"""API module exports."""
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.bookings import router as bookings_router
from app.api.drivers import router as drivers_router
from app.api.admin import router as admin_router
from app.api.support import router as support_router
from app.api.websocket import router as websocket_router
from app.api.payments import router as payments_router
from app.api.notifications import router as notifications_router

__all__ = [
    "auth_router",
    "users_router",
    "bookings_router",
    "drivers_router",
    "admin_router",
    "support_router",
    "websocket_router",
    "payments_router",
    "notifications_router",
]
