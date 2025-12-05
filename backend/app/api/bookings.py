"""
Seryvo Platform - Bookings API Router
Handles booking creation, management, and client operations
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models import (
    User, Booking, BookingStop, BookingEvent, ServiceType,
    PricingRule, SurgeRule, Region, Promotion, PromotionRedemption,
    AuditLog, Conversation, ConversationParticipant, DriverProfile,
    PaymentMethod
)
from app.schemas import (
    BookingCreate,
    BookingUpdate,
    BookingResponse,
    BookingListResponse,
    BookingStopResponse,
    BookingCancelRequest,
    BookingRatingRequest,
    PriceEstimateRequest,
    PriceEstimateResponse,
    ServiceTypeResponse,
    SuccessResponse,
    UserResponse,
)
from app.api.websocket import notify_new_booking_offer, get_online_drivers

router = APIRouter(prefix="/bookings", tags=["Bookings"])


# Role dependency helpers
require_client = require_roles(["admin", "client"])
require_any_role = require_roles(["admin", "support", "driver", "client"])


# ===========================================
# Helper functions to build aligned responses
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


def build_booking_response(
    booking: Booking,
    stops: List[BookingStop],
    client: Optional[UserResponse] = None,
    driver: Optional[UserResponse] = None,
    service_type: Optional[ServiceTypeResponse] = None
) -> BookingResponse:
    """Build a BookingResponse from a Booking model - aligned with model fields."""
    return BookingResponse(
        id=booking.id,
        client_id=booking.client_id,
        driver_id=booking.driver_id,
        service_type_id=booking.service_type_id,
        status=booking.status,
        is_asap=booking.is_asap,
        # Address fields
        pickup_address=booking.pickup_address,
        pickup_lat=float(booking.pickup_lat) if booking.pickup_lat else None,
        pickup_lng=float(booking.pickup_lng) if booking.pickup_lng else None,
        dropoff_address=booking.dropoff_address,
        dropoff_lat=float(booking.dropoff_lat) if booking.dropoff_lat else None,
        dropoff_lng=float(booking.dropoff_lng) if booking.dropoff_lng else None,
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


async def calculate_price(
    db: AsyncSession,
    pickup_lat: float,
    pickup_lng: float,
    dropoff_lat: float,
    dropoff_lng: float,
    service_type_id: Optional[int] = None,
    scheduled_at: Optional[datetime] = None
) -> PriceEstimateResponse:
    """Calculate price estimate for a ride."""
    # Simplified distance calculation (Haversine would be better)
    import math
    
    def haversine(lat1, lon1, lat2, lon2):
        R = 6371  # Earth's radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        return R * c
    
    distance_km = haversine(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng)
    
    # Estimate duration (assume avg 30 km/h in city)
    duration_minutes = (distance_km / 30) * 60
    
    # Get pricing rule
    query = select(PricingRule).where(PricingRule.is_active == True)
    if service_type_id:
        query = query.where(
            or_(
                PricingRule.service_type_id == service_type_id,
                PricingRule.service_type_id.is_(None)
            )
        )
    query = query.limit(1)
    
    result = await db.execute(query)
    pricing_rule = result.scalar_one_or_none()
    
    # Default pricing if no rule found
    base_fare = 5.0
    per_km = 1.5
    per_minute = 0.3
    minimum_fare = 10.0
    currency = "USD"
    
    if pricing_rule:
        base_fare = float(pricing_rule.base_fare)
        per_km = float(pricing_rule.per_km)
        per_minute = float(pricing_rule.per_minute)
        minimum_fare = float(pricing_rule.minimum_fare)
        currency = pricing_rule.currency
    
    # Calculate base fare
    fare = base_fare + (distance_km * per_km) + (duration_minutes * per_minute)
    
    # Check surge pricing
    surge_multiplier = 1.0
    surge_result = await db.execute(
        select(SurgeRule).where(SurgeRule.is_active == True)
    )
    surge_rules = surge_result.scalars().all()
    
    for rule in surge_rules:
        # Apply surge if active (simplified - would check time/location)
        if rule.multiplier > surge_multiplier:
            surge_multiplier = float(rule.multiplier)
    
    fare = fare * surge_multiplier
    
    # Apply minimum fare
    fare = max(fare, minimum_fare)
    
    return PriceEstimateResponse(
        estimated_fare=round(fare, 2),
        estimated_distance_km=round(distance_km, 2),
        estimated_duration_minutes=round(duration_minutes, 0),
        surge_multiplier=surge_multiplier,
        currency=currency,
        breakdown={
            "base_fare": base_fare,
            "distance_charge": round(distance_km * per_km, 2),
            "time_charge": round(duration_minutes * per_minute, 2),
            "surge_amount": round(fare - (fare / surge_multiplier), 2) if surge_multiplier > 1 else 0
        }
    )


@router.post("/estimate", response_model=PriceEstimateResponse)
async def get_price_estimate(
    request: PriceEstimateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get price estimate for a ride."""
    return await calculate_price(
        db,
        request.pickup_lat,
        request.pickup_lng,
        request.dropoff_lat,
        request.dropoff_lng,
        request.service_type_id,
        request.scheduled_at
    )


@router.get("/service-types", response_model=List[ServiceTypeResponse])
async def list_service_types(
    db: AsyncSession = Depends(get_db)
):
    """List available service types."""
    result = await db.execute(
        select(ServiceType).where(ServiceType.is_active == True)
    )
    service_types = result.scalars().all()
    
    return [ServiceTypeResponse(
        id=st.id,
        code=st.code,
        name=st.name,
        description=st.description,
        base_capacity=st.base_capacity,
        is_active=st.is_active
    ) for st in service_types]


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    request: BookingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new booking."""
    client_id = current_user.id
    
    # Require payment method before booking
    payment_method_result = await db.execute(
        select(PaymentMethod).where(
            PaymentMethod.user_id == client_id,
            PaymentMethod.is_default == True
        )
    )
    default_payment_method = payment_method_result.scalar_one_or_none()
    
    if not default_payment_method:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please add a payment method before booking a ride"
        )
    
    # Validate stops (need at least pickup and dropoff)
    if len(request.stops) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least 2 stops (pickup and dropoff) are required"
        )
    
    # Calculate price estimate
    pickup = request.stops[0]
    dropoff = request.stops[-1]
    estimate = await calculate_price(
        db,
        pickup.lat or 0,
        pickup.lng or 0,
        dropoff.lat or 0,
        dropoff.lng or 0,
        request.service_type_id,
        request.requested_pickup_at
    )
    
    # Check promotion code
    discount = 0
    promo = None
    if request.promotion_code:
        promo_result = await db.execute(
            select(Promotion).where(
                Promotion.code == request.promotion_code,
                Promotion.is_active == True
            )
        )
        promo = promo_result.scalar_one_or_none()
        
        if promo:
            if promo.discount_type == "percentage":
                discount = estimate.estimated_fare * (promo.discount_value / 100)
            else:
                discount = promo.discount_value
    
    # Create booking with aligned field names
    pickup_stop = request.stops[0] if request.stops else None
    dropoff_stop = request.stops[-1] if len(request.stops) > 1 else request.stops[0] if request.stops else None
    
    booking = Booking(
        client_id=client_id,
        service_type_id=request.service_type_id,
        status="requested",  # Use 'requested' to match frontend expectations
        is_asap=request.requested_pickup_at is None,
        requested_pickup_at=request.requested_pickup_at,
        pickup_address=pickup_stop.address if pickup_stop else "Unknown",
        pickup_lat=pickup_stop.lat if pickup_stop else None,
        pickup_lng=pickup_stop.lng if pickup_stop else None,
        dropoff_address=dropoff_stop.address if dropoff_stop else "Unknown",
        dropoff_lat=dropoff_stop.lat if dropoff_stop else None,
        dropoff_lng=dropoff_stop.lng if dropoff_stop else None,
        passenger_count=request.passenger_count,
        luggage_count=request.luggage_count,
        special_notes=request.special_notes,
        estimated_distance_km=estimate.estimated_distance_km,
        estimated_duration_min=int(estimate.estimated_duration_minutes),
        base_fare=estimate.estimated_fare - discount,
        discount_total=discount if discount > 0 else None,
        final_fare=estimate.estimated_fare - discount,
    )
    db.add(booking)
    await db.flush()
    
    # Create stops
    for idx, stop_data in enumerate(request.stops):
        stop = BookingStop(
            booking_id=booking.id,
            sequence=idx,
            address=stop_data.address,
            lat=stop_data.lat,
            lng=stop_data.lng,
            stop_type=stop_data.stop_type,
        )
        db.add(stop)
    
    # Create booking event
    event = BookingEvent(
        booking_id=booking.id,
        actor_id=client_id,
        event_type="booking.created",
        description=f"Booking created with estimated fare: {estimate.estimated_fare}"
    )
    db.add(event)
    
    # Record promotion redemption
    if request.promotion_code and discount > 0 and promo:
        redemption = PromotionRedemption(
            promotion_id=promo.id,
            user_id=client_id,
            booking_id=booking.id,
            discount_amount=discount
        )
        db.add(redemption)
    
    await db.commit()
    await db.refresh(booking)
    
    # Get stops for response
    stops_result = await db.execute(
        select(BookingStop).where(BookingStop.booking_id == booking.id).order_by(BookingStop.sequence)
    )
    stops = stops_result.scalars().all()
    
    # ===========================================
    # Dispatch booking offer to available drivers
    # ===========================================
    try:
        # Get available drivers (approved and online)
        available_drivers_result = await db.execute(
            select(DriverProfile.user_id).where(
                DriverProfile.status == "approved",
                DriverProfile.availability_status == "available"
            )
        )
        available_driver_ids = [str(row[0]) for row in available_drivers_result.fetchall()]
        
        # Filter to only online drivers via WebSocket
        online_drivers = await get_online_drivers()
        available_online_drivers = [
            driver_id for driver_id in available_driver_ids 
            if driver_id in online_drivers
        ]
        
        if available_online_drivers:
            # Build booking offer data - include status for frontend detection
            booking_offer_data = {
                "status": "requested",  # Frontend expects this to identify new offers
                "pickup_address": booking.pickup_address,
                "pickup_lat": float(booking.pickup_lat) if booking.pickup_lat else None,
                "pickup_lng": float(booking.pickup_lng) if booking.pickup_lng else None,
                "dropoff_address": booking.dropoff_address,
                "dropoff_lat": float(booking.dropoff_lat) if booking.dropoff_lat else None,
                "dropoff_lng": float(booking.dropoff_lng) if booking.dropoff_lng else None,
                "estimated_fare": float(booking.final_fare) if booking.final_fare else None,
                "estimated_distance_km": float(booking.estimated_distance_km) if booking.estimated_distance_km else None,
                "estimated_duration_min": booking.estimated_duration_min,
                "passenger_count": booking.passenger_count,
                "is_asap": booking.is_asap,
                "requested_pickup_at": booking.requested_pickup_at.isoformat() if booking.requested_pickup_at else None,
            }
            
            # Notify available drivers
            await notify_new_booking_offer(
                booking_id=str(booking.id),
                booking_data=booking_offer_data,
                available_driver_ids=available_online_drivers
            )
            
            # Send push notifications to available drivers
            from app.core.push_service import push_service
            for driver_id in available_online_drivers:
                try:
                    await push_service.notify_driver_new_ride(
                        db=db,
                        driver_id=int(driver_id),
                        booking_id=booking.id,
                        pickup_address=booking.pickup_address,
                        estimated_fare=float(booking.final_fare or 0)
                    )
                except Exception as push_err:
                    print(f"Push notification failed for driver {driver_id}: {push_err}")
    except Exception as e:
        # Don't fail the booking creation if notification fails
        print(f"Warning: Failed to dispatch booking offer: {e}")
    
    # Send email confirmation to client
    try:
        from app.core.email_service import email_service
        await email_service.send_booking_confirmation(
            to_email=current_user.email,
            booking_id=booking.id,
            pickup_address=booking.pickup_address,
            dropoff_address=booking.dropoff_address,
            scheduled_time=booking.requested_pickup_at,
            estimated_fare=float(booking.final_fare or 0),
            service_type="Standard"
        )
    except Exception as email_err:
        print(f"Email notification failed: {email_err}")
    
    return build_booking_response(booking, stops)


@router.get("", response_model=BookingListResponse)
async def list_bookings(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List bookings for current user."""
    user_id = current_user.id
    user_roles = [ur.role.name for ur in current_user.roles]
    
    query = select(Booking)
    
    # Filter by role
    if "admin" in user_roles or "support" in user_roles:
        pass  # Show all bookings
    elif "driver" in user_roles:
        # Drivers see their assigned bookings AND all 'requested' bookings (offers)
        query = query.where(
            or_(
                Booking.driver_id == user_id,
                Booking.status == "requested"  # Unassigned bookings are offers
            )
        )
    else:
        query = query.where(Booking.client_id == user_id)
    
    # Apply status filter
    if status:
        query = query.where(Booking.status == status)
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(Booking.created_at.desc())
    
    result = await db.execute(query)
    bookings = result.scalars().all()
    
    booking_responses = []
    for booking in bookings:
        # Get stops
        stops_result = await db.execute(
            select(BookingStop).where(BookingStop.booking_id == booking.id).order_by(BookingStop.sequence)
        )
        stops = stops_result.scalars().all()
        
        booking_responses.append(build_booking_response(booking, stops))
    
    total_pages = (total + page_size - 1) // page_size
    
    return BookingListResponse(
        items=booking_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get booking details."""
    user_id = current_user.id
    user_roles = [ur.role.name for ur in current_user.roles]
    
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check access
    is_admin = any(r in ["admin", "support"] for r in user_roles)
    if not is_admin and booking.client_id != user_id and booking.driver_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this booking"
        )
    
    # Get stops
    stops_result = await db.execute(
        select(BookingStop).where(BookingStop.booking_id == booking.id).order_by(BookingStop.sequence)
    )
    stops = stops_result.scalars().all()
    
    # Get client and driver info
    client = None
    driver = None
    
    client_result = await db.execute(
        select(User).where(User.id == booking.client_id)
    )
    client_user = client_result.scalar_one_or_none()
    if client_user:
        client = UserResponse(
            id=client_user.id,
            email=client_user.email,
            full_name=client_user.full_name,
            phone=client_user.phone,
            avatar_url=client_user.avatar_url,
            is_active=client_user.is_active,
            created_at=client_user.created_at,
            roles=[]
        )
    
    if booking.driver_id:
        driver_result = await db.execute(
            select(User).where(User.id == booking.driver_id)
        )
        driver_user = driver_result.scalar_one_or_none()
        if driver_user:
            driver = UserResponse(
                id=driver_user.id,
                email=driver_user.email,
                full_name=driver_user.full_name,
                phone=driver_user.phone,
                avatar_url=driver_user.avatar_url,
                is_active=driver_user.is_active,
                created_at=driver_user.created_at,
                roles=[]
            )
    
    return build_booking_response(booking, stops, client=client, driver=driver)


@router.patch("/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: int,
    request: BookingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update booking (before driver accepts)."""
    user_id = current_user.id
    
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    if booking.client_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this booking"
        )
    
    if booking.status not in ["requested", "searching"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update booking after driver has been assigned"
        )
    
    # Update fields - using aligned field names
    if request.requested_pickup_at is not None:
        booking.requested_pickup_at = request.requested_pickup_at
    if request.passenger_count is not None:
        booking.passenger_count = request.passenger_count
    if request.luggage_count is not None:
        booking.luggage_count = request.luggage_count
    if request.special_notes is not None:
        booking.special_notes = request.special_notes
    
    await db.commit()
    await db.refresh(booking)
    
    # Get stops
    stops_result = await db.execute(
        select(BookingStop).where(BookingStop.booking_id == booking.id).order_by(BookingStop.sequence)
    )
    stops = stops_result.scalars().all()
    
    return build_booking_response(booking, stops)


@router.patch("/{booking_id}/status", response_model=BookingResponse)
async def update_booking_status(
    booking_id: int,
    request: BookingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update booking status. Used by drivers to accept offers and update trip progress.
    
    Status transitions:
    - requested -> driver_assigned (driver accepts offer)
    - driver_assigned -> driver_en_route_pickup (driver heading to pickup)
    - driver_en_route_pickup -> driver_arrived (driver at pickup)
    - driver_arrived -> in_progress (trip started)
    - in_progress -> completed (trip finished)
    """
    user_id = current_user.id
    user_roles = [ur.role.name for ur in current_user.roles]
    
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check permissions
    is_admin = any(r in ["admin", "support"] for r in user_roles)
    is_driver = "driver" in user_roles
    is_client = booking.client_id == user_id
    is_assigned_driver = booking.driver_id == user_id
    
    new_status = request.status
    
    # Validate status transition and permissions
    if new_status == "driver_assigned":
        # Driver accepting an offer
        if not is_driver and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only drivers can accept booking offers"
            )
        if booking.status != "requested":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only accept bookings in 'requested' status"
            )
        if booking.driver_id is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Booking already has a driver assigned"
            )
        # Assign the driver
        booking.driver_id = user_id
        booking.accepted_at = datetime.utcnow()
        
    elif new_status in ["driver_en_route_pickup", "driver_arrived", "in_progress", "completed"]:
        # Only assigned driver or admin can update these statuses
        if not is_assigned_driver and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the assigned driver can update trip status"
            )
        
        # Validate status progression
        valid_transitions = {
            "driver_assigned": ["driver_en_route_pickup"],
            "driver_en_route_pickup": ["driver_arrived"],
            "driver_arrived": ["in_progress"],
            "in_progress": ["completed"],
        }
        
        if booking.status not in valid_transitions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot transition from '{booking.status}' status"
            )
        
        if new_status not in valid_transitions.get(booking.status, []):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition from '{booking.status}' to '{new_status}'"
            )
        
        # Set timestamps
        if new_status == "in_progress":
            booking.started_at = datetime.utcnow()
        elif new_status == "completed":
            booking.completed_at = datetime.utcnow()
            
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {new_status}"
        )
    
    # Capture previous status for WebSocket notification
    previous_status = booking.status
    
    # Update status
    booking.status = new_status
    
    # Create event
    event = BookingEvent(
        booking_id=booking.id,
        actor_id=user_id,
        event_type=f"booking.{new_status}",
        event_metadata={"previous_status": booking.status}
    )
    db.add(event)
    
    await db.commit()
    await db.refresh(booking)
    
    # Get stops
    stops_result = await db.execute(
        select(BookingStop).where(BookingStop.booking_id == booking.id).order_by(BookingStop.sequence)
    )
    stops = stops_result.scalars().all()
    
    # Broadcast status change via WebSocket
    try:
        from app.api.websocket import notify_booking_update, notify_driver_arrived, MessageType
        
        # Special handling for driver_arrived
        if new_status == "driver_arrived":
            await notify_driver_arrived(
                str(booking.id),
                str(booking.client_id),
                str(booking.driver_id) if booking.driver_id else None
            )
        else:
            # General status update for other statuses
            await notify_booking_update(
                str(booking.id),
                str(booking.client_id),
                str(booking.driver_id) if booking.driver_id else None,
                MessageType.BOOKING_STATUS_CHANGED,
                {
                    "status": new_status,
                    "previous_status": previous_status,
                    "updated_at": datetime.utcnow().isoformat()
                }
            )
    except Exception as ws_err:
        print(f"WebSocket notification failed: {ws_err}")
    
    return build_booking_response(booking, stops)


@router.post("/{booking_id}/cancel", response_model=SuccessResponse)
async def cancel_booking(
    booking_id: int,
    request: BookingCancelRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel a booking."""
    user_id = current_user.id
    user_roles = [ur.role.name for ur in current_user.roles]
    
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check permissions
    is_admin = any(r in ["admin", "support"] for r in user_roles)
    if not is_admin and booking.client_id != user_id and booking.driver_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to cancel this booking"
        )
    
    if booking.status in ["completed", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking is already completed or cancelled"
        )
    
    # Update booking
    booking.status = "cancelled"
    booking.cancelled_at = datetime.utcnow()
    # Note: cancel_reason is stored in the event metadata, not on the booking model
    
    # Create event with reason
    event = BookingEvent(
        booking_id=booking.id,
        actor_id=user_id,
        event_type="booking.cancelled",
        event_metadata={"reason": request.reason}
    )
    db.add(event)
    
    await db.commit()
    
    # Broadcast cancellation via WebSocket
    try:
        from app.api.websocket import notify_booking_update, MessageType
        await notify_booking_update(
            str(booking.id),
            str(booking.client_id),
            str(booking.driver_id) if booking.driver_id else None,
            MessageType.BOOKING_CANCELLED,
            {
                "reason": request.reason,
                "cancelled_by": user_id,
                "cancelled_at": booking.cancelled_at.isoformat()
            }
        )
    except Exception as ws_err:
        print(f"WebSocket cancellation notification failed: {ws_err}")
    
    return SuccessResponse(
        success=True,
        message="Booking cancelled successfully"
    )


@router.post("/{booking_id}/rate", response_model=SuccessResponse)
async def rate_booking(
    booking_id: int,
    request: BookingRatingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Rate a completed booking."""
    user_id = current_user.id
    
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    if booking.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only rate completed bookings"
        )
    
    # Client rates driver
    if booking.client_id == user_id:
        if booking.driver_rating is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already rated this trip"
            )
        booking.driver_rating = request.rating
        
    # Driver rates client
    elif booking.driver_id == user_id:
        if booking.client_rating is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already rated this trip"
            )
        booking.client_rating = request.rating
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to rate this booking"
        )
    
    await db.commit()
    
    return SuccessResponse(
        success=True,
        message="Rating submitted successfully"
    )


