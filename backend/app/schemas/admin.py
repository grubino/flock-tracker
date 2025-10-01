from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.user import UserRole


class UpdateUserRole(BaseModel):
    role: UserRole


class ResetUserPassword(BaseModel):
    new_password: str


class AdminUserResponse(BaseModel):
    id: int
    email: EmailStr
    name: str
    role: UserRole
    provider: str
    is_active: bool
    is_verified: bool

    class Config:
        from_attributes = True
