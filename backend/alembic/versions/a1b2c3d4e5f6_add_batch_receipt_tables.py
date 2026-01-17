"""add_batch_receipt_tables

Revision ID: a1b2c3d4e5f6
Revises: f8c9d3e2a4b1
Create Date: 2026-01-06 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f8c9d3e2a4b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create batch_receipt_uploads table
    op.create_table(
        'batch_receipt_uploads',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('batch_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('total_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('processed_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('success_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('error_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('ocr_engine', sa.String(), nullable=False, server_default='tesseract'),
        sa.Column('status', sa.String(length=10), nullable=False, server_default='PENDING'),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('batch_id')
    )
    op.create_index(op.f('ix_batch_receipt_uploads_id'), 'batch_receipt_uploads', ['id'], unique=False)
    op.create_index(op.f('ix_batch_receipt_uploads_batch_id'), 'batch_receipt_uploads', ['batch_id'], unique=True)
    op.create_index(op.f('ix_batch_receipt_uploads_status'), 'batch_receipt_uploads', ['status'], unique=False)

    # Create batch_receipt_items table
    op.create_table(
        'batch_receipt_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('batch_upload_id', sa.Integer(), nullable=False),
        sa.Column('receipt_id', sa.Integer(), nullable=True),
        sa.Column('expense_id', sa.Integer(), nullable=True),
        sa.Column('filename', sa.String(), nullable=False),
        sa.Column('status', sa.String(length=10), nullable=False, server_default='PENDING'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('ocr_attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('llm_attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['batch_upload_id'], ['batch_receipt_uploads.id'], ),
        sa.ForeignKeyConstraint(['receipt_id'], ['receipts.id'], ),
        sa.ForeignKeyConstraint(['expense_id'], ['expenses.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_batch_receipt_items_id'), 'batch_receipt_items', ['id'], unique=False)
    op.create_index(op.f('ix_batch_receipt_items_status'), 'batch_receipt_items', ['status'], unique=False)


def downgrade() -> None:
    # Drop batch_receipt_items table
    op.drop_index(op.f('ix_batch_receipt_items_status'), table_name='batch_receipt_items')
    op.drop_index(op.f('ix_batch_receipt_items_id'), table_name='batch_receipt_items')
    op.drop_table('batch_receipt_items')

    # Drop batch_receipt_uploads table
    op.drop_index(op.f('ix_batch_receipt_uploads_status'), table_name='batch_receipt_uploads')
    op.drop_index(op.f('ix_batch_receipt_uploads_batch_id'), table_name='batch_receipt_uploads')
    op.drop_index(op.f('ix_batch_receipt_uploads_id'), table_name='batch_receipt_uploads')
    op.drop_table('batch_receipt_uploads')
