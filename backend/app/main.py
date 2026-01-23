from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import os
import argparse
import sys
from pathlib import Path
from datetime import datetime
from app.config import settings

# Server startup timestamp for cache invalidation
SERVER_START_TIME = datetime.now().isoformat()
from app.database.database import create_tables, SessionLocal
from app.routers import animals_router, events_router, expenses_router, locations_router, photographs_router, auth_router, admin_router, vendors_router, receipts_router, products_router, orders_router, care_schedules_router, livestreams_router
from app.models import *  # Import all models to ensure they're registered with SQLAlchemy
from app.services.auth import create_admin_user

# Parse command line arguments for log level
parser = argparse.ArgumentParser(description='Flock Tracker API Server')
parser.add_argument('--log-level', type=str,
                   choices=['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'],
                   default='INFO',
                   help='Set the logging level (default: INFO)')
args, unknown = parser.parse_known_args()

# Configure logging
log_level = getattr(logging, args.log_level.upper())
logging.basicConfig(
    level=log_level,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
logger.info(f"Logging configured at {args.log_level} level")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting up Flock Tracker API...")
    try:
        create_tables()
        logger.info("Database tables created successfully")

        # Create admin user if ADMIN_PASSWORD is provided
        if settings.admin_password:
            db = SessionLocal()
            try:
                admin_user = create_admin_user(db, settings.admin_password)
                if admin_user:
                    logger.info(f"Admin user created/verified: {admin_user.email}")
                else:
                    logger.info("Admin user already exists")
            except Exception as e:
                logger.error(f"Failed to create admin user: {e}")
            finally:
                db.close()
        else:
            logger.warning("ADMIN_PASSWORD not set - skipping admin user creation")

    except Exception as e:
        logger.error(f"Failed to initialize application: {e}")
        raise

    yield

    # Shutdown
    logger.info("Shutting down Flock Tracker API...")


app = FastAPI(
    title=settings.app_name,
    description="""
    ## Flock Tracker API

    A comprehensive API for tracking farm animals, events, and locations.

    ### Features:
    * **Animal Management**: Track sheep, chickens, and bees with lineage information
    * **Event Tracking**: Record health events, treatments, breeding, and more
    * **Location Management**: Manage paddocks and locations with capacity tracking
    * **Search & Filter**: Powerful search and filtering capabilities

    ### Animal Types:
    * **Sheep**: Track lineage, health events, and location with gender tracking (ewes/rams)
    * **Chickens**: Monitor flock health and egg production
    * **Hives**: Track hive health and honey production
    """,
    version=settings.version,
    debug=settings.debug,
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins_list(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests for debugging"""
    logger.debug(f"Incoming request: {request.method} {request.url.path}")
    logger.debug(f"Headers: {dict(request.headers)}")
    logger.debug(f"Client: {request.client.host if request.client else 'unknown'}:{request.client.port if request.client else 'unknown'}")

    try:
        response = await call_next(request)
        logger.debug(f"Response status: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"Request processing error: {e}", exc_info=True)
        raise


# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


# Include routers
app.include_router(auth_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(animals_router, prefix="/api")
app.include_router(events_router, prefix="/api")
app.include_router(expenses_router, prefix="/api")
app.include_router(vendors_router, prefix="/api")
app.include_router(receipts_router, prefix="/api")
app.include_router(locations_router, prefix="/api")
app.include_router(care_schedules_router, prefix="/api")
app.include_router(livestreams_router)
app.include_router(products_router)
app.include_router(orders_router)
app.include_router(photographs_router)

# API and health endpoints (before static file mounting)
@app.get("/api", tags=["API Info"])
async def api_info():
    """API information endpoint"""
    return {
        "app_name": settings.app_name,
        "version": settings.version,
        "server_start_time": SERVER_START_TIME,
        "endpoints": {
            "animals": "/api/animals",
            "events": "/api/events",
            "locations": "/api/locations"
        }
    }

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "app_name": settings.app_name,
        "version": settings.version
    }

@app.get("/download/apk", tags=["Downloads"])
async def download_apk():
    """Download the Android APK file"""
    apk_path = Path(__file__).parent.parent.parent / "frontend" / "android" / "app" / "build" / "outputs" / "apk" / "debug" / "app-debug.apk"

    if not apk_path.exists():
        return JSONResponse(
            status_code=404,
            content={"detail": "APK file not found. Please build the Android app first."}
        )

    return FileResponse(
        path=str(apk_path),
        filename="flock-tracker.apk",
        media_type="application/vnd.android.package-archive"
    )

# Static file serving - mount after API routes but before catch-all
static_dir = Path(__file__).parent.parent / "static"
if static_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(static_dir / "assets")), name="assets")

# Frontend routes
@app.get("/", response_class=FileResponse, tags=["Frontend"])
async def serve_frontend():
    """Serve the React frontend"""
    static_dir = Path(__file__).parent.parent / "static"
    index_file = static_dir / "index.html"

    if index_file.exists():
        return FileResponse(str(index_file))
    else:
        # Fallback if static files aren't built yet
        return {
            "message": "Welcome to Flock Tracker API",
            "version": settings.version,
            "documentation": "/docs",
            "redoc": "/redoc",
            "note": "React frontend not built yet. Run 'npm run build' in the frontend directory."
        }

# Catch-all route for React Router (SPA routing) - must be last
@app.get("/{full_path:path}", response_class=FileResponse, tags=["Frontend"])
async def serve_spa(full_path: str):
    """Serve React app for all non-API routes (SPA routing)"""
    # Explicitly exclude API routes and system paths
    excluded_paths = ("api", "docs", "redoc", "health", "openapi.json", "assets")

    # Check if this is an API route or system path
    if full_path.startswith(excluded_paths) or full_path in excluded_paths:
        return JSONResponse(
            status_code=404,
            content={"detail": f"Not found: /{full_path}"}
        )

    static_dir = Path(__file__).parent.parent / "static"
    index_file = static_dir / "index.html"

    if index_file.exists():
        return FileResponse(str(index_file))
    else:
        return JSONResponse(
            status_code=404,
            content={"detail": "Frontend not found. Please build the React app first."}
        )


if __name__ == "__main__":
    import uvicorn

    # Check if SSL certificates exist
    cert_path = Path(__file__).parent.parent / "certs" / "cert.pem"
    key_path = Path(__file__).parent.parent / "certs" / "key.pem"

    ssl_config = {}
    if cert_path.exists() and key_path.exists():
        logger.info("Starting server with HTTPS enabled")
        ssl_config = {
            "ssl_keyfile": str(key_path),
            "ssl_certfile": str(cert_path)
        }
    else:
        logger.warning("SSL certificates not found, starting with HTTP")

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=args.log_level.lower(),
        **ssl_config
    )