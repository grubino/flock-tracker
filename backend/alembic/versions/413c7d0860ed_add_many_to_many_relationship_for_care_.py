"""add many to many relationship for care schedules and animals

Revision ID: 413c7d0860ed
Revises: 11765d38a326
Create Date: 2025-12-04 22:04:19.697100

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '413c7d0860ed'
down_revision: Union[str, None] = '11765d38a326'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from sqlalchemy import inspect
    from alembic import context

    conn = context.get_bind()
    inspector = inspect(conn)
    tables = inspector.get_table_names()

    # Create the care_schedule_animals association table if it doesn't exist
    if 'care_schedule_animals' not in tables:
        op.create_table(
            'care_schedule_animals',
            sa.Column('care_schedule_id', sa.Integer(), nullable=False),
            sa.Column('animal_id', sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(['care_schedule_id'], ['care_schedules.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['animal_id'], ['animals.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('care_schedule_id', 'animal_id')
        )

    # Check if animal_id column still exists in care_schedules
    columns = [col['name'] for col in inspector.get_columns('care_schedules')]
    if 'animal_id' in columns:
        # Migrate existing data: copy animal_id values to the new association table
        # Only migrate rows where animal_id is not NULL
        op.execute("""
            INSERT INTO care_schedule_animals (care_schedule_id, animal_id)
            SELECT id, animal_id
            FROM care_schedules
            WHERE animal_id IS NOT NULL
        """)

        # Drop the old animal_id column from care_schedules using batch mode for SQLite
        with op.batch_alter_table('care_schedules') as batch_op:
            batch_op.drop_column('animal_id')


def downgrade() -> None:
    # Add back the animal_id column
    op.add_column('care_schedules', sa.Column('animal_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'care_schedules_animal_id_fkey',
        'care_schedules',
        'animals',
        ['animal_id'],
        ['id'],
        ondelete='CASCADE'
    )
    op.create_index('ix_care_schedules_animal_id', 'care_schedules', ['animal_id'])

    # Migrate data back: take the first animal from each schedule
    # This will lose information if a schedule has multiple animals
    op.execute("""
        UPDATE care_schedules
        SET animal_id = (
            SELECT animal_id
            FROM care_schedule_animals
            WHERE care_schedule_animals.care_schedule_id = care_schedules.id
            LIMIT 1
        )
        WHERE id IN (SELECT DISTINCT care_schedule_id FROM care_schedule_animals)
    """)

    # Drop the association table
    op.drop_table('care_schedule_animals')
