from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app.database.database import get_db
from app.schemas import Event, EventCreate, EventUpdate, EventWithAnimal, EventBulkCreate
from app.services.event_service import EventService
from app.models.event import EventType
from app.services.auth import get_current_active_user, require_admin, require_user
from app.models.user import User

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=List[EventWithAnimal])
def read_events(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    animal_id: Optional[int] = Query(None, description="Filter by animal ID"),
    event_type: Optional[EventType] = Query(None, description="Filter by event type"),
    start_date: Optional[date] = Query(None, description="Filter events from this date"),
    end_date: Optional[date] = Query(None, description="Filter events until this date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all events with optional filtering"""
    service = EventService(db)
    events = service.get_events(
        skip=skip,
        limit=limit,
        animal_id=animal_id,
        event_type=event_type,
        start_date=start_date,
        end_date=end_date
    )
    return events


@router.post("", response_model=Event)
def create_event(
    event: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
):
    """Create a new event"""
    service = EventService(db)
    return service.create_event(event)


@router.post("/bulk", response_model=List[Event])
def create_bulk_events(
    bulk_create: EventBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
):
    """Create multiple events at once"""
    service = EventService(db)
    return service.create_bulk_events(bulk_create)


@router.get("/search")
def search_events(
    q: str = Query(..., description="Search term for description, notes, medication, or veterinarian"),
    db: Session = Depends(get_db)
):
    """Search events by description, notes, medication, or veterinarian"""
    service = EventService(db)
    events = service.search_events(q)
    return events


@router.get("/recent")
def get_recent_events(
    days: int = Query(7, ge=1, le=365, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """Get events from the last N days"""
    service = EventService(db)
    events = service.get_recent_events(days)
    return events


@router.get("/upcoming")
def get_upcoming_events(db: Session = Depends(get_db)):
    """Get upcoming scheduled events"""
    service = EventService(db)
    events = service.get_upcoming_events()
    return events


@router.get("/type/{event_type}", response_model=List[EventWithAnimal])
def get_events_by_type(event_type: EventType, db: Session = Depends(get_db)):
    """Get all events of a specific type"""
    service = EventService(db)
    events = service.get_events_by_type(event_type)
    return events


@router.get("/{event_id}", response_model=EventWithAnimal)
def read_event(event_id: int, db: Session = Depends(get_db)):
    """Get a single event by ID"""
    service = EventService(db)
    event = service.get_event(event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.put("/{event_id}", response_model=Event)
def update_event(
    event_id: int,
    event: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
):
    """Update an existing event"""
    service = EventService(db)
    updated_event = service.update_event(event_id, event)
    if updated_event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return updated_event


@router.delete("/{event_id}")
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete an event"""
    service = EventService(db)
    success = service.delete_event(event_id)
    if not success:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted successfully"}


@router.get("/animal/{animal_id}", response_model=List[Event])
def read_events_by_animal(animal_id: int, db: Session = Depends(get_db)):
    """Get all events for a specific animal"""
    service = EventService(db)
    events = service.get_events_by_animal(animal_id)
    return events


@router.get("/animal/{animal_id}/health", response_model=List[Event])
def get_animal_health_events(animal_id: int, db: Session = Depends(get_db)):
    """Get all health-related events for an animal"""
    service = EventService(db)
    events = service.get_health_events(animal_id)
    return events


@router.get("/animal/{animal_id}/medication", response_model=List[Event])
def get_animal_medication_history(animal_id: int, db: Session = Depends(get_db)):
    """Get medication history for an animal"""
    service = EventService(db)
    events = service.get_medication_history(animal_id)
    return events