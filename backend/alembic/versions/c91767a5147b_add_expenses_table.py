"""add_expenses_table

Revision ID: c91767a5147b
Revises: b47e4346b20c
Create Date: 2025-10-03 09:51:08.856757

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c91767a5147b'
down_revision: Union[str, None] = 'b47e4346b20c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create expense category enum
    expense_category = postgresql.ENUM(
        'FEED', 'SEED', 'MEDICATION', 'VETERINARY', 'INFRASTRUCTURE',
        'EQUIPMENT', 'SUPPLIES', 'UTILITIES', 'LABOR', 'MAINTENANCE', 'OTHER',
        name='expensecategory'
    )
    expense_category.create(op.get_bind(), checkfirst=True)

    # Create expenses table
    op.create_table(
        'expenses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('category', postgresql.ENUM(
            'FEED', 'SEED', 'MEDICATION', 'VETERINARY', 'INFRASTRUCTURE',
            'EQUIPMENT', 'SUPPLIES', 'UTILITIES', 'LABOR', 'MAINTENANCE', 'OTHER',
            name='expensecategory', create_type=False
        ), nullable=False),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('expense_date', sa.DateTime(), nullable=False),
        sa.Column('vendor', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_expenses_category', 'expenses', ['category'])
    op.create_index('ix_expenses_expense_date', 'expenses', ['expense_date'])
    op.create_index('ix_expenses_id', 'expenses', ['id'])


def downgrade() -> None:
    op.drop_index('ix_expenses_id', table_name='expenses')
    op.drop_index('ix_expenses_expense_date', table_name='expenses')
    op.drop_index('ix_expenses_category', table_name='expenses')
    op.drop_table('expenses')
    sa.Enum(name='expensecategory').drop(op.get_bind(), checkfirst=True)
