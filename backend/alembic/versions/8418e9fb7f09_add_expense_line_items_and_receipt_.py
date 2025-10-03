"""add_expense_line_items_and_receipt_reference

Revision ID: 8418e9fb7f09
Revises: bf9ee8f40acf
Create Date: 2025-10-03 15:52:15.650175

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8418e9fb7f09'
down_revision: Union[str, None] = 'bf9ee8f40acf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add receipt_id to expenses
    op.add_column('expenses', sa.Column('receipt_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_expenses_receipt_id', 'expenses', 'receipts', ['receipt_id'], ['id'])

    # Remove expense_id from receipts (reverse relationship)
    op.drop_constraint('receipts_expense_id_fkey', 'receipts', type_='foreignkey')
    op.drop_column('receipts', 'expense_id')

    # Create expense_line_items table
    op.create_table(
        'expense_line_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('expense_id', sa.Integer(), nullable=False),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('quantity', sa.Numeric(10, 2), nullable=True),
        sa.Column('unit_price', sa.Numeric(10, 2), nullable=True),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.ForeignKeyConstraint(['expense_id'], ['expenses.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_expense_line_items_id'), 'expense_line_items', ['id'], unique=False)


def downgrade() -> None:
    # Drop expense_line_items table
    op.drop_index(op.f('ix_expense_line_items_id'), table_name='expense_line_items')
    op.drop_table('expense_line_items')

    # Restore expense_id to receipts
    op.add_column('receipts', sa.Column('expense_id', sa.Integer(), nullable=True))
    op.create_foreign_key('receipts_expense_id_fkey', 'receipts', 'expenses', ['expense_id'], ['id'])

    # Remove receipt_id from expenses
    op.drop_constraint('fk_expenses_receipt_id', 'expenses', type_='foreignkey')
    op.drop_column('expenses', 'receipt_id')
