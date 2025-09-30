"""Add role column to users table for fresh databases

Revision ID: 001_initial_role
Revises: 5ea0f857da65
Create Date: 2025-09-29 20:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision: str = '001_initial_role'
down_revision: Union[str, None] = '5ea0f857da65'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add role column to users table if it doesn't exist"""

    # Get connection to check database type
    connection = op.get_bind()

    # Check if we're using PostgreSQL or SQLite
    is_postgresql = connection.dialect.name == 'postgresql'

    if is_postgresql:
        # For PostgreSQL, create enum type first
        connection.execute(text("""
            DO $$
            BEGIN
                -- Create enum type if it doesn't exist
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
                    CREATE TYPE userrole AS ENUM ('customer', 'user', 'admin');
                END IF;

                -- Add column if it doesn't exist
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'users' AND column_name = 'role'
                ) THEN
                    ALTER TABLE users ADD COLUMN role userrole NOT NULL DEFAULT 'customer';
                END IF;
            END $$;
        """))
    else:
        # For SQLite and other databases
        # Check if column exists first
        try:
            connection.execute(text("SELECT role FROM users LIMIT 1"))
            # Column exists, no need to add it
        except:
            # Column doesn't exist, add it
            op.add_column('users', sa.Column('role', sa.String(20), nullable=False, server_default='customer'))

    # Update existing users with appropriate roles
    # This will work whether the column was just added or already existed
    connection.execute(text("""
        UPDATE users
        SET role = 'admin'
        WHERE email = 'admin@flocktracker.com'
           OR email = 'admin@flocktracker.local'
    """))

    # Update admin@flocktracker.local to admin@flocktracker.com if it exists
    connection.execute(text("""
        UPDATE users
        SET email = 'admin@flocktracker.com'
        WHERE email = 'admin@flocktracker.local'
    """))

    # Set remaining users to 'user' role (exclude admin)
    connection.execute(text("""
        UPDATE users
        SET role = 'user'
        WHERE role = 'customer' AND email != 'admin@flocktracker.com'
    """))


def downgrade() -> None:
    """Remove role column from users table"""

    connection = op.get_bind()
    is_postgresql = connection.dialect.name == 'postgresql'

    # Drop the column
    op.drop_column('users', 'role')

    if is_postgresql:
        # Drop the enum type
        connection.execute(text("DROP TYPE IF EXISTS userrole"))