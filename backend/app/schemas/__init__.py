"""Schemas module exports."""
from app.schemas.schemas import *

__all__ = [
    # Auth
    "LoginRequest",
    "RegisterRequest",
    "TokenResponse",
    "RefreshTokenRequest",
    "PasswordResetRequest",
    "PasswordResetVerify",
    "PasswordResetConfirm",
    # Users
    "RoleResponse",
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserListResponse",
    # Driver
    "DriverProfileResponse",
    "DriverStatusUpdate",
    "VehicleCreate",
    "VehicleResponse",
    "DriverDocumentResponse",
    "DriverDocumentReviewRequest",
    # Config
    "RegionResponse",
    "ServiceTypeResponse",
    # Pricing
    "PricingRuleResponse",
    "PriceEstimateRequest",
    "PriceEstimateResponse",
    # Booking
    "BookingStopCreate",
    "BookingStopResponse",
    "BookingCreate",
    "BookingUpdate",
    "BookingResponse",
    "BookingListResponse",
    "BookingCancelRequest",
    "BookingRatingRequest",
    # Driver jobs
    "DriverJobResponse",
    "DriverLocationUpdate",
    # Support
    "TicketCreate",
    "TicketUpdate",
    "TicketMessageCreate",
    "TicketMessageResponse",
    "TicketResponse",
    "TicketListResponse",
    # Chat
    "MessageCreate",
    "MessageResponse",
    "ConversationResponse",
    # Analytics
    "DashboardStats",
    "DriverEarnings",
    "RevenueReport",
    # Admin
    "SurchargeCreate",
    "SurchargeResponse",
    "SurgeRuleCreate",
    "SurgeRuleResponse",
    "AuditLogResponse",
    "AuditLogListResponse",
    # Promotions
    "PromotionCreate",
    "PromotionResponse",
    "ValidatePromoRequest",
    "ValidatePromoResponse",
    # OTP Verification
    "OTPSendRequest",
    "OTPSendResponse",
    "OTPVerifyRequest",
    "OTPVerifyResponse",
    "UserVerificationResponse",
    "RegisterWithOTPRequest",
    # Generic
    "SuccessResponse",
    "ErrorResponse",
]
