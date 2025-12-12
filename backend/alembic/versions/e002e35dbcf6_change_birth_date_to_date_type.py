"""change_birth_date_to_date_type

Revision ID: e002e35dbcf6
Revises: 413c7d0860ed
Create Date: 2025-12-11 12:07:37.256726

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = 'e002e35dbcf6'
down_revision: Union[str, None] = '413c7d0860ed'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Change birth_date column type from DateTime to Date
    # Using batch operations for SQLite compatibility
    # Note: This migration assumes birth_date values are either NULL or already in proper date format
    with op.batch_alter_table('animals', schema=None) as batch_op:
        batch_op.alter_column('birth_date',
                              existing_type=sa.DateTime(),
                              type_=sa.Date(),
                              existing_nullable=True)


def downgrade() -> None:
    # Revert birth_date column type from Date back to DateTime
    with op.batch_alter_table('animals', schema=None) as batch_op:
        batch_op.alter_column('birth_date',
                              existing_type=sa.Date(),
                              type_=sa.DateTime(),
                              existing_nullable=True)
