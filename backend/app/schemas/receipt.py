from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, List


class ReceiptBase(BaseModel):
    filename: str
    file_type: str


class ReceiptCreate(ReceiptBase):
    file_path: str


class ReceiptResponse(ReceiptBase):
    id: int
    file_path: str
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
