from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from app.database.database import get_db
from app.schemas import Location, LocationCreate, LocationUpdate, LocationWithAnimals, Animal
from app.services.location_service import LocationService

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("/", response_model=List[Location])
def read_locations(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    db: Session = Depends(get_db)
):
    """Get all locations"""
    service = LocationService(db)
    locations = service.get_locations(skip=skip, limit=limit)
    return locations


@router.post("/", response_model=Location)
def create_location(location: LocationCreate, db: Session = Depends(get_db)):
    """Create a new location"""
    service = LocationService(db)
    return service.create_location(location)


@router.get("/search")
def search_locations(
    q: str = Query(..., description="Search term for name, paddock, or address"),
    db: Session = Depends(get_db)
):
    """Search locations by name, paddock name, or address"""
    service = LocationService(db)
    locations = service.search_locations(q)
    return locations


@router.get("/occupancy")
def get_locations_occupancy(db: Session = Depends(get_db)):
    """Get occupancy information for all locations"""
    service = LocationService(db)
    occupancy_data = service.get_locations_with_capacity()
    return occupancy_data


@router.get("/available")
def get_available_locations(
    minimum_space: int = Query(1, ge=1, description="Minimum available space required"),
    db: Session = Depends(get_db)
):
    """Get locations that have available space"""
    service = LocationService(db)
    locations = service.get_available_locations(minimum_space)
    return locations


@router.get("/{location_id}", response_model=LocationWithAnimals)
def read_location(location_id: int, db: Session = Depends(get_db)):
    """Get a single location with animals"""
    service = LocationService(db)
    location = service.get_location_with_animals(location_id)
    if location is None:
        raise HTTPException(status_code=404, detail="Location not found")
    return location


@router.put("/{location_id}", response_model=Location)
def update_location(location_id: int, location: LocationUpdate, db: Session = Depends(get_db)):
    """Update an existing location"""
    service = LocationService(db)
    updated_location = service.update_location(location_id, location)
    if updated_location is None:
        raise HTTPException(status_code=404, detail="Location not found")
    return updated_location


@router.delete("/{location_id}")
def delete_location(location_id: int, db: Session = Depends(get_db)):
    """Delete a location"""
    service = LocationService(db)
    success = service.delete_location(location_id)
    if not success:
        raise HTTPException(status_code=404, detail="Location not found")
    return {"message": "Location deleted successfully"}


@router.get("/{location_id}/animals", response_model=List[Animal])
def get_animals_at_location(location_id: int, db: Session = Depends(get_db)):
    """Get all animals currently at a specific location"""
    service = LocationService(db)
    # Verify location exists
    location = service.get_location(location_id)
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    animals = service.get_animals_at_location(location_id)
    return animals


@router.get("/{location_id}/occupancy")
def get_location_occupancy(location_id: int, db: Session = Depends(get_db)):
    """Get occupancy information for a specific location"""
    service = LocationService(db)
    occupancy = service.get_location_occupancy(location_id)
    if occupancy is None:
        raise HTTPException(status_code=404, detail="Location not found")
    return occupancy


@router.post("/move-animals")
def move_animals_between_locations(
    from_location_id: int,
    to_location_id: int,
    animal_ids: List[int],
    db: Session = Depends(get_db)
):
    """Move multiple animals from one location to another"""
    service = LocationService(db)
    success = service.move_animals_between_locations(from_location_id, to_location_id, animal_ids)
    if success:
        return {
            "message": f"Successfully moved {len(animal_ids)} animals from location {from_location_id} to location {to_location_id}",
            "moved_animals": animal_ids
        }
    else:
        raise HTTPException(status_code=400, detail="Failed to move animals")