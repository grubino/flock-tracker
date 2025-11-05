"""Add care_schedules and care_completions tables

Revision ID: f8c9d3e2a4b1
Revises: b47e4346b20c
Create Date: 2025-11-05 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f8c9d3e2a4b1'
down_revision: Union[str, None] = 'b47e4346b20c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create care_schedules table
    op.create_table(
        'care_schedules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('care_type', sa.Enum(
            'FEEDING', 'WATERING', 'DEWORMING', 'DELICING', 'VACCINATION',
            'HEALTH_CHECK', 'HOOF_TRIM', 'SHEARING', 'GROOMING',
            'BREEDING_CHECK', 'MEDICATION', 'MITE_TREATMENT', 'CLEANING', 'OTHER',
            name='caretype'
        ), nullable=False),
        sa.Column('recurrence_type', sa.Enum(
            'ONCE', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY',
            name='recurrencetype'
        ), nullable=False),
        sa.Column('start_date', sa.DateTime(), nullable=False),
        sa.Column('end_date', sa.DateTime(), nullable=True),
        sa.Column('next_due_date', sa.DateTime(), nullable=False),
        sa.Column('recurrence_interval', sa.Integer(), nullable=True),
        sa.Column('reminder_enabled', sa.Boolean(), nullable=True),
        sa.Column('reminder_days_before', sa.Integer(), nullable=True),
        sa.Column('reminder_hours_before', sa.Integer(), nullable=True),
        sa.Column('status', sa.Enum(
            'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED',
            name='schedulestatus'
        ), nullable=False),
        sa.Column('priority', sa.String(length=20), nullable=True),
        sa.Column('animal_id', sa.Integer(), nullable=True),
        sa.Column('location_id', sa.Integer(), nullable=True),
        sa.Column('assigned_to_id', sa.Integer(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('estimated_duration_minutes', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['animal_id'], ['animals.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_care_schedules_id'), 'care_schedules', ['id'], unique=False)
    op.create_index(op.f('ix_care_schedules_title'), 'care_schedules', ['title'], unique=False)
    op.create_index(op.f('ix_care_schedules_care_type'), 'care_schedules', ['care_type'], unique=False)
    op.create_index(op.f('ix_care_schedules_start_date'), 'care_schedules', ['start_date'], unique=False)
    op.create_index(op.f('ix_care_schedules_next_due_date'), 'care_schedules', ['next_due_date'], unique=False)
    op.create_index(op.f('ix_care_schedules_status'), 'care_schedules', ['status'], unique=False)
    op.create_index(op.f('ix_care_schedules_animal_id'), 'care_schedules', ['animal_id'], unique=False)
    op.create_index(op.f('ix_care_schedules_location_id'), 'care_schedules', ['location_id'], unique=False)
    op.create_index(op.f('ix_care_schedules_assigned_to_id'), 'care_schedules', ['assigned_to_id'], unique=False)

    # Create care_completions table
    op.create_table(
        'care_completions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('schedule_id', sa.Integer(), nullable=False),
        sa.Column('scheduled_date', sa.DateTime(), nullable=False),
        sa.Column('completed_date', sa.DateTime(), nullable=False),
        sa.Column('completed_by_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.Enum(
            'PENDING', 'OVERDUE', 'COMPLETED', 'SKIPPED',
            name='taskstatus'
        ), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=True),
        sa.Column('event_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['schedule_id'], ['care_schedules.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['completed_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['event_id'], ['events.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_care_completions_id'), 'care_completions', ['id'], unique=False)
    op.create_index(op.f('ix_care_completions_schedule_id'), 'care_completions', ['schedule_id'], unique=False)
    op.create_index(op.f('ix_care_completions_completed_date'), 'care_completions', ['completed_date'], unique=False)
    op.create_index(op.f('ix_care_completions_event_id'), 'care_completions', ['event_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_care_completions_event_id'), table_name='care_completions')
    op.drop_index(op.f('ix_care_completions_completed_date'), table_name='care_completions')
    op.drop_index(op.f('ix_care_completions_schedule_id'), table_name='care_completions')
    op.drop_index(op.f('ix_care_completions_id'), table_name='care_completions')
    op.drop_table('care_completions')

    op.drop_index(op.f('ix_care_schedules_assigned_to_id'), table_name='care_schedules')
    op.drop_index(op.f('ix_care_schedules_location_id'), table_name='care_schedules')
    op.drop_index(op.f('ix_care_schedules_animal_id'), table_name='care_schedules')
    op.drop_index(op.f('ix_care_schedules_status'), table_name='care_schedules')
    op.drop_index(op.f('ix_care_schedules_next_due_date'), table_name='care_schedules')
    op.drop_index(op.f('ix_care_schedules_start_date'), table_name='care_schedules')
    op.drop_index(op.f('ix_care_schedules_care_type'), table_name='care_schedules')
    op.drop_index(op.f('ix_care_schedules_title'), table_name='care_schedules')
    op.drop_index(op.f('ix_care_schedules_id'), table_name='care_schedules')
    op.drop_table('care_schedules')
