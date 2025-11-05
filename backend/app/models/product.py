from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database.database import Base


class ProductCategory(str, enum.Enum):
    PET_FOOD = "pet_food"
    MEAT = "meat"
    EGGS = "eggs"
    WOOL = "wool"
    HONEY = "honey"
    DAIRY = "dairy"
    VEGETABLES = "vegetables"
    FRUITS = "fruits"
    PROCESSED = "processed"
    OTHER = "other"


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text)
    category = Column(SQLEnum(ProductCategory), nullable=False, index=True)
    price = Column(Float, nullable=False)  # Price per unit
    inventory_quantity = Column(Integer, nullable=False, default=0)
    unit = Column(String, nullable=False)  # e.g., "lb", "dozen", "jar", "each"
    sku = Column(String, unique=True, index=True)
    image_url = Column(String, nullable=True)
    is_active = Column(Integer, nullable=False, default=1)  # SQLite boolean
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    created_by = relationship("User", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")
