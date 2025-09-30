from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.database import get_db
from app.schemas import Animal, AnimalCreate, AnimalUpdate, AnimalWithDetails, AnimalWithLocation
from app.services.animal_service import AnimalService
from app.models.animal import AnimalType
from app.services.auth import get_current_active_user, require_admin, require_user
from app.models.user import User

router = APIRouter(prefix="/animals", tags=["animals"])


@router.get("", response_model=List[AnimalWithDetails])
def read_animals(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    animal_type: Optional[AnimalType] = Query(None, description="Filter by animal type"),
    location_id: Optional[int] = Query(None, description="Filter by current location"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all animals with optional filtering"""
    service = AnimalService(db)
    animals = service.get_animals(
        skip=skip,
        limit=limit,
        animal_type=animal_type,
        location_id=location_id
    )
    return animals


@router.post("", response_model=Animal)
def create_animal(
    animal: AnimalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
):
    """Create a new animal"""
    service = AnimalService(db)
    return service.create_animal(animal)


@router.get("/search")
def search_animals(
    q: str = Query(..., description="Search term for name or tag number"),
    db: Session = Depends(get_db)
):
    """Search animals by name or tag number"""
    service = AnimalService(db)
    animals = service.search_animals(q)
    return animals


@router.get("/type/{animal_type}", response_model=List[Animal])
def get_animals_by_type(animal_type: AnimalType, db: Session = Depends(get_db)):
    """Get all animals of a specific type"""
    service = AnimalService(db)
    animals = service.get_animals_by_type(animal_type)
    return animals


@router.get("/tag/{tag_number}", response_model=AnimalWithLocation)
def read_animal_by_tag(tag_number: str, db: Session = Depends(get_db)):
    """Get animal by tag number"""
    service = AnimalService(db)
    animal = service.get_animal_by_tag(tag_number)
    if animal is None:
        raise HTTPException(status_code=404, detail="Animal not found")
    return animal


@router.get("/{animal_id}", response_model=AnimalWithDetails)
def read_animal(animal_id: int, db: Session = Depends(get_db)):
    """Get a single animal with all details"""
    service = AnimalService(db)
    animal = service.get_animal_with_details(animal_id)
    if animal is None:
        raise HTTPException(status_code=404, detail="Animal not found")
    return animal


@router.put("/{animal_id}", response_model=Animal)
def update_animal(
    animal_id: int,
    animal: AnimalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
):
    """Update an existing animal"""
    service = AnimalService(db)
    updated_animal = service.update_animal(animal_id, animal)
    if updated_animal is None:
        raise HTTPException(status_code=404, detail="Animal not found")
    return updated_animal


@router.delete("/{animal_id}")
def delete_animal(
    animal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete an animal"""
    service = AnimalService(db)
    success = service.delete_animal(animal_id)
    if not success:
        raise HTTPException(status_code=404, detail="Animal not found")
    return {"message": "Animal deleted successfully"}


@router.get("/{animal_id}/offspring", response_model=List[Animal])
def get_animal_offspring(animal_id: int, db: Session = Depends(get_db)):
    """Get all offspring of an animal"""
    service = AnimalService(db)
    # Verify animal exists
    animal = service.get_animal(animal_id)
    if not animal:
        raise HTTPException(status_code=404, detail="Animal not found")

    offspring = service.get_offspring(animal_id)
    return offspring


@router.post("/{animal_id}/move")
def move_animal_to_location(
    animal_id: int,
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
):
    """Move an animal to a new location"""
    service = AnimalService(db)
    updated_animal = service.move_animal_to_location(animal_id, location_id)
    if not updated_animal:
        raise HTTPException(status_code=404, detail="Animal not found")
    return {"message": f"Animal moved to location {location_id}", "animal": updated_animal}