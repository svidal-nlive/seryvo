"""
Seryvo Platform - Drivers API Router
Handles driver operations, job management, and status updates
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
import os
import uuid
import aiofiles

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models import (
    User, Role, UserRole, DriverProfile, Vehicle, DriverDocument,
    Booking, BookingStop, BookingEvent, AuditLog, PaymentMethod, Payment
)
from app.schemas import (
    DriverProfileResponse,
    DriverStatusUpdate,
    VehicleCreate,
    VehicleResponse,
    DriverJobResponse,
    DriverLocationUpdate,
    BookingStopResponse,
    BookingResponse,
    DriverEarnings,
    SuccessResponse,
    DriverDocumentResponse,
    DriverDocumentReviewRequest,
)

router = APIRouter(prefix="/drivers", tags=["Drivers"])


# Role dependency for driver-only endpoints
require_driver = require_roles(["admin", "driver"])


# ===========================================
# Helper functions for aligned responses
# ===========================================

def build_booking_stop_response(stop: BookingStop) -> BookingStopResponse:
    """Build a BookingStopResponse from a BookingStop model - aligned with model fields."""
    return BookingStopResponse(
        id=stop.id,
        sequence=stop.sequence,
        address=stop.address,
        lat=float(stop.lat) if stop.lat else None,
        lng=float(stop.lng) if stop.lng else None,
        stop_type=stop.stop_type,
        arrived_at=stop.arrived_at
    )


def build_driver_job_response(
    booking: Booking,
    stops: List[BookingStop],
    client_name: Optional[str] = None,
    client_phone: Optional[str] = None,
    client_rating_avg: Optional[float] = None
) -> DriverJobResponse:
    """Build a DriverJobResponse from a Booking model - aligned with model fields."""
    return DriverJobResponse(
        id=booking.id,
        status=booking.status,
        is_asap=booking.is_asap,
        requested_pickup_at=booking.requested_pickup_at,
        pickup_address=booking.pickup_address,
        pickup_lat=float(booking.pickup_lat) if booking.pickup_lat else None,
        pickup_lng=float(booking.pickup_lng) if booking.pickup_lng else None,
        dropoff_address=booking.dropoff_address,
        dropoff_lat=float(booking.dropoff_lat) if booking.dropoff_lat else None,
        dropoff_lng=float(booking.dropoff_lng) if booking.dropoff_lng else None,
        estimated_distance_km=float(booking.estimated_distance_km) if booking.estimated_distance_km else None,
        estimated_duration_min=booking.estimated_duration_min,
        base_fare=float(booking.base_fare) if booking.base_fare else None,
        final_fare=float(booking.final_fare) if booking.final_fare else None,
        driver_earnings=float(booking.driver_earnings) if booking.driver_earnings else None,
        passenger_count=booking.passenger_count,
        luggage_count=booking.luggage_count,
        special_notes=booking.special_notes,
        stops=[build_booking_stop_response(s) for s in stops],
        client_name=client_name,
        client_phone=client_phone,
        client_rating_avg=client_rating_avg
    )


@router.get("/profile", response_model=DriverProfileResponse)
async def get_driver_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_driver)
):
    """Get current driver's profile."""
    user_id = current_user.id
    
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        # Create profile if doesn't exist
        profile = DriverProfile(
            user_id=user_id,
            status="pending",
            availability_status="offline"
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    
    return DriverProfileResponse(
        user_id=profile.user_id,
        status=profile.status,
        availability_status=profile.availability_status,
        rating_average=float(profile.rating_average) if profile.rating_average else 0.0,
        total_ratings=profile.total_ratings or 0,
        acceptance_rate=float(profile.acceptance_rate) if profile.acceptance_rate else 0.0,
        cancellation_rate=float(profile.cancellation_rate) if profile.cancellation_rate else 0.0
    )


@router.patch("/status", response_model=DriverProfileResponse)
async def update_driver_status(
    request: DriverStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_driver)
):
    """Update driver availability status."""
    user_id = current_user.id
    
    valid_statuses = ["available", "busy", "offline"]
    if request.availability_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )
    
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        profile = DriverProfile(
            user_id=user_id,
            status="approved",
            availability_status=request.availability_status
        )
        db.add(profile)
    else:
        if profile.status != "approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Driver account is not approved"
            )
        profile.availability_status = request.availability_status
    
    await db.commit()
    await db.refresh(profile)
    
    return DriverProfileResponse(
        user_id=profile.user_id,
        status=profile.status,
        availability_status=profile.availability_status,
        rating_average=float(profile.rating_average) if profile.rating_average else 0.0,
        total_ratings=profile.total_ratings or 0,
        acceptance_rate=float(profile.acceptance_rate) if profile.acceptance_rate else 0.0,
        cancellation_rate=float(profile.cancellation_rate) if profile.cancellation_rate else 0.0
    )


@router.post("/location", response_model=SuccessResponse)
async def update_driver_location(
    request: DriverLocationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_driver)
):
    """Update driver's current location."""
    user_id = current_user.id
    
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver profile not found"
        )
    
    profile.current_lat = request.latitude
    profile.current_lng = request.longitude
    profile.location_updated_at = datetime.utcnow()
    
    await db.commit()
    
    return SuccessResponse(
        success=True,
        message="Location updated"
    )


@router.get("/vehicles", response_model=List[VehicleResponse])
async def list_vehicles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_driver)
):
    """List driver's vehicles."""
    user_id = current_user.id
    
    result = await db.execute(
        select(Vehicle).where(Vehicle.driver_id == user_id)
    )
    vehicles = result.scalars().all()
    
    return [VehicleResponse(
        id=v.id,
        make=v.make,
        model=v.model,
        year=v.year,
        color=v.color,
        license_plate=v.license_plate,
        capacity=v.capacity,
        is_active=v.is_active
    ) for v in vehicles]


@router.post("/vehicles", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def add_vehicle(
    request: VehicleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_driver)
):
    """Add a new vehicle."""
    user_id = current_user.id
    
    vehicle = Vehicle(
        driver_id=user_id,
        make=request.make,
        model=request.model,
        year=request.year,
        color=request.color,
        license_plate=request.license_plate,
        capacity=request.capacity,
        service_type_id=request.service_type_id,
        status="active",  # Default status for new vehicles
        is_active=True
    )
    db.add(vehicle)
    await db.commit()
    await db.refresh(vehicle)
    
    return VehicleResponse(
        id=vehicle.id,
        make=vehicle.make,
        model=vehicle.model,
        year=vehicle.year,
        color=vehicle.color,
        license_plate=vehicle.license_plate,
        capacity=vehicle.capacity,
        is_active=vehicle.is_active
    )


@router.delete("/vehicles/{vehicle_id}", response_model=SuccessResponse)
async def remove_vehicle(
    vehicle_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_driver)
):
    """Remove a vehicle."""
    user_id = current_user.id
    
    result = await db.execute(
        select(Vehicle).where(
            Vehicle.id == vehicle_id,
            Vehicle.driver_id == user_id
        )
    )
    vehicle = result.scalar_one_or_none()
    
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found"
        )
    
    vehicle.is_active = False
    await db.commit()
    
    return SuccessResponse(
        success=True,
        message="Vehicle removed"
    )


@router.get("/jobs/available", response_model=List[DriverJobResponse])
async def get_available_jobs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_driver)
):
    """Get available jobs (pending bookings) for driver."""
    user_id = current_user.id
    
    # Check if driver is available
    profile_result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == user_id)
    )
    profile = profile_result.scalar_one_or_none()
    
    if not profile or profile.availability_status != "available":
        return []
    
    # Get pending bookings without a driver
    result = await db.execute(
        select(Booking).where(
            Booking.status.in_(["pending", "searching"]),
            Booking.driver_id.is_(None)
        ).order_by(Booking.created_at.desc()).limit(10)
    )
    bookings = result.scalars().all()
    
    jobs = []
    for booking in bookings:
        # Get stops
        stops_result = await db.execute(
            select(BookingStop).where(BookingStop.booking_id == booking.id).order_by(BookingStop.sequence)
        )
        stops = stops_result.scalars().all()
        
        # Get client info
        client_result = await db.execute(
            select(User).where(User.id == booking.client_id)
        )
        client = client_result.scalar_one_or_none()
        
        jobs.append(build_driver_job_response(
            booking,
            stops,
            client_name=client.full_name if client else None,
            client_phone=None,  # Hidden until accepted
            client_rating_avg=None
        ))
    
    return jobs


@router.get("/jobs/current", response_model=Optional[DriverJobResponse])
async def get_current_job(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_driver)
):
    """Get driver's current active job."""
    user_id = current_user.id
    
    result = await db.execute(
        select(Booking).where(
            Booking.driver_id == user_id,
            Booking.status.in_(["accepted", "arrived", "in_progress"])
        ).order_by(Booking.created_at.desc()).limit(1)
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        return None
    
    # Get stops
    stops_result = await db.execute(
        select(BookingStop).where(BookingStop.booking_id == booking.id).order_by(BookingStop.sequence)
    )
    stops = stops_result.scalars().all()
    
    # Get client info
    client_result = await db.execute(
        select(User).where(User.id == booking.client_id)
    )
    client = client_result.scalar_one_or_none()
    
    return build_driver_job_response(
        booking,
        stops,
        client_name=client.full_name if client else None,
        client_phone=client.phone if client else None,
        client_rating_avg=None
    )


@router.post("/jobs/{booking_id}/accept", response_model=SuccessResponse)
async def accept_job(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_driver)
):
    """Accept a job."""
    user_id = current_user.id
    
    # Check driver profile
    profile_result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == user_id)
    )
    profile = profile_result.scalar_one_or_none()
    
    if not profile or profile.status != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Driver account is not approved"
        )
    
    # Get booking
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    if booking.driver_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking already assigned to a driver"
        )
    
    if booking.status not in ["pending", "searching"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking is not available for acceptance"
        )
    
    # Accept booking
    booking.driver_id = user_id
    booking.status = "accepted"
    
    # Update driver status
    profile.availability_status = "busy"
    
    # Create event
    event = BookingEvent(
        booking_id=booking.id,
        actor_id=user_id,
        event_type="booking.accepted"
    )
    db.add(event)
    
    await db.commit()
    
    # Send notifications to client
    try:
        # Get client info
        client_result = await db.execute(
            select(User).where(User.id == booking.client_id)
        )
        client = client_result.scalar_one_or_none()
        
        # Get vehicle info
        vehicle_result = await db.execute(
            select(Vehicle).where(Vehicle.driver_id == user_id, Vehicle.status == "active").limit(1)
        )
        vehicle = vehicle_result.scalar_one_or_none()
        vehicle_info = f"{vehicle.make} {vehicle.model} - {vehicle.license_plate}" if vehicle else "Vehicle"
        
        if client:
            # Email notification
            from app.core.email_service import email_service
            await email_service.send_driver_assigned(
                to_email=client.email,
                booking_id=booking.id,
                driver_name=current_user.full_name,
                vehicle_info=vehicle_info,
                eta_minutes=5
            )
            
            # Push notification
            from app.core.push_service import push_service
            await push_service.notify_client_driver_assigned(
                db=db,
                client_id=client.id,
                booking_id=booking.id,
                driver_name=current_user.full_name,
                eta_minutes=5
            )
            
            # WebSocket notification for real-time update
            from app.api.websocket import notify_driver_assigned
            await notify_driver_assigned(
                str(booking.id),
                str(booking.client_id),
                str(user_id),
                {
                    "id": user_id,
                    "name": current_user.full_name,
                    "phone": current_user.phone,
                    "photo_url": current_user.photo_url,
                    "rating": float(profile.rating_average) if profile.rating_average else None,
                    "vehicle": {
                        "make": vehicle.make if vehicle else None,
                        "model": vehicle.model if vehicle else None,
                        "color": vehicle.color if vehicle else None,
                        "license_plate": vehicle.license_plate if vehicle else None,
                    } if vehicle else None
                }
            )
    except Exception as notify_err:
        print(f"Notification failed: {notify_err}")
    
    return SuccessResponse(
        success=True,
        message="Job accepted"
    )


@router.post("/jobs/{booking_id}/arrive", response_model=SuccessResponse)
async def arrive_at_pickup(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_driver)
):
    """Mark arrival at pickup location."""
    user_id = current_user.id
    
    result = await db.execute(
        select(Booking).where(
            Booking.id == booking_id,
            Booking.driver_id == user_id
        )
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    if booking.status != "accepted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid booking status for this action"
        )
    
    booking.status = "arrived"
    
    # Create event
    event = BookingEvent(
        booking_id=booking.id,
        actor_id=user_id,
        event_type="driver.arrived"
    )
    db.add(event)
    
    await db.commit()
    
    # Notify client that driver has arrived
    try:
        from app.core.push_service import push_service
        await push_service.notify_client_driver_arrived(
            db=db,
            client_id=booking.client_id,
            booking_id=booking.id,
            driver_name=current_user.full_name
        )
    except Exception as notify_err:
        print(f"Push notification failed: {notify_err}")
    
    return SuccessResponse(
        success=True,
        message="Arrival confirmed"
    )


@router.post("/jobs/{booking_id}/start", response_model=SuccessResponse)
async def start_trip(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_driver)
):
    """Start the trip."""
    user_id = current_user.id
    
    result = await db.execute(
        select(Booking).where(
            Booking.id == booking_id,
            Booking.driver_id == user_id
        )
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    if booking.status != "arrived":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid booking status for this action"
        )
    
    booking.status = "in_progress"
    booking.started_at = datetime.utcnow()
    
    # Create event
    event = BookingEvent(
        booking_id=booking.id,
        actor_id=user_id,
        event_type="trip.started"
    )
    db.add(event)
    
    await db.commit()
    
    return SuccessResponse(
        success=True,
        message="Trip started"
    )


@router.post("/jobs/{booking_id}/complete", response_model=SuccessResponse)
async def complete_trip(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_driver)
):
    """Complete the trip and process payment."""
    user_id = current_user.id
    
    result = await db.execute(
        select(Booking).where(
            Booking.id == booking_id,
            Booking.driver_id == user_id
        )
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    if booking.status != "in_progress":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid booking status for this action"
        )
    
    booking.status = "completed"
    booking.completed_at = datetime.utcnow()
    
    # final_fare should already be set from booking creation; if not, use base_fare
    if not booking.final_fare:
        booking.final_fare = booking.base_fare
    
    # Calculate driver earnings (80%) and platform fee (20%)
    DRIVER_SHARE = 0.80
    final_amount = float(booking.final_fare or 0)
    booking.driver_earnings = round(final_amount * DRIVER_SHARE, 2)
    booking.platform_fee = round(final_amount * (1 - DRIVER_SHARE), 2)
    
    # Process payment via Stripe
    payment_status = "pending"
    stripe_payment_intent_id = None
    payment_failure_reason = None
    
    try:
        # Get client's default payment method
        pm_result = await db.execute(
            select(PaymentMethod).where(
                PaymentMethod.user_id == booking.client_id,
                PaymentMethod.is_default == True
            )
        )
        payment_method = pm_result.scalar_one_or_none()
        
        if payment_method and payment_method.stripe_payment_method_id:
            # Process payment via Stripe
            from app.core.stripe_service import stripe_service
            
            amount_cents = int(final_amount * 100)  # Convert to cents
            
            stripe_result = await stripe_service.create_payment_intent(
                amount=amount_cents,
                currency="usd",
                payment_method_id=payment_method.stripe_payment_method_id,
                description=f"Seryvo Ride #{booking.id}",
                metadata={
                    "booking_id": str(booking.id),
                    "client_id": str(booking.client_id),
                    "driver_id": str(booking.driver_id),
                }
            )
            
            if stripe_result.get("success"):
                stripe_payment_intent_id = stripe_result.get("payment_intent_id")
                if stripe_result.get("status") in ("succeeded", "requires_capture"):
                    payment_status = "completed"
                else:
                    payment_status = stripe_result.get("status", "pending")
            else:
                payment_failure_reason = stripe_result.get("error", "Payment failed")
                payment_status = "failed"
        else:
            # Demo mode: Simulate successful payment if no Stripe payment method
            payment_status = "completed"
            print(f"[Demo] Simulating payment for booking {booking.id}: ${final_amount:.2f}")
    except Exception as e:
        payment_failure_reason = str(e)
        payment_status = "failed"
        print(f"[Payment] Error processing payment for booking {booking.id}: {e}")
    
    # Create Payment record
    payment = Payment(
        booking_id=booking.id,
        amount=final_amount,
        currency="USD",
        payment_method="card",
        payment_status=payment_status,
        stripe_payment_intent_id=stripe_payment_intent_id,
        failure_reason=payment_failure_reason,
        completed_at=datetime.utcnow() if payment_status == "completed" else None,
    )
    db.add(payment)
    
    # Update driver status back to available
    profile_result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == user_id)
    )
    profile = profile_result.scalar_one_or_none()
    if profile:
        profile.availability_status = "available"
    
    # Create event
    event = BookingEvent(
        booking_id=booking.id,
        actor_id=user_id,
        event_type="trip.completed",
        event_metadata={
            "final_fare": final_amount,
            "driver_earnings": float(booking.driver_earnings or 0),
            "platform_fee": float(booking.platform_fee or 0),
            "payment_status": payment_status,
        }
    )
    db.add(event)
    
    await db.commit()
    
    # Send ride receipt and notifications
    try:
        # Get client info
        client_result = await db.execute(
            select(User).where(User.id == booking.client_id)
        )
        client = client_result.scalar_one_or_none()
        
        if client:
            # Send email receipt
            from app.core.email_service import email_service
            await email_service.send_ride_receipt(
                to_email=client.email,
                booking_id=booking.id,
                pickup_address=booking.pickup_address,
                dropoff_address=booking.dropoff_address,
                driver_name=current_user.full_name,
                distance=float(booking.estimated_distance_km or 0),
                duration_minutes=int(booking.estimated_duration_min or 0),
                base_fare=float(booking.base_fare or 0),
                total_fare=float(booking.final_fare or 0),
                payment_method="Card",
                completed_at=booking.completed_at
            )
            
            # Push notification to client
            from app.core.push_service import push_service
            await push_service.notify_client_ride_complete(
                db=db,
                client_id=client.id,
                booking_id=booking.id,
                total_fare=float(booking.final_fare or 0)
            )
            
            # Push notification to driver about earnings
            await push_service.notify_driver_payment_received(
                db=db,
                driver_id=user_id,
                amount=float(booking.driver_earnings or 0),
                booking_id=booking.id
            )
    except Exception as notify_err:
        print(f"Trip completion notifications failed: {notify_err}")
    
    return SuccessResponse(
        success=True,
        message="Trip completed"
    )


@router.get("/earnings", response_model=DriverEarnings)
async def get_driver_earnings(
    period: str = Query("week", regex="^(today|week|month)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_driver)
):
    """Get driver earnings summary."""
    user_id = current_user.id
    
    # Calculate period start
    now = datetime.utcnow()
    if period == "today":
        period_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        period_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        period_start = period_start.replace(day=period_start.day - period_start.weekday())
    else:  # month
        period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Get completed bookings in period
    result = await db.execute(
        select(Booking).where(
            Booking.driver_id == user_id,
            Booking.status == "completed",
            Booking.completed_at >= period_start
        )
    )
    bookings = result.scalars().all()
    
    total_trips = len(bookings)
    total_earnings = sum(
        float(b.final_fare) if b.final_fare else 0 
        for b in bookings
    )
    average_per_trip = total_earnings / total_trips if total_trips > 0 else 0
    
    return DriverEarnings(
        period=period,
        total_trips=total_trips,
        total_earnings=round(total_earnings, 2),
        average_per_trip=round(average_per_trip, 2),
        currency="USD"
    )


@router.get("/history", response_model=List[BookingResponse])
async def get_driver_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_driver)
):
    """Get driver's trip history."""
    user_id = current_user.id
    
    offset = (page - 1) * page_size
    
    result = await db.execute(
        select(Booking).where(
            Booking.driver_id == user_id,
            Booking.status.in_(["completed", "cancelled"])
        ).order_by(Booking.created_at.desc()).offset(offset).limit(page_size)
    )
    bookings = result.scalars().all()
    
    responses = []
    for booking in bookings:
        # Get stops
        stops_result = await db.execute(
            select(BookingStop).where(BookingStop.booking_id == booking.id).order_by(BookingStop.sequence)
        )
        stops = stops_result.scalars().all()
        
        responses.append(BookingResponse(
            id=booking.id,
            client_id=booking.client_id,
            driver_id=booking.driver_id,
            service_type_id=booking.service_type_id,
            status=booking.status,
            is_asap=booking.is_asap,
            pickup_address=booking.pickup_address,
            pickup_lat=float(booking.pickup_lat) if booking.pickup_lat else None,
            pickup_lng=float(booking.pickup_lng) if booking.pickup_lng else None,
            dropoff_address=booking.dropoff_address,
            dropoff_lat=float(booking.dropoff_lat) if booking.dropoff_lat else None,
            dropoff_lng=float(booking.dropoff_lng) if booking.dropoff_lng else None,
            requested_pickup_at=booking.requested_pickup_at,
            confirmed_at=booking.confirmed_at,
            started_at=booking.started_at,
            completed_at=booking.completed_at,
            cancelled_at=booking.cancelled_at,
            passenger_count=booking.passenger_count,
            luggage_count=booking.luggage_count,
            special_notes=booking.special_notes,
            estimated_distance_km=float(booking.estimated_distance_km) if booking.estimated_distance_km else None,
            estimated_duration_min=booking.estimated_duration_min,
            base_fare=float(booking.base_fare) if booking.base_fare else None,
            distance_fare=float(booking.distance_fare) if booking.distance_fare else None,
            time_fare=float(booking.time_fare) if booking.time_fare else None,
            surge_multiplier=float(booking.surge_multiplier) if booking.surge_multiplier else None,
            extras_total=float(booking.extras_total) if booking.extras_total else None,
            tax_total=float(booking.tax_total) if booking.tax_total else None,
            discount_total=float(booking.discount_total) if booking.discount_total else None,
            final_fare=float(booking.final_fare) if booking.final_fare else None,
            driver_earnings=float(booking.driver_earnings) if booking.driver_earnings else None,
            platform_fee=float(booking.platform_fee) if booking.platform_fee else None,
            driver_rating=booking.driver_rating,
            client_rating=booking.client_rating,
            driver_feedback=booking.driver_feedback,
            client_feedback=booking.client_feedback,
            created_at=booking.created_at,
            updated_at=booking.updated_at,
            stops=[BookingStopResponse(
                id=s.id,
                sequence=s.sequence,
                address=s.address,
                lat=float(s.lat) if s.lat else None,
                lng=float(s.lng) if s.lng else None,
                stop_type=s.stop_type,
                arrived_at=s.arrived_at
            ) for s in stops]
        ))
    
    return responses


# ===========================================
# Driver Document Endpoints
# ===========================================

# Allowed document types
ALLOWED_DOCUMENT_TYPES = [
    "drivers_license",
    "vehicle_registration",
    "insurance",
    "profile_photo",
    "vehicle_photo_front",
    "vehicle_photo_back",
    "vehicle_photo_interior",
    "background_check",
]

# Allowed file extensions
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Upload directory (in production, use cloud storage like S3)
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "documents")


@router.get("/documents", response_model=List[DriverDocumentResponse])
async def get_driver_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_driver)
):
    """Get current driver's documents."""
    result = await db.execute(
        select(DriverDocument).where(DriverDocument.driver_id == current_user.id)
    )
    documents = result.scalars().all()
    
    return [
        DriverDocumentResponse(
            id=doc.id,
            driver_id=doc.driver_id,
            doc_type=doc.doc_type,
            file_url=doc.file_url,
            status=doc.status,
            expires_at=doc.expires_at,
            reviewed_by=doc.reviewed_by,
            reviewed_at=doc.reviewed_at,
            rejection_reason=None,  # Add this field to model if needed
            created_at=doc.created_at
        )
        for doc in documents
    ]


@router.post("/documents", response_model=DriverDocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_driver_document(
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_driver)
):
    """Upload a driver document."""
    # Validate document type
    if doc_type not in ALLOWED_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document type. Allowed: {ALLOWED_DOCUMENT_TYPES}"
        )
    
    # Validate file extension
    if file.filename:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed: {list(ALLOWED_EXTENSIONS)}"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File name is required"
        )
    
    # Check file size
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Create upload directory if it doesn't exist
    driver_upload_dir = os.path.join(UPLOAD_DIR, str(current_user.id))
    os.makedirs(driver_upload_dir, exist_ok=True)
    
    # Generate unique filename
    unique_filename = f"{doc_type}_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(driver_upload_dir, unique_filename)
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as out_file:
        await out_file.write(file_content)
    
    # Create relative URL for the file
    file_url = f"/uploads/documents/{current_user.id}/{unique_filename}"
    
    # Check if document of this type already exists
    result = await db.execute(
        select(DriverDocument).where(
            and_(
                DriverDocument.driver_id == current_user.id,
                DriverDocument.doc_type == doc_type
            )
        )
    )
    existing_doc = result.scalar_one_or_none()
    
    if existing_doc:
        # Update existing document
        existing_doc.file_url = file_url
        existing_doc.status = "pending_review"
        existing_doc.reviewed_by = None
        existing_doc.reviewed_at = None
        existing_doc.created_at = datetime.utcnow()
        document = existing_doc
    else:
        # Create new document
        document = DriverDocument(
            driver_id=current_user.id,
            doc_type=doc_type,
            file_url=file_url,
            status="pending_review"
        )
        db.add(document)
    
    await db.commit()
    await db.refresh(document)
    
    return DriverDocumentResponse(
        id=document.id,
        driver_id=document.driver_id,
        doc_type=document.doc_type,
        file_url=document.file_url,
        status=document.status,
        expires_at=document.expires_at,
        reviewed_by=document.reviewed_by,
        reviewed_at=document.reviewed_at,
        rejection_reason=None,
        created_at=document.created_at
    )


@router.delete("/documents/{document_id}", response_model=SuccessResponse)
async def delete_driver_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_driver)
):
    """Delete a driver document."""
    result = await db.execute(
        select(DriverDocument).where(
            and_(
                DriverDocument.id == document_id,
                DriverDocument.driver_id == current_user.id
            )
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Delete file from disk
    if document.file_url:
        file_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            document.file_url.lstrip('/')
        )
        if os.path.exists(file_path):
            os.remove(file_path)
    
    await db.delete(document)
    await db.commit()
    
    return SuccessResponse(message="Document deleted successfully")


# Admin endpoint for reviewing documents
require_admin = require_roles(["admin"])


@router.get("/admin/documents/pending", response_model=List[DriverDocumentResponse])
async def get_pending_documents(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get all pending documents for review (admin only)."""
    result = await db.execute(
        select(DriverDocument)
        .where(DriverDocument.status == "pending_review")
        .order_by(DriverDocument.created_at.asc())
        .offset(offset)
        .limit(limit)
    )
    documents = result.scalars().all()
    
    return [
        DriverDocumentResponse(
            id=doc.id,
            driver_id=doc.driver_id,
            doc_type=doc.doc_type,
            file_url=doc.file_url,
            status=doc.status,
            expires_at=doc.expires_at,
            reviewed_by=doc.reviewed_by,
            reviewed_at=doc.reviewed_at,
            rejection_reason=None,
            created_at=doc.created_at
        )
        for doc in documents
    ]


@router.patch("/admin/documents/{document_id}/review", response_model=DriverDocumentResponse)
async def review_driver_document(
    document_id: int,
    request: DriverDocumentReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Review and approve/reject a driver document (admin only)."""
    result = await db.execute(
        select(DriverDocument).where(DriverDocument.id == document_id)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Update document status
    document.status = request.status
    document.reviewed_by = current_user.id
    document.reviewed_at = datetime.utcnow()
    
    if request.expires_at:
        document.expires_at = request.expires_at
    
    await db.commit()
    await db.refresh(document)
    
    # Log the review action
    audit_log = AuditLog(
        user_id=current_user.id,
        action="document_review",
        entity_type="driver_document",
        entity_id=document.id,
        changes={
            "status": request.status,
            "rejection_reason": request.rejection_reason
        }
    )
    db.add(audit_log)
    await db.commit()
    
    return DriverDocumentResponse(
        id=document.id,
        driver_id=document.driver_id,
        doc_type=document.doc_type,
        file_url=document.file_url,
        status=document.status,
        expires_at=document.expires_at,
        reviewed_by=document.reviewed_by,
        reviewed_at=document.reviewed_at,
        rejection_reason=request.rejection_reason if request.status == "rejected" else None,
        created_at=document.created_at
    )