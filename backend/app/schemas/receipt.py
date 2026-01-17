from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, List
from app.models.batch_receipt import BatchStatus, BatchItemStatus


class ReceiptBase(BaseModel):
    filename: str
    file_type: str


class ReceiptCreate(ReceiptBase):
    file_path: Optional[str] = None


class ReceiptResponse(ReceiptBase):
    id: int
    file_path: Optional[str] = None  # Now optional - stored in database instead
    raw_text: Optional[str] = None
    extracted_data: Optional[Dict] = None
    expense_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OCRResult(BaseModel):
    """Result of OCR processing"""
    raw_text: str
    vendor: Optional[str] = None
    items: List[Dict[str, str]] = []
    total: Optional[str] = None
    date: Optional[str] = None


class BatchReceiptItemResponse(BaseModel):
    """Response schema for individual batch receipt item"""
    id: int
    filename: str
    status: str
    error_message: Optional[str] = None
    expense_id: Optional[int] = None
    receipt_id: Optional[int] = None
    ocr_attempts: int
    llm_attempts: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BatchReceiptUploadResponse(BaseModel):
    """Response schema for batch receipt upload metadata"""
    batch_id: str
    total_count: int
    processed_count: int
    success_count: int
    error_count: int
    status: str
    ocr_engine: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BatchReceiptStatusResponse(BatchReceiptUploadResponse):
    """Combined response with batch metadata and all items"""
    items: List[BatchReceiptItemResponse]
