from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.database import get_db
from app.schemas.vendor import VendorCreate, VendorUpdate, VendorResponse
from app.models.vendor import Vendor
from app.services.auth import get_current_active_user, require_user
from app.models.user import User

router = APIRouter(prefix="/vendors", tags=["vendors"])


@router.get("", response_model=List[VendorResponse])
def list_vendors(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    search: Optional[str] = Query(None, description="Search by vendor name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all vendors with optional filtering"""
    query = db.query(Vendor)

    if search:
        query = query.filter(Vendor.name.ilike(f"%{search}%"))

    query = query.order_by(Vendor.name)
    vendors = query.offset(skip).limit(limit).all()
    return vendors


@router.post("", response_model=VendorResponse)
def create_vendor(
    vendor: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
):
    """Create a new vendor"""
    db_vendor = Vendor(**vendor.model_dump())
    db.add(db_vendor)
    db.commit()
    db.refresh(db_vendor)
    return db_vendor


@router.get("/{vendor_id}", response_model=VendorResponse)
def get_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific vendor by ID"""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@router.put("/{vendor_id}", response_model=VendorResponse)
def update_vendor(
    vendor_id: int,
    vendor_update: VendorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
):
    """Update an existing vendor"""
    db_vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not db_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    update_data = vendor_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_vendor, field, value)

    db.commit()
    db.refresh(db_vendor)
    return db_vendor


@router.delete("/{vendor_id}")
def delete_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
):
    """Delete a vendor"""
    db_vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not db_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    db.delete(db_vendor)
    db.commit()
    return {"message": "Vendor deleted successfully"}
