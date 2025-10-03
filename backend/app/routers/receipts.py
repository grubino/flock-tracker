from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List
import os
import shutil
from pathlib import Path

from app.database.database import get_db
from app.models.receipt import Receipt
from app.models.vendor import Vendor
from app.schemas.receipt import ReceiptResponse, OCRResult
from app.routers.auth import get_current_active_user
from app.models.user import User

# Import Celery task
try:
    from workers.tasks import process_receipt_ocr
    CELERY_AVAILABLE = True
except ImportError:
    CELERY_AVAILABLE = False
    # Fallback to synchronous processing if Celery not available
    from app.services.ocr_service import OCRService

router = APIRouter(prefix="/receipts", tags=["receipts"])

# Configure upload directory
UPLOAD_DIR = Path("uploads/receipts")
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

    # Generate unique filename
    import uuid
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename

    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving file: {str(e)}"
        )

    # Create receipt record
    receipt = Receipt(
        filename=file.filename,
        file_path=str(file_path),
        file_type=file.content_type
    )
    db.add(receipt)
    db.commit()
    db.refresh(receipt)

    return receipt


@router.post("/{receipt_id}/process")
async def process_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Process a receipt with OCR and extract structured data (async with Celery)"""

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

    try:
        if CELERY_AVAILABLE:
            # Queue OCR processing task
            task = process_receipt_ocr.delay(receipt_id)
            return {
                'status': 'processing',
                'task_id': task.id,
                'message': 'OCR processing started'
            }
        else:
            # Fallback to synchronous processing
            raw_text = OCRService.extract_text(receipt.file_path, receipt.file_type)
            vendors = db.query(Vendor).all()
            known_vendor_names = [v.name for v in vendors]
            extracted_data = OCRService.parse_receipt(raw_text, known_vendor_names)

            receipt.raw_text = raw_text
            receipt.extracted_data = extracted_data
            db.commit()

            result = {'raw_text': raw_text}
            result.update(extracted_data)
            return {
                'status': 'completed',
                'task_id': None,
                'result': result
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
    task = AsyncResult(task_id, app=process_receipt_ocr.app)

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
        return {
            'status': 'failed',
            'task_id': task_id,
            'error': str(task.info) if task.info else 'Unknown error'
        }
    else:
        return {
            'status': task.state.lower(),
            'task_id': task_id
        }


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
        print(f"Error deleting file: {str(e)}")

    db.delete(receipt)
    db.commit()
    return {"message": "Receipt deleted successfully"}
