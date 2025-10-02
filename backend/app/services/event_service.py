from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import datetime, date, timedelta
from fastapi import HTTPException
from app.models import Event, EventType, Animal
from app.schemas import EventCreate, EventUpdate, EventBulkCreate


class EventService:
    def __init__(self, db: Session):
        self.db = db

    def get_events(
        self,
        skip: int = 0,
        limit: int = 100,
        animal_id: Optional[int] = None,
        event_type: Optional[EventType] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[Event]:
        """Get all events with optional filtering"""
        query = self.db.query(Event).options(joinedload(Event.animal))

        if animal_id:
            query = query.filter(Event.animal_id == animal_id)

        if event_type:
            query = query.filter(Event.event_type == event_type)

        if start_date:
            query = query.filter(Event.event_date >= start_date)

        if end_date:
            query = query.filter(Event.event_date <= end_date)

        return query.order_by(Event.event_date.desc()).offset(skip).limit(limit).all()

    def get_event(self, event_id: int) -> Optional[Event]:
        """Get a single event by ID"""
        return (
            self.db.query(Event)
            .options(joinedload(Event.animal))
            .filter(Event.id == event_id)
            .first()
        )

    def get_events_by_animal(self, animal_id: int) -> List[Event]:
        """Get all events for a specific animal"""
        return (
            self.db.query(Event)
            .filter(Event.animal_id == animal_id)
            .order_by(Event.event_date.desc())
            .all()
        )

    def get_events_by_type(self, event_type: EventType) -> List[Event]:
        """Get all events of a specific type"""
        return (
            self.db.query(Event)
            .options(joinedload(Event.animal))
            .filter(Event.event_type == event_type)
            .order_by(Event.event_date.desc())
            .all()
        )

    def get_recent_events(self, days: int = 7) -> List[Event]:
        """Get events from the last N days"""
        cutoff_date = datetime.now().date() - timedelta(days=days)
        return (
            self.db.query(Event)
            .options(joinedload(Event.animal))
            .filter(Event.event_date >= cutoff_date)
            .order_by(Event.event_date.desc())
            .all()
        )

    def create_event(self, event: EventCreate) -> Event:
        """Create a new event"""
        try:
            # Validate that the animal exists
            animal = self.db.query(Animal).filter(Animal.id == event.animal_id).first()
            if not animal:
                raise HTTPException(status_code=400, detail="Animal not found")

            db_event = Event(**event.model_dump())
            self.db.add(db_event)
            self.db.commit()
            self.db.refresh(db_event)
            return db_event

        except IntegrityError as e:
            self.db.rollback()
            raise HTTPException(status_code=400, detail="Database integrity error")

    def create_bulk_events(self, bulk_create: EventBulkCreate) -> List[Event]:
        """Create multiple events at once"""
        try:
            created_events = []

            # Validate all animal IDs exist before creating any events
            animal_ids = set(event.animal_id for event in bulk_create.events)
            animals = self.db.query(Animal).filter(Animal.id.in_(animal_ids)).all()
            existing_animal_ids = {animal.id for animal in animals}

            for event in bulk_create.events:
                if event.animal_id not in existing_animal_ids:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Animal with ID {event.animal_id} not found"
                    )

            # Create all events
            for event in bulk_create.events:
                db_event = Event(**event.model_dump())
                self.db.add(db_event)
                created_events.append(db_event)

            self.db.commit()

            # Refresh all events to get their IDs
            for db_event in created_events:
                self.db.refresh(db_event)

            return created_events

        except IntegrityError as e:
            self.db.rollback()
            raise HTTPException(status_code=400, detail="Database integrity error")
        except HTTPException:
            self.db.rollback()
            raise

    def update_event(self, event_id: int, event: EventUpdate) -> Optional[Event]:
        """Update an existing event"""
        db_event = self.get_event(event_id)
        if not db_event:
            return None

        try:
            update_data = event.model_dump(exclude_unset=True)

            # Validate animal if being updated
            if "animal_id" in update_data:
                animal = self.db.query(Animal).filter(Animal.id == update_data["animal_id"]).first()
                if not animal:
                    raise HTTPException(status_code=400, detail="Animal not found")

            for field, value in update_data.items():
                setattr(db_event, field, value)

            self.db.commit()
            self.db.refresh(db_event)
            return db_event

        except IntegrityError as e:
            self.db.rollback()
            raise HTTPException(status_code=400, detail="Database integrity error")

    def delete_event(self, event_id: int) -> bool:
        """Delete an event"""
        db_event = self.get_event(event_id)
        if db_event:
            self.db.delete(db_event)
            self.db.commit()
            return True
        return False

    def get_medication_history(self, animal_id: int) -> List[Event]:
        """Get medication history for an animal"""
        return (
            self.db.query(Event)
            .filter(
                Event.animal_id == animal_id,
                Event.event_type.in_([EventType.MEDICATION, EventType.DEWORMING, EventType.VACCINATION])
            )
            .order_by(Event.event_date.desc())
            .all()
        )

    def get_health_events(self, animal_id: int) -> List[Event]:
        """Get all health-related events for an animal"""
        health_types = [
            EventType.HEALTH_CHECK,
            EventType.MEDICATION,
            EventType.VACCINATION,
            EventType.INJURY,
            EventType.TREATMENT,
            EventType.DEWORMING,
            EventType.DELICING
        ]
        return (
            self.db.query(Event)
            .filter(
                Event.animal_id == animal_id,
                Event.event_type.in_(health_types)
            )
            .order_by(Event.event_date.desc())
            .all()
        )

    def search_events(self, search_term: str) -> List[Event]:
        """Search events by description or notes"""
        return (
            self.db.query(Event)
            .options(joinedload(Event.animal))
            .filter(
                (Event.description.ilike(f"%{search_term}%")) |
                (Event.notes.ilike(f"%{search_term}%")) |
                (Event.medication_name.ilike(f"%{search_term}%")) |
                (Event.veterinarian.ilike(f"%{search_term}%"))
            )
            .order_by(Event.event_date.desc())
            .all()
        )

    def get_upcoming_events(self) -> List[Event]:
        """Get upcoming scheduled events (events in the future)"""
        today = datetime.now().date()
        return (
            self.db.query(Event)
            .options(joinedload(Event.animal))
            .filter(Event.event_date > today)
            .order_by(Event.event_date.asc())
            .all()
        )