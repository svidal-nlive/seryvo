"""
Seryvo Platform - Canonical Enums

This module defines all canonical enum values used throughout the platform.
These MUST align with docs/Platform Canonical Definitions.md

All code should import and use these enums rather than string literals.
"""
from enum import Enum


class Role(str, Enum):
    """User roles in the platform.
    
    These values are used consistently across database, API, and frontend.
    """
    CLIENT = "client"
    DRIVER = "driver"
    SUPPORT_AGENT = "support_agent"
    ADMIN = "admin"


class BookingStatus(str, Enum):
    """Canonical booking lifecycle states.
    
    See docs/Booking State Machine.md for transition rules.
    """
    # Pre-trip states
    DRAFT = "draft"                           # Quote/cart stage, not yet confirmed
    REQUESTED = "requested"                   # Client confirmed, searching for driver
    
    # Assignment and pickup states
    DRIVER_ASSIGNED = "driver_assigned"       # Driver accepted booking
    DRIVER_EN_ROUTE_PICKUP = "driver_en_route_pickup"  # Driver heading to pickup
    DRIVER_ARRIVED = "driver_arrived"         # Driver at pickup, waiting for client
    
    # Trip states
    IN_PROGRESS = "in_progress"               # Client onboard, trip active
    
    # Completion states
    COMPLETED = "completed"                   # Trip completed successfully
    
    # Cancellation states
    CANCELED_BY_CLIENT = "canceled_by_client"
    CANCELED_BY_DRIVER = "canceled_by_driver"
    CANCELED_BY_SYSTEM = "canceled_by_system"  # Timeout, payment failure, etc.
    
    # No-show states
    NO_SHOW_CLIENT = "no_show_client"         # Client didn't show up
    NO_SHOW_DRIVER = "no_show_driver"         # Driver didn't show up
    
    # Post-trip states
    DISPUTED = "disputed"                     # Under dispute review
    REFUNDED = "refunded"                     # Resolved with refund
    
    @classmethod
    def active_statuses(cls) -> list[str]:
        """Return list of statuses considered 'active' (trip in progress)."""
        return [
            cls.REQUESTED.value,
            cls.DRIVER_ASSIGNED.value,
            cls.DRIVER_EN_ROUTE_PICKUP.value,
            cls.DRIVER_ARRIVED.value,
            cls.IN_PROGRESS.value,
        ]
    
    @classmethod
    def terminal_statuses(cls) -> list[str]:
        """Return list of statuses that are terminal (trip ended)."""
        return [
            cls.COMPLETED.value,
            cls.CANCELED_BY_CLIENT.value,
            cls.CANCELED_BY_DRIVER.value,
            cls.CANCELED_BY_SYSTEM.value,
            cls.NO_SHOW_CLIENT.value,
            cls.NO_SHOW_DRIVER.value,
            cls.REFUNDED.value,
        ]
    
    @classmethod
    def cancelable_statuses(cls) -> list[str]:
        """Return list of statuses from which a booking can be canceled."""
        return [
            cls.DRAFT.value,
            cls.REQUESTED.value,
            cls.DRIVER_ASSIGNED.value,
            cls.DRIVER_EN_ROUTE_PICKUP.value,
        ]
    
    @classmethod
    def awaiting_driver_statuses(cls) -> list[str]:
        """Return list of statuses where we're looking for a driver."""
        return [cls.REQUESTED.value]
    
    @classmethod
    def driver_active_statuses(cls) -> list[str]:
        """Return list of statuses where a driver is actively on the booking."""
        return [
            cls.DRIVER_ASSIGNED.value,
            cls.DRIVER_EN_ROUTE_PICKUP.value,
            cls.DRIVER_ARRIVED.value,
            cls.IN_PROGRESS.value,
        ]


# Legacy status mapping for migration
LEGACY_STATUS_MAP = {
    "pending": BookingStatus.REQUESTED.value,
    "searching": BookingStatus.REQUESTED.value,
    "accepted": BookingStatus.DRIVER_ASSIGNED.value,
    "en_route": BookingStatus.DRIVER_EN_ROUTE_PICKUP.value,
    "arrived": BookingStatus.DRIVER_ARRIVED.value,
    "in_progress": BookingStatus.IN_PROGRESS.value,
    "completed": BookingStatus.COMPLETED.value,
    "cancelled": BookingStatus.CANCELED_BY_SYSTEM.value,  # Default; should be refined
}


def migrate_legacy_status(legacy_status: str) -> str:
    """Convert a legacy status value to canonical status.
    
    Returns the canonical status, or the input if already canonical.
    """
    return LEGACY_STATUS_MAP.get(legacy_status, legacy_status)


class DriverPlatformStatus(str, Enum):
    """Driver platform/onboarding status.
    
    Represents the driver's compliance and approval state.
    """
    PENDING_VERIFICATION = "pending_verification"  # Awaiting document review
    INACTIVE = "inactive"                          # Approved but not allowed to work
    ACTIVE = "active"                              # Fully approved, can accept jobs
    SUSPENDED = "suspended"                        # Temporarily blocked
    BANNED = "banned"                              # Permanently blocked
    
    @classmethod
    def can_go_online(cls, status: str) -> bool:
        """Check if a driver with this status can go online."""
        return status == cls.ACTIVE.value


class DriverAvailabilityStatus(str, Enum):
    """Driver availability status (runtime state).
    
    Represents whether driver is currently accepting jobs.
    """
    OFFLINE = "offline"       # Not accepting jobs
    AVAILABLE = "available"   # Online and ready for jobs
    ON_TRIP = "on_trip"       # Currently on a booking
    ON_BREAK = "on_break"     # Online but not accepting (future)


class VehicleStatus(str, Enum):
    """Vehicle approval status."""
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    INACTIVE = "inactive"


class DocumentStatus(str, Enum):
    """Driver document verification status."""
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class PaymentStatus(str, Enum):
    """Payment transaction status."""
    PENDING = "pending"
    PROCESSING = "processing"
    CAPTURED = "captured"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"
    
    @classmethod
    def refundable_statuses(cls) -> list[str]:
        """Return statuses that allow refunds."""
        return [cls.COMPLETED.value, cls.CAPTURED.value]


class PayoutStatus(str, Enum):
    """Driver payout status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class TicketStatus(str, Enum):
    """Support ticket status."""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING_ON_CLIENT = "waiting_on_client"
    WAITING_ON_DRIVER = "waiting_on_driver"
    RESOLVED = "resolved"
    CLOSED = "closed"
    ESCALATED = "escalated"


class TicketPriority(str, Enum):
    """Support ticket priority."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TicketCategory(str, Enum):
    """Support ticket category."""
    TRIP_ISSUE = "trip_issue"
    ACCOUNT_ISSUE = "account_issue"
    PAYMENT_DISPUTE = "payment_dispute"
    SAFETY_INCIDENT = "safety_incident"
    OTHER = "other"
