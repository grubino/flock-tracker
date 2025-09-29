import os
import uuid
import shutil
from typing import List, Optional
from pathlib import Path
from PIL import Image

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.photograph import Photograph
from app.models.animal import Animal
from app.schemas.photograph import (
    Photograph as PhotographSchema,
    PhotographCreate,
    PhotographUpdate,
    PhotographUploadResponse
)

router = APIRouter(prefix="/api/photographs", tags=["photographs"])

# Configuration
UPLOAD_DIR = Path("uploads/photos")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


def get_image_dimensions(file_path: str) -> tuple[Optional[int], Optional[int]]:
    """Get image dimensions using PIL"""
    try:
        with Image.open(file_path) as img:
            return img.width, img.height
    except Exception:
        return None, None


def validate_image_file(file: UploadFile) -> None:
    """Validate uploaded image file"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file_ext} not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Check MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"MIME type {file.content_type} not allowed"
        )


@router.post("/upload/{animal_id}", response_model=PhotographUploadResponse)
async def upload_photograph(
    animal_id: int,
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    is_primary: bool = Form(False),
    db: Session = Depends(get_db)
):
    """Upload a photograph for an animal"""

    # Validate animal exists
    animal = db.query(Animal).filter(Animal.id == animal_id).first()
    if not animal:
        raise HTTPException(status_code=404, detail="Animal not found")

    # Validate file
    validate_image_file(file)

    # Check file size
    file.file.seek(0, 2)  # Move to end of file
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // 1024 // 1024}MB"
        )

    # Generate unique filename
    file_ext = Path(file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename

    try:
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Get image dimensions
        width, height = get_image_dimensions(str(file_path))

        # If this is set as primary, unset any existing primary photos
        if is_primary:
            db.query(Photograph).filter(
                Photograph.animal_id == animal_id,
                Photograph.is_primary == True
            ).update({Photograph.is_primary: False})

        # Create database record
        photograph = Photograph(
            animal_id=animal_id,
            filename=unique_filename,
            original_filename=file.filename,
            file_path=str(file_path),
            file_size=file_size,
            mime_type=file.content_type,
            width=width,
            height=height,
            caption=caption,
            description=description,
            is_primary=is_primary
        )

        db.add(photograph)
        db.commit()
        db.refresh(photograph)

        return PhotographUploadResponse(
            photograph=PhotographSchema.model_validate(photograph),
            message="Photograph uploaded successfully"
        )

    except Exception as e:
        # Clean up file if database operation failed
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to upload photograph: {str(e)}")


@router.get("/animal/{animal_id}", response_model=List[PhotographSchema])
def get_animal_photographs(animal_id: int, db: Session = Depends(get_db)):
    """Get all photographs for an animal"""
    animal = db.query(Animal).filter(Animal.id == animal_id).first()
    if not animal:
        raise HTTPException(status_code=404, detail="Animal not found")

    photographs = db.query(Photograph).filter(
        Photograph.animal_id == animal_id
    ).order_by(Photograph.is_primary.desc(), Photograph.created_at.desc()).all()

    return photographs


@router.get("/{photograph_id}", response_model=PhotographSchema)
def get_photograph(photograph_id: int, db: Session = Depends(get_db)):
    """Get a specific photograph"""
    photograph = db.query(Photograph).filter(Photograph.id == photograph_id).first()
    if not photograph:
        raise HTTPException(status_code=404, detail="Photograph not found")

    return photograph


@router.get("/{photograph_id}/file")
def get_photograph_file(photograph_id: int, db: Session = Depends(get_db)):
    """Serve the actual image file"""
    photograph = db.query(Photograph).filter(Photograph.id == photograph_id).first()
    if not photograph:
        raise HTTPException(status_code=404, detail="Photograph not found")

    file_path = Path(photograph.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image file not found")

    return FileResponse(
        path=file_path,
        media_type=photograph.mime_type,
        filename=photograph.original_filename
    )


@router.put("/{photograph_id}", response_model=PhotographSchema)
def update_photograph(
    photograph_id: int,
    photograph_update: PhotographUpdate,
    db: Session = Depends(get_db)
):
    """Update photograph metadata"""
    photograph = db.query(Photograph).filter(Photograph.id == photograph_id).first()
    if not photograph:
        raise HTTPException(status_code=404, detail="Photograph not found")

    # If setting as primary, unset other primary photos for the same animal
    if photograph_update.is_primary is True:
        db.query(Photograph).filter(
            Photograph.animal_id == photograph.animal_id,
            Photograph.id != photograph_id,
            Photograph.is_primary == True
        ).update({Photograph.is_primary: False})

    # Update fields
    update_data = photograph_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(photograph, field, value)

    db.commit()
    db.refresh(photograph)

    return photograph


@router.delete("/{photograph_id}")
def delete_photograph(photograph_id: int, db: Session = Depends(get_db)):
    """Delete a photograph"""
    photograph = db.query(Photograph).filter(Photograph.id == photograph_id).first()
    if not photograph:
        raise HTTPException(status_code=404, detail="Photograph not found")

    # Delete file from filesystem
    file_path = Path(photograph.file_path)
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception as e:
            # Log the error but don't fail the request
            print(f"Warning: Could not delete file {file_path}: {e}")

    # Delete from database
    db.delete(photograph)
    db.commit()

    return {"message": "Photograph deleted successfully"}


@router.post("/{photograph_id}/set-primary")
def set_primary_photograph(photograph_id: int, db: Session = Depends(get_db)):
    """Set a photograph as the primary photo for an animal"""
    photograph = db.query(Photograph).filter(Photograph.id == photograph_id).first()
    if not photograph:
        raise HTTPException(status_code=404, detail="Photograph not found")

    # Unset all primary photos for this animal
    db.query(Photograph).filter(
        Photograph.animal_id == photograph.animal_id,
        Photograph.is_primary == True
    ).update({Photograph.is_primary: False})

    # Set this photo as primary
    photograph.is_primary = True
    db.commit()

    return {"message": "Primary photograph updated successfully"}