from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from app.database.database import Base


class UserRole(str, Enum):
    customer = "customer"
    user = "user"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=True)  # Nullable for OAuth users
    picture = Column(String, nullable=True)
    provider = Column(String, default="local")  # local, google, auth0
    provider_id = Column(String, nullable=True)  # ID from OAuth provider
    role = Column(SQLEnum(UserRole), default=UserRole.customer, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    products = relationship("Product", back_populates="created_by")
    orders = relationship("Order", back_populates="customer")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', name='{self.name}')>"