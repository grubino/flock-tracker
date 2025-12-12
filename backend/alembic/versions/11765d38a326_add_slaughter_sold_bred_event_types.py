"""add_slaughter_sold_bred_event_types

Revision ID: 11765d38a326
Revises: 99e7061284c2
Create Date: 2025-11-29 11:44:35.813774

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = '11765d38a326'
down_revision: Union[str, None] = '99e7061284c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add new event types: slaughter, sold, bred"""

    # Get connection to check database type
    connection = op.get_bind()

    # Check if we're using PostgreSQL
    is_postgresql = connection.dialect.name == 'postgresql'

    if is_postgresql:
        # For PostgreSQL, add new values to the eventtype enum
        connection.execute(text("""
            DO $$
            BEGIN
                -- Add slaughter if it doesn't exist
                IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'slaughter' AND enumtypid = 'eventtype'::regtype) THEN
                    ALTER TYPE eventtype ADD VALUE 'slaughter';
                END IF;

                -- Add sold if it doesn't exist
                IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'sold' AND enumtypid = 'eventtype'::regtype) THEN
                    ALTER TYPE eventtype ADD VALUE 'sold';
                END IF;

                -- Add bred if it doesn't exist
                IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'bred' AND enumtypid = 'eventtype'::regtype) THEN
                    ALTER TYPE eventtype ADD VALUE 'bred';
                END IF;
            END $$;
        """))
    # For SQLite, enums are stored as strings, so no migration needed


def downgrade() -> None:
    """Remove new event types: slaughter, sold, bred"""

    # Note: PostgreSQL doesn't support removing enum values directly
    # You would need to recreate the enum type to remove values
    # For SQLite, no action needed

    # Get connection to check database type
    connection = op.get_bind()

    # Check if we're using PostgreSQL
    is_postgresql = connection.dialect.name == 'postgresql'

    if is_postgresql:
        # WARNING: Removing enum values in PostgreSQL requires recreating the type
        # This is only safe if no data uses these values
        # Consider deleting events with these types first:
        connection.execute(text("""
            DELETE FROM events WHERE event_type IN ('slaughter', 'sold', 'bred')
        """))

        # Note: Actually removing the enum values would require:
        # 1. Creating a new enum without these values
        # 2. Altering the column to use the new enum
        # 3. Dropping the old enum
        # This is complex and risky, so we just delete the data above
