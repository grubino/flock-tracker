#!/usr/bin/env python3
"""
Script to reset admin user password
Run this script to set a new password for admin@flocktracker.local
"""

import getpass
import sys
from app.database.database import SessionLocal
from app.models.user import User
from app.services.auth import get_password_hash
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def reset_admin_password():
    """Reset the admin user password"""

    db = SessionLocal()
    try:
        # Find the admin user
        admin_user = db.query(User).filter(User.email == 'admin@flocktracker.com').first()

        if not admin_user:
            logger.error("Admin user not found!")
            return False

        # Get new password from user input
        print("Resetting password for admin@flocktracker.com")
        new_password = getpass.getpass("Enter new password: ")
        confirm_password = getpass.getpass("Confirm new password: ")

        if new_password != confirm_password:
            logger.error("Passwords do not match!")
            return False

        if len(new_password) < 8:
            logger.error("Password must be at least 8 characters long!")
            return False

        # Hash the new password
        hashed_password = get_password_hash(new_password)

        # Update the admin user
        admin_user.hashed_password = hashed_password

        db.commit()
        logger.info("Admin password updated successfully!")

        # Test the new password
        from app.services.auth import authenticate_user
        test_user = authenticate_user(db, 'admin@flocktracker.com', new_password)
        if test_user:
            logger.info("Password verification test: SUCCESS")
        else:
            logger.error("Password verification test: FAILED")

        return True

    except Exception as e:
        logger.error(f"Failed to reset password: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def reset_admin_password_with_value(password: str):
    """Reset admin password with a specific value (for scripting)"""

    if len(password) < 8:
        logger.error("Password must be at least 8 characters long!")
        return False

    db = SessionLocal()
    try:
        # Find the admin user
        admin_user = db.query(User).filter(User.email == 'admin@flocktracker.com').first()

        if not admin_user:
            logger.error("Admin user not found!")
            return False

        # Hash the new password
        hashed_password = get_password_hash(password)

        # Update the admin user
        admin_user.hashed_password = hashed_password

        db.commit()
        logger.info("Admin password updated successfully!")
        return True

    except Exception as e:
        logger.error(f"Failed to reset password: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Password provided as command line argument
        password = sys.argv[1]
        success = reset_admin_password_with_value(password)
    else:
        # Interactive mode
        success = reset_admin_password()

    sys.exit(0 if success else 1)