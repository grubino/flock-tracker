from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.database import Base


class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # image/jpeg, image/png, application/pdf

    # OCR results
    raw_text = Column(Text, nullable=True)
    extracted_data = Column(JSON, nullable=True)  # Structured extraction: vendor, items, total

    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    expense = relationship("Expense", back_populates="receipt", uselist=False)

    def __repr__(self):
        return f"<Receipt(id={self.id}, filename='{self.filename}')>"
