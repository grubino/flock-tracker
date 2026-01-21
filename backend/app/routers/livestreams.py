from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import logging

from app.database.database import get_db
from app.models.livestream import Livestream
from app.models.user import User
from app.routers.auth import get_current_active_user
from app.services.stream_service import stream_service
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/livestreams", tags=["livestreams"])


# Pydantic schemas
class LivestreamBase(BaseModel):
    name: str
    description: Optional[str] = None
    stream_url: str
    stream_type: str  # "rtsp" or "rtmp"
    location_id: Optional[int] = None
    is_active: bool = True
    username: Optional[str] = None
    password: Optional[str] = None


class LivestreamCreate(LivestreamBase):
    pass


class LivestreamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    stream_url: Optional[str] = None
    stream_type: Optional[str] = None
    location_id: Optional[int] = None
    is_active: Optional[bool] = None
    username: Optional[str] = None
    password: Optional[str] = None


class LivestreamResponse(LivestreamBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


@router.get("", response_model=List[LivestreamResponse])
def get_livestreams(
    location_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all livestreams with optional filters"""
    query = db.query(Livestream)

    if location_id is not None:
        query = query.filter(Livestream.location_id == location_id)

    if is_active is not None:
        query = query.filter(Livestream.is_active == is_active)

    livestreams = query.order_by(Livestream.name).all()
    return livestreams


@router.get("/{livestream_id}", response_model=LivestreamResponse)
def get_livestream(
    livestream_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific livestream by ID"""
    livestream = db.query(Livestream).filter(Livestream.id == livestream_id).first()
    if not livestream:
        raise HTTPException(status_code=404, detail="Livestream not found")
    return livestream


@router.post("", response_model=LivestreamResponse, status_code=status.HTTP_201_CREATED)
def create_livestream(
    livestream_data: LivestreamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new livestream"""
    # Validate stream type
    if livestream_data.stream_type not in ["rtsp", "rtmp"]:
        raise HTTPException(
            status_code=400,
            detail="stream_type must be either 'rtsp' or 'rtmp'"
        )

    livestream = Livestream(**livestream_data.model_dump())
    db.add(livestream)
    db.commit()
    db.refresh(livestream)
    return livestream


@router.put("/{livestream_id}", response_model=LivestreamResponse)
def update_livestream(
    livestream_id: int,
    livestream_data: LivestreamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a livestream"""
    livestream = db.query(Livestream).filter(Livestream.id == livestream_id).first()
    if not livestream:
        raise HTTPException(status_code=404, detail="Livestream not found")

    # Validate stream type if provided
    if livestream_data.stream_type and livestream_data.stream_type not in ["rtsp", "rtmp"]:
        raise HTTPException(
            status_code=400,
            detail="stream_type must be either 'rtsp' or 'rtmp'"
        )

    # Update fields
    for key, value in livestream_data.model_dump(exclude_unset=True).items():
        setattr(livestream, key, value)

    db.commit()
    db.refresh(livestream)
    return livestream


@router.delete("/{livestream_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_livestream(
    livestream_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a livestream"""
    livestream = db.query(Livestream).filter(Livestream.id == livestream_id).first()
    if not livestream:
        raise HTTPException(status_code=404, detail="Livestream not found")

    db.delete(livestream)
    db.commit()
    return None


@router.websocket("/{livestream_id}/stream")
async def stream_websocket(
    websocket: WebSocket,
    livestream_id: int,
    db: Session = Depends(get_db),
):
    """WebSocket endpoint for streaming video"""
    logger.info(f"WebSocket connection request for livestream {livestream_id}")

    try:
        await websocket.accept()
        logger.info(f"WebSocket accepted for livestream {livestream_id}")
    except Exception as e:
        logger.error(f"Failed to accept WebSocket: {e}")
        return

    try:
        # Get livestream configuration
        livestream = db.query(Livestream).filter(Livestream.id == livestream_id).first()
        if not livestream:
            error_msg = "Livestream not found"
            logger.error(f"{error_msg} (ID: {livestream_id})")
            await websocket.close(code=1008, reason=error_msg)
            return

        if not livestream.is_active:
            error_msg = "Livestream is not active"
            logger.warning(f"{error_msg}: {livestream.name}")
            await websocket.close(code=1008, reason=error_msg)
            return

        logger.info(f"Starting stream for livestream {livestream_id}: {livestream.name}")
        logger.info(f"Stream URL: {livestream.stream_url}")
        logger.info(f"Stream type: {livestream.stream_type}")
        logger.info(f"Has auth: {bool(livestream.username)}")

        # Stream using OpenCV (simpler and more reliable for most cases)
        await stream_service.stream_mjpeg_simple(
            websocket,
            livestream.stream_url,
            livestream.username,
            livestream.password
        )

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for livestream {livestream_id}")
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error in WebSocket stream for livestream {livestream_id}: {error_msg}", exc_info=True)

        # Try to send a more user-friendly error message
        if "Failed to open video stream" in error_msg:
            error_msg = "Cannot connect to stream. Check that the URL is correct and the camera is accessible."
        elif "unable to read frames" in error_msg:
            error_msg = "Stream connection established but no video data received. The camera may be offline."

        try:
            await websocket.close(code=1011, reason=error_msg[:123])  # WebSocket close reason limited to 123 bytes
        except Exception as close_error:
            logger.error(f"Failed to close WebSocket properly: {close_error}")
