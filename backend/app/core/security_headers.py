"""
Seryvo Platform - Security Headers Middleware
Adds production-ready security headers to all responses.
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses.
    These headers help protect against common web vulnerabilities.
    """
    
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        
        # ===========================================
        # Content Security Policy
        # ===========================================
        # Restricts resources the client can load
        # Note: Adjust as needed for your frontend requirements
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "  # Needed for some frameworks
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https: wss:; "
            "frame-ancestors 'self'; "
            "form-action 'self'; "
            "base-uri 'self'"
        )
        
        # ===========================================
        # XSS Protection (Legacy but still useful)
        # ===========================================
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # ===========================================
        # Content Type Sniffing Protection
        # ===========================================
        # Prevents browsers from MIME-sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # ===========================================
        # Clickjacking Protection
        # ===========================================
        # Prevents the page from being embedded in iframes
        response.headers["X-Frame-Options"] = "DENY"
        
        # ===========================================
        # Referrer Policy
        # ===========================================
        # Controls how much referrer info is sent
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # ===========================================
        # Permissions Policy (formerly Feature-Policy)
        # ===========================================
        # Controls browser features
        response.headers["Permissions-Policy"] = (
            "accelerometer=(), "
            "camera=(), "
            "geolocation=(self), "  # Allow for location services
            "gyroscope=(), "
            "magnetometer=(), "
            "microphone=(), "
            "payment=(self), "  # Allow for payment processing
            "usb=()"
        )
        
        # ===========================================
        # Strict Transport Security (HSTS)
        # ===========================================
        # Forces HTTPS for 1 year, includes subdomains
        # Note: Only add in production with valid SSL
        # This is typically handled by the reverse proxy (nginx)
        # Uncomment if backend serves directly:
        # response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        
        # ===========================================
        # Cache Control for API responses
        # ===========================================
        # Prevent caching of sensitive API responses
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        
        return response
