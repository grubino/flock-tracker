from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


class PhotographBase(BaseModel):
    animal_id: int = Field(..., description="ID of the animal this photograph belongs to")
    caption: Optional[str] = Field(None, description="Caption for the photograph")
    description: Optional[str] = Field(None, description="Description of the photograph")
    date_taken: Optional[datetime] = Field(None, description="Date when the photograph was taken")
    is_primary: bool = Field(False, description="Whether this is the primary photo for the animal")


class PhotographCreate(PhotographBase):
    """Schema for creating a new photograph (metadata only - file upload handled separately)"""
    pass


class PhotographUpdate(BaseModel):
    """Schema for updating photograph metadata"""
    caption: Optional[str] = None
    description: Optional[str] = None
    date_taken: Optional[datetime] = None
    is_primary: Optional[bool] = None


class Photograph(PhotographBase):
    """Schema for returning photograph data"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    original_filename: str
    file_path: str
    file_size: int
    mime_type: str
    width: Optional[int] = None
    height: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class PhotographBrief(BaseModel):
    """Brief photograph info for nested responses"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    file_path: str
    caption: Optional[str] = None
    is_primary: bool
    width: Optional[int] = None
    height: Optional[int] = None


class PhotographUploadResponse(BaseModel):
    """Response schema for photograph upload"""
    photograph: Photograph
    message: str = "Photograph uploaded successfully"