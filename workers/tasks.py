from workers.celery_app import celery_app
from app.services.ocr_service_router import OCRServiceRouter
from app.services.image_preprocessing import (
    preprocess_image_from_bytes,
    save_image_to_bytes,
    get_conservative_dimensions,
)
from app.database.database import SessionLocal
from app.models.receipt import Receipt
from app.models.vendor import Vendor
from app.models.expense import ExpenseCategory
from app.models.batch_receipt import (
    BatchReceiptUpload,
    BatchReceiptItem,
    BatchStatus,
    BatchItemStatus,
)
from app.models.expense import Expense
from app.models.expense_line_item import ExpenseLineItem
import os
import tempfile
import asyncio
from decimal import Decimal
from datetime import datetime
from dotenv import load_dotenv
import threading
from queue import Queue

load_dotenv()

import logging

logger = logging.getLogger(__name__)


class TimeoutException(Exception):
    """Raised when operation times out"""

    pass


def run_ocr_in_thread(queue, ocr_engine, temp_path, file_type, known_vendor_names):
    """
    Run OCR in a separate thread.
    While we can't forcefully kill a hung thread, we can timeout and move on to the next receipt.
    """
    try:
        # Run OCR service
        raw_text, extracted_data = OCRServiceRouter.process_receipt(
            ocr_engine=ocr_engine,
            file_path=temp_path,
            file_type=file_type,
            known_vendor_names=known_vendor_names
        )

        queue.put(
            {"success": True, "raw_text": raw_text, "extracted_data": extracted_data}
        )
    except Exception as e:
        queue.put({"success": False, "error": str(e)})


def run_ocr_with_timeout(
    ocr_engine, temp_path, file_type, known_vendor_names, timeout_seconds
):
    """
    Run OCR with a timeout using threading.
    Returns (raw_text, extracted_data) on success.
    Raises TimeoutException on timeout or ValueError on error.

    Note: We can't forcefully kill a hung thread, but we can timeout and move on.
    The thread will continue running in the background until it finishes, but we don't wait for it.
    """
    queue = Queue()
    thread = threading.Thread(
        target=run_ocr_in_thread,
        args=(queue, ocr_engine, temp_path, file_type, known_vendor_names),
        daemon=True,  # Daemon thread will be killed when main program exits
    )

    thread.start()
    thread.join(timeout=timeout_seconds)

    if thread.is_alive():
        # Thread is still running after timeout
        logger.error(
            f"OCR thread timed out after {timeout_seconds}s, moving on (thread will continue in background)"
        )
        raise TimeoutException(
            f"OCR processing timed out after {timeout_seconds} seconds"
        )

    # Thread finished - check result
    if not queue.empty():
        result = queue.get()
        if result["success"]:
            return result["raw_text"], result["extracted_data"]
        else:
            raise ValueError(f"OCR processing failed: {result['error']}")
    else:
        # Thread exited without putting anything in queue
        raise ValueError("OCR thread exited unexpectedly without returning a result")


@celery_app.task(bind=True, name="workers.tasks.process_receipt_ocr")
def process_receipt_ocr(self, receipt_id: int, ocr_engine: str):
    """
    Celery task to process receipt OCR asynchronously.

    Args:
        receipt_id: ID of the receipt to process

    Returns:
        dict: OCR results with vendor, items, total, and date
    """
    db = SessionLocal()

    try:
        # Update task state to show progress
        self.update_state(state="PROCESSING", meta={"status": "Loading receipt..."})

        # Get receipt from database
        receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
        if not receipt:
            raise ValueError(f"Receipt {receipt_id} not found")

        # Check if already processed
        if receipt.raw_text:
            result = {"status": "completed", "raw_text": receipt.raw_text}
            if receipt.extracted_data:
                result.update(receipt.extracted_data)
            return result

        # Update state
        self.update_state(
            state="PROCESSING", meta={"status": "Extracting text from image..."}
        )

        # Get file data from database (no filesystem needed!)
        if not receipt.file_data:
            raise ValueError(f"Receipt {receipt_id} has no file data stored")

        # Preprocess and write file data to temporary file for OCR processing
        try:
            # Preprocess image to reduce memory usage
            # Use conservative dimensions for memory-intensive models like Donut and PaddleOCR
            max_width, max_height = get_conservative_dimensions()

            logger.info(f"Preprocessing image for receipt {receipt_id} (max dimensions: {max_width}x{max_height})")

            # Only preprocess images, not PDFs
            if receipt.file_type in ["image/jpeg", "image/jpg", "image/png"]:
                try:
                    image, metadata = preprocess_image_from_bytes(
                        receipt.file_data,
                        max_width=max_width,
                        max_height=max_height,
                        convert_to_rgb=True
                    )

                    logger.info(
                        f"Image preprocessed: {metadata['original_size']} -> {metadata['final_size']}, "
                        f"resized: {metadata['was_resized']}, converted: {metadata['was_converted']}"
                    )

                    # Save preprocessed image to bytes
                    processed_data = save_image_to_bytes(image, format="JPEG", quality=95)
                    file_ext = "jpg"

                    logger.info(
                        f"Image size reduced from {len(receipt.file_data)} to {len(processed_data)} bytes "
                        f"({len(processed_data)/len(receipt.file_data)*100:.1f}%)"
                    )
                except Exception as e:
                    logger.warning(f"Image preprocessing failed, using original: {e}")
                    processed_data = receipt.file_data
                    file_ext = receipt.filename.split(".")[-1] if "." in receipt.filename else "jpg"
            else:
                # Use original data for PDFs
                processed_data = receipt.file_data
                file_ext = receipt.filename.split(".")[-1] if "." in receipt.filename else "pdf"

            # Create temporary file with correct extension
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_ext}")
            temp_file.write(processed_data)
            temp_file.close()
            temp_path = temp_file.name
            logger.info(f"✓ Wrote {len(processed_data)} bytes to temp file: {temp_path}")
        except Exception as e:
            raise Exception(f"Error creating temporary file: {str(e)}")

        # Get known vendors for better matching
        vendors = db.query(Vendor).all()
        known_vendor_names = [v.name for v in vendors]

        # Process with OCR service router
        try:
            # Update state
            self.update_state(
                state="PROCESSING", meta={"status": "Parsing receipt data..."}
            )

            # Process receipt with the specified OCR engine
            raw_text, extracted_data = OCRServiceRouter.process_receipt(
                ocr_engine=ocr_engine,
                file_path=temp_path,
                file_type=receipt.file_type,
                known_vendor_names=known_vendor_names
            )
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_path)
                print(f"✓ Cleaned up temp file: {temp_path}")
            except:
                pass

        # Update receipt with OCR results
        receipt.raw_text = raw_text
        receipt.extracted_data = extracted_data
        db.commit()

        result = {"status": "completed", "raw_text": raw_text}
        result.update(extracted_data)
        return result

    except Exception as e:
        db.rollback()
        # Update task state to failed
        self.update_state(state="FAILURE", meta={"status": "failed", "error": str(e)})
        raise
    finally:
        db.close()


@celery_app.task(bind=True, name="workers.tasks.process_batch_receipts")
def process_batch_receipts(self, batch_id: str):
    """
    Celery task to process batch receipt upload with auto expense creation.

    Args:
        batch_id: UUID of the batch to process

    Returns:
        dict: Summary of batch processing results
    """
    db = SessionLocal()

    try:
        # Load batch from database
        batch = (
            db.query(BatchReceiptUpload)
            .filter(BatchReceiptUpload.batch_id == batch_id)
            .first()
        )
        if not batch:
            raise ValueError(f"Batch {batch_id} not found")

        # Update batch status to processing
        batch.status = BatchStatus.PROCESSING
        db.commit()

        # Get LLM URL from environment
        llm_url = os.getenv("LLM_URL", "http://localhost:8080/v1")

        # Get all items in this batch
        items = (
            db.query(BatchReceiptItem)
            .filter(BatchReceiptItem.batch_upload_id == batch.id)
            .all()
        )

        # Get known vendors for OCR matching
        vendors = db.query(Vendor).all()
        known_vendor_names = [v.name for v in vendors]

        # Process each item
        for idx, item in enumerate(items, 1):
            try:
                # Update task state with progress
                self.update_state(
                    state="PROCESSING",
                    meta={
                        "current": idx,
                        "total": len(items),
                        "current_filename": item.filename,
                        "processed_count": batch.processed_count,
                        "success_count": batch.success_count,
                        "error_count": batch.error_count,
                    },
                )

                # Update item status to processing
                item.status = BatchItemStatus.PROCESSING
                db.commit()

                # Get receipt
                receipt = (
                    db.query(Receipt).filter(Receipt.id == item.receipt_id).first()
                )
                if not receipt:
                    raise ValueError(f"Receipt {item.receipt_id} not found")

                # Get file data and create temp file
                if not receipt.file_data:
                    raise ValueError(f"Receipt {item.receipt_id} has no file data")

                # Preprocess image to reduce memory usage
                try:
                    # Use conservative dimensions for memory-intensive models like Donut and PaddleOCR
                    max_width, max_height = get_conservative_dimensions()

                    logger.info(f"Preprocessing image for {item.filename} (max dimensions: {max_width}x{max_height})")

                    # Only preprocess images, not PDFs
                    if receipt.file_type in ["image/jpeg", "image/jpg", "image/png"]:
                        try:
                            image, metadata = preprocess_image_from_bytes(
                                receipt.file_data,
                                max_width=max_width,
                                max_height=max_height,
                                convert_to_rgb=True
                            )

                            logger.info(
                                f"Image preprocessed: {metadata['original_size']} -> {metadata['final_size']}, "
                                f"resized: {metadata['was_resized']}, converted: {metadata['was_converted']}"
                            )

                            # Save preprocessed image to bytes
                            processed_data = save_image_to_bytes(image, format="JPEG", quality=95)
                            file_ext = "jpg"

                            logger.info(
                                f"Image size reduced from {len(receipt.file_data)} to {len(processed_data)} bytes "
                                f"({len(processed_data)/len(receipt.file_data)*100:.1f}%)"
                            )
                        except Exception as e:
                            logger.warning(f"Image preprocessing failed, using original: {e}")
                            processed_data = receipt.file_data
                            file_ext = receipt.filename.split(".")[-1] if "." in receipt.filename else "jpg"
                    else:
                        # Use original data for PDFs
                        processed_data = receipt.file_data
                        file_ext = receipt.filename.split(".")[-1] if "." in receipt.filename else "pdf"

                    # Create temporary file with correct extension
                    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_ext}")
                    temp_file.write(processed_data)
                    temp_file.close()
                    temp_path = temp_file.name
                    logger.info(f"✓ Wrote {len(processed_data)} bytes to temp file: {temp_path}")
                except Exception as e:
                    raise Exception(f"Error creating temporary file: {str(e)}")

                try:
                    # Step 1: Run OCR based on batch OCR engine with timeout
                    item.ocr_attempts += 1
                    db.commit()

                    logger.info(
                        f"Starting OCR for {item.filename} using {batch.ocr_engine}"
                    )

                    # Set timeout based on OCR engine (GOT-OCR, EasyOCR, Chandra, and PaddleOCR are slower)
                    ocr_timeout = (
                        300 if batch.ocr_engine in ["got-ocr", "easyocr", "chandra", "paddleocr"] else 60
                    )  # 5 min for slow engines, 1 min for tesseract

                    # Run OCR with hard timeout using multiprocessing
                    raw_text, extracted_data = run_ocr_with_timeout(
                        batch.ocr_engine,
                        temp_path,
                        receipt.file_type,
                        known_vendor_names,
                        ocr_timeout,
                    )

                    logger.info(
                        f"OCR complete for {item.filename}, extracted {len(raw_text)} characters"
                    )

                    # Update receipt with OCR results
                    receipt.raw_text = raw_text
                    receipt.extracted_data = extracted_data
                    db.commit()

                    # Step 2: Run LLM extraction with retry
                    from app.services.llm_expense_extractor import LLMExpenseExtractor

                    # Use asyncio to run the async function
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    try:
                        llm_result = loop.run_until_complete(
                            LLMExpenseExtractor.extract_expense_data_with_retry(
                                ocr_text=raw_text,
                                llm_url=llm_url,
                                timeout=300,
                                max_retries=3,
                            )
                        )
                    finally:
                        loop.close()

                    item.llm_attempts = llm_result["attempts"]
                    db.commit()

                    if not llm_result["success"]:
                        raise ValueError(
                            f"LLM extraction failed: {llm_result['error']}"
                        )

                    expense_data = llm_result["data"]

                    # Step 3: Auto-create expense
                    # Look up or create vendor
                    vendor = None
                    if expense_data.get("vendor_name"):
                        vendor = (
                            db.query(Vendor)
                            .filter(Vendor.name == expense_data["vendor_name"])
                            .first()
                        )
                        if not vendor:
                            vendor = Vendor(name=expense_data["vendor_name"])
                            db.add(vendor)
                            db.flush()  # Get vendor.id

                    # Parse expense date
                    try:
                        expense_date = datetime.fromisoformat(
                            expense_data["expense_date"]
                        )
                    except (ValueError, KeyError):
                        # Fallback to receipt creation date
                        expense_date = receipt.created_at

                    # Create expense
                    # Convert category string to enum
                    category_str = expense_data.get("category", "other")
                    try:
                        category_enum = ExpenseCategory(category_str)
                    except ValueError:
                        # If invalid category, default to OTHER
                        category_enum = ExpenseCategory.OTHER

                    expense = Expense(
                        category=category_enum,
                        amount=Decimal(str(expense_data["amount"])),
                        description=expense_data.get(
                            "description", f"Receipt: {receipt.filename}"
                        ),
                        notes=expense_data.get("notes"),
                        expense_date=expense_date,
                        vendor_id=vendor.id if vendor else None,
                        receipt_id=receipt.id,
                    )
                    db.add(expense)
                    db.flush()  # Get expense.id

                    # Create line items
                    for line_item_data in expense_data.get("line_items", []):
                        line_item = ExpenseLineItem(
                            expense_id=expense.id,
                            description=line_item_data.get("description", "Item"),
                            amount=Decimal(str(line_item_data["amount"])),
                            quantity=(
                                Decimal(str(line_item_data["quantity"]))
                                if line_item_data.get("quantity")
                                else None
                            ),
                            unit_price=(
                                Decimal(str(line_item_data["unit_price"]))
                                if line_item_data.get("unit_price")
                                else None
                            ),
                            category=line_item_data.get("category"),
                        )
                        db.add(line_item)

                    db.commit()
                    db.refresh(expense)

                    # Update batch item with expense ID and mark complete
                    item.expense_id = expense.id
                    item.status = BatchItemStatus.COMPLETED
                    batch.success_count += 1

                finally:
                    # Clean up temp file
                    try:
                        os.unlink(temp_path)
                    except:
                        pass

            except Exception as e:
                # Handle item-level error
                error_message = str(e)
                item.status = BatchItemStatus.FAILED
                item.error_message = error_message
                batch.error_count += 1
                # Continue with next item

            finally:
                # Update batch progress
                batch.processed_count += 1
                db.commit()

        # Mark batch as completed
        batch.status = BatchStatus.COMPLETED
        db.commit()

        return {
            "batch_id": batch_id,
            "total_count": batch.total_count,
            "processed_count": batch.processed_count,
            "success_count": batch.success_count,
            "error_count": batch.error_count,
            "status": "completed",
        }

    except Exception as e:
        # Handle batch-level error
        if "batch" in locals():
            batch.status = BatchStatus.FAILED
            db.commit()

        self.update_state(state="FAILURE", meta={"status": "failed", "error": str(e)})
        raise
    finally:
        db.close()
