#!/usr/bin/env python3
"""
Simple script to run the Flock Tracker API server
"""
import uvicorn
from app.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        reload_excludes=[
            "*.db",
            "*.db-journal",
            "*.db-shm",
            "*.db-wal",
            "*.sqlite",
            "*.sqlite3",
            "*.log",
            "*.tmp",
            ".coverage",
            "coverage.xml",
            "htmlcov/*",
            "__pycache__/*",
            "*.pyc",
        ],
        log_level="info" if not settings.debug else "debug"
    )