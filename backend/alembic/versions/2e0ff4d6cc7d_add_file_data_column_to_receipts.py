"""add file_data column to receipts

Revision ID: 2e0ff4d6cc7d
Revises: 7a0357e4b66b
Create Date: 2025-10-04 18:23:38.771731

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2e0ff4d6cc7d'
down_revision: Union[str, None] = '7a0357e4b66b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add file_data column to store image binary data
    op.add_column('receipts', sa.Column('file_data', sa.LargeBinary(), nullable=True))

    # Make file_path nullable (keeping for backwards compatibility)
    op.alter_column('receipts', 'file_path', nullable=True)


def downgrade() -> None:
    # Remove file_data column
    op.drop_column('receipts', 'file_data')

    # Restore file_path to non-nullable
    op.alter_column('receipts', 'file_path', nullable=False)
