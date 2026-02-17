from .animals import router as animals_router
from .events import router as events_router
from .expenses import router as expenses_router
from .locations import router as locations_router
from .photographs import router as photographs_router
from .auth import router as auth_router
from .admin import router as admin_router
from .vendors import router as vendors_router
from .receipts import router as receipts_router
from .products import router as products_router
from .orders import router as orders_router
from .care_schedules import router as care_schedules_router
from .livestreams import router as livestreams_router
from .agent import router as agent_router

__all__ = [
    "animals_router",
    "events_router",
    "expenses_router",
    "locations_router",
    "photographs_router",
    "auth_router",
    "admin_router",
    "vendors_router",
    "receipts_router",
    "products_router",
    "orders_router",
    "care_schedules_router",
    "livestreams_router",
    "agent_router"
]