from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database.database import Base
from app.models.expense import ExpenseCategory


class ExpenseLineItem(Base):
    __tablename__ = "expense_line_items"

    id = Column(Integer, primary_key=True, index=True)
    expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=False)
    description = Column(String, nullable=False)
    category = Column(SQLEnum(ExpenseCategory), nullable=True, index=True)
    quantity = Column(Numeric(10, 2), nullable=True)
    unit_price = Column(Numeric(10, 2), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)

    # Relationships
    expense = relationship("Expense", back_populates="line_items")

    def __repr__(self):
        return f"<ExpenseLineItem(id={self.id}, description='{self.description}', amount={self.amount})>"
