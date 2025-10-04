from workers.celery_app import celery_app
from app.services.ocr_layout_service import OCRLayoutService
from app.services.ocr_service import OCRService
from app.database.database import SessionLocal
from app.models.receipt import Receipt
from app.models.vendor import Vendor
import os


@celery_app.task(bind=True, name='workers.tasks.process_receipt_ocr')
def process_receipt_ocr(self, receipt_id: int):
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
        self.update_state(state='PROCESSING', meta={'status': 'Loading receipt...'})

        # Get receipt from database
        receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
        if not receipt:
            raise ValueError(f"Receipt {receipt_id} not found")

        # Check if already processed
        if receipt.raw_text:
            result = {'status': 'completed', 'raw_text': receipt.raw_text}
            if receipt.extracted_data:
                result.update(receipt.extracted_data)
            return result

        # Update state
        self.update_state(state='PROCESSING', meta={'status': 'Extracting text from image...'})

        # Verify file exists
        if not os.path.exists(receipt.file_path):
            raise FileNotFoundError(f"Receipt file not found: {receipt.file_path}")

        # Extract text using OCR
        raw_text = OCRService.extract_text(receipt.file_path, receipt.file_type)

        # Update state
        self.update_state(state='PROCESSING', meta={'status': 'Parsing receipt data...'})

        # Get known vendors for better matching
        vendors = db.query(Vendor).all()
        known_vendor_names = [v.name for v in vendors]

        # Parse receipt data
        extracted_data = OCRLayoutService.parse_receipt_with_layout(receipt.file_path, receipt.file_type, known_vendor_names)

        # Update receipt with OCR results
        receipt.raw_text = raw_text
        receipt.extracted_data = extracted_data
        db.commit()

        result = {'status': 'completed', 'raw_text': raw_text}
        result.update(extracted_data)
        return result

    except Exception as e:
        db.rollback()
        # Update task state to failed
        self.update_state(
            state='FAILURE',
            meta={
                'status': 'failed',
                'error': str(e)
            }
        )
        raise
    finally:
        db.close()
