from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from app.models.care_schedule import (
    CareType,
    RecurrenceType,
    ScheduleStatus,
    TaskStatus
)


# ============================================================================
# CareSchedule Schemas
# ============================================================================

class CareScheduleBase(BaseModel):
    """Base schema for care schedule"""
    title: str = Field(..., description="Title of the care task", max_length=200)
    description: Optional[str] = Field(None, description="Detailed description of the care task")
    care_type: CareType = Field(..., description="Type of care task")

    # Scheduling
    recurrence_type: RecurrenceType = Field(RecurrenceType.ONCE, description="How often the task recurs")
    start_date: datetime = Field(..., description="When the schedule starts")
    end_date: Optional[datetime] = Field(None, description="When the schedule ends (for recurring tasks)")
    next_due_date: datetime = Field(..., description="Next occurrence of this task")
    recurrence_interval: int = Field(1, description="Interval for recurrence (e.g., every 2 weeks)", ge=1)

    # Reminder settings
    reminder_enabled: bool = Field(True, description="Whether reminders are enabled")
    reminder_days_before: int = Field(1, description="Days before to send reminder", ge=0)
    reminder_hours_before: int = Field(0, description="Additional hours before to send reminder", ge=0)

    # Status and priority
    status: ScheduleStatus = Field(ScheduleStatus.ACTIVE, description="Current status of the schedule")
    priority: str = Field("MEDIUM", description="Priority level: LOW, MEDIUM, HIGH, URGENT")

    # Relationships
    animal_ids: List[int] = Field(default_factory=list, description="IDs of the animals this schedule is for")
    location_id: Optional[int] = Field(None, description="ID of the location this schedule is for")
    assigned_to_id: Optional[int] = Field(None, description="ID of the user assigned to this task")

    # Additional details
    notes: Optional[str] = Field(None, description="Additional notes or instructions")
    estimated_duration_minutes: Optional[int] = Field(None, description="Estimated duration in minutes", ge=0)


class CareScheduleCreate(BaseModel):
    """Schema for creating a new care schedule"""
    title: str = Field(..., description="Title of the care task", max_length=200)
    description: Optional[str] = Field(None, description="Detailed description of the care task")
    care_type: CareType = Field(..., description="Type of care task")

    # Scheduling
    recurrence_type: RecurrenceType = Field(RecurrenceType.ONCE, description="How often the task recurs")
    start_date: datetime = Field(..., description="When the schedule starts")
    end_date: Optional[datetime] = Field(None, description="When the schedule ends (for recurring tasks)")
    recurrence_interval: int = Field(1, description="Interval for recurrence", ge=1)

    # Reminder settings
    reminder_enabled: bool = Field(True, description="Whether reminders are enabled")
    reminder_days_before: int = Field(1, description="Days before to send reminder", ge=0)
    reminder_hours_before: int = Field(0, description="Additional hours before to send reminder", ge=0)

    # Status and priority
    status: Optional[ScheduleStatus] = Field(ScheduleStatus.ACTIVE, description="Current status of the schedule")
    priority: str = Field("MEDIUM", description="Priority level")

    # Relationships
    animal_ids: List[int] = Field(default_factory=list, description="IDs of the animals")
    location_id: Optional[int] = Field(None, description="ID of the location")
    assigned_to_id: Optional[int] = Field(None, description="ID of the user assigned")

    # Additional details
    notes: Optional[str] = Field(None, description="Additional notes")
    estimated_duration_minutes: Optional[int] = Field(None, description="Estimated duration in minutes", ge=0)


class CareScheduleUpdate(BaseModel):
    """Schema for updating an existing care schedule"""
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    care_type: Optional[CareType] = None

    # Scheduling
    recurrence_type: Optional[RecurrenceType] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    next_due_date: Optional[datetime] = None
    recurrence_interval: Optional[int] = Field(None, ge=1)

    # Reminder settings
    reminder_enabled: Optional[bool] = None
    reminder_days_before: Optional[int] = Field(None, ge=0)
    reminder_hours_before: Optional[int] = Field(None, ge=0)

    # Status and priority
    status: Optional[ScheduleStatus] = None
    priority: Optional[str] = None

    # Relationships
    animal_ids: Optional[List[int]] = None
    location_id: Optional[int] = None
    assigned_to_id: Optional[int] = None

    # Additional details
    notes: Optional[str] = None
    estimated_duration_minutes: Optional[int] = Field(None, ge=0)


class CareSchedule(CareScheduleBase):
    """Schema for returning care schedule data"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by_id: Optional[int]
    created_at: datetime
    updated_at: datetime


class CareScheduleBrief(BaseModel):
    """Brief schema for care schedule (for lists/references)"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    care_type: CareType
    recurrence_type: RecurrenceType
    next_due_date: datetime
    status: ScheduleStatus
    priority: str


class CareScheduleWithDetails(CareSchedule):
    """Schema for care schedule with related entities"""
    # This can be extended to include animal, location, assigned_to details
    # completions: Optional[List["CareCompletion"]] = None
    pass


# ============================================================================
# CareCompletion Schemas
# ============================================================================

class CareCompletionBase(BaseModel):
    """Base schema for care completion"""
    schedule_id: int = Field(..., description="ID of the care schedule")
    scheduled_date: datetime = Field(..., description="When it was supposed to happen")
    completed_date: datetime = Field(..., description="When it actually happened")
    status: TaskStatus = Field(TaskStatus.COMPLETED, description="Status of the task")
    notes: Optional[str] = Field(None, description="Notes about the completion")
    duration_minutes: Optional[int] = Field(None, description="Actual duration in minutes", ge=0)
    event_id: Optional[int] = Field(None, description="Related event ID if applicable")


class CareCompletionCreate(BaseModel):
    """Schema for creating a new care completion"""
    schedule_id: int = Field(..., description="ID of the care schedule")
    scheduled_date: datetime = Field(..., description="When it was supposed to happen")
    completed_date: datetime = Field(..., description="When it actually happened")
    status: TaskStatus = Field(TaskStatus.COMPLETED, description="Status of the task")
    notes: Optional[str] = Field(None, description="Notes about the completion")
    duration_minutes: Optional[int] = Field(None, description="Actual duration in minutes", ge=0)
    event_id: Optional[int] = Field(None, description="Related event ID if applicable")


class CareCompletionUpdate(BaseModel):
    """Schema for updating a care completion"""
    completed_date: Optional[datetime] = None
    status: Optional[TaskStatus] = None
    notes: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, ge=0)
    event_id: Optional[int] = None


class CareCompletion(CareCompletionBase):
    """Schema for returning care completion data"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    completed_by_id: Optional[int]
    created_at: datetime
    updated_at: datetime


class CareCompletionWithSchedule(CareCompletion):
    """Schema for care completion with schedule information"""
    schedule: Optional[CareScheduleBrief] = None


# ============================================================================
# Task/Reminder Schemas
# ============================================================================

class UpcomingTask(BaseModel):
    """Schema for upcoming care tasks (for dashboard/reminders)"""
    model_config = ConfigDict(from_attributes=True)

    schedule_id: int
    title: str
    care_type: CareType
    due_date: datetime
    priority: str
    animal_ids: List[int] = Field(default_factory=list, description="IDs of animals for this task")
    location_id: Optional[int]
    assigned_to_id: Optional[int]
    status: str
    days_until_due: int


class TaskSummary(BaseModel):
    """Summary of tasks by status"""
    pending_count: int
    overdue_count: int
    completed_today_count: int
    upcoming_7_days_count: int
