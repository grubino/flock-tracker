"""add_animal_breed_components

Revision ID: d7e8f9a0b1c2
Revises: c3f1a2b4d5e6
Create Date: 2026-06-08 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'd7e8f9a0b1c2'
down_revision: Union[str, None] = 'c3f1a2b4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'animal_breed_components',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('animal_id', sa.Integer(), nullable=False),
        sa.Column('breed_name', sa.String(), nullable=False),
        sa.Column('percentage', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['animal_id'], ['animals.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_animal_breed_components_id'), 'animal_breed_components', ['id'], unique=False)
    op.create_index(op.f('ix_animal_breed_components_animal_id'), 'animal_breed_components', ['animal_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_animal_breed_components_animal_id'), table_name='animal_breed_components')
    op.drop_index(op.f('ix_animal_breed_components_id'), table_name='animal_breed_components')
    op.drop_table('animal_breed_components')
