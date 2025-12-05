"""
Seryvo Platform - SQLAlchemy Models
Based on docs/Database Schema (SQL-ready).md
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import (
    String, Integer, Boolean, Text, Numeric, 
    ForeignKey, DateTime, JSON, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


# ===========================================
# 1. Core RBAC & Users
# ===========================================

class Role(Base):
    """User roles (client, driver, support, admin)."""
    __tablename__ = "roles"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    # Relationships
    users: Mapped[List["UserRole"]] = relationship(back_populates="role")
    permissions: Mapped[List["RolePermission"]] = relationship(back_populates="role")


class User(Base):
    """All platform users."""
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    
    # Relationships
    roles: Mapped[List["UserRole"]] = relationship(back_populates="user", lazy="selectin")
    client_profile: Mapped[Optional["ClientProfile"]] = relationship(back_populates="user", uselist=False)
    driver_profile: Mapped[Optional["DriverProfile"]] = relationship(back_populates="user", uselist=False)
    bookings_as_client: Mapped[List["Booking"]] = relationship(
        back_populates="client", foreign_keys="Booking.client_id"
    )
    bookings_as_driver: Mapped[List["Booking"]] = relationship(
        back_populates="driver", foreign_keys="Booking.driver_id"
    )


class UserRole(Base):
    """Many-to-many: users to roles."""
    __tablename__ = "user_roles"
    
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_id: Mapped[int] = mapped_column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    
    user: Mapped["User"] = relationship(back_populates="roles")
    role: Mapped["Role"] = relationship(back_populates="users")


class Permission(Base):
    """Fine-grained permissions."""
    __tablename__ = "permissions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    roles: Mapped[List["RolePermission"]] = relationship(back_populates="permission")


class RolePermission(Base):
    """Many-to-many: roles to permissions."""
    __tablename__ = "role_permissions"
    
    role_id: Mapped[int] = mapped_column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    permission_id: Mapped[int] = mapped_column(Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)
    
    role: Mapped["Role"] = relationship(back_populates="permissions")
    permission: Mapped["Permission"] = relationship(back_populates="roles")


# ===========================================
# 2. Profiles (Client / Driver)
# ===========================================

class ClientProfile(Base):
    """Extended client profile."""
    __tablename__ = "client_profiles"
    
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    default_payment_method_id: Mapped[Optional[int]] = mapped_column(Integer)
    default_currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    default_language: Mapped[Optional[str]] = mapped_column(String(10))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    rating_average: Mapped[Optional[float]] = mapped_column(Numeric(3, 2))
    total_trips: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    user: Mapped["User"] = relationship(back_populates="client_profile")
    saved_locations: Mapped[List["SavedLocation"]] = relationship(back_populates="client")


class DriverProfile(Base):
    """Extended driver profile."""
    __tablename__ = "driver_profiles"
    
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    availability_status: Mapped[str] = mapped_column(String(50), default="offline", nullable=False)
    current_lat: Mapped[Optional[float]] = mapped_column(Numeric(10, 7))
    current_lng: Mapped[Optional[float]] = mapped_column(Numeric(10, 7))
    location_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    rating_average: Mapped[Optional[float]] = mapped_column(Numeric(3, 2))
    total_ratings: Mapped[int] = mapped_column(Integer, default=0)
    total_trips: Mapped[int] = mapped_column(Integer, default=0)
    acceptance_rate: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    cancellation_rate: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    preferred_region_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("regions.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    user: Mapped["User"] = relationship(back_populates="driver_profile")
    vehicles: Mapped[List["Vehicle"]] = relationship(back_populates="driver")
    documents: Mapped[List["DriverDocument"]] = relationship(back_populates="driver")


class SavedLocation(Base):
    """Client saved addresses (Home, Work, etc.)."""
    __tablename__ = "saved_locations"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("client_profiles.user_id", ondelete="CASCADE"), nullable=False)
    label: Mapped[str] = mapped_column(String(50), nullable=False)
    address_line1: Mapped[Optional[str]] = mapped_column(String(255))
    address_line2: Mapped[Optional[str]] = mapped_column(String(255))
    city: Mapped[Optional[str]] = mapped_column(String(100))
    state: Mapped[Optional[str]] = mapped_column(String(100))
    postal_code: Mapped[Optional[str]] = mapped_column(String(50))
    country: Mapped[Optional[str]] = mapped_column(String(100))
    latitude: Mapped[Optional[float]] = mapped_column(Numeric(10, 7))
    longitude: Mapped[Optional[float]] = mapped_column(Numeric(10, 7))
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    client: Mapped["ClientProfile"] = relationship(back_populates="saved_locations")


class Vehicle(Base):
    """Driver vehicles."""
    __tablename__ = "vehicles"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    driver_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    service_type_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("service_types.id"))
    make: Mapped[Optional[str]] = mapped_column(String(100))
    model: Mapped[Optional[str]] = mapped_column(String(100))
    year: Mapped[Optional[int]] = mapped_column(Integer)
    color: Mapped[Optional[str]] = mapped_column(String(50))
    license_plate: Mapped[Optional[str]] = mapped_column(String(50))
    capacity: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    driver: Mapped["DriverProfile"] = relationship(back_populates="vehicles", foreign_keys=[driver_id], primaryjoin="Vehicle.driver_id == DriverProfile.user_id")
    service_type: Mapped[Optional["ServiceType"]] = relationship()


class DriverDocument(Base):
    """Driver documents (license, insurance, etc.)."""
    __tablename__ = "driver_documents"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    driver_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    doc_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_url: Mapped[Optional[str]] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    reviewed_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    driver: Mapped["DriverProfile"] = relationship(back_populates="documents", foreign_keys=[driver_id], primaryjoin="DriverDocument.driver_id == DriverProfile.user_id")


# ===========================================
# 3. Regions, Service Types & Pricing
# ===========================================

class Region(Base):
    """Geographic regions."""
    __tablename__ = "regions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    timezone: Mapped[Optional[str]] = mapped_column(String(50))
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    description: Mapped[Optional[str]] = mapped_column(Text)
    geojson: Mapped[Optional[dict]] = mapped_column(JSON)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class ServiceType(Base):
    """Vehicle/service types (standard, premium, van)."""
    __tablename__ = "service_types"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    base_capacity: Mapped[int] = mapped_column(Integer, default=4)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class PricingRule(Base):
    """Pricing configuration per region/service type."""
    __tablename__ = "pricing_rules"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    region_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("regions.id", ondelete="SET NULL"))
    service_type_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("service_types.id", ondelete="SET NULL"))
    base_fare: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    per_km: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    per_minute: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    minimum_fare: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    region: Mapped[Optional["Region"]] = relationship()
    service_type: Mapped[Optional["ServiceType"]] = relationship()


class SurgeRule(Base):
    """Surge/dynamic pricing rules."""
    __tablename__ = "surge_rules"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    region_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("regions.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    multiplier: Mapped[float] = mapped_column(Numeric(5, 2), default=1.0, nullable=False)
    time_start: Mapped[Optional[str]] = mapped_column(String(10))  # HH:MM format
    time_end: Mapped[Optional[str]] = mapped_column(String(10))
    days_of_week: Mapped[Optional[str]] = mapped_column(String(50))  # comma-separated
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Surcharge(Base):
    """Airport, toll, and other surcharges."""
    __tablename__ = "surcharges"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    surcharge_type: Mapped[str] = mapped_column(String(50), nullable=False)  # airport, toll, congestion, event, custom
    amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    is_percentage: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    location_keywords: Mapped[Optional[str]] = mapped_column(Text)  # comma-separated keywords
    applies_to_service_types: Mapped[Optional[str]] = mapped_column(String(255))  # comma-separated codes
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ===========================================
# 4. Promotions
# ===========================================

class Promotion(Base):
    """Promo codes."""
    __tablename__ = "promotions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    discount_type: Mapped[str] = mapped_column(String(20), nullable=False)  # percentage or fixed
    discount_value: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    max_uses: Mapped[Optional[int]] = mapped_column(Integer)
    max_uses_per_user: Mapped[Optional[int]] = mapped_column(Integer)
    starts_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ===========================================
# 5. Booking & Trip Model
# ===========================================

class Booking(Base):
    """Trip bookings."""
    __tablename__ = "bookings"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    driver_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), index=True)
    service_type_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("service_types.id", ondelete="SET NULL"))
    
    status: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    is_asap: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    
    pickup_address: Mapped[str] = mapped_column(String(500), nullable=False)
    pickup_lat: Mapped[Optional[float]] = mapped_column(Numeric(10, 7))
    pickup_lng: Mapped[Optional[float]] = mapped_column(Numeric(10, 7))
    dropoff_address: Mapped[str] = mapped_column(String(500), nullable=False)
    dropoff_lat: Mapped[Optional[float]] = mapped_column(Numeric(10, 7))
    dropoff_lng: Mapped[Optional[float]] = mapped_column(Numeric(10, 7))
    
    requested_pickup_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    passenger_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    luggage_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    special_notes: Mapped[Optional[str]] = mapped_column(Text)
    
    estimated_distance_km: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    estimated_duration_min: Mapped[Optional[int]] = mapped_column(Integer)
    
    base_fare: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    distance_fare: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    time_fare: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    surge_multiplier: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    extras_total: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    tax_total: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    discount_total: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    final_fare: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    driver_earnings: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    platform_fee: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    
    client_rating: Mapped[Optional[int]] = mapped_column(Integer)  # driver rates client
    driver_rating: Mapped[Optional[int]] = mapped_column(Integer)  # client rates driver
    client_feedback: Mapped[Optional[str]] = mapped_column(Text)
    driver_feedback: Mapped[Optional[str]] = mapped_column(Text)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    client: Mapped["User"] = relationship(back_populates="bookings_as_client", foreign_keys=[client_id])
    driver: Mapped[Optional["User"]] = relationship(back_populates="bookings_as_driver", foreign_keys=[driver_id])
    stops: Mapped[List["BookingStop"]] = relationship(back_populates="booking", order_by="BookingStop.sequence")
    events: Mapped[List["BookingEvent"]] = relationship(back_populates="booking", order_by="BookingEvent.created_at")
    service_type: Mapped[Optional["ServiceType"]] = relationship()


class BookingStop(Base):
    """Stops for multi-stop trips."""
    __tablename__ = "booking_stops"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    booking_id: Mapped[int] = mapped_column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    lat: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7))
    lng: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7))
    stop_type: Mapped[str] = mapped_column(String(50), nullable=False)  # 'pickup' or 'dropoff'
    arrived_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    booking: Mapped["Booking"] = relationship(back_populates="stops")


class BookingEvent(Base):
    """Booking status changes and events."""
    __tablename__ = "booking_events"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    booking_id: Mapped[int] = mapped_column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    actor_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))
    description: Mapped[Optional[str]] = mapped_column(Text)
    event_metadata: Mapped[Optional[dict]] = mapped_column("metadata", JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    booking: Mapped["Booking"] = relationship(back_populates="events")


# ===========================================
# 6. Support Tickets
# ===========================================

class SupportTicket(Base):
    """Support tickets."""
    __tablename__ = "support_tickets"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    assigned_to: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))
    booking_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("bookings.id", ondelete="SET NULL"), index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="open", nullable=False, index=True)
    priority: Mapped[str] = mapped_column(String(50), default="medium", nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    creator: Mapped["User"] = relationship(foreign_keys=[user_id])
    assignee: Mapped[Optional["User"]] = relationship(foreign_keys=[assigned_to])
    booking: Mapped[Optional["Booking"]] = relationship()
    messages: Mapped[List["SupportTicketMessage"]] = relationship(back_populates="ticket")


class SupportTicketMessage(Base):
    """Messages on support tickets."""
    __tablename__ = "support_ticket_messages"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticket_id: Mapped[int] = mapped_column(Integer, ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False)
    sender_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_internal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    ticket: Mapped["SupportTicket"] = relationship(back_populates="messages")
    sender: Mapped["User"] = relationship()


# ===========================================
# 7. Chat / Conversations
# ===========================================

class Conversation(Base):
    """Generic conversation model."""
    __tablename__ = "conversations"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    booking_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("bookings.id", ondelete="SET NULL"))
    conversation_type: Mapped[str] = mapped_column(String(50), default="booking", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    participants: Mapped[List["ConversationParticipant"]] = relationship(back_populates="conversation")
    messages: Mapped[List["ConversationMessage"]] = relationship(back_populates="conversation")


class ConversationParticipant(Base):
    """Participants in a conversation."""
    __tablename__ = "conversation_participants"
    
    conversation_id: Mapped[int] = mapped_column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_in_conversation: Mapped[Optional[str]] = mapped_column(String(50))
    
    conversation: Mapped["Conversation"] = relationship(back_populates="participants")
    user: Mapped["User"] = relationship()


class ConversationMessage(Base):
    """Messages in a conversation."""
    __tablename__ = "conversation_messages"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    conversation: Mapped["Conversation"] = relationship(back_populates="messages")
    sender: Mapped["User"] = relationship()


# ===========================================
# 8. Audit Logs
# ===========================================

class AuditLog(Base):
    """Audit trail for admin actions."""
    __tablename__ = "audit_logs"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    actor_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[Optional[int]] = mapped_column(Integer)
    old_value: Mapped[Optional[dict]] = mapped_column(JSON)
    new_value: Mapped[Optional[dict]] = mapped_column(JSON)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    actor: Mapped[Optional["User"]] = relationship()


# ===========================================
# 9. Payments
# ===========================================

class PaymentMethod(Base):
    """Saved payment methods for users."""
    __tablename__ = "payment_methods"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    method_type: Mapped[str] = mapped_column(String(50), nullable=False)  # 'card', 'bank_account'
    last_four: Mapped[Optional[str]] = mapped_column(String(4))
    brand: Mapped[Optional[str]] = mapped_column(String(50))  # 'visa', 'mastercard', etc.
    exp_month: Mapped[Optional[int]] = mapped_column(Integer)
    exp_year: Mapped[Optional[int]] = mapped_column(Integer)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    stripe_payment_method_id: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    user: Mapped["User"] = relationship()


class Payment(Base):
    """Payment records for bookings."""
    __tablename__ = "payments"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    booking_id: Mapped[int] = mapped_column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    payment_method: Mapped[str] = mapped_column(String(50), nullable=False)  # 'card', 'cash', 'wallet'
    payment_status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)  # 'pending', 'completed', 'failed', 'refunded'
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(String(255))
    stripe_charge_id: Mapped[Optional[str]] = mapped_column(String(255))
    failure_reason: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    booking: Mapped["Booking"] = relationship()


class DriverPayout(Base):
    """Payout records for drivers."""
    __tablename__ = "driver_payouts"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    driver_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    payout_status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)  # 'pending', 'processing', 'completed', 'failed'
    stripe_transfer_id: Mapped[Optional[str]] = mapped_column(String(255))
    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    bookings_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    driver: Mapped["User"] = relationship()


class PromotionRedemption(Base):
    """Promotion code redemptions."""
    __tablename__ = "promotion_redemptions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    promotion_id: Mapped[int] = mapped_column(Integer, ForeignKey("promotions.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    booking_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("bookings.id", ondelete="SET NULL"))
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    redeemed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    promotion: Mapped["Promotion"] = relationship()
    user: Mapped["User"] = relationship()
    booking: Mapped[Optional["Booking"]] = relationship()


# ===========================================
# 10. OTP Verification
# ===========================================

class OTPCode(Base):
    """One-time password codes for phone/email verification."""
    __tablename__ = "otp_codes"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    identifier: Mapped[str] = mapped_column(String(255), nullable=False, index=True)  # email or phone
    identifier_type: Mapped[str] = mapped_column(String(20), nullable=False)  # 'email' or 'phone'
    code: Mapped[str] = mapped_column(String(10), nullable=False)
    purpose: Mapped[str] = mapped_column(String(50), nullable=False)  # 'registration', 'login', 'password_reset', 'phone_verify'
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    user: Mapped[Optional["User"]] = relationship()


class UserVerification(Base):
    """Track user verification status for email and phone."""
    __tablename__ = "user_verifications"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    email_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    phone_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    phone_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    user: Mapped["User"] = relationship()


# ===========================================
# 11. Push Notifications
# ===========================================

class PushSubscription(Base):
    """
    Web Push API subscriptions for browser push notifications.
    Free to use - uses W3C Push API standard.
    """
    __tablename__ = "push_subscriptions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    endpoint: Mapped[str] = mapped_column(Text, nullable=False)  # Push service URL
    keys_json: Mapped[str] = mapped_column(Text, nullable=False)  # JSON: {p256dh, auth}
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500))  # Browser info
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    user: Mapped["User"] = relationship()
    
    __table_args__ = (
        Index("ix_push_subscriptions_user_active", "user_id", "is_active"),
    )


# Alias for backward compatibility
TicketMessage = SupportTicketMessage
