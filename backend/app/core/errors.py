"""
Seryvo Platform - Standardized Error Handling
Provides consistent error codes, messages, and response structures.
"""
from enum import Enum
from typing import Optional, Any, Dict, List
from fastapi import HTTPException, status
from pydantic import BaseModel


class ErrorCode(str, Enum):
    """Standardized error codes for the API."""
    
    # Authentication errors (1xxx)
    AUTH_INVALID_CREDENTIALS = "AUTH_001"
    AUTH_TOKEN_EXPIRED = "AUTH_002"
    AUTH_TOKEN_INVALID = "AUTH_003"
    AUTH_INSUFFICIENT_PERMISSIONS = "AUTH_004"
    AUTH_ACCOUNT_DISABLED = "AUTH_005"
    AUTH_EMAIL_NOT_VERIFIED = "AUTH_006"
    AUTH_PHONE_NOT_VERIFIED = "AUTH_007"
    AUTH_MFA_REQUIRED = "AUTH_008"
    AUTH_SESSION_EXPIRED = "AUTH_009"
    
    # Validation errors (2xxx)
    VALIDATION_FAILED = "VAL_001"
    VALIDATION_EMAIL_INVALID = "VAL_002"
    VALIDATION_PASSWORD_WEAK = "VAL_003"
    VALIDATION_PHONE_INVALID = "VAL_004"
    VALIDATION_REQUIRED_FIELD = "VAL_005"
    VALIDATION_INVALID_FORMAT = "VAL_006"
    VALIDATION_OUT_OF_RANGE = "VAL_007"
    
    # Resource errors (3xxx)
    RESOURCE_NOT_FOUND = "RES_001"
    RESOURCE_ALREADY_EXISTS = "RES_002"
    RESOURCE_CONFLICT = "RES_003"
    RESOURCE_DELETED = "RES_004"
    RESOURCE_LOCKED = "RES_005"
    
    # Booking errors (4xxx)
    BOOKING_NOT_FOUND = "BOOK_001"
    BOOKING_ALREADY_CANCELLED = "BOOK_002"
    BOOKING_CANNOT_CANCEL = "BOOK_003"
    BOOKING_ALREADY_COMPLETED = "BOOK_004"
    BOOKING_INVALID_STATUS_TRANSITION = "BOOK_005"
    BOOKING_NO_DRIVERS_AVAILABLE = "BOOK_006"
    BOOKING_DRIVER_ALREADY_ASSIGNED = "BOOK_007"
    BOOKING_INVALID_STOPS = "BOOK_008"
    BOOKING_PAYMENT_REQUIRED = "BOOK_009"
    BOOKING_TIME_SLOT_UNAVAILABLE = "BOOK_010"
    
    # Driver errors (5xxx)
    DRIVER_NOT_FOUND = "DRV_001"
    DRIVER_NOT_ACTIVE = "DRV_002"
    DRIVER_NOT_VERIFIED = "DRV_003"
    DRIVER_NO_VEHICLE = "DRV_004"
    DRIVER_SUSPENDED = "DRV_005"
    DRIVER_BANNED = "DRV_006"
    DRIVER_ALREADY_ON_TRIP = "DRV_007"
    DRIVER_DOCUMENT_EXPIRED = "DRV_008"
    DRIVER_LOCATION_REQUIRED = "DRV_009"
    
    # Payment errors (6xxx)
    PAYMENT_FAILED = "PAY_001"
    PAYMENT_INSUFFICIENT_FUNDS = "PAY_002"
    PAYMENT_METHOD_INVALID = "PAY_003"
    PAYMENT_METHOD_REQUIRED = "PAY_004"
    PAYMENT_ALREADY_PROCESSED = "PAY_005"
    PAYMENT_REFUND_FAILED = "PAY_006"
    PAYMENT_AMOUNT_INVALID = "PAY_007"
    
    # Rate limiting (7xxx)
    RATE_LIMIT_EXCEEDED = "RATE_001"
    OTP_COOLDOWN_ACTIVE = "RATE_002"
    
    # System errors (9xxx)
    INTERNAL_ERROR = "SYS_001"
    SERVICE_UNAVAILABLE = "SYS_002"
    DATABASE_ERROR = "SYS_003"
    EXTERNAL_SERVICE_ERROR = "SYS_004"
    FILE_UPLOAD_ERROR = "SYS_005"


# Error code to HTTP status mapping
ERROR_STATUS_MAP: Dict[ErrorCode, int] = {
    # Auth errors -> 401/403
    ErrorCode.AUTH_INVALID_CREDENTIALS: status.HTTP_401_UNAUTHORIZED,
    ErrorCode.AUTH_TOKEN_EXPIRED: status.HTTP_401_UNAUTHORIZED,
    ErrorCode.AUTH_TOKEN_INVALID: status.HTTP_401_UNAUTHORIZED,
    ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS: status.HTTP_403_FORBIDDEN,
    ErrorCode.AUTH_ACCOUNT_DISABLED: status.HTTP_403_FORBIDDEN,
    ErrorCode.AUTH_EMAIL_NOT_VERIFIED: status.HTTP_403_FORBIDDEN,
    ErrorCode.AUTH_PHONE_NOT_VERIFIED: status.HTTP_403_FORBIDDEN,
    ErrorCode.AUTH_MFA_REQUIRED: status.HTTP_403_FORBIDDEN,
    ErrorCode.AUTH_SESSION_EXPIRED: status.HTTP_401_UNAUTHORIZED,
    
    # Validation errors -> 400/422
    ErrorCode.VALIDATION_FAILED: status.HTTP_422_UNPROCESSABLE_ENTITY,
    ErrorCode.VALIDATION_EMAIL_INVALID: status.HTTP_422_UNPROCESSABLE_ENTITY,
    ErrorCode.VALIDATION_PASSWORD_WEAK: status.HTTP_422_UNPROCESSABLE_ENTITY,
    ErrorCode.VALIDATION_PHONE_INVALID: status.HTTP_422_UNPROCESSABLE_ENTITY,
    ErrorCode.VALIDATION_REQUIRED_FIELD: status.HTTP_422_UNPROCESSABLE_ENTITY,
    ErrorCode.VALIDATION_INVALID_FORMAT: status.HTTP_422_UNPROCESSABLE_ENTITY,
    ErrorCode.VALIDATION_OUT_OF_RANGE: status.HTTP_422_UNPROCESSABLE_ENTITY,
    
    # Resource errors -> 404/409
    ErrorCode.RESOURCE_NOT_FOUND: status.HTTP_404_NOT_FOUND,
    ErrorCode.RESOURCE_ALREADY_EXISTS: status.HTTP_409_CONFLICT,
    ErrorCode.RESOURCE_CONFLICT: status.HTTP_409_CONFLICT,
    ErrorCode.RESOURCE_DELETED: status.HTTP_410_GONE,
    ErrorCode.RESOURCE_LOCKED: status.HTTP_423_LOCKED,
    
    # Booking errors -> 400/404/409
    ErrorCode.BOOKING_NOT_FOUND: status.HTTP_404_NOT_FOUND,
    ErrorCode.BOOKING_ALREADY_CANCELLED: status.HTTP_409_CONFLICT,
    ErrorCode.BOOKING_CANNOT_CANCEL: status.HTTP_400_BAD_REQUEST,
    ErrorCode.BOOKING_ALREADY_COMPLETED: status.HTTP_409_CONFLICT,
    ErrorCode.BOOKING_INVALID_STATUS_TRANSITION: status.HTTP_400_BAD_REQUEST,
    ErrorCode.BOOKING_NO_DRIVERS_AVAILABLE: status.HTTP_503_SERVICE_UNAVAILABLE,
    ErrorCode.BOOKING_DRIVER_ALREADY_ASSIGNED: status.HTTP_409_CONFLICT,
    ErrorCode.BOOKING_INVALID_STOPS: status.HTTP_400_BAD_REQUEST,
    ErrorCode.BOOKING_PAYMENT_REQUIRED: status.HTTP_402_PAYMENT_REQUIRED,
    ErrorCode.BOOKING_TIME_SLOT_UNAVAILABLE: status.HTTP_409_CONFLICT,
    
    # Driver errors -> 400/403/404
    ErrorCode.DRIVER_NOT_FOUND: status.HTTP_404_NOT_FOUND,
    ErrorCode.DRIVER_NOT_ACTIVE: status.HTTP_403_FORBIDDEN,
    ErrorCode.DRIVER_NOT_VERIFIED: status.HTTP_403_FORBIDDEN,
    ErrorCode.DRIVER_NO_VEHICLE: status.HTTP_400_BAD_REQUEST,
    ErrorCode.DRIVER_SUSPENDED: status.HTTP_403_FORBIDDEN,
    ErrorCode.DRIVER_BANNED: status.HTTP_403_FORBIDDEN,
    ErrorCode.DRIVER_ALREADY_ON_TRIP: status.HTTP_409_CONFLICT,
    ErrorCode.DRIVER_DOCUMENT_EXPIRED: status.HTTP_403_FORBIDDEN,
    ErrorCode.DRIVER_LOCATION_REQUIRED: status.HTTP_400_BAD_REQUEST,
    
    # Payment errors -> 400/402
    ErrorCode.PAYMENT_FAILED: status.HTTP_400_BAD_REQUEST,
    ErrorCode.PAYMENT_INSUFFICIENT_FUNDS: status.HTTP_402_PAYMENT_REQUIRED,
    ErrorCode.PAYMENT_METHOD_INVALID: status.HTTP_400_BAD_REQUEST,
    ErrorCode.PAYMENT_METHOD_REQUIRED: status.HTTP_402_PAYMENT_REQUIRED,
    ErrorCode.PAYMENT_ALREADY_PROCESSED: status.HTTP_409_CONFLICT,
    ErrorCode.PAYMENT_REFUND_FAILED: status.HTTP_400_BAD_REQUEST,
    ErrorCode.PAYMENT_AMOUNT_INVALID: status.HTTP_400_BAD_REQUEST,
    
    # Rate limiting -> 429
    ErrorCode.RATE_LIMIT_EXCEEDED: status.HTTP_429_TOO_MANY_REQUESTS,
    ErrorCode.OTP_COOLDOWN_ACTIVE: status.HTTP_429_TOO_MANY_REQUESTS,
    
    # System errors -> 500/503
    ErrorCode.INTERNAL_ERROR: status.HTTP_500_INTERNAL_SERVER_ERROR,
    ErrorCode.SERVICE_UNAVAILABLE: status.HTTP_503_SERVICE_UNAVAILABLE,
    ErrorCode.DATABASE_ERROR: status.HTTP_500_INTERNAL_SERVER_ERROR,
    ErrorCode.EXTERNAL_SERVICE_ERROR: status.HTTP_502_BAD_GATEWAY,
    ErrorCode.FILE_UPLOAD_ERROR: status.HTTP_500_INTERNAL_SERVER_ERROR,
}


# Human-readable error messages
ERROR_MESSAGES: Dict[ErrorCode, str] = {
    ErrorCode.AUTH_INVALID_CREDENTIALS: "Invalid email or password",
    ErrorCode.AUTH_TOKEN_EXPIRED: "Your session has expired. Please log in again",
    ErrorCode.AUTH_TOKEN_INVALID: "Invalid authentication token",
    ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS: "You don't have permission to perform this action",
    ErrorCode.AUTH_ACCOUNT_DISABLED: "Your account has been disabled",
    ErrorCode.AUTH_EMAIL_NOT_VERIFIED: "Please verify your email address",
    ErrorCode.AUTH_PHONE_NOT_VERIFIED: "Please verify your phone number",
    ErrorCode.AUTH_MFA_REQUIRED: "Multi-factor authentication required",
    ErrorCode.AUTH_SESSION_EXPIRED: "Your session has expired",
    
    ErrorCode.VALIDATION_FAILED: "Validation failed",
    ErrorCode.VALIDATION_EMAIL_INVALID: "Invalid email address format",
    ErrorCode.VALIDATION_PASSWORD_WEAK: "Password is too weak",
    ErrorCode.VALIDATION_PHONE_INVALID: "Invalid phone number format",
    ErrorCode.VALIDATION_REQUIRED_FIELD: "Required field is missing",
    ErrorCode.VALIDATION_INVALID_FORMAT: "Invalid format",
    ErrorCode.VALIDATION_OUT_OF_RANGE: "Value is out of allowed range",
    
    ErrorCode.RESOURCE_NOT_FOUND: "Resource not found",
    ErrorCode.RESOURCE_ALREADY_EXISTS: "Resource already exists",
    ErrorCode.RESOURCE_CONFLICT: "Resource conflict",
    ErrorCode.RESOURCE_DELETED: "Resource has been deleted",
    ErrorCode.RESOURCE_LOCKED: "Resource is locked",
    
    ErrorCode.BOOKING_NOT_FOUND: "Booking not found",
    ErrorCode.BOOKING_ALREADY_CANCELLED: "Booking has already been cancelled",
    ErrorCode.BOOKING_CANNOT_CANCEL: "Booking cannot be cancelled in its current state",
    ErrorCode.BOOKING_ALREADY_COMPLETED: "Booking has already been completed",
    ErrorCode.BOOKING_INVALID_STATUS_TRANSITION: "Invalid booking status transition",
    ErrorCode.BOOKING_NO_DRIVERS_AVAILABLE: "No drivers available in your area",
    ErrorCode.BOOKING_DRIVER_ALREADY_ASSIGNED: "A driver has already been assigned to this booking",
    ErrorCode.BOOKING_INVALID_STOPS: "Invalid pickup/dropoff locations",
    ErrorCode.BOOKING_PAYMENT_REQUIRED: "Payment method required before booking",
    ErrorCode.BOOKING_TIME_SLOT_UNAVAILABLE: "Selected time slot is not available",
    
    ErrorCode.DRIVER_NOT_FOUND: "Driver not found",
    ErrorCode.DRIVER_NOT_ACTIVE: "Driver account is not active",
    ErrorCode.DRIVER_NOT_VERIFIED: "Driver verification pending",
    ErrorCode.DRIVER_NO_VEHICLE: "Driver has no registered vehicle",
    ErrorCode.DRIVER_SUSPENDED: "Driver account is suspended",
    ErrorCode.DRIVER_BANNED: "Driver account has been banned",
    ErrorCode.DRIVER_ALREADY_ON_TRIP: "Driver is already on a trip",
    ErrorCode.DRIVER_DOCUMENT_EXPIRED: "Driver documents have expired",
    ErrorCode.DRIVER_LOCATION_REQUIRED: "Driver location is required",
    
    ErrorCode.PAYMENT_FAILED: "Payment processing failed",
    ErrorCode.PAYMENT_INSUFFICIENT_FUNDS: "Insufficient funds",
    ErrorCode.PAYMENT_METHOD_INVALID: "Invalid payment method",
    ErrorCode.PAYMENT_METHOD_REQUIRED: "Payment method is required",
    ErrorCode.PAYMENT_ALREADY_PROCESSED: "Payment has already been processed",
    ErrorCode.PAYMENT_REFUND_FAILED: "Refund processing failed",
    ErrorCode.PAYMENT_AMOUNT_INVALID: "Invalid payment amount",
    
    ErrorCode.RATE_LIMIT_EXCEEDED: "Too many requests. Please slow down",
    ErrorCode.OTP_COOLDOWN_ACTIVE: "Please wait before requesting another code",
    
    ErrorCode.INTERNAL_ERROR: "An internal error occurred",
    ErrorCode.SERVICE_UNAVAILABLE: "Service is temporarily unavailable",
    ErrorCode.DATABASE_ERROR: "Database error occurred",
    ErrorCode.EXTERNAL_SERVICE_ERROR: "External service error",
    ErrorCode.FILE_UPLOAD_ERROR: "File upload failed",
}


class APIError(BaseModel):
    """Standardized API error response."""
    error_code: str
    message: str
    detail: Optional[str] = None
    field: Optional[str] = None  # For validation errors
    retry_after: Optional[int] = None  # For rate limiting
    metadata: Optional[Dict[str, Any]] = None


class APIErrorResponse(BaseModel):
    """Full error response structure."""
    success: bool = False
    error: APIError
    request_id: Optional[str] = None  # For tracing


class SeryvoException(HTTPException):
    """Custom exception with standardized error handling."""
    
    def __init__(
        self,
        error_code: ErrorCode,
        detail: Optional[str] = None,
        field: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ):
        self.error_code = error_code
        self.error_detail = detail
        self.field = field
        self.metadata = metadata
        
        status_code = ERROR_STATUS_MAP.get(error_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        message = ERROR_MESSAGES.get(error_code, "An error occurred")
        
        super().__init__(
            status_code=status_code,
            detail={
                "error_code": error_code.value,
                "message": message,
                "detail": detail,
                "field": field,
                "metadata": metadata,
            },
            headers=headers,
        )


def raise_error(
    error_code: ErrorCode,
    detail: Optional[str] = None,
    field: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """Convenience function to raise a standardized error."""
    raise SeryvoException(
        error_code=error_code,
        detail=detail,
        field=field,
        metadata=metadata,
    )


def raise_not_found(resource_type: str, resource_id: Any) -> None:
    """Raise a standardized 404 error."""
    raise SeryvoException(
        error_code=ErrorCode.RESOURCE_NOT_FOUND,
        detail=f"{resource_type} with ID '{resource_id}' not found",
        metadata={"resource_type": resource_type, "resource_id": str(resource_id)},
    )


def raise_validation_error(message: str, field: Optional[str] = None) -> None:
    """Raise a standardized validation error."""
    raise SeryvoException(
        error_code=ErrorCode.VALIDATION_FAILED,
        detail=message,
        field=field,
    )


def raise_auth_error(error_code: ErrorCode = ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS) -> None:
    """Raise a standardized authentication/authorization error."""
    raise SeryvoException(error_code=error_code)


def raise_booking_error(error_code: ErrorCode, booking_id: Optional[Any] = None) -> None:
    """Raise a standardized booking error."""
    raise SeryvoException(
        error_code=error_code,
        metadata={"booking_id": str(booking_id)} if booking_id else None,
    )
