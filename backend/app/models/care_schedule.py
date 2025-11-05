from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from ..database.database import Base


class CareType(str, enum.Enum):
    """Types of care tasks that can be scheduled"""
    FEEDING = "FEEDING"
    WATERING = "WATERING"
    DEWORMING = "DEWORMING"
    DELICING = "DELICING"
    VACCINATION = "VACCINATION"
    HEALTH_CHECK = "HEALTH_CHECK"
    HOOF_TRIM = "HOOF_TRIM"
    SHEARING = "SHEARING"
    GROOMING = "GROOMING"
    BREEDING_CHECK = "BREEDING_CHECK"
    MEDICATION = "MEDICATION"
    MITE_TREATMENT = "MITE_TREATMENT"
    CLEANING = "CLEANING"
    OTHER = "OTHER"


class RecurrenceType(str, enum.Enum):
    """Recurrence patterns for scheduled care"""
    ONCE = "ONCE"  # One-time task
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    BIWEEKLY = "BIWEEKLY"
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    YEARLY = "YEARLY"


class ScheduleStatus(str, enum.Enum):
    """Status of scheduled care"""
    ACTIVE = "ACTIVE"  # Schedule is active
    PAUSED = "PAUSED"  # Temporarily paused
    COMPLETED = "COMPLETED"  # For one-time tasks or ended recurring tasks
    CANCELLED = "CANCELLED"  # Cancelled schedule


class TaskStatus(str, enum.Enum):
    """Status of individual care tasks"""
    PENDING = "PENDING"
    OVERDUE = "OVERDUE"
    COMPLETED = "COMPLETED"
    SKIPPED = "SKIPPED"


class CareSchedule(Base):
    """
    Represents a scheduled care task for animals.
    Can be one-time or recurring.
    """
    __tablename__ = "care_schedules"

    id = Column(Integer, primary_key=True, index=True)

    # Care details
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    care_type = Column(SQLEnum(CareType), nullable=False, index=True)

    # Scheduling
    recurrence_type = Column(SQLEnum(RecurrenceType), nullable=False, default=RecurrenceType.ONCE)
    start_date = Column(DateTime, nullable=False, index=True)
    end_date = Column(DateTime, nullable=True)  # Optional, for recurring schedules
    next_due_date = Column(DateTime, nullable=False, index=True)  # Next occurrence

    # Recurrence details
    recurrence_interval = Column(Integer, default=1)  # e.g., every 2 weeks

    # Reminder settings
    reminder_enabled = Column(Boolean, default=True)
    reminder_days_before = Column(Integer, default=1)  # Days before to send reminder
    reminder_hours_before = Column(Integer, default=0)  # Additional hours

    # Status and priority
    status = Column(SQLEnum(ScheduleStatus), nullable=False, default=ScheduleStatus.ACTIVE, index=True)
    priority = Column(String(20), default="MEDIUM")  # LOW, MEDIUM, HIGH, URGENT

    # Relationships
    animal_id = Column(Integer, ForeignKey("animals.id", ondelete="CASCADE"), nullable=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Additional details
    notes = Column(Text, nullable=True)
    estimated_duration_minutes = Column(Integer, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    animal = relationship("Animal", back_populates="care_schedules", foreign_keys=[animal_id])
    location = relationship("Location", back_populates="care_schedules", foreign_keys=[location_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    completions = relationship("CareCompletion", back_populates="schedule", cascade="all, delete-orphan")


class CareCompletion(Base):
    """
    Tracks completion of scheduled care tasks.
    Each time a scheduled task is completed, a record is created here.
    """
    __tablename__ = "care_completions"

    id = Column(Integer, primary_key=True, index=True)

    # Link to schedule
    schedule_id = Column(Integer, ForeignKey("care_schedules.id", ondelete="CASCADE"), nullable=False, index=True)

    # Completion details
    scheduled_date = Column(DateTime, nullable=False)  # When it was supposed to happen
    completed_date = Column(DateTime, nullable=False, index=True)  # When it actually happened
    completed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Status and notes
    status = Column(SQLEnum(TaskStatus), nullable=False, default=TaskStatus.COMPLETED)
    notes = Column(Text, nullable=True)
    duration_minutes = Column(Integer, nullable=True)  # Actual duration

    # Optional link to related event (if an event was created for this)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="SET NULL"), nullable=True, index=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    schedule = relationship("CareSchedule", back_populates="completions")
    completed_by = relationship("User", foreign_keys=[completed_by_id])
    event = relationship("Event", foreign_keys=[event_id])
