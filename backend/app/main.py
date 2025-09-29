from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
from app.config import settings
from app.database.database import create_tables, SessionLocal
from app.routers import animals_router, events_router, locations_router, photographs_router, auth_router
from app.models import User  # Import User model to ensure it's registered with SQLAlchemy
from app.services.auth import create_admin_user

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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
app.include_router(animals_router, prefix="/api")
app.include_router(events_router, prefix="/api")
app.include_router(locations_router, prefix="/api")
app.include_router(photographs_router)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Welcome to Flock Tracker API",
        "version": settings.version,
        "documentation": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "app_name": settings.app_name,
        "version": settings.version
    }


@app.get("/api", tags=["API Info"])
async def api_info():
    """API information endpoint"""
    return {
        "app_name": settings.app_name,
        "version": settings.version,
        "endpoints": {
            "animals": "/api/animals",
            "events": "/api/events",
            "locations": "/api/locations"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info"
    )