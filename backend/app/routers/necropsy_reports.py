import os
import uuid
import shutil
from typing import List, Optional
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.necropsy_report import NecropsyReport
from app.models.event import Event

router = APIRouter(prefix="/api/necropsy-reports", tags=["necropsy-reports"])

UPLOAD_DIR = Path("uploads/necropsy_reports")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {".pdf"}
ALLOWED_MIME_TYPES = {"application/pdf"}


def validate_pdf(file: UploadFile) -> None:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail=f"MIME type {file.content_type} not allowed")


@router.post("/upload/{event_id}")
async def upload_necropsy_report(
    event_id: int,
    file: UploadFile = File(...),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Upload a necropsy report PDF for a death event"""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    validate_pdf(file)

    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size: {MAX_FILE_SIZE // 1024 // 1024}MB")

    unique_filename = f"{uuid.uuid4()}.pdf"
    file_path = UPLOAD_DIR / unique_filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        report = NecropsyReport(
            event_id=event_id,
            filename=unique_filename,
            original_filename=file.filename,
            file_path=str(file_path),
            file_size=file_size,
            notes=notes,
        )
        db.add(report)
        db.commit()
        db.refresh(report)

        return {
            "id": report.id,
            "event_id": report.event_id,
            "original_filename": report.original_filename,
            "file_size": report.file_size,
            "notes": report.notes,
            "created_at": report.created_at,
        }

    except Exception as e:
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to upload report: {str(e)}")


@router.get("/event/{event_id}")
def get_event_necropsy_reports(event_id: int, db: Session = Depends(get_db)):
    """Get all necropsy reports for an event"""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    reports = db.query(NecropsyReport).filter(
        NecropsyReport.event_id == event_id
    ).order_by(NecropsyReport.created_at.desc()).all()

    return [
        {
            "id": r.id,
            "event_id": r.event_id,
            "original_filename": r.original_filename,
            "file_size": r.file_size,
            "notes": r.notes,
            "created_at": r.created_at,
        }
        for r in reports
    ]


@router.get("/{report_id}/file")
def download_necropsy_report(report_id: int, db: Session = Depends(get_db)):
    """Download a necropsy report PDF"""
    report = db.query(NecropsyReport).filter(NecropsyReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    file_path = Path(report.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=report.original_filename,
    )


@router.delete("/{report_id}")
def delete_necropsy_report(report_id: int, db: Session = Depends(get_db)):
    """Delete a necropsy report"""
    report = db.query(NecropsyReport).filter(NecropsyReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    file_path = Path(report.file_path)
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception as e:
            print(f"Warning: could not delete file {file_path}: {e}")

    db.delete(report)
    db.commit()

    return {"message": "Report deleted successfully"}
