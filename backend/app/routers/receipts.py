from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List
import os
import shutil
from pathlib import Path
import logging

from app.database.database import get_db
from app.models.receipt import Receipt
from app.models.vendor import Vendor
from app.schemas.receipt import ReceiptResponse, OCRResult
from app.routers.auth import get_current_active_user
from app.models.user import User

logger = logging.getLogger(__name__)

# Initialize Celery client (don't import worker tasks)
from celery import Celery
import os

REDIS_URL = os.getenv('REDIS_URL')
CELERY_AVAILABLE = bool(REDIS_URL)

if CELERY_AVAILABLE:
    # Create Celery client to send tasks (not execute them)
    celery_app = Celery(
        'flock_tracker_api',
        broker=REDIS_URL,
        backend=REDIS_URL
    )
    # Configure serialization to match worker
    celery_app.conf.update(
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='UTC',
        enable_utc=True,
        result_extended=True,  # Include more metadata in results
    )
    logger.info(f"Celery client initialized with broker: {REDIS_URL[:20]}...")
else:
    celery_app = None
    logger.warning("REDIS_URL not set - Celery unavailable, will use synchronous processing")
    # Import services for fallback
    from app.services.ocr_service import OCRService
    from app.services.ocr_layout_service import OCRLayoutService
    from app.services.ocr_easyocr_service import OCREasyOCRService

router = APIRouter(prefix="/receipts", tags=["receipts"])

# Configure upload directory
# Use /data/uploads for Render Disk or uploads/receipts for local dev
UPLOAD_DIR = Path(os.getenv('UPLOAD_DIR', 'uploads/receipts'))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Allowed file types
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.pdf'}
ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png', 'application/pdf'}


@router.post("/upload", response_model=ReceiptResponse)
async def upload_receipt(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload a receipt image or PDF for OCR processing"""

    # Validate file type
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"MIME type not allowed. Allowed types: {', '.join(ALLOWED_MIME_TYPES)}"
        )

    # Read file data into memory
    try:
        file_data = await file.read()
        file_size = len(file_data)
        logger.info(f"File uploaded: {file.filename} (size: {file_size} bytes)")
    except Exception as e:
        logger.error(f"Error reading file {file.filename}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reading file: {str(e)}"
        )

    # Create receipt record with file data in database
    receipt = Receipt(
        filename=file.filename,
        file_path=None,  # No longer using filesystem
        file_type=file.content_type,
        file_data=file_data
    )
    db.add(receipt)
    db.commit()
    db.refresh(receipt)

    logger.info(f"Receipt saved to database: ID={receipt.id}, filename={receipt.filename}")

    return receipt


@router.get("/celery-status")
async def celery_status(current_user: User = Depends(get_current_active_user)):
    """Check if Celery is available and connected"""
    if not CELERY_AVAILABLE:
        return {
            "available": False,
            "message": "REDIS_URL not configured"
        }

    try:
        # Try to inspect workers
        i = celery_app.control.inspect()
        stats = i.stats()

        if stats:
            return {
                "available": True,
                "workers_online": len(stats),
                "workers": list(stats.keys())
            }
        else:
            return {
                "available": True,
                "workers_online": 0,
                "message": "No workers are currently running"
            }
    except Exception as e:
        return {
            "available": True,
            "error": str(e),
            "message": "Celery client initialized but cannot connect to broker/workers"
        }


@router.post("/{receipt_id}/process")
async def process_receipt(
    receipt_id: int,
    ocr_engine: str = "tesseract",  # Options: "tesseract" or "easyocr"
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Process a receipt with OCR and extract structured data (async with Celery)

    Args:
        receipt_id: ID of the receipt to process
        ocr_engine: OCR engine to use - "tesseract" (default) or "easyocr"
    """

    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    # Check if already processed
    if receipt.raw_text:
        result = {'raw_text': receipt.raw_text}
        if receipt.extracted_data:
            result.update(receipt.extracted_data)
        return {
            'status': 'completed',
            'task_id': None,
            'result': result
        }

    # Validate OCR engine
    if ocr_engine not in ["tesseract", "easyocr"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OCR engine. Choose 'tesseract' or 'easyocr'"
        )

    try:
        if CELERY_AVAILABLE:
            # Queue OCR processing task by name (worker will handle it)
            # TODO: Update worker to support ocr_engine parameter
            task = celery_app.send_task('workers.tasks.process_receipt_ocr', args=[receipt_id, ocr_engine])
            return {
                'status': 'processing',
                'task_id': task.id,
                'message': f'OCR processing started with {ocr_engine}',
                'ocr_engine': ocr_engine
            }
        else:
            # Fallback to synchronous processing
            import tempfile

            # Get file data from database and write to temp file
            if not receipt.file_data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Receipt has no file data"
                )

            # Create temp file
            file_ext = receipt.filename.split('.')[-1] if '.' in receipt.filename else 'jpg'
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_ext}')
            temp_file.write(receipt.file_data)
            temp_file.close()
            temp_path = temp_file.name

            try:
                vendors = db.query(Vendor).all()
                known_vendor_names = [v.name for v in vendors]

                # Choose OCR engine
                if ocr_engine == "easyocr":
                    logger.info(f"Using EasyOCR for receipt {receipt_id}")
                    extracted_data = OCREasyOCRService.parse_receipt_with_easyocr(
                        temp_path,
                        receipt.file_type,
                        known_vendor_names
                    )
                    # EasyOCR doesn't return separate raw_text, construct it from lines
                    raw_text = "\n".join([item['description'] for item in extracted_data.get('items', [])])
                else:  # tesseract (default)
                    logger.info(f"Using Tesseract for receipt {receipt_id}")
                    raw_text = OCRService.extract_text(temp_path, receipt.file_type)
                    extracted_data = OCRLayoutService.parse_receipt_with_layout(
                        temp_path,
                        receipt.file_type,
                        known_vendor_names
                    )
                    extracted_data['ocr_engine'] = 'tesseract'

                receipt.raw_text = raw_text
                receipt.extracted_data = extracted_data
                db.commit()
            finally:
                # Clean up temp file
                try:
                    os.unlink(temp_path)
                except:
                    pass

            result = {'raw_text': raw_text}
            result.update(extracted_data)
            return {
                'status': 'completed',
                'task_id': None,
                'result': result,
                'ocr_engine': ocr_engine
            }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing receipt: {str(e)}"
        )


@router.get("/task/{task_id}")
async def get_task_status(
    task_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Check the status of an OCR processing task"""

    if not CELERY_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Celery not available"
        )

    from celery.result import AsyncResult

    try:
        task = AsyncResult(task_id, app=celery_app)

        if task.state == 'PENDING':
            return {
                'status': 'pending',
                'task_id': task_id,
                'message': 'Task is waiting to be processed'
            }
        elif task.state == 'PROCESSING':
            return {
                'status': 'processing',
                'task_id': task_id,
                'message': task.info.get('status', 'Processing...') if task.info else 'Processing...'
            }
        elif task.state == 'SUCCESS':
            return {
                'status': 'completed',
                'task_id': task_id,
                'result': task.result
            }
        elif task.state == 'FAILURE':
            # Handle failure with better error extraction
            error_msg = 'Unknown error'
            if task.info:
                if isinstance(task.info, dict):
                    error_msg = task.info.get('error', str(task.info))
                else:
                    error_msg = str(task.info)

            return {
                'status': 'failed',
                'task_id': task_id,
                'error': error_msg
            }
        else:
            return {
                'status': task.state.lower(),
                'task_id': task_id
            }
    except Exception as e:
        # Catch serialization errors and other issues
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving task status: {str(e)}"
        )


@router.get("/", response_model=List[ReceiptResponse])
def get_receipts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all receipts"""
    receipts = db.query(Receipt).offset(skip).limit(limit).all()
    return receipts


@router.get("/{receipt_id}", response_model=ReceiptResponse)
def get_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific receipt"""
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return receipt


@router.delete("/{receipt_id}")
def delete_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a receipt and its file"""
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    # Delete file
    try:
        if os.path.exists(receipt.file_path):
            os.remove(receipt.file_path)
    except Exception as e:
        # Log error but continue with database deletion
        logger.warning(f"Error deleting file for receipt {receipt_id}: {str(e)}")

    db.delete(receipt)
    db.commit()
    logger.info(f"Receipt deleted: ID={receipt_id}")
    return {"message": "Receipt deleted successfully"}
