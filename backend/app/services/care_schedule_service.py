from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime, timedelta
from app.models.care_schedule import (
    CareSchedule,
    CareCompletion,
    CareType,
    RecurrenceType,
    ScheduleStatus,
    TaskStatus,
    care_schedule_animals
)
from app.models.animal import Animal
from app.schemas.care_schedule import (
    CareScheduleCreate,
    CareScheduleUpdate,
    CareCompletionCreate,
    CareCompletionUpdate,
    UpcomingTask,
    TaskSummary
)


class CareScheduleService:
    """Service for managing care schedules"""

    def __init__(self, db: Session):
        self.db = db

    def get_schedules(
        self,
        skip: int = 0,
        limit: int = 100,
        animal_id: Optional[int] = None,
        location_id: Optional[int] = None,
        care_type: Optional[CareType] = None,
        status: Optional[ScheduleStatus] = None,
        assigned_to_id: Optional[int] = None
    ) -> List[CareSchedule]:
        """Get care schedules with optional filtering"""
        query = self.db.query(CareSchedule)

        if animal_id:
            # Filter by animal using the many-to-many relationship
            query = query.join(CareSchedule.animals).filter(Animal.id == animal_id)
        if location_id:
            query = query.filter(CareSchedule.location_id == location_id)
        if care_type:
            query = query.filter(CareSchedule.care_type == care_type)
        if status:
            query = query.filter(CareSchedule.status == status)
        if assigned_to_id:
            query = query.filter(CareSchedule.assigned_to_id == assigned_to_id)

        return query.order_by(CareSchedule.next_due_date).offset(skip).limit(limit).all()

    def get_schedule_by_id(self, schedule_id: int) -> Optional[CareSchedule]:
        """Get a specific care schedule by ID"""
        return self.db.query(CareSchedule).filter(CareSchedule.id == schedule_id).first()

    def create_schedule(self, schedule: CareScheduleCreate, user_id: int) -> CareSchedule:
        """Create a new care schedule"""
        # Extract animal_ids before creating the schedule
        animal_ids = schedule.animal_ids
        schedule_data = schedule.model_dump(exclude={'animal_ids'})

        # Set next_due_date to start_date initially
        db_schedule = CareSchedule(
            **schedule_data,
            next_due_date=schedule.start_date,
            created_by_id=user_id
        )

        # Add animals to the schedule
        if animal_ids:
            animals = self.db.query(Animal).filter(Animal.id.in_(animal_ids)).all()
            db_schedule.animals = animals

        self.db.add(db_schedule)
        self.db.commit()
        self.db.refresh(db_schedule)
        return db_schedule

    def update_schedule(self, schedule_id: int, schedule_update: CareScheduleUpdate) -> Optional[CareSchedule]:
        """Update an existing care schedule"""
        db_schedule = self.get_schedule_by_id(schedule_id)
        if not db_schedule:
            return None

        update_data = schedule_update.model_dump(exclude_unset=True)

        # Handle animal_ids separately
        animal_ids = update_data.pop('animal_ids', None)
        if animal_ids is not None:
            animals = self.db.query(Animal).filter(Animal.id.in_(animal_ids)).all()
            db_schedule.animals = animals

        # Update other fields
        for field, value in update_data.items():
            setattr(db_schedule, field, value)

        db_schedule.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(db_schedule)
        return db_schedule

    def delete_schedule(self, schedule_id: int) -> bool:
        """Delete a care schedule"""
        db_schedule = self.get_schedule_by_id(schedule_id)
        if not db_schedule:
            return False

        self.db.delete(db_schedule)
        self.db.commit()
        return True

    def get_upcoming_tasks(
        self,
        days: int = 7,
        assigned_to_id: Optional[int] = None
    ) -> List[UpcomingTask]:
        """Get upcoming care tasks within the next N days"""
        end_date = datetime.utcnow() + timedelta(days=days)

        query = self.db.query(CareSchedule).filter(
            and_(
                CareSchedule.status == ScheduleStatus.ACTIVE,
                CareSchedule.next_due_date <= end_date
            )
        )

        if assigned_to_id:
            query = query.filter(CareSchedule.assigned_to_id == assigned_to_id)

        schedules = query.order_by(CareSchedule.next_due_date).all()

        tasks = []
        for schedule in schedules:
            now = datetime.utcnow()
            days_until = (schedule.next_due_date - now).days

            # Determine status
            if schedule.next_due_date < now:
                status = "OVERDUE"
            else:
                status = "PENDING"

            # Get animal IDs from the many-to-many relationship
            animal_ids = [animal.id for animal in schedule.animals]

            tasks.append(UpcomingTask(
                schedule_id=schedule.id,
                title=schedule.title,
                care_type=schedule.care_type,
                due_date=schedule.next_due_date,
                priority=schedule.priority,
                animal_ids=animal_ids,
                location_id=schedule.location_id,
                assigned_to_id=schedule.assigned_to_id,
                status=status,
                days_until_due=days_until
            ))

        return tasks

    def get_overdue_tasks(self, assigned_to_id: Optional[int] = None) -> List[CareSchedule]:
        """Get all overdue care tasks"""
        query = self.db.query(CareSchedule).filter(
            and_(
                CareSchedule.status == ScheduleStatus.ACTIVE,
                CareSchedule.next_due_date < datetime.utcnow()
            )
        )

        if assigned_to_id:
            query = query.filter(CareSchedule.assigned_to_id == assigned_to_id)

        return query.order_by(CareSchedule.next_due_date).all()

    def get_task_summary(self, assigned_to_id: Optional[int] = None) -> TaskSummary:
        """Get summary of tasks by status"""
        now = datetime.utcnow()
        today_start = datetime(now.year, now.month, now.day)
        today_end = today_start + timedelta(days=1)
        week_end = now + timedelta(days=7)

        base_query = self.db.query(CareSchedule)
        if assigned_to_id:
            base_query = base_query.filter(CareSchedule.assigned_to_id == assigned_to_id)

        # Pending count (active and due in the future)
        pending_count = base_query.filter(
            and_(
                CareSchedule.status == ScheduleStatus.ACTIVE,
                CareSchedule.next_due_date >= now
            )
        ).count()

        # Overdue count
        overdue_count = base_query.filter(
            and_(
                CareSchedule.status == ScheduleStatus.ACTIVE,
                CareSchedule.next_due_date < now
            )
        ).count()

        # Completed today count
        completed_today_count = self.db.query(CareCompletion).filter(
            and_(
                CareCompletion.completed_date >= today_start,
                CareCompletion.completed_date < today_end,
                CareCompletion.status == TaskStatus.COMPLETED
            )
        ).count()

        # Upcoming in next 7 days
        upcoming_7_days_count = base_query.filter(
            and_(
                CareSchedule.status == ScheduleStatus.ACTIVE,
                CareSchedule.next_due_date >= now,
                CareSchedule.next_due_date <= week_end
            )
        ).count()

        return TaskSummary(
            pending_count=pending_count,
            overdue_count=overdue_count,
            completed_today_count=completed_today_count,
            upcoming_7_days_count=upcoming_7_days_count
        )

    def calculate_next_due_date(self, schedule: CareSchedule, from_date: datetime = None) -> datetime:
        """Calculate the next due date based on recurrence pattern"""
        if schedule.recurrence_type == RecurrenceType.ONCE:
            return schedule.start_date

        base_date = from_date or schedule.next_due_date
        interval = schedule.recurrence_interval or 1

        if schedule.recurrence_type == RecurrenceType.DAILY:
            return base_date + timedelta(days=interval)
        elif schedule.recurrence_type == RecurrenceType.WEEKLY:
            return base_date + timedelta(weeks=interval)
        elif schedule.recurrence_type == RecurrenceType.BIWEEKLY:
            return base_date + timedelta(weeks=2 * interval)
        elif schedule.recurrence_type == RecurrenceType.MONTHLY:
            # Simple month addition (may need refinement for edge cases)
            month = base_date.month + interval
            year = base_date.year + (month - 1) // 12
            month = ((month - 1) % 12) + 1
            return base_date.replace(year=year, month=month)
        elif schedule.recurrence_type == RecurrenceType.QUARTERLY:
            return base_date + timedelta(days=90 * interval)
        elif schedule.recurrence_type == RecurrenceType.YEARLY:
            return base_date.replace(year=base_date.year + interval)

        return base_date

    # ========================================================================
    # CareCompletion methods
    # ========================================================================

    def get_completions(
        self,
        schedule_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[CareCompletion]:
        """Get care completions with optional filtering"""
        query = self.db.query(CareCompletion)

        if schedule_id:
            query = query.filter(CareCompletion.schedule_id == schedule_id)

        return query.order_by(CareCompletion.completed_date.desc()).offset(skip).limit(limit).all()

    def get_completion_by_id(self, completion_id: int) -> Optional[CareCompletion]:
        """Get a specific care completion by ID"""
        return self.db.query(CareCompletion).filter(CareCompletion.id == completion_id).first()

    def create_completion(self, completion: CareCompletionCreate, user_id: int) -> CareCompletion:
        """Create a new care completion and update schedule"""
        # Create the completion record
        db_completion = CareCompletion(
            **completion.model_dump(),
            completed_by_id=user_id
        )
        self.db.add(db_completion)

        # Update the schedule's next_due_date if it's a recurring task
        schedule = self.get_schedule_by_id(completion.schedule_id)
        if schedule:
            if schedule.recurrence_type == RecurrenceType.ONCE:
                # Mark as completed for one-time tasks
                schedule.status = ScheduleStatus.COMPLETED
            else:
                # Calculate next due date for recurring tasks
                schedule.next_due_date = self.calculate_next_due_date(
                    schedule,
                    completion.completed_date
                )

            schedule.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(db_completion)
        return db_completion

    def update_completion(
        self,
        completion_id: int,
        completion_update: CareCompletionUpdate
    ) -> Optional[CareCompletion]:
        """Update an existing care completion"""
        db_completion = self.get_completion_by_id(completion_id)
        if not db_completion:
            return None

        update_data = completion_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_completion, field, value)

        db_completion.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(db_completion)
        return db_completion

    def delete_completion(self, completion_id: int) -> bool:
        """Delete a care completion"""
        db_completion = self.get_completion_by_id(completion_id)
        if not db_completion:
            return False

        self.db.delete(db_completion)
        self.db.commit()
        return True
