from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List

from app.database.database import get_db
from app.models.user import User, UserRole
from app.schemas.admin import UpdateUserRole, ResetUserPassword, AdminUserResponse
from app.services.auth import require_admin, get_password_hash

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
    responses={403: {"description": "Not authorized"}},
)


@router.get("/users", response_model=List[AdminUserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List all users (admin only)"""
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.get("/users/{user_id}", response_model=AdminUserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get a specific user by ID (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.patch("/users/{user_id}/role", response_model=AdminUserResponse)
async def update_user_role(
    user_id: int,
    role_update: UpdateUserRole,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update a user's role (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent admin from removing their own admin role
    if user.id == current_user.id and role_update.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove your own admin role"
        )

    user.role = role_update.role
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/reset-password", response_model=AdminUserResponse)
async def reset_user_password(
    user_id: int,
    password_reset: ResetUserPassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Reset a user's password (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Only allow password reset for local users
    if user.provider != "local":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reset password for {user.provider} users"
        )

    user.hashed_password = get_password_hash(password_reset.new_password)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/activate", response_model=AdminUserResponse)
async def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Activate a user (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    user.is_active = True
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/deactivate", response_model=AdminUserResponse)
async def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Deactivate a user (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent admin from deactivating themselves
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )

    user.is_active = False
    db.commit()
    db.refresh(user)
    return user


@router.post("/fix-expense-categories")
def fix_expense_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Fix any invalid expense category values in the database"""

    # Valid enum values (uppercase as defined in database)
    valid_categories = ['FEED', 'SEED', 'MEDICATION', 'VETERINARY', 'INFRASTRUCTURE',
                       'EQUIPMENT', 'SUPPLIES', 'UTILITIES', 'LABOR', 'MAINTENANCE', 'OTHER']

    # Check for invalid categories
    result = db.execute(text("""
        SELECT id, category FROM expenses
        WHERE category NOT IN ('FEED', 'SEED', 'MEDICATION', 'VETERINARY', 'INFRASTRUCTURE',
                              'EQUIPMENT', 'SUPPLIES', 'UTILITIES', 'LABOR', 'MAINTENANCE', 'OTHER')
    """))
    invalid_expenses = list(result)

    if invalid_expenses:
        # Fix them
        for expense_id, category in invalid_expenses:
            db.execute(
                text('UPDATE expenses SET category = :new_cat WHERE id = :id'),
                {'new_cat': 'OTHER', 'id': expense_id}
            )

        db.commit()
        return {
            "fixed": len(invalid_expenses),
            "expenses": [{"id": e[0], "old_category": e[1]} for e in invalid_expenses]
        }
    else:
        return {"fixed": 0, "message": "No invalid categories found"}


@router.get("/check-expense-categories")
def check_expense_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Check all expense categories in the database"""

    result = db.execute(text("SELECT DISTINCT category FROM expenses ORDER BY category"))
    categories = [row[0] for row in result]

    valid_categories = ['FEED', 'SEED', 'MEDICATION', 'VETERINARY', 'INFRASTRUCTURE',
                       'EQUIPMENT', 'SUPPLIES', 'UTILITIES', 'LABOR', 'MAINTENANCE', 'OTHER']

    return {
        "categories_in_db": categories,
        "invalid_categories": [c for c in categories if c not in valid_categories]
    }
