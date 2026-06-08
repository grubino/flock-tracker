"""add_necropsy_reports_table

Revision ID: c3f1a2b4d5e6
Revises: 7d1e9b35452c
Create Date: 2026-04-14 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3f1a2b4d5e6'
down_revision: Union[str, None] = '7d1e9b35452c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'necropsy_reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('event_id', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(), nullable=False),
        sa.Column('original_filename', sa.String(), nullable=False),
        sa.Column('file_path', sa.String(), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['event_id'], ['events.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_necropsy_reports_id'), 'necropsy_reports', ['id'], unique=False)
    op.create_index(op.f('ix_necropsy_reports_event_id'), 'necropsy_reports', ['event_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_necropsy_reports_event_id'), table_name='necropsy_reports')
    op.drop_index(op.f('ix_necropsy_reports_id'), table_name='necropsy_reports')
    op.drop_table('necropsy_reports')
