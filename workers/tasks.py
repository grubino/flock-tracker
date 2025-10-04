from workers.celery_app import celery_app
from app.services.ocr_layout_service import OCRLayoutService
from app.services.ocr_service import OCRService
from app.services.easyocr_service import EasyOCRService
from app.database.database import SessionLocal
from app.models.receipt import Receipt
from app.models.vendor import Vendor
import os
from dotenv import load_dotenv

load_dotenv()


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
            # Debug: List files in upload directory
            upload_dir = os.path.dirname(receipt.file_path)
            if os.path.exists(upload_dir):
                files = os.listdir(upload_dir)
                print(f"✗ File not found: {receipt.file_path}")
                print(f"  Files in {upload_dir}: {files[:10]}")  # Show first 10 files
            else:
                print(f"✗ Upload directory doesn't exist: {upload_dir}")
            raise FileNotFoundError(f"Receipt file not found: {receipt.file_path}")

        # Get OCR engine configuration
        ocr_engine = os.getenv('OCR_ENGINE', 'easyocr').lower()
        use_gpu = os.getenv('OCR_USE_GPU', 'false').lower() == 'true'
        x_ths = float(os.getenv('OCR_X_THS', '1.0'))
        y_ths = float(os.getenv('OCR_Y_THS', '0.5'))

        # Get known vendors for better matching
        vendors = db.query(Vendor).all()
        known_vendor_names = [v.name for v in vendors]

        # Use EasyOCR or Tesseract based on configuration
        if ocr_engine == 'easyocr':
            # Extract structured data directly with EasyOCR
            extracted_data = EasyOCRService.extract_structured_data(
                receipt.file_path,
                known_vendors=known_vendor_names,
                gpu=use_gpu,
                paragraph=True,
                x_ths=x_ths,
                y_ths=y_ths
            )
            raw_text = extracted_data.pop('raw_text', '')
        else:
            # Use Tesseract with layout service
            raw_text = OCRService.extract_text(receipt.file_path, receipt.file_type)

            # Update state
            self.update_state(state='PROCESSING', meta={'status': 'Parsing receipt data...'})

            # Parse receipt data
            extracted_data = OCRLayoutService.parse_receipt_with_layout(
                receipt.file_path,
                receipt.file_type,
                known_vendor_names
            )

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
