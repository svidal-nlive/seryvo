"""
Seryvo Platform - Pydantic Schemas
Request/Response models for API endpoints
"""
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ===========================================
# Base Schemas
# ===========================================

class BaseSchema(BaseModel):
    """Base schema with common config."""
    model_config = ConfigDict(from_attributes=True)


# ===========================================
# Auth Schemas
# ===========================================

class LoginRequest(BaseModel):
    """Login request payload."""
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    """Registration request payload."""
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    phone: Optional[str] = None
    role: str = Field(default="client")  # client, driver


class TokenResponse(BaseModel):
    """JWT token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    """Refresh token request."""
    refresh_token: str


class PasswordResetRequest(BaseModel):
    """Password reset request."""
    email: EmailStr


class PasswordResetVerify(BaseModel):
    """Verify password reset OTP."""
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)


class PasswordResetConfirm(BaseModel):
    """Confirm password reset."""
    token: str
    new_password: str = Field(..., min_length=6)


# ===========================================
# User Schemas
# ===========================================

class RoleResponse(BaseSchema):
    """Role response."""
    id: int
    name: str
    description: Optional[str] = None


class UserBase(BaseModel):
    """Base user fields."""
    email: EmailStr
    full_name: str
    phone: Optional[str] = None


class UserCreate(UserBase):
    """Create user payload."""
    password: str = Field(..., min_length=6)
    roles: List[str] = Field(default=["client"])


class UserUpdate(BaseModel):
    """Update user payload."""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(BaseSchema):
    """User response."""
    id: int
    email: str
    full_name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    roles: List[str] = []


class UserListResponse(BaseModel):
    """Paginated user list response."""
    items: List[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ===========================================
# Driver Profile Schemas
# ===========================================

class DriverProfileResponse(BaseSchema):
    """Driver profile response."""
    user_id: int
    status: str
    availability_status: str
    rating_average: float
    total_ratings: int
    acceptance_rate: float
    cancellation_rate: float


class DriverStatusUpdate(BaseModel):
    """Update driver availability status."""
    availability_status: str  # available, busy, offline


class VehicleCreate(BaseModel):
    """Create vehicle payload."""
    make: str
    model: str
    year: int
    color: str
    license_plate: str
    capacity: int = 4
    service_type_id: Optional[int] = None


class VehicleResponse(BaseSchema):
    """Vehicle response."""
    id: int
    make: Optional[str]
    model: Optional[str]
    year: Optional[int]
    color: Optional[str]
    license_plate: Optional[str]
    capacity: Optional[int]
    is_active: bool


# ===========================================
# Driver Document Schemas
# ===========================================

class DriverDocumentResponse(BaseSchema):
    """Driver document response."""
    id: int
    driver_id: int
    doc_type: str
    file_url: str
    status: str  # pending_review, approved, rejected, expired
    expires_at: Optional[datetime] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime


class DriverDocumentReviewRequest(BaseModel):
    """Review driver document request."""
    status: str = Field(..., pattern="^(approved|rejected)$")
    rejection_reason: Optional[str] = None
    expires_at: Optional[datetime] = None


# ===========================================
# Region & Service Type Schemas
# ===========================================

class RegionResponse(BaseSchema):
    """Region response."""
    id: int
    name: str
    description: Optional[str]
    is_active: bool


class ServiceTypeResponse(BaseSchema):
    """Service type response."""
    id: int
    code: str
    name: str
    description: Optional[str]
    base_capacity: int
    is_active: bool


# ===========================================
# Pricing Schemas
# ===========================================

class PricingRuleResponse(BaseSchema):
    """Pricing rule response."""
    id: int
    region_id: Optional[int]
    service_type_id: Optional[int]
    base_fare: float
    per_km: float
    per_minute: float
    minimum_fare: float
    currency: str
    is_active: bool


class PriceEstimateRequest(BaseModel):
    """Price estimate request."""
    pickup_lat: float
    pickup_lng: float
    dropoff_lat: float
    dropoff_lng: float
    service_type_id: Optional[int] = None
    scheduled_at: Optional[datetime] = None


class PriceEstimateResponse(BaseModel):
    """Price estimate response."""
    estimated_fare: float
    estimated_distance_km: float
    estimated_duration_minutes: float
    surge_multiplier: float
    currency: str
    breakdown: dict = {}


# ===========================================
# Booking Schemas
# ===========================================

class BookingStopCreate(BaseModel):
    """Create booking stop payload."""
    sequence: int = 0
    address: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    stop_type: str = "pickup"  # 'pickup' or 'dropoff'


class BookingStopResponse(BaseSchema):
    """Booking stop response - aligned with BookingStop model."""
    id: int
    sequence: int
    address: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    stop_type: str
    arrived_at: Optional[datetime] = None
    
    # Deprecated field aliases for backward compatibility
    # These will be removed in a future version
    @property
    def position(self) -> int:
        """Deprecated: Use 'sequence' instead."""
        return self.sequence
    
    @property
    def address_line1(self) -> str:
        """Deprecated: Use 'address' instead."""
        return self.address
    
    @property
    def latitude(self) -> Optional[float]:
        """Deprecated: Use 'lat' instead."""
        return self.lat
    
    @property
    def longitude(self) -> Optional[float]:
        """Deprecated: Use 'lng' instead."""
        return self.lng


class BookingCreate(BaseModel):
    """Create booking payload."""
    service_type_id: Optional[int] = None
    requested_pickup_at: Optional[datetime] = None  # Aligned with model field name
    passenger_count: int = 1
    luggage_count: int = 0  # Aligned with model field name (integer, not string)
    special_notes: Optional[str] = None  # Aligned with model field name
    promotion_code: Optional[str] = None
    stops: List[BookingStopCreate]  # At least 2 stops (pickup + dropoff)
    
    # Deprecated aliases for backward compatibility
    @property
    def scheduled_start_at(self) -> Optional[datetime]:
        """Deprecated: Use 'requested_pickup_at' instead."""
        return self.requested_pickup_at


class BookingUpdate(BaseModel):
    """Update booking payload."""
    status: Optional[str] = None  # For status transitions (driver accept, trip progress)
    requested_pickup_at: Optional[datetime] = None  # Aligned with model field name
    passenger_count: Optional[int] = None
    luggage_count: Optional[int] = None  # Aligned with model field name
    special_notes: Optional[str] = None  # Aligned with model field name


class BookingResponse(BaseSchema):
    """Booking response - aligned with Booking model."""
    id: int
    client_id: int
    driver_id: Optional[int]
    service_type_id: Optional[int]
    status: str
    is_asap: bool = True
    
    # Address fields from model
    pickup_address: Optional[str] = None
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    dropoff_address: Optional[str] = None
    dropoff_lat: Optional[float] = None
    dropoff_lng: Optional[float] = None
    
    # Time fields - aligned with model
    requested_pickup_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    
    # Details - aligned with model
    passenger_count: int = 1
    luggage_count: int = 0
    special_notes: Optional[str] = None
    
    # Pricing - aligned with model
    estimated_distance_km: Optional[float] = None
    estimated_duration_min: Optional[int] = None
    base_fare: Optional[float] = None
    distance_fare: Optional[float] = None
    time_fare: Optional[float] = None
    surge_multiplier: Optional[float] = None
    extras_total: Optional[float] = None
    tax_total: Optional[float] = None
    discount_total: Optional[float] = None
    final_fare: Optional[float] = None
    driver_earnings: Optional[float] = None
    platform_fee: Optional[float] = None
    
    # Ratings - aligned with model
    client_rating: Optional[int] = None  # driver rates client
    driver_rating: Optional[int] = None  # client rates driver
    client_feedback: Optional[str] = None
    driver_feedback: Optional[str] = None
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    
    # Related objects
    stops: List[BookingStopResponse] = []
    client: Optional[UserResponse] = None
    driver: Optional[UserResponse] = None
    service_type: Optional[ServiceTypeResponse] = None


class BookingListResponse(BaseModel):
    """Paginated booking list response."""
    items: List[BookingResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class BookingCancelRequest(BaseModel):
    """Cancel booking request."""
    reason: Optional[str] = None


class BookingRatingRequest(BaseModel):
    """Rate booking request."""
    rating: int = Field(..., ge=1, le=5)
    feedback: Optional[str] = None


# ===========================================
# Driver Job Schemas
# ===========================================

class DriverJobResponse(BaseSchema):
    """Driver job (booking) response - aligned with Booking model."""
    id: int
    status: str
    is_asap: bool = True
    requested_pickup_at: Optional[datetime] = None
    pickup_address: Optional[str] = None
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    dropoff_address: Optional[str] = None
    dropoff_lat: Optional[float] = None
    dropoff_lng: Optional[float] = None
    estimated_distance_km: Optional[float] = None
    estimated_duration_min: Optional[int] = None
    base_fare: Optional[float] = None
    final_fare: Optional[float] = None
    driver_earnings: Optional[float] = None
    passenger_count: int = 1
    luggage_count: int = 0
    special_notes: Optional[str] = None
    stops: List[BookingStopResponse] = []
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    client_rating_avg: Optional[float] = None


class DriverLocationUpdate(BaseModel):
    """Update driver location."""
    lat: float  # Aligned with model convention
    lng: float  # Aligned with model convention
    heading: Optional[float] = None
    speed: Optional[float] = None


# ===========================================
# Support Ticket Schemas
# ===========================================

class TicketCreate(BaseModel):
    """Create support ticket payload."""
    category: str
    subject: str
    description: str
    priority: str = "medium"
    booking_id: Optional[int] = None


class TicketUpdate(BaseModel):
    """Update support ticket payload."""
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[int] = None


class TicketMessageCreate(BaseModel):
    """Create ticket message payload."""
    message: str
    is_internal: bool = False


class TicketMessageResponse(BaseSchema):
    """Ticket message response."""
    id: int
    sender_id: int
    message: str
    is_internal: bool
    created_at: datetime
    sender: Optional[UserResponse] = None


class TicketResponse(BaseSchema):
    """Support ticket response."""
    id: int
    created_by: int
    assigned_to: Optional[int]
    booking_id: Optional[int]
    category: str
    status: str
    priority: str
    subject: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    creator: Optional[UserResponse] = None
    assignee: Optional[UserResponse] = None
    messages: List[TicketMessageResponse] = []


class TicketListResponse(BaseModel):
    """Paginated ticket list response."""
    items: List[TicketResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ===========================================
# Conversation / Chat Schemas
# ===========================================

class MessageCreate(BaseModel):
    """Create message payload."""
    message: str


class MessageResponse(BaseSchema):
    """Message response."""
    id: int
    sender_id: int
    message: str
    is_read: bool
    created_at: datetime
    sender: Optional[UserResponse] = None


class ConversationResponse(BaseSchema):
    """Conversation response."""
    id: int
    booking_id: Optional[int]
    conversation_type: str
    created_at: datetime
    messages: List[MessageResponse] = []
    participants: List[UserResponse] = []


# ===========================================
# Analytics & Reports Schemas
# ===========================================

class DashboardStats(BaseModel):
    """Dashboard statistics."""
    total_users: int
    active_users: int
    total_drivers: int
    active_drivers: int
    total_bookings: int
    pending_bookings: int
    completed_bookings: int
    total_revenue: float
    currency: str = "USD"


class DriverEarnings(BaseModel):
    """Driver earnings summary."""
    period: str  # today, week, month
    total_trips: int
    total_earnings: float
    average_per_trip: float
    currency: str = "USD"


class RevenueReport(BaseModel):
    """Revenue report data."""
    period_start: datetime
    period_end: datetime
    total_revenue: float
    total_trips: int
    average_fare: float
    platform_fees: float
    driver_payouts: float
    by_service_type: dict = {}
    by_region: dict = {}


# ===========================================
# Admin Schemas
# ===========================================

class SurchargeCreate(BaseModel):
    """Create surcharge payload."""
    name: str
    surcharge_type: str
    amount: float
    is_percentage: bool = False
    location_keywords: Optional[str] = None
    applies_to_service_types: Optional[str] = None


class SurchargeResponse(BaseSchema):
    """Surcharge response."""
    id: int
    name: str
    surcharge_type: str
    amount: float
    is_percentage: bool
    location_keywords: Optional[str]
    applies_to_service_types: Optional[str]
    is_active: bool


class SurgeRuleCreate(BaseModel):
    """Create surge rule payload."""
    region_id: Optional[int]
    name: str
    multiplier: float
    time_start: Optional[str] = None
    time_end: Optional[str] = None
    days_of_week: Optional[str] = None


class SurgeRuleResponse(BaseSchema):
    """Surge rule response."""
    id: int
    region_id: Optional[int]
    name: str
    multiplier: float
    time_start: Optional[str]
    time_end: Optional[str]
    days_of_week: Optional[str]
    is_active: bool


class AuditLogResponse(BaseSchema):
    """Audit log response."""
    id: int
    actor_id: Optional[int]
    action: str
    entity_type: str
    entity_id: Optional[int]
    old_value: Optional[dict]
    new_value: Optional[dict]
    ip_address: Optional[str]
    created_at: datetime
    actor: Optional[UserResponse] = None


class AuditLogListResponse(BaseModel):
    """Paginated audit log list response."""
    items: List[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ===========================================
# Promotion Schemas
# ===========================================

class PromotionCreate(BaseModel):
    """Create promotion payload."""
    code: str
    description: Optional[str] = None
    discount_type: str  # percentage or fixed
    discount_value: float
    max_uses: Optional[int] = None
    max_uses_per_user: Optional[int] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None


class PromotionResponse(BaseSchema):
    """Promotion response."""
    id: int
    code: str
    description: Optional[str]
    discount_type: str
    discount_value: float
    max_uses: Optional[int]
    max_uses_per_user: Optional[int]
    starts_at: Optional[datetime]
    ends_at: Optional[datetime]
    is_active: bool


class ValidatePromoRequest(BaseModel):
    """Validate promo code request."""
    code: str
    amount: float


class ValidatePromoResponse(BaseModel):
    """Validate promo code response."""
    valid: bool
    discount_amount: float = 0
    message: Optional[str] = None


# ===========================================
# Generic Responses
# ===========================================

class SuccessResponse(BaseModel):
    """Generic success response."""
    success: bool = True
    message: str = "Operation successful"
    data: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Error response."""
    error: str
    detail: Optional[str] = None


# ===========================================
# OTP Verification Schemas
# ===========================================

class OTPSendRequest(BaseModel):
    """Request to send OTP code."""
    identifier: str = Field(..., description="Email address or phone number")
    identifier_type: str = Field(..., pattern="^(email|phone)$", description="Type: 'email' or 'phone'")
    purpose: str = Field(default="registration", description="Purpose: 'registration', 'login', 'password_reset', 'phone_verify'")


class OTPSendResponse(BaseModel):
    """Response after sending OTP."""
    success: bool
    message: str
    expires_in_seconds: int = 300  # 5 minutes default
    masked_identifier: str  # e.g., "j***@example.com" or "***-***-1234"


class OTPVerifyRequest(BaseModel):
    """Request to verify OTP code."""
    identifier: str = Field(..., description="Email address or phone number")
    identifier_type: str = Field(..., pattern="^(email|phone)$")
    code: str = Field(..., min_length=6, max_length=6, description="6-digit OTP code")
    purpose: str = Field(default="registration")


class OTPVerifyResponse(BaseModel):
    """Response after verifying OTP."""
    success: bool
    message: str
    verification_token: Optional[str] = None  # Token to prove verification for registration


class UserVerificationResponse(BaseSchema):
    """User verification status response."""
    user_id: int
    email_verified: bool
    email_verified_at: Optional[datetime] = None
    phone_verified: bool
    phone_verified_at: Optional[datetime] = None


class RegisterWithOTPRequest(BaseModel):
    """Registration request with OTP verification token."""
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    phone: Optional[str] = None
    role: str = Field(default="client")
    verification_token: str = Field(..., description="Token from OTP verification")


# ===========================================
# Payment Schemas
# ===========================================

class PaymentMethodCreate(BaseModel):
    """Create payment method payload."""
    method_type: str = Field(..., description="card, bank_account, etc.")
    last_four: Optional[str] = Field(None, max_length=4)
    brand: Optional[str] = None  # visa, mastercard, etc.
    exp_month: Optional[int] = Field(None, ge=1, le=12)
    exp_year: Optional[int] = None
    is_default: bool = False
    stripe_payment_method_id: Optional[str] = None


class PaymentMethodResponse(BaseSchema):
    """Payment method response - aligned with PaymentMethod model."""
    id: int
    user_id: int
    method_type: str
    last_four: Optional[str] = None
    brand: Optional[str] = None
    exp_month: Optional[int] = None
    exp_year: Optional[int] = None
    is_default: bool = False
    stripe_payment_method_id: Optional[str] = None
    created_at: datetime


class PaymentResponse(BaseSchema):
    """Payment response - aligned with Payment model."""
    id: int
    booking_id: int
    amount: float
    currency: str = "USD"
    payment_method: str  # Aligned with model: 'card', 'cash', 'wallet'
    payment_status: str  # Aligned with model: 'pending', 'completed', 'failed', 'refunded'
    stripe_payment_intent_id: Optional[str] = None
    stripe_charge_id: Optional[str] = None
    failure_reason: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class DriverPayoutResponse(BaseSchema):
    """Driver payout response - aligned with DriverPayout model."""
    id: int
    driver_id: int
    amount: float
    currency: str = "USD"
    payout_status: str  # Aligned with model: 'pending', 'processing', 'completed', 'failed'
    stripe_transfer_id: Optional[str] = None
    period_start: datetime
    period_end: datetime
    bookings_count: int = 0
    failure_reason: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


