from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database.database import get_db
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse
from app.models.expense import Expense, ExpenseCategory
from app.models.expense_line_item import ExpenseLineItem
from app.services.auth import get_current_active_user, require_user
from app.models.user import User

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.get("", response_model=List[ExpenseResponse])
def list_expenses(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    category: Optional[ExpenseCategory] = Query(None, description="Filter by expense category"),
    start_date: Optional[datetime] = Query(None, description="Filter expenses from this date"),
    end_date: Optional[datetime] = Query(None, description="Filter expenses until this date"),
    vendor: Optional[str] = Query(None, description="Filter by vendor name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all expenses with optional filtering"""
    query = db.query(Expense)

    if category:
        query = query.filter(Expense.category == category)
    if start_date:
        query = query.filter(Expense.expense_date >= start_date)
    if end_date:
        query = query.filter(Expense.expense_date <= end_date)
    if vendor:
        query = query.filter(Expense.vendor.ilike(f"%{vendor}%"))

    query = query.order_by(Expense.expense_date.desc())
    expenses = query.offset(skip).limit(limit).all()
    return expenses


@router.post("", response_model=ExpenseResponse)
def create_expense(
    expense: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
):
    """Create a new expense with optional line items"""
    # Extract line items before creating expense
    line_items_data = expense.line_items
    expense_data = expense.model_dump(exclude={'line_items'})

    # Create expense
    db_expense = Expense(**expense_data)
    db.add(db_expense)
    db.flush()  # Flush to get the expense ID

    # Create line items
    if line_items_data:
        for item_data in line_items_data:
            db_line_item = ExpenseLineItem(**item_data.model_dump(), expense_id=db_expense.id)
            db.add(db_line_item)

    db.commit()
    db.refresh(db_expense)
    return db_expense


@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific expense by ID"""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: int,
    expense_update: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
):
    """Update an existing expense and its line items"""
    db_expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    update_data = expense_update.model_dump(exclude_unset=True, exclude={'line_items'})
    for field, value in update_data.items():
        setattr(db_expense, field, value)

    # Update line items if provided
    if expense_update.line_items is not None:
        # Delete existing line items
        db.query(ExpenseLineItem).filter(ExpenseLineItem.expense_id == expense_id).delete()

        # Add new line items
        for item_data in expense_update.line_items:
            db_line_item = ExpenseLineItem(**item_data.model_dump(), expense_id=expense_id)
            db.add(db_line_item)

    db.commit()
    db.refresh(db_expense)
    return db_expense


@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
):
    """Delete an expense"""
    db_expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    db.delete(db_expense)
    db.commit()
    return {"message": "Expense deleted successfully"}
