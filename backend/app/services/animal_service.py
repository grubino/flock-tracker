from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from fastapi import HTTPException
from app.models import Animal, AnimalType, SheepGender, Location, AnimalBreedComponent
from app.models.user import User, UserRole
from app.schemas import AnimalCreate, AnimalUpdate
from app.schemas.animal import BreedComponentCreate, EffectiveBreedComponent


def _breeds_complete(breeds: List[EffectiveBreedComponent]) -> bool:
    """True if every breed has a known percentage and they sum to ~100."""
    return (
        bool(breeds)
        and all(b.percentage is not None for b in breeds)
        and abs(sum(b.percentage for b in breeds) - 100.0) < 0.5
    )


def compute_effective_breeds(animal: Animal, visited: set = None, depth: int = 0) -> List[EffectiveBreedComponent]:
    """Recursively compute breed composition, inheriting from ancestors when not explicitly set.

    Percentages are only calculated when BOTH parents have complete breed info (all percentages
    known and summing to 100). Otherwise, breed names are inherited without percentages.
    """
    if visited is None:
        visited = set()
    if animal is None or animal.id in visited or depth > 6:
        return []
    visited.add(animal.id)

    if animal.breed_components:
        return [
            EffectiveBreedComponent(breed_name=bc.breed_name, percentage=bc.percentage, source="direct")
            for bc in animal.breed_components
        ]

    sire_breeds = compute_effective_breeds(animal.sire, visited, depth + 1) if animal.sire else []
    dam_breeds = compute_effective_breeds(animal.dam, visited, depth + 1) if animal.dam else []

    if not sire_breeds and not dam_breeds:
        return []

    if _breeds_complete(sire_breeds) and _breeds_complete(dam_breeds):
        combined: dict = {}
        for bc in sire_breeds:
            combined[bc.breed_name] = combined.get(bc.breed_name, 0.0) + bc.percentage / 2.0
        for bc in dam_breeds:
            combined[bc.breed_name] = combined.get(bc.breed_name, 0.0) + bc.percentage / 2.0
        return [
            EffectiveBreedComponent(breed_name=name, percentage=round(pct, 1), source="inherited")
            for name, pct in combined.items()
        ]
    else:
        seen: dict = {}
        for bc in sire_breeds + dam_breeds:
            seen[bc.breed_name] = None
        return [
            EffectiveBreedComponent(breed_name=name, percentage=None, source="inherited")
            for name in seen
        ]


class AnimalService:
    def __init__(self, db: Session):
        self.db = db

    def get_animals(
        self,
        skip: int = 0,
        limit: int = 100,
        animal_type: Optional[AnimalType] = None,
        location_id: Optional[int] = None,
        current_user: Optional[User] = None,
        on_farm: Optional[bool] = True
    ) -> List[Animal]:
        """Get all animals with optional filtering

        Args:
            on_farm: Filter by on_farm status. Defaults to True (only show animals on farm).
                     Set to None to show all animals regardless of status.
        """
        query = self.db.query(Animal).options(
            joinedload(Animal.current_location),
            joinedload(Animal.breed_components),
            joinedload(Animal.sire).joinedload(Animal.breed_components),
            joinedload(Animal.dam).joinedload(Animal.breed_components),
            joinedload(Animal.photographs),
            joinedload(Animal.events)  # Need events to compute on_farm property
        )

        # Customers can only see sellable animals
        if current_user and current_user.role == UserRole.customer:
            query = query.filter(Animal.is_sellable == True)

        if animal_type:
            query = query.filter(Animal.animal_type == animal_type)

        if location_id:
            query = query.filter(Animal.current_location_id == location_id)

        # Get all animals matching criteria first
        all_animals = query.all()

        # Filter by on_farm status if requested
        if on_farm is not None:
            all_animals = [animal for animal in all_animals if animal.on_farm == on_farm]

        # Apply pagination after filtering
        return all_animals[skip:skip + limit]

    def get_animal(self, animal_id: int) -> Optional[Animal]:
        """Get a single animal by ID"""
        return self.db.query(Animal).filter(Animal.id == animal_id).first()

    def get_animal_with_details(self, animal_id: int) -> Optional[Animal]:
        """Get animal with all related data (events, lineage, location)"""
        return (
            self.db.query(Animal)
            .options(
                joinedload(Animal.events),
                joinedload(Animal.breed_components),
                joinedload(Animal.sire).joinedload(Animal.breed_components),
                joinedload(Animal.dam).joinedload(Animal.breed_components),
                joinedload(Animal.current_location),
                joinedload(Animal.sired_offspring),
                joinedload(Animal.dam_offspring)
            )
            .filter(Animal.id == animal_id)
            .first()
        )

    def get_animal_by_tag(self, tag_number: str) -> Optional[Animal]:
        """Get animal by tag number"""
        return self.db.query(Animal).filter(Animal.tag_number == tag_number).first()

    def create_animal(self, animal: AnimalCreate) -> Animal:
        """Create a new animal"""
        try:
            # Validate that sire and dam exist if provided
            if animal.sire_id:
                sire = self.get_animal(animal.sire_id)
                if not sire:
                    raise HTTPException(status_code=400, detail="Sire not found")

            if animal.dam_id:
                dam = self.get_animal(animal.dam_id)
                if not dam:
                    raise HTTPException(status_code=400, detail="Dam not found")

            # Validate location if provided
            if animal.current_location_id:
                location = self.db.query(Location).filter(Location.id == animal.current_location_id).first()
                if not location:
                    raise HTTPException(status_code=400, detail="Location not found")

            db_animal = Animal(**animal.model_dump())
            self.db.add(db_animal)
            self.db.commit()
            self.db.refresh(db_animal)
            return db_animal

        except IntegrityError as e:
            self.db.rollback()
            if "tag_number" in str(e):
                raise HTTPException(status_code=400, detail="Tag number already exists")
            raise HTTPException(status_code=400, detail="Database integrity error")

    def update_animal(self, animal_id: int, animal: AnimalUpdate, current_user: Optional[User] = None) -> Optional[Animal]:
        """Update an existing animal"""
        db_animal = self.get_animal(animal_id)
        if not db_animal:
            return None

        try:
            # Validate references if they're being updated
            update_data = animal.model_dump(exclude_unset=True)

            # Only users and admins can set sellable flags
            if current_user and current_user.role == UserRole.customer:
                if "is_sellable" in update_data or "allowed_shares" in update_data:
                    raise HTTPException(status_code=403, detail="Customers cannot modify sellable settings")

            if "sire_id" in update_data and update_data["sire_id"]:
                sire = self.get_animal(update_data["sire_id"])
                if not sire:
                    raise HTTPException(status_code=400, detail="Sire not found")

            if "dam_id" in update_data and update_data["dam_id"]:
                dam = self.get_animal(update_data["dam_id"])
                if not dam:
                    raise HTTPException(status_code=400, detail="Dam not found")

            if "current_location_id" in update_data and update_data["current_location_id"]:
                location = self.db.query(Location).filter(Location.id == update_data["current_location_id"]).first()
                if not location:
                    raise HTTPException(status_code=400, detail="Location not found")

            for field, value in update_data.items():
                setattr(db_animal, field, value)

            self.db.commit()
            self.db.refresh(db_animal)
            return db_animal

        except IntegrityError as e:
            self.db.rollback()
            if "tag_number" in str(e):
                raise HTTPException(status_code=400, detail="Tag number already exists")
            raise HTTPException(status_code=400, detail="Database integrity error")

    def delete_animal(self, animal_id: int) -> bool:
        """Delete an animal"""
        db_animal = self.get_animal(animal_id)
        if db_animal:
            self.db.delete(db_animal)
            self.db.commit()
            return True
        return False

    def get_animals_by_type(self, animal_type: AnimalType) -> List[Animal]:
        """Get all animals of a specific type"""
        return self.db.query(Animal).filter(Animal.animal_type == animal_type).all()

    def get_offspring(self, animal_id: int) -> List[Animal]:
        """Get all offspring of an animal (as either sire or dam)"""
        return (
            self.db.query(Animal)
            .filter((Animal.sire_id == animal_id) | (Animal.dam_id == animal_id))
            .all()
        )

    def move_animal_to_location(self, animal_id: int, location_id: int) -> Optional[Animal]:
        """Move an animal to a new location"""
        animal = self.get_animal(animal_id)
        if not animal:
            return None

        # Validate location exists
        location = self.db.query(Location).filter(Location.id == location_id).first()
        if not location:
            raise HTTPException(status_code=400, detail="Location not found")

        animal.current_location_id = location_id
        self.db.commit()
        self.db.refresh(animal)
        return animal

    def search_animals(self, search_term: str) -> List[Animal]:
        """Search animals by name or tag number"""
        return (
            self.db.query(Animal)
            .filter(
                (Animal.name.ilike(f"%{search_term}%")) |
                (Animal.tag_number.ilike(f"%{search_term}%"))
            )
            .all()
        )