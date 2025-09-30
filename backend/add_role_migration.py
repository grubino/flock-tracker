#!/usr/bin/env python3
"""
Migration script to add role column to users table
Run this once to update existing database schema
"""

from sqlalchemy import text
from app.database.database import engine, SessionLocal
from app.models.user import UserRole
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_add_role():
    """Add role column to users table and set default values"""

    with engine.connect() as connection:
        try:
            # Check if role column already exists (SQLite compatible)
            result = connection.execute(text("PRAGMA table_info(users)"))
            columns = [row[1] for row in result.fetchall()]
            if 'role' in columns:
                logger.info("Role column already exists, skipping migration")
                return

            # Add role column with default value
            logger.info("Adding role column to users table...")
            connection.execute(text(
                "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'customer'"
            ))

            # Update existing users
            # Set first user as admin if no admin exists
            result = connection.execute(text("SELECT COUNT(*) FROM users"))
            user_count = result.fetchone()[0]

            if user_count > 0:
                # Check if there's an admin user
                result = connection.execute(text("SELECT email FROM users WHERE email = 'admin@flocktracker.com'"))
                admin_exists = result.fetchone()

                if admin_exists:
                    # Set admin role for admin user
                    connection.execute(text(
                        "UPDATE users SET role = :admin_role WHERE email = 'admin@flocktracker.com'"
                    ), {"admin_role": UserRole.admin.value})
                    logger.info("Set admin role for admin@flocktracker.com")
                else:
                    # Set first user as admin
                    result = connection.execute(text("SELECT id FROM users ORDER BY id LIMIT 1"))
                    first_user_id = result.fetchone()[0]
                    connection.execute(text(
                        "UPDATE users SET role = :admin_role WHERE id = :user_id"
                    ), {"admin_role": UserRole.admin.value, "user_id": first_user_id})
                    logger.info(f"Set first user (ID: {first_user_id}) as admin")

                # Set remaining users as 'user' role
                connection.execute(text(
                    "UPDATE users SET role = :user_role WHERE role = 'customer' AND email != 'admin@flocktracker.com'"
                ), {"user_role": UserRole.user.value})
                logger.info("Updated remaining users to 'user' role")

            connection.commit()
            logger.info("Migration completed successfully!")

        except Exception as e:
            connection.rollback()
            logger.error(f"Migration failed: {e}")
            raise

if __name__ == "__main__":
    migrate_add_role()