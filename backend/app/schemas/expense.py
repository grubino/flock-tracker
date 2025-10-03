from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal
from typing import Optional
from app.models.expense import ExpenseCategory
from app.schemas.vendor import VendorResponse


class ExpenseBase(BaseModel):
    category: ExpenseCategory
    amount: Decimal = Field(..., gt=0)
    description: str = Field(..., min_length=1)
    notes: Optional[str] = None
    expense_date: datetime
    vendor_id: Optional[int] = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    category: Optional[ExpenseCategory] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    description: Optional[str] = Field(None, min_length=1)
    notes: Optional[str] = None
    expense_date: Optional[datetime] = None
    vendor_id: Optional[int] = None


class ExpenseResponse(ExpenseBase):
    id: int
    created_at: datetime
    updated_at: datetime
    vendor: Optional[VendorResponse] = None

    class Config:
        from_attributes = True
