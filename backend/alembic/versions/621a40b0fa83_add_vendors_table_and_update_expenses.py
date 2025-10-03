"""add_vendors_table_and_update_expenses

Revision ID: 621a40b0fa83
Revises: c91767a5147b
Create Date: 2025-10-03 10:32:55.486095

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '621a40b0fa83'
down_revision: Union[str, None] = 'c91767a5147b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create vendors table
    op.create_table(
        'vendors',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('address', sa.String(), nullable=True),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('website', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_vendors_id', 'vendors', ['id'])
    op.create_index('ix_vendors_name', 'vendors', ['name'])

    # Update expenses table
    op.add_column('expenses', sa.Column('vendor_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_expenses_vendor_id', 'expenses', 'vendors', ['vendor_id'], ['id'])
    op.drop_column('expenses', 'vendor')


def downgrade() -> None:
    # Revert expenses table
    op.add_column('expenses', sa.Column('vendor', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.drop_constraint('fk_expenses_vendor_id', 'expenses', type_='foreignkey')
    op.drop_column('expenses', 'vendor_id')

    # Drop vendors table
    op.drop_index('ix_vendors_name', table_name='vendors')
    op.drop_index('ix_vendors_id', table_name='vendors')
    op.drop_table('vendors')
