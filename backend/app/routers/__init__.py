from .animals import router as animals_router
from .events import router as events_router
from .locations import router as locations_router
from .photographs import router as photographs_router
from .auth import router as auth_router
from .admin import router as admin_router

__all__ = ["animals_router", "events_router", "locations_router", "photographs_router", "auth_router", "admin_router"]