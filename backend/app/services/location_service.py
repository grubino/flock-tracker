from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from fastapi import HTTPException
from app.models import Location, Animal
from app.schemas import LocationCreate, LocationUpdate


class LocationService:
    def __init__(self, db: Session):
        self.db = db

    def get_locations(self, skip: int = 0, limit: int = 100) -> List[Location]:
        """Get all locations"""
        return self.db.query(Location).offset(skip).limit(limit).all()

    def get_location(self, location_id: int) -> Optional[Location]:
        """Get a single location by ID"""
        return self.db.query(Location).filter(Location.id == location_id).first()

    def get_location_with_animals(self, location_id: int) -> Optional[Location]:
        """Get location with all animals currently at that location"""
        return (
            self.db.query(Location)
            .options(joinedload(Location.animals))
            .filter(Location.id == location_id)
            .first()
        )

    def create_location(self, location: LocationCreate) -> Location:
        """Create a new location"""
        try:
            db_location = Location(**location.model_dump())
            self.db.add(db_location)
            self.db.commit()
            self.db.refresh(db_location)
            return db_location

        except IntegrityError as e:
            self.db.rollback()
            raise HTTPException(status_code=400, detail="Database integrity error")

    def update_location(self, location_id: int, location: LocationUpdate) -> Optional[Location]:
        """Update an existing location"""
        db_location = self.get_location(location_id)
        if not db_location:
            return None

        try:
            update_data = location.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(db_location, field, value)
            self.db.commit()
            self.db.refresh(db_location)
            return db_location

        except IntegrityError as e:
            self.db.rollback()
            raise HTTPException(status_code=400, detail="Database integrity error")

    def delete_location(self, location_id: int) -> bool:
        """Delete a location"""
        db_location = self.get_location(location_id)
        if not db_location:
            return False

        # Check if any animals are currently at this location
        animals_at_location = self.db.query(Animal).filter(Animal.current_location_id == location_id).count()
        if animals_at_location > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete location. {animals_at_location} animals are currently at this location."
            )

        self.db.delete(db_location)
        self.db.commit()
        return True

    def get_animals_at_location(self, location_id: int) -> List[Animal]:
        """Get all animals currently at a specific location"""
        return (
            self.db.query(Animal)
            .filter(Animal.current_location_id == location_id)
            .all()
        )

    def get_location_occupancy(self, location_id: int) -> dict:
        """Get occupancy information for a location"""
        location = self.get_location(location_id)
        if not location:
            return None

        current_animals = self.get_animals_at_location(location_id)
        current_count = len(current_animals)

        result = {
            "location_id": location_id,
            "location_name": location.name,
            "current_occupancy": current_count,
            "capacity": location.capacity,
            "occupancy_percentage": None,
            "available_space": None
        }

        if location.capacity:
            result["occupancy_percentage"] = (current_count / location.capacity) * 100
            result["available_space"] = location.capacity - current_count

        return result

    def search_locations(self, search_term: str) -> List[Location]:
        """Search locations by name, paddock name, or address"""
        return (
            self.db.query(Location)
            .filter(
                (Location.name.ilike(f"%{search_term}%")) |
                (Location.paddock_name.ilike(f"%{search_term}%")) |
                (Location.address.ilike(f"%{search_term}%"))
            )
            .all()
        )

    def get_locations_with_capacity(self) -> List[dict]:
        """Get all locations with their current occupancy information"""
        locations = self.get_locations()
        results = []

        for location in locations:
            occupancy = self.get_location_occupancy(location.id)
            results.append(occupancy)

        return results

    def get_available_locations(self, minimum_space: int = 1) -> List[Location]:
        """Get locations that have available space"""
        available_locations = []
        locations = self.get_locations()

        for location in locations:
            if location.capacity is None:
                # If no capacity limit is set, consider it available
                available_locations.append(location)
            else:
                current_count = len(self.get_animals_at_location(location.id))
                available_space = location.capacity - current_count
                if available_space >= minimum_space:
                    available_locations.append(location)

        return available_locations

    def move_animals_between_locations(self, from_location_id: int, to_location_id: int, animal_ids: List[int]) -> bool:
        """Move multiple animals from one location to another"""
        # Validate locations exist
        from_location = self.get_location(from_location_id)
        to_location = self.get_location(to_location_id)

        if not from_location or not to_location:
            raise HTTPException(status_code=400, detail="One or both locations not found")

        # Validate to_location has capacity
        if to_location.capacity:
            current_count = len(self.get_animals_at_location(to_location_id))
            if current_count + len(animal_ids) > to_location.capacity:
                raise HTTPException(
                    status_code=400,
                    detail="Destination location does not have enough capacity"
                )

        try:
            # Update all animals' locations
            self.db.query(Animal).filter(
                Animal.id.in_(animal_ids),
                Animal.current_location_id == from_location_id
            ).update({"current_location_id": to_location_id}, synchronize_session=False)

            self.db.commit()
            return True

        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=400, detail="Failed to move animals")