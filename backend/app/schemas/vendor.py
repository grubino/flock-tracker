from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class VendorBase(BaseModel):
    name: str = Field(..., min_length=1)
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None


class VendorCreate(VendorBase):
    pass


class VendorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None


class VendorResponse(VendorBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
