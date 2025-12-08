"""
Seryvo Platform - Rate Limiting Configuration
Uses slowapi with Redis backend for distributed rate limiting.
"""
from functools import wraps
from typing import Callable, Optional
from fastapi import Request, Response
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import settings


def get_rate_limit_key(request: Request) -> str:
    """
    Get rate limit key based on user identity if authenticated,
    otherwise fall back to IP address.
    """
    # If user is authenticated, use their user_id for more accurate limiting
    if hasattr(request.state, "user") and request.state.user:
        return f"user:{request.state.user.id}"
    
    # Fall back to IP address for unauthenticated requests
    return get_remote_address(request)


def get_auth_rate_limit_key(request: Request) -> str:
    """
    Key function specifically for auth endpoints.
    Uses IP + email combination to prevent brute force attacks.
    """
    ip = get_remote_address(request)
    
    # For login attempts, combine IP with email if available
    # This prevents one attacker from locking out all users from an IP
    try:
        # Try to get email from form/body if it's a login attempt
        if hasattr(request, "_body"):
            import json
            body = json.loads(request._body)
            email = body.get("email", body.get("username", ""))
            if email:
                return f"auth:{ip}:{email}"
    except Exception:
        pass
    
    return f"auth:{ip}"


# Initialize the limiter with Redis storage if available
# Falls back to memory storage if Redis is not configured
def create_limiter() -> Limiter:
    """Create and configure the rate limiter."""
    storage_uri = None
    
    # Use Redis if configured and in production
    if settings.redis_url and settings.is_production:
        storage_uri = settings.redis_url
    
    return Limiter(
        key_func=get_rate_limit_key,
        default_limits=[settings.rate_limit_default] if settings.rate_limit_enabled else [],
        storage_uri=storage_uri,
        headers_enabled=True,  # Add X-RateLimit headers to responses
        strategy="fixed-window",  # Use fixed-window strategy
        swallow_errors=True,  # Don't crash if Redis is down
        enabled=settings.rate_limit_enabled,
    )


# Create global limiter instance
limiter = create_limiter()


# Rate limit presets for different endpoint types
class RateLimits:
    """Predefined rate limit configurations for different endpoint types."""
    
    # Default limit for regular endpoints
    DEFAULT = settings.rate_limit_default  # "100/minute"
    
    # Auth endpoints - stricter to prevent brute force
    AUTH = settings.rate_limit_auth  # "20/minute"
    
    # Sensitive operations - even stricter
    SENSITIVE = settings.rate_limit_sensitive  # "10/minute"
    
    # Read-heavy endpoints - more relaxed
    READ_HEAVY = "200/minute"
    
    # Admin endpoints - reasonable limit
    ADMIN = "50/minute"
    
    # WebSocket connection - per IP
    WEBSOCKET = "10/minute"
    
    # OTP/verification codes - very strict
    OTP = "5/minute"
    
    # File uploads - restrictive
    UPLOAD = "10/minute"
    
    # Booking creation - prevent spamming
    BOOKING_CREATE = "30/minute"
    
    # Payment operations - sensitive
    PAYMENT = "20/minute"


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """Custom handler for rate limit exceeded errors."""
    from fastapi.responses import JSONResponse
    
    retry_after = getattr(exc, "retry_after", 60)
    
    return JSONResponse(
        status_code=429,
        content={
            "error": "rate_limit_exceeded",
            "message": "Too many requests. Please slow down.",
            "retry_after_seconds": retry_after,
            "detail": str(exc.detail) if hasattr(exc, "detail") else None,
        },
        headers={
            "Retry-After": str(retry_after),
            "X-RateLimit-Limit": str(getattr(exc, "limit", "unknown")),
        }
    )


def setup_rate_limiting(app):
    """
    Configure rate limiting middleware and exception handlers for the app.
    
    Args:
        app: FastAPI application instance
    """
    if not settings.rate_limit_enabled:
        print("Rate limiting is disabled")
        return
    
    # Store limiter in app state for access in decorators
    app.state.limiter = limiter
    
    # Add custom exception handler
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
    
    print(f"Rate limiting enabled: {settings.rate_limit_default} default")


# Convenience decorators for common rate limits
def auth_rate_limit():
    """Decorator for auth endpoints with stricter rate limiting."""
    return limiter.limit(
        RateLimits.AUTH,
        key_func=get_auth_rate_limit_key
    )


def sensitive_rate_limit():
    """Decorator for sensitive operations."""
    return limiter.limit(RateLimits.SENSITIVE)


def otp_rate_limit():
    """Decorator for OTP/verification endpoints."""
    return limiter.limit(RateLimits.OTP)


def booking_rate_limit():
    """Decorator for booking creation."""
    return limiter.limit(RateLimits.BOOKING_CREATE)


def payment_rate_limit():
    """Decorator for payment operations."""
    return limiter.limit(RateLimits.PAYMENT)


def admin_rate_limit():
    """Decorator for admin operations."""
    return limiter.limit(RateLimits.ADMIN)


def upload_rate_limit():
    """Decorator for file uploads."""
    return limiter.limit(RateLimits.UPLOAD)
