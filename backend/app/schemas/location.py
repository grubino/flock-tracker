from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


class LocationBase(BaseModel):
    name: str = Field(..., description="Name of the location")
    address: Optional[str] = Field(None, description="Physical address of the location")
    paddock_name: Optional[str] = Field(None, description="Name of the paddock/field")
    description: Optional[str] = Field(None, description="Description of the location")

    # Geographic information
    latitude: Optional[float] = Field(None, description="Latitude coordinate")
    longitude: Optional[float] = Field(None, description="Longitude coordinate")

    # Area information
    area_size: Optional[float] = Field(None, description="Size of the area")
    area_unit: Optional[str] = Field(None, description="Unit of area measurement (acres, hectares, etc.)")

    # Capacity
    capacity: Optional[int] = Field(None, description="Maximum number of animals this location can hold")


class LocationCreate(LocationBase):
    """Schema for creating a new location"""
    pass


class LocationUpdate(BaseModel):
    """Schema for updating an existing location"""
    name: Optional[str] = None
    address: Optional[str] = None
    paddock_name: Optional[str] = None
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_size: Optional[float] = None
    area_unit: Optional[str] = None
    capacity: Optional[int] = None


class Location(LocationBase):
    """Schema for returning location data"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class LocationWithAnimals(Location):
    """Schema for location with current animals"""
    pass  # Animals will be loaded separately if needed