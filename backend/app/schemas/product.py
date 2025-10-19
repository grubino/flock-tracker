from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.product import ProductCategory


class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: ProductCategory
    price: float = Field(gt=0, description="Price must be greater than 0")
    inventory_quantity: int = Field(ge=0, description="Inventory must be non-negative")
    unit: str
    sku: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[ProductCategory] = None
    price: Optional[float] = Field(None, gt=0)
    inventory_quantity: Optional[int] = Field(None, ge=0)
    unit: Optional[str] = None
    sku: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None


class ProductResponse(ProductBase):
    id: int
    created_by_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
