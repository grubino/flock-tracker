from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database.database import get_db
from app.schemas.care_schedule import (
    CareSchedule,
    CareScheduleCreate,
    CareScheduleUpdate,
    CareScheduleBrief,
    CareCompletion,
    CareCompletionCreate,
    CareCompletionUpdate,
    UpcomingTask,
    TaskSummary
)
from app.services.care_schedule_service import CareScheduleService
from app.models.care_schedule import CareType, ScheduleStatus
from app.services.auth import get_current_active_user, require_user
from app.models.user import User


router = APIRouter(prefix="/care-schedules", tags=["care-schedules"])


# ============================================================================
# Care Schedule Endpoints
# ============================================================================

@router.get("", response_model=List[CareSchedule])
def read_schedules(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    animal_id: Optional[int] = Query(None, description="Filter by animal ID"),
    location_id: Optional[int] = Query(None, description="Filter by location ID"),
    care_type: Optional[CareType] = Query(None, description="Filter by care type"),
    status: Optional[ScheduleStatus] = Query(None, description="Filter by status"),
    assigned_to_id: Optional[int] = Query(None, description="Filter by assigned user ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all care schedules with optional filtering"""
    service = CareScheduleService(db)
    schedules = service.get_schedules(
        skip=skip,
        limit=limit,
        animal_id=animal_id,
        location_id=location_id,
        care_type=care_type,
        status=status,
        assigned_to_id=assigned_to_id
    )
    return schedules


@router.post("", response_model=CareSchedule)
def create_schedule(
    schedule: CareScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
):
    """Create a new care schedule"""
    service = CareScheduleService(db)
    return service.create_schedule(schedule, current_user.id)


@router.get("/upcoming", response_model=List[UpcomingTask])
def get_upcoming_tasks(
    days: int = Query(7, ge=1, le=365, description="Number of days to look ahead"),
    assigned_to_id: Optional[int] = Query(None, description="Filter by assigned user ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get upcoming care tasks within the next N days"""
    service = CareScheduleService(db)
    return service.get_upcoming_tasks(days=days, assigned_to_id=assigned_to_id)


@router.get("/overdue", response_model=List[CareSchedule])
def get_overdue_tasks(
    assigned_to_id: Optional[int] = Query(None, description="Filter by assigned user ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all overdue care tasks"""
    service = CareScheduleService(db)
    return service.get_overdue_tasks(assigned_to_id=assigned_to_id)


@router.get("/summary", response_model=TaskSummary)
def get_task_summary(
    assigned_to_id: Optional[int] = Query(None, description="Filter by assigned user ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get summary of tasks by status"""
    service = CareScheduleService(db)
    return service.get_task_summary(assigned_to_id=assigned_to_id)


@router.get("/{schedule_id}", response_model=CareSchedule)
def read_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific care schedule by ID"""
    service = CareScheduleService(db)
    schedule = service.get_schedule_by_id(schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Care schedule not found")
    return schedule


@router.put("/{schedule_id}", response_model=CareSchedule)
def update_schedule(
    schedule_id: int,
    schedule_update: CareScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
):
    """Update an existing care schedule"""
    service = CareScheduleService(db)
    updated_schedule = service.update_schedule(schedule_id, schedule_update)
    if not updated_schedule:
        raise HTTPException(status_code=404, detail="Care schedule not found")
    return updated_schedule


@router.delete("/{schedule_id}", status_code=204)
def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
):
    """Delete a care schedule"""
    service = CareScheduleService(db)
    success = service.delete_schedule(schedule_id)
    if not success:
        raise HTTPException(status_code=404, detail="Care schedule not found")
    return None


# ============================================================================
# Care Completion Endpoints
# ============================================================================

@router.get("/completions", response_model=List[CareCompletion], tags=["care-completions"])
def read_completions(
    schedule_id: Optional[int] = Query(None, description="Filter by schedule ID"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get care completions with optional filtering"""
    service = CareScheduleService(db)
    return service.get_completions(schedule_id=schedule_id, skip=skip, limit=limit)


@router.post("/completions", response_model=CareCompletion, tags=["care-completions"])
def create_completion(
    completion: CareCompletionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
):
    """
    Create a new care completion.
    This marks a scheduled task as completed and updates the schedule accordingly.
    """
    service = CareScheduleService(db)
    return service.create_completion(completion, current_user.id)


@router.get("/completions/{completion_id}", response_model=CareCompletion, tags=["care-completions"])
def read_completion(
    completion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific care completion by ID"""
    service = CareScheduleService(db)
    completion = service.get_completion_by_id(completion_id)
    if not completion:
        raise HTTPException(status_code=404, detail="Care completion not found")
    return completion


@router.put("/completions/{completion_id}", response_model=CareCompletion, tags=["care-completions"])
def update_completion(
    completion_id: int,
    completion_update: CareCompletionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
):
    """Update an existing care completion"""
    service = CareScheduleService(db)
    updated_completion = service.update_completion(completion_id, completion_update)
    if not updated_completion:
        raise HTTPException(status_code=404, detail="Care completion not found")
    return updated_completion


@router.delete("/completions/{completion_id}", status_code=204, tags=["care-completions"])
def delete_completion(
    completion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
):
    """Delete a care completion"""
    service = CareScheduleService(db)
    success = service.delete_completion(completion_id)
    if not success:
        raise HTTPException(status_code=404, detail="Care completion not found")
    return None
