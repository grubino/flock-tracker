"""add_category_to_expense_line_items

Revision ID: 7a0357e4b66b
Revises: 8418e9fb7f09
Create Date: 2025-10-03 16:13:37.707400

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a0357e4b66b'
down_revision: Union[str, None] = '8418e9fb7f09'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add category column to expense_line_items
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expensecategory') THEN
                CREATE TYPE expensecategory AS ENUM ('feed', 'seed', 'medication', 'veterinary', 'infrastructure', 'equipment', 'supplies', 'utilities', 'labor', 'maintenance', 'other');
            END IF;
        END $$;
    """)

    op.add_column('expense_line_items', sa.Column('category', sa.Enum('feed', 'seed', 'medication', 'veterinary', 'infrastructure', 'equipment', 'supplies', 'utilities', 'labor', 'maintenance', 'other', name='expensecategory'), nullable=True))
    op.create_index(op.f('ix_expense_line_items_category'), 'expense_line_items', ['category'], unique=False)


def downgrade() -> None:
    # Remove category column from expense_line_items
    op.drop_index(op.f('ix_expense_line_items_category'), table_name='expense_line_items')
    op.drop_column('expense_line_items', 'category')
