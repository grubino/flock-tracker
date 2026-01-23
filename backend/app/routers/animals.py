from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import csv
import io
from app.database.database import get_db
from app.schemas import Animal, AnimalCreate, AnimalUpdate, AnimalWithDetails, AnimalWithLocation
from app.services.animal_service import AnimalService
from app.models.animal import AnimalType, SheepGender
from app.services.auth import get_current_active_user, require_admin, require_user
from app.models.user import User

router = APIRouter(prefix="/animals", tags=["animals"])


@router.get("", response_model=List[AnimalWithDetails])
def read_animals(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    animal_type: Optional[AnimalType] = Query(None, description="Filter by animal type"),
    location_id: Optional[int] = Query(None, description="Filter by current location"),
    on_farm: Optional[bool] = Query(True, description="Filter by on_farm status. True=on farm only, False=off farm only, None=all animals"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all animals with optional filtering"""
    service = AnimalService(db)
    animals = service.get_animals(
        skip=skip,
        limit=limit,
        animal_type=animal_type,
        location_id=location_id,
        current_user=current_user,
        on_farm=on_farm
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
    updated_animal = service.update_animal(animal_id, animal, current_user)
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


@router.post("/import-csv")
async def import_animals_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
) -> Dict[str, Any]:
    """
    Import animals from a CSV file.

    Expected CSV format:
    - tag_number (required): Unique tag number for the animal
    - animal_type (required): Type of animal (sheep, chicken, hive)
    - name (optional): Name of the animal
    - sheep_gender (optional): Gender for sheep (ewe or ram)
    - birth_date (optional): Birth date (YYYY-MM-DD)
    - is_sellable (optional): Whether animal is sellable (true/false)
    - sire_tag_number (optional): Tag number of the sire
    - dam_tag_number (optional): Tag number of the dam
    - location_name (optional): Name of the current location

    Returns:
    - success_count: Number of animals successfully imported
    - error_count: Number of animals that failed
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
        rows = list(csv_reader)  # Read all rows into memory
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading CSV file: {str(e)}")

    # Import animals
    service = AnimalService(db)
    success_count = 0
    error_count = 0
    errors = []
    created_animals = []

    # Get all animals for parent lookup
    from app.models.animal import Animal as AnimalModel
    animals_by_tag = {animal.tag_number: animal for animal in db.query(AnimalModel).all()}

    # Get all locations for location lookup
    from app.models.location import Location
    locations_by_name = {location.name: location for location in db.query(Location).all()}

    # Store rows with their original row numbers for error reporting
    pending_rows = [(idx + 2, row) for idx, row in enumerate(rows)]  # Start at 2 to account for header

    # Multi-pass processing: keep processing until no more animals can be created
    max_passes = len(rows) + 1  # Prevent infinite loops
    pass_count = 0

    while pending_rows and pass_count < max_passes:
        pass_count += 1
        next_pending = []

        for row_num, row in pending_rows:
            try:
                # Validate tag_number (required)
                tag_number = row.get('tag_number', '').strip()
                if not tag_number:
                    errors.append(f"Row {row_num}: Missing tag_number")
                    error_count += 1
                    continue

                # Check if tag_number already exists
                if tag_number in animals_by_tag:
                    errors.append(f"Row {row_num}: Animal with tag_number '{tag_number}' already exists")
                    error_count += 1
                    continue

                # Validate animal_type (required)
                animal_type_str = row.get('animal_type', '').strip().upper()
                try:
                    animal_type = AnimalType[animal_type_str]
                except KeyError:
                    valid_types = ', '.join([e.name for e in AnimalType])
                    errors.append(f"Row {row_num}: Invalid animal_type '{animal_type_str}'. Valid types: {valid_types}")
                    error_count += 1
                    continue

                # Parse optional sheep_gender
                sheep_gender = None
                sheep_gender_str = row.get('sheep_gender', '').strip().upper()
                if sheep_gender_str:
                    try:
                        sheep_gender = SheepGender[sheep_gender_str]
                    except KeyError:
                        valid_genders = ', '.join([e.name for e in SheepGender])
                        errors.append(f"Row {row_num}: Invalid sheep_gender '{sheep_gender_str}'. Valid genders: {valid_genders}")
                        error_count += 1
                        continue

                # Parse optional birth_date
                birth_date = None
                birth_date_str = row.get('birth_date', '').strip()
                if birth_date_str:
                    try:
                        birth_date = datetime.strptime(birth_date_str, '%Y-%m-%d')
                    except ValueError:
                        errors.append(f"Row {row_num}: Invalid birth_date format '{birth_date_str}'. Use YYYY-MM-DD")
                        error_count += 1
                        continue

                # Parse optional is_sellable
                is_sellable = False
                is_sellable_str = row.get('is_sellable', '').strip().lower()
                if is_sellable_str in ('true', '1', 'yes', 't', 'y'):
                    is_sellable = True

                # Lookup sire by tag_number
                sire_id = None
                sire_tag_number = row.get('sire_tag_number', '').strip()
                if sire_tag_number:
                    if sire_tag_number in animals_by_tag:
                        sire_id = animals_by_tag[sire_tag_number].id
                    else:
                        # Defer this row if parent is in CSV but not yet processed
                        csv_tag_numbers = {r.get('tag_number', '').strip() for _, r in pending_rows}
                        if sire_tag_number in csv_tag_numbers:
                            next_pending.append((row_num, row))
                            continue
                        else:
                            errors.append(f"Row {row_num}: Sire with tag_number '{sire_tag_number}' not found")
                            error_count += 1
                            continue

                # Lookup dam by tag_number
                dam_id = None
                dam_tag_number = row.get('dam_tag_number', '').strip()
                if dam_tag_number:
                    if dam_tag_number in animals_by_tag:
                        dam_id = animals_by_tag[dam_tag_number].id
                    else:
                        # Defer this row if parent is in CSV but not yet processed
                        csv_tag_numbers = {r.get('tag_number', '').strip() for _, r in pending_rows}
                        if dam_tag_number in csv_tag_numbers:
                            next_pending.append((row_num, row))
                            continue
                        else:
                            errors.append(f"Row {row_num}: Dam with tag_number '{dam_tag_number}' not found")
                            error_count += 1
                            continue

                # Lookup location by name
                location_id = None
                location_name = row.get('location_name', '').strip()
                if location_name:
                    if location_name in locations_by_name:
                        location_id = locations_by_name[location_name].id
                    else:
                        errors.append(f"Row {row_num}: Location '{location_name}' not found")
                        error_count += 1
                        continue

                # Create animal object
                animal_data = AnimalCreate(
                    tag_number=tag_number,
                    animal_type=animal_type,
                    name=row.get('name', '').strip() or None,
                    sheep_gender=sheep_gender,
                    birth_date=birth_date,
                    sire_id=sire_id,
                    dam_id=dam_id,
                    current_location_id=location_id
                )

                # Create the animal
                created_animal = service.create_animal(animal_data)

                # Update is_sellable if specified
                if is_sellable:
                    created_animal.is_sellable = is_sellable
                    db.commit()
                    db.refresh(created_animal)

                # Add to lookup dict for subsequent rows
                animals_by_tag[tag_number] = created_animal
                created_animals.append(created_animal)
                success_count += 1

            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
                error_count += 1

        # Update pending rows for next pass
        pending_rows = next_pending

    # Check if there are any remaining rows that couldn't be processed
    if pending_rows:
        for row_num, row in pending_rows:
            tag_number = row.get('tag_number', '').strip()
            errors.append(f"Row {row_num}: Could not process animal '{tag_number}' - circular dependency or missing parents")
            error_count += 1

    # Convert created animals to Pydantic schemas for serialization
    created_animals_schemas = [Animal.model_validate(animal) for animal in created_animals[:10]]

    return {
        "success_count": success_count,
        "error_count": error_count,
        "total_rows": success_count + error_count,
        "errors": errors,
        "created_animals": created_animals_schemas  # Return first 10 created animals as examples
    }