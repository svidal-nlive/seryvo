"""
Seryvo Platform - FastAPI Main Application
Entry point for the backend API server
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import init_db, close_db
from app.core.rate_limiter import setup_rate_limiting
from app.core.security_headers import SecurityHeadersMiddleware
from app.api import (
    auth_router,
    users_router,
    bookings_router,
    drivers_router,
    admin_router,
    support_router,
    websocket_router,
    payments_router,
    notifications_router,
    organizations_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    print(f"Starting {settings.app_name}...")
    await init_db()
    print("Database initialized")
    
    yield
    
    # Shutdown
    print("Shutting down...")
    await close_db()
    print("Database connection closed")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Seryvo Platform API - Premium transportation booking platform",
    version="1.0.0",
    docs_url="/docs",  # Always available for API reference
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add Security Headers (production-ready)
app.add_middleware(SecurityHeadersMiddleware)

# Configure Rate Limiting
setup_rate_limiting(app)


# Import custom exception for handler
from app.core.errors import SeryvoException, ErrorCode


# Custom SeryvoException handler
@app.exception_handler(SeryvoException)
async def seryvo_exception_handler(request: Request, exc: SeryvoException):
    """Handle Seryvo-specific exceptions with standardized format."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
        },
        headers=exc.headers,
    )


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle uncaught exceptions."""
    if settings.debug:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "error_code": ErrorCode.INTERNAL_ERROR.value,
                    "message": "An internal error occurred",
                    "detail": str(exc),
                },
            }
        )
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "error_code": ErrorCode.INTERNAL_ERROR.value,
                "message": "An internal error occurred",
            },
        }
    )


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "app": settings.app_name}


# API version info
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API info."""
    return {
        "app": settings.app_name,
        "version": "1.0.0",
        "docs": "/docs" if settings.debug else "disabled",
    }


# Include routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(bookings_router, prefix="/api/v1")
app.include_router(drivers_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(support_router, prefix="/api/v1")
app.include_router(websocket_router, prefix="/api/v1")
app.include_router(payments_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(organizations_router, prefix="/api/v1")


# Run with uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.debug,
    )
