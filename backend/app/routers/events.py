from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import date, datetime
import csv
import io
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


@router.post("/import-csv")
async def import_events_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
) -> Dict[str, Any]:
    """
    Import events from a CSV file.

    Expected CSV format:
    - animal_id (or tag_number): ID or tag number of the animal
    - event_type: Type of event (deworming, lambing, health_check, etc.)
    - event_date: Date of event (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)
    - description (optional): Description of the event
    - notes (optional): Additional notes
    - medication_name (optional): Name of medication
    - dosage (optional): Dosage administered
    - veterinarian (optional): Veterinarian name
    - cost (optional): Cost of the treatment

    Returns:
    - success_count: Number of events successfully imported
    - error_count: Number of events that failed
    - errors: List of error messages with row numbers
    """

    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV file")

    # Read CSV file
    try:
        contents = await file.read()
        csv_text = contents.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_text))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading CSV file: {str(e)}")

    # Import events
    service = EventService(db)
    success_count = 0
    error_count = 0
    errors = []
    created_events = []

    # Get all animals for tag_number lookup if needed
    from app.models.animal import Animal
    animals_by_tag = {animal.tag_number: animal for animal in db.query(Animal).all()}

    for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 to account for header row
        try:
            # Get animal_id (either directly or from tag_number)
            animal_id = None
            if 'animal_id' in row and row['animal_id']:
                try:
                    animal_id = int(row['animal_id'])
                except ValueError:
                    errors.append(f"Row {row_num}: Invalid animal_id '{row['animal_id']}'")
                    error_count += 1
                    continue
            elif 'tag_number' in row and row['tag_number']:
                tag_number = row['tag_number'].strip()
                if tag_number in animals_by_tag:
                    animal_id = animals_by_tag[tag_number].id
                else:
                    errors.append(f"Row {row_num}: Animal with tag_number '{tag_number}' not found")
                    error_count += 1
                    continue
            else:
                errors.append(f"Row {row_num}: Missing animal_id or tag_number")
                error_count += 1
                continue

            # Validate event_type
            event_type_str = row.get('event_type', '').strip().upper()
            try:
                event_type = EventType[event_type_str]
            except KeyError:
                valid_types = ', '.join([e.name for e in EventType])
                errors.append(f"Row {row_num}: Invalid event_type '{event_type_str}'. Valid types: {valid_types}")
                error_count += 1
                continue

            # Parse event_date
            event_date_str = row.get('event_date', '').strip()
            if not event_date_str:
                errors.append(f"Row {row_num}: Missing event_date")
                error_count += 1
                continue

            try:
                # Try parsing with time first
                try:
                    event_date = datetime.strptime(event_date_str, '%Y-%m-%d %H:%M:%S')
                except ValueError:
                    # Try parsing without time
                    event_date = datetime.strptime(event_date_str, '%Y-%m-%d')
            except ValueError:
                errors.append(f"Row {row_num}: Invalid event_date format '{event_date_str}'. Use YYYY-MM-DD or YYYY-MM-DD HH:MM:SS")
                error_count += 1
                continue

            # Create event object
            event_data = EventCreate(
                animal_id=animal_id,
                event_type=event_type,
                event_date=event_date,
                description=row.get('description', '').strip() or None,
                notes=row.get('notes', '').strip() or None,
                medication_name=row.get('medication_name', '').strip() or None,
                dosage=row.get('dosage', '').strip() or None,
                veterinarian=row.get('veterinarian', '').strip() or None,
                cost=row.get('cost', '').strip() or None
            )

            # Create the event
            created_event = service.create_event(event_data)
            created_events.append(created_event)
            success_count += 1

        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
            error_count += 1

    # Convert created events to Pydantic schemas for serialization
    created_events_schemas = [Event.model_validate(event) for event in created_events[:10]]

    return {
        "success_count": success_count,
        "error_count": error_count,
        "total_rows": success_count + error_count,
        "errors": errors,
        "created_events": created_events_schemas  # Return first 10 created events as examples
    }