from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from app.models.animal import AnimalType, SheepGender


class AnimalBase(BaseModel):
    name: Optional[str] = None
    tag_number: str = Field(..., description="Unique tag number for the animal")
    animal_type: AnimalType = Field(..., description="Type of animal (sheep, chicken, hive)")
    sheep_gender: Optional[SheepGender] = Field(None, description="Gender for sheep (ewe or ram)")
    birth_date: Optional[datetime] = None
    current_location_id: Optional[int] = None
    sire_id: Optional[int] = None
    dam_id: Optional[int] = None


class AnimalCreate(AnimalBase):
    """Schema for creating a new animal"""
    pass


class AnimalUpdate(BaseModel):
    """Schema for updating an existing animal"""
    name: Optional[str] = None
    tag_number: Optional[str] = None
    animal_type: Optional[AnimalType] = None
    sheep_gender: Optional[SheepGender] = None
    birth_date: Optional[datetime] = None
    current_location_id: Optional[int] = None
    sire_id: Optional[int] = None
    dam_id: Optional[int] = None


class Animal(AnimalBase):
    """Schema for returning animal data"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


# Import schemas for nested objects
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.schemas.location import Location
    from app.schemas.photograph import PhotographBrief


class LocationBrief(BaseModel):
    """Brief location info for nested responses"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    paddock_name: Optional[str] = None


class AnimalBrief(BaseModel):
    """Brief animal info for nested responses"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: Optional[str] = None
    tag_number: str
    animal_type: AnimalType
    sheep_gender: Optional[SheepGender] = None


class AnimalWithLocation(Animal):
    """Schema for animal with location information"""
    current_location: Optional[LocationBrief] = None


class AnimalWithLineage(Animal):
    """Schema for animal with lineage information"""
    sire: Optional[AnimalBrief] = None
    dam: Optional[AnimalBrief] = None


class AnimalWithDetails(Animal):
    """Schema for animal with all related data"""
    current_location: Optional[LocationBrief] = None
    sire: Optional[AnimalBrief] = None
    dam: Optional[AnimalBrief] = None