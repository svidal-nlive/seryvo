"""
Seryvo Platform - Shared Response Builders
Centralized response building logic to eliminate DRY violations across API modules.
"""
from typing import Optional, List
from decimal import Decimal

from app.models import (
    Booking,
    BookingStop,
    User,
    DriverProfile,
    ServiceType,
)
from app.schemas import (
    BookingStopResponse,
    BookingResponse,
    DriverJobResponse,
    ServiceTypeResponse,
    UserResponse,
)


def build_booking_stop_response(stop: BookingStop) -> BookingStopResponse:
    """
    Build a BookingStopResponse from a BookingStop model.
    Aligned with model fields for consistent API responses.
    """
    return BookingStopResponse(
        id=stop.id,
        sequence=stop.sequence,
        address=stop.address,
        lat=float(stop.lat) if stop.lat else None,
        lng=float(stop.lng) if stop.lng else None,
        stop_type=stop.stop_type,
        arrived_at=stop.arrived_at
    )


def build_service_type_response(service_type: ServiceType) -> ServiceTypeResponse:
    """Build a ServiceTypeResponse from a ServiceType model."""
    return ServiceTypeResponse(
        id=service_type.id,
        code=service_type.code,
        name=service_type.name,
        description=service_type.description,
        base_capacity=service_type.base_capacity,
        is_active=service_type.is_active
    )


def build_user_response(user: User, roles: List[str]) -> UserResponse:
    """Build a UserResponse from a User model."""
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        created_at=user.created_at,
        roles=roles
    )


def safe_float(value) -> Optional[float]:
    """Safely convert Decimal or numeric to float."""
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def build_booking_response(
    booking: Booking,
    stops: List[BookingStop],
    client: Optional[UserResponse] = None,
    driver: Optional[UserResponse] = None,
    service_type: Optional[ServiceTypeResponse] = None
) -> BookingResponse:
    """
    Build a BookingResponse from a Booking model.
    Aligned with model fields for consistent API responses.
    """
    return BookingResponse(
        id=booking.id,
        client_id=booking.client_id,
        driver_id=booking.driver_id,
        service_type_id=booking.service_type_id,
        status=booking.status,
        is_asap=booking.is_asap,
        # Address fields
        pickup_address=booking.pickup_address,
        pickup_lat=safe_float(booking.pickup_lat),
        pickup_lng=safe_float(booking.pickup_lng),
        dropoff_address=booking.dropoff_address,
        dropoff_lat=safe_float(booking.dropoff_lat),
        dropoff_lng=safe_float(booking.dropoff_lng),
        # Time fields
        requested_pickup_at=booking.requested_pickup_at,
        confirmed_at=booking.confirmed_at,
        started_at=booking.started_at,
        completed_at=booking.completed_at,
        cancelled_at=booking.cancelled_at,
        # Details
        passenger_count=booking.passenger_count,
        luggage_count=booking.luggage_count,
        special_notes=booking.special_notes,
        # Pricing
        estimated_distance_km=safe_float(booking.estimated_distance_km),
        estimated_duration_min=booking.estimated_duration_min,
        base_fare=safe_float(booking.base_fare),
        distance_fare=safe_float(booking.distance_fare),
        time_fare=safe_float(booking.time_fare),
        surge_multiplier=safe_float(booking.surge_multiplier),
        extras_total=safe_float(booking.extras_total),
        tax_total=safe_float(booking.tax_total),
        discount_total=safe_float(booking.discount_total),
        final_fare=safe_float(booking.final_fare),
        driver_earnings=safe_float(booking.driver_earnings),
        platform_fee=safe_float(booking.platform_fee),
        # Ratings
        client_rating=booking.client_rating,
        driver_rating=booking.driver_rating,
        client_feedback=booking.client_feedback,
        driver_feedback=booking.driver_feedback,
        # Timestamps
        created_at=booking.created_at,
        updated_at=booking.updated_at,
        # Related objects
        stops=[build_booking_stop_response(s) for s in stops],
        client=client,
        driver=driver,
        service_type=service_type
    )


def build_driver_job_response(
    booking: Booking,
    stops: List[BookingStop],
    client_name: Optional[str] = None,
    client_phone: Optional[str] = None,
    client_rating_avg: Optional[float] = None
) -> DriverJobResponse:
    """
    Build a DriverJobResponse from a Booking model.
    Used for driver-facing job views with client info.
    """
    return DriverJobResponse(
        id=booking.id,
        status=booking.status,
        is_asap=booking.is_asap,
        requested_pickup_at=booking.requested_pickup_at,
        pickup_address=booking.pickup_address,
        pickup_lat=safe_float(booking.pickup_lat),
        pickup_lng=safe_float(booking.pickup_lng),
        dropoff_address=booking.dropoff_address,
        dropoff_lat=safe_float(booking.dropoff_lat),
        dropoff_lng=safe_float(booking.dropoff_lng),
        estimated_distance_km=safe_float(booking.estimated_distance_km),
        estimated_duration_min=booking.estimated_duration_min,
        driver_earnings=safe_float(booking.driver_earnings),
        final_fare=safe_float(booking.final_fare),
        passenger_count=booking.passenger_count,
        luggage_count=booking.luggage_count,
        special_notes=booking.special_notes,
        client_name=client_name,
        client_phone=client_phone,
        client_rating_avg=client_rating_avg,
        stops=[build_booking_stop_response(s) for s in stops],
        created_at=booking.created_at,
        started_at=booking.started_at,
        completed_at=booking.completed_at
    )
