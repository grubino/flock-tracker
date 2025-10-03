from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from app.models.expense import ExpenseCategory
from app.schemas.vendor import VendorResponse


class ExpenseLineItemBase(BaseModel):
    description: str = Field(..., min_length=1)
    category: Optional[ExpenseCategory] = None
    quantity: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    amount: Decimal = Field(..., gt=0)


class ExpenseLineItemCreate(ExpenseLineItemBase):
    pass


class ExpenseLineItemResponse(ExpenseLineItemBase):
    id: int

    class Config:
        from_attributes = True


class ReceiptBrief(BaseModel):
    id: int
    filename: str
    file_path: str

    class Config:
        from_attributes = True


class ExpenseBase(BaseModel):
    category: ExpenseCategory
    amount: Decimal = Field(..., gt=0)
    description: str = Field(..., min_length=1)
    notes: Optional[str] = None
    expense_date: datetime
    vendor_id: Optional[int] = None
    receipt_id: Optional[int] = None


class ExpenseCreate(ExpenseBase):
    line_items: Optional[List[ExpenseLineItemCreate]] = []


class ExpenseUpdate(BaseModel):
    category: Optional[ExpenseCategory] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    description: Optional[str] = Field(None, min_length=1)
    notes: Optional[str] = None
    expense_date: Optional[datetime] = None
    vendor_id: Optional[int] = None
    receipt_id: Optional[int] = None
    line_items: Optional[List[ExpenseLineItemCreate]] = None


class ExpenseResponse(ExpenseBase):
    id: int
    created_at: datetime
    updated_at: datetime
    vendor: Optional[VendorResponse] = None
    receipt: Optional[ReceiptBrief] = None
    line_items: List[ExpenseLineItemResponse] = []

    class Config:
        from_attributes = True
