from sqlalchemy import Column, Integer, String, DateTime, Numeric, Enum as SQLEnum, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database.database import Base


class ExpenseCategory(enum.Enum):
    FEED = "feed"
    SEED = "seed"
    MEDICATION = "medication"
    VETERINARY = "veterinary"
    INFRASTRUCTURE = "infrastructure"
    EQUIPMENT = "equipment"
    SUPPLIES = "supplies"
    UTILITIES = "utilities"
    LABOR = "labor"
    MAINTENANCE = "maintenance"
    TAX = "tax"
    OTHER = "other"


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(SQLEnum(ExpenseCategory), nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)  # Decimal for precise currency
    description = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    expense_date = Column(DateTime, nullable=False, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    receipt_id = Column(Integer, ForeignKey("receipts.id"), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    vendor = relationship("Vendor", back_populates="expenses")
    receipt = relationship("Receipt", back_populates="expense")
    line_items = relationship("ExpenseLineItem", back_populates="expense", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Expense(id={self.id}, category='{self.category.value}', amount={self.amount}, date='{self.expense_date}')>"
