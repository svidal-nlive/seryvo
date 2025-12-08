"""
Seryvo Platform - Production Logging Configuration
Provides structured logging without exposing sensitive data.
"""
import logging
import sys
from typing import Any, Dict, Optional
from functools import lru_cache

from app.core.config import settings


# ===========================================
# Sensitive Data Filter
# ===========================================

class SensitiveDataFilter(logging.Filter):
    """
    Filter that removes or masks sensitive data from log records.
    """
    
    SENSITIVE_FIELDS = {
        'password', 'token', 'secret', 'api_key', 'apikey', 
        'authorization', 'cookie', 'otp', 'otp_code', 'code',
        'credit_card', 'card_number', 'cvv', 'ssn', 'secret_key'
    }
    
    def filter(self, record: logging.LogRecord) -> bool:
        """Filter sensitive data from log messages."""
        if hasattr(record, 'msg'):
            record.msg = self._mask_sensitive(str(record.msg))
        return True
    
    def _mask_sensitive(self, msg: str) -> str:
        """Mask potentially sensitive data in log messages."""
        msg_lower = msg.lower()
        for field in self.SENSITIVE_FIELDS:
            if field in msg_lower:
                # Simple masking - in production, use more sophisticated approach
                import re
                pattern = rf'({field}["\']?\s*[:=]\s*["\']?)([^"\'\s,}}]+)'
                msg = re.sub(pattern, r'\1[REDACTED]', msg, flags=re.IGNORECASE)
        return msg


# ===========================================
# Custom Formatter
# ===========================================

class SeryvoFormatter(logging.Formatter):
    """
    Custom formatter with structured output for production.
    """
    
    def format(self, record: logging.LogRecord) -> str:
        # Add extra context
        record.app = settings.app_name
        record.env = settings.app_env
        
        return super().format(record)


# ===========================================
# Logger Setup
# ===========================================

@lru_cache()
def get_logger(name: str = "seryvo") -> logging.Logger:
    """
    Get a configured logger instance.
    
    Args:
        name: Logger name (typically module name)
        
    Returns:
        Configured Logger instance
    """
    logger = logging.getLogger(name)
    
    # Only configure if not already configured
    if not logger.handlers:
        logger.setLevel(logging.DEBUG if settings.debug else logging.INFO)
        
        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.DEBUG if settings.debug else logging.INFO)
        
        # Format based on environment
        if settings.is_production:
            # Structured format for production (easier to parse in log aggregators)
            fmt = '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s"}'
        else:
            # Human-readable for development
            fmt = '%(asctime)s | %(levelname)-8s | %(name)s | %(message)s'
        
        formatter = SeryvoFormatter(fmt, datefmt='%Y-%m-%d %H:%M:%S')
        console_handler.setFormatter(formatter)
        
        # Add sensitive data filter in production
        if settings.is_production:
            console_handler.addFilter(SensitiveDataFilter())
        
        logger.addHandler(console_handler)
        logger.propagate = False
    
    return logger


# ===========================================
# Logging Utilities
# ===========================================

def log_request(
    logger: logging.Logger,
    method: str,
    path: str,
    user_id: Optional[int] = None,
    extra: Optional[Dict[str, Any]] = None
) -> None:
    """Log an API request."""
    msg = f"{method} {path}"
    if user_id:
        msg += f" | user_id={user_id}"
    if extra:
        # Filter out sensitive keys
        safe_extra = {k: v for k, v in extra.items() 
                      if k.lower() not in SensitiveDataFilter.SENSITIVE_FIELDS}
        if safe_extra:
            msg += f" | {safe_extra}"
    logger.info(msg)


def log_error(
    logger: logging.Logger,
    message: str,
    error: Optional[Exception] = None,
    user_id: Optional[int] = None,
    include_traceback: bool = False
) -> None:
    """Log an error safely."""
    msg = message
    if user_id:
        msg += f" | user_id={user_id}"
    if error:
        # Don't include error message if it might contain sensitive data
        msg += f" | error_type={type(error).__name__}"
    
    if include_traceback and settings.debug:
        logger.exception(msg)
    else:
        logger.error(msg)


def log_security_event(
    logger: logging.Logger,
    event_type: str,
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    success: bool = True,
    details: Optional[str] = None
) -> None:
    """Log a security-related event."""
    msg = f"SECURITY | {event_type} | success={success}"
    if user_id:
        msg += f" | user_id={user_id}"
    if ip_address:
        msg += f" | ip={ip_address}"
    if details and not settings.is_production:
        # Only include details in non-production
        msg += f" | {details}"
    
    level = logging.INFO if success else logging.WARNING
    logger.log(level, msg)


# Create default logger
logger = get_logger()
