from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from app.models.event import EventType


class EventBase(BaseModel):
    animal_id: int = Field(..., description="ID of the animal this event relates to")
    event_type: EventType = Field(..., description="Type of event")
    event_date: datetime = Field(..., description="Date and time when the event occurred")
    description: Optional[str] = Field(None, description="Description of the event")
    notes: Optional[str] = Field(None, description="Additional notes about the event")

    # Additional event-specific fields
    medication_name: Optional[str] = Field(None, description="Name of medication (for medication events)")
    dosage: Optional[str] = Field(None, description="Dosage administered")
    veterinarian: Optional[str] = Field(None, description="Veterinarian who performed the procedure")
    cost: Optional[str] = Field(None, description="Cost of the treatment/procedure")


class EventCreate(EventBase):
    """Schema for creating a new event"""
    pass


class EventBulkCreate(BaseModel):
    """Schema for creating multiple events at once"""
    events: List[EventCreate] = Field(..., description="List of events to create")


class EventUpdate(BaseModel):
    """Schema for updating an existing event"""
    animal_id: Optional[int] = None
    event_type: Optional[EventType] = None
    event_date: Optional[datetime] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    medication_name: Optional[str] = None
    dosage: Optional[str] = None
    veterinarian: Optional[str] = None
    cost: Optional[str] = None


class Event(EventBase):
    """Schema for returning event data"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class EventWithAnimal(Event):
    """Schema for event with animal information"""
    pass  # Animal data will be loaded separately if needed