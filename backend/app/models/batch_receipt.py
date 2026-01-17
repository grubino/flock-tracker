from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database.database import Base


class BatchStatus(enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class BatchItemStatus(enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class BatchReceiptUpload(Base):
    __tablename__ = "batch_receipt_uploads"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String, unique=True, nullable=False, index=True)  # UUID
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    total_count = Column(Integer, nullable=False, default=0)
    processed_count = Column(Integer, nullable=False, default=0)
    success_count = Column(Integer, nullable=False, default=0)
    error_count = Column(Integer, nullable=False, default=0)
    ocr_engine = Column(String, nullable=False, default="tesseract")  # tesseract, easyocr, got-ocr, chandra, paddleocr
    status = Column(SQLEnum(BatchStatus), nullable=False, default=BatchStatus.PENDING, index=True)

    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="batch_receipts")
    items = relationship("BatchReceiptItem", back_populates="batch", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<BatchReceiptUpload(id={self.id}, batch_id='{self.batch_id}', status='{self.status.value}', {self.processed_count}/{self.total_count})>"


class BatchReceiptItem(Base):
    __tablename__ = "batch_receipt_items"

    id = Column(Integer, primary_key=True, index=True)
    batch_upload_id = Column(Integer, ForeignKey("batch_receipt_uploads.id"), nullable=False)
    receipt_id = Column(Integer, ForeignKey("receipts.id"), nullable=True)  # Set after receipt created
    expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=True)  # Set after expense created
    filename = Column(String, nullable=False)
    status = Column(SQLEnum(BatchItemStatus), nullable=False, default=BatchItemStatus.PENDING, index=True)
    error_message = Column(Text, nullable=True)
    ocr_attempts = Column(Integer, nullable=False, default=0)
    llm_attempts = Column(Integer, nullable=False, default=0)

    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    batch = relationship("BatchReceiptUpload", back_populates="items")
    receipt = relationship("Receipt")
    expense = relationship("Expense")

    def __repr__(self):
        return f"<BatchReceiptItem(id={self.id}, filename='{self.filename}', status='{self.status.value}')>"
