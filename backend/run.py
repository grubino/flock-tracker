#!/usr/bin/env python3
"""
Simple script to run the Flock Tracker API server
"""
import uvicorn
from pathlib import Path
import logging
from app.config import settings

logger = logging.getLogger(__name__)

if __name__ == "__main__":
    # Check if SSL certificates exist
    cert_path = Path(__file__).parent / "certs" / "cert.pem"
    key_path = Path(__file__).parent / "certs" / "key.pem"

    ssl_config = {}
    if cert_path.exists() and key_path.exists():
        print(f"Starting server with HTTPS enabled (port {settings.port})")
        ssl_config = {
            "ssl_keyfile": str(key_path),
            "ssl_certfile": str(cert_path)
        }
    else:
        print(f"SSL certificates not found, starting with HTTP (port {settings.port})")

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
        log_level="info" if not settings.debug else "debug",
        **ssl_config
    )