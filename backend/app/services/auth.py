from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
import logging

from app.config import settings
from app.database.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import TokenData

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = settings.secret_key if hasattr(settings, 'secret_key') else "your-secret-key-change-this-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Security scheme
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str, credentials_exception):
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        role_str: str = payload.get("role")
        if email is None:
            raise credentials_exception

        role = None
        if role_str:
            try:
                role = UserRole(role_str)
            except ValueError:
                role = UserRole.customer  # Default fallback

        token_data = TokenData(email=email, role=role)
    except JWTError:
        raise credentials_exception
    return token_data


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get a user by email"""
    return db.query(User).filter(User.email == email).first()


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Authenticate a user with email and password"""
    logger.debug(f"Authenticating user: {email}")

    user = get_user_by_email(db, email)
    if not user:
        logger.debug(f"User not found: {email}")
        return None
    if not user.hashed_password:  # OAuth user trying to login with password
        logger.debug(f"User {email} has no password (OAuth user)")
        return None
    if not verify_password(password, user.hashed_password):
        logger.debug(f"Invalid password for user: {email}")
        return None

    logger.debug(f"User authenticated successfully: {email}")
    return user


def create_user(db: Session, email: str, name: str, password: str, role: UserRole = UserRole.customer) -> User:
    """Create a new user with email and password"""
    # Check if user already exists
    existing_user = get_user_by_email(db, email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create new user
    hashed_password = get_password_hash(password)
    db_user = User(
        email=email,
        name=name,
        hashed_password=hashed_password,
        provider="local",
        role=role,
        is_active=True,
        is_verified=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def create_admin_user(db: Session, password: str) -> Optional[User]:
    """Create an admin user with username 'admin' if it doesn't exist"""
    admin_email = "admin@flocktracker.com"
    admin_name = "Administrator"

    # Check if admin user already exists
    existing_admin = get_user_by_email(db, admin_email)
    if existing_admin:
        return existing_admin

    # Create admin user
    try:
        hashed_password = get_password_hash(password)
        admin_user = User(
            email=admin_email,
            name=admin_name,
            hashed_password=hashed_password,
            provider="local",
            role=UserRole.admin,
            is_active=True,
            is_verified=True  # Admin is pre-verified
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        return admin_user
    except Exception as e:
        db.rollback()
        raise e


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get the current authenticated user"""
    logger.debug("Verifying user credentials from token")

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        token_data = verify_token(credentials.credentials, credentials_exception)
        logger.debug(f"Token validated for user: {token_data.email}")
    except Exception as e:
        logger.warning(f"Token validation failed: {e}")
        raise

    user = get_user_by_email(db, email=token_data.email)
    if user is None:
        logger.warning(f"User not found for validated token: {token_data.email}")
        raise credentials_exception

    logger.debug(f"Current user retrieved: {user.email}")
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get the current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def require_role(required_role: UserRole):
    """Dependency factory that creates a role-checking dependency"""
    async def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role != required_role and current_user.role != UserRole.admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {required_role.value}"
            )
        return current_user
    return role_checker


def require_min_role(min_role: UserRole):
    """Dependency factory that creates a minimum role-checking dependency"""
    role_hierarchy = {
        UserRole.customer: 0,
        UserRole.user: 1,
        UserRole.admin: 2
    }

    async def min_role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if role_hierarchy.get(current_user.role, 0) < role_hierarchy.get(min_role, 0):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Minimum required role: {min_role.value}"
            )
        return current_user
    return min_role_checker


# Common role dependencies
require_admin = require_role(UserRole.admin)
require_user = require_min_role(UserRole.user)
require_admin_or_user = require_min_role(UserRole.user)