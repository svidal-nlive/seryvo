"""
Seryvo Platform - Admin API Router
Handles admin operations, reports, and system management
"""
import secrets
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.security import hash_password, create_access_token
from app.models import (
    User, Role, UserRole, DriverProfile, Booking, Payment, DriverPayout,
    SurgeRule, PricingRule, Region, ServiceType, Promotion, AuditLog, Vehicle,
    PaymentMethod, ClientProfile
)
from app.schemas import (
    DashboardStats,
    RevenueReport,
    SurgeRuleCreate,
    SurgeRuleResponse,
    SurchargeCreate,
    SurchargeResponse,
    PromotionCreate,
    PromotionResponse,
    AuditLogResponse,
    AuditLogListResponse,
    UserResponse,
    SuccessResponse,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


# Role mapping between API names and database names
# Frontend/API uses 'support_agent', database uses 'support'
def map_role_to_db(role: str) -> str:
    """Map API role name to database role name."""
    if role == "support_agent":
        return "support"
    return role


def map_role_from_db(role: str) -> str:
    """Map database role name to API role name."""
    if role == "support":
        return "support_agent"
    return role


# Request/Response schemas for user provisioning
class AdminCreateUserRequest(BaseModel):
    """Request to create a new user by admin."""
    email: EmailStr
    full_name: str
    role: str
    phone: Optional[str] = None
    password: Optional[str] = None  # If not provided, generates temp password
    send_invite: bool = True  # Send invite email with login instructions


class AdminUpdateUserRoleRequest(BaseModel):
    """Request to update a user's role."""
    new_role: str


class AdminInviteUserRequest(BaseModel):
    """Request to invite a new user via email."""
    email: EmailStr
    full_name: str
    role: str
    message: Optional[str] = None  # Optional personalized message


class UserProvisioningResponse(BaseModel):
    """Response for user provisioning operations."""
    success: bool
    message: str
    user_id: Optional[int] = None
    temporary_password: Optional[str] = None
    invite_link: Optional[str] = None


# Role dependency for admin-only endpoints
require_admin = require_roles(["admin"])


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get dashboard statistics."""
    # Count users
    total_users_result = await db.execute(
        select(func.count()).select_from(User)
    )
    total_users = total_users_result.scalar() or 0
    
    active_users_result = await db.execute(
        select(func.count()).select_from(User).where(User.is_active == True)
    )
    active_users = active_users_result.scalar() or 0
    
    # Count drivers
    driver_role_result = await db.execute(
        select(Role).where(Role.name == "driver")
    )
    driver_role = driver_role_result.scalar_one_or_none()
    
    total_drivers = 0
    active_drivers = 0
    
    if driver_role:
        total_drivers_result = await db.execute(
            select(func.count()).select_from(UserRole).where(UserRole.role_id == driver_role.id)
        )
        total_drivers = total_drivers_result.scalar() or 0
        
        # Active drivers (available status)
        active_drivers_result = await db.execute(
            select(func.count()).select_from(DriverProfile).where(
                DriverProfile.availability_status == "available"
            )
        )
        active_drivers = active_drivers_result.scalar() or 0
    
    # Count bookings
    total_bookings_result = await db.execute(
        select(func.count()).select_from(Booking)
    )
    total_bookings = total_bookings_result.scalar() or 0
    
    pending_bookings_result = await db.execute(
        select(func.count()).select_from(Booking).where(
            Booking.status.in_(["pending", "searching", "accepted"])
        )
    )
    pending_bookings = pending_bookings_result.scalar() or 0
    
    completed_bookings_result = await db.execute(
        select(func.count()).select_from(Booking).where(Booking.status == "completed")
    )
    completed_bookings = completed_bookings_result.scalar() or 0
    
    # Total revenue
    revenue_result = await db.execute(
        select(func.sum(Booking.final_fare)).where(Booking.status == "completed")
    )
    total_revenue = float(revenue_result.scalar() or 0)
    
    return DashboardStats(
        total_users=total_users,
        active_users=active_users,
        total_drivers=total_drivers,
        active_drivers=active_drivers,
        total_bookings=total_bookings,
        pending_bookings=pending_bookings,
        completed_bookings=completed_bookings,
        total_revenue=round(total_revenue, 2),
        currency="USD"
    )


@router.get("/reports/revenue", response_model=RevenueReport)
async def get_revenue_report(
    period: str = Query("month", regex="^(week|month|year)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get revenue report."""
    now = datetime.utcnow()
    
    if period == "week":
        period_start = now - timedelta(days=7)
    elif period == "month":
        period_start = now - timedelta(days=30)
    else:  # year
        period_start = now - timedelta(days=365)
    
    # Get completed bookings in period
    result = await db.execute(
        select(Booking).where(
            Booking.status == "completed",
            Booking.completed_at >= period_start
        )
    )
    bookings = result.scalars().all()
    
    total_revenue = sum(float(b.final_fare) if b.final_fare else 0 for b in bookings)
    total_trips = len(bookings)
    average_fare = total_revenue / total_trips if total_trips > 0 else 0
    
    # Platform fees (assume 20%)
    platform_fees = total_revenue * 0.20
    driver_payouts = total_revenue * 0.80
    
    # Revenue by service type
    by_service_type = {}
    for booking in bookings:
        st_id = booking.service_type_id or 0
        if st_id not in by_service_type:
            by_service_type[st_id] = {"count": 0, "revenue": 0}
        by_service_type[st_id]["count"] += 1
        by_service_type[st_id]["revenue"] += float(booking.final_fare) if booking.final_fare else 0
    
    return RevenueReport(
        period_start=period_start,
        period_end=now,
        total_revenue=round(total_revenue, 2),
        total_trips=total_trips,
        average_fare=round(average_fare, 2),
        platform_fees=round(platform_fees, 2),
        driver_payouts=round(driver_payouts, 2),
        by_service_type=by_service_type,
        by_region={}
    )


@router.get("/surge-rules", response_model=List[SurgeRuleResponse])
async def list_surge_rules(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List all surge pricing rules."""
    result = await db.execute(select(SurgeRule))
    rules = result.scalars().all()
    
    return [SurgeRuleResponse(
        id=r.id,
        region_id=r.region_id,
        name=r.name,
        multiplier=float(r.multiplier),
        time_start=r.time_start.isoformat() if r.time_start else None,
        time_end=r.time_end.isoformat() if r.time_end else None,
        days_of_week=r.days_of_week,
        is_active=r.is_active
    ) for r in rules]


@router.post("/surge-rules", response_model=SurgeRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_surge_rule(
    request: SurgeRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create a new surge pricing rule."""
    rule = SurgeRule(
        region_id=request.region_id,
        name=request.name,
        multiplier=request.multiplier,
        days_of_week=request.days_of_week,
        is_active=True
    )
    
    # Parse time strings if provided
    if request.time_start:
        try:
            hours, minutes = map(int, request.time_start.split(":"))
            rule.time_start = datetime.now().replace(hour=hours, minute=minutes).time()
        except:
            pass
    
    if request.time_end:
        try:
            hours, minutes = map(int, request.time_end.split(":"))
            rule.time_end = datetime.now().replace(hour=hours, minute=minutes).time()
        except:
            pass
    
    db.add(rule)
    
    # Audit log
    audit_log = AuditLog(
        actor_id=current_user.id,
        action="surge_rule.created",
        entity_type="surge_rule",
        new_value={"name": request.name, "multiplier": request.multiplier}
    )
    db.add(audit_log)
    
    await db.commit()
    await db.refresh(rule)
    
    return SurgeRuleResponse(
        id=rule.id,
        region_id=rule.region_id,
        name=rule.name,
        multiplier=float(rule.multiplier),
        time_start=rule.time_start.isoformat() if rule.time_start else None,
        time_end=rule.time_end.isoformat() if rule.time_end else None,
        days_of_week=rule.days_of_week,
        is_active=rule.is_active
    )


@router.patch("/surge-rules/{rule_id}", response_model=SurgeRuleResponse)
async def update_surge_rule(
    rule_id: int,
    request: SurgeRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update a surge pricing rule."""
    result = await db.execute(
        select(SurgeRule).where(SurgeRule.id == rule_id)
    )
    rule = result.scalar_one_or_none()
    
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Surge rule not found"
        )
    
    old_values = {"name": rule.name, "multiplier": float(rule.multiplier)}
    
    rule.name = request.name
    rule.multiplier = request.multiplier
    rule.region_id = request.region_id
    rule.days_of_week = request.days_of_week
    
    # Audit log
    audit_log = AuditLog(
        actor_id=current_user.id,
        action="surge_rule.updated",
        entity_type="surge_rule",
        entity_id=rule.id,
        old_value=old_values,
        new_value={"name": request.name, "multiplier": request.multiplier}
    )
    db.add(audit_log)
    
    await db.commit()
    await db.refresh(rule)
    
    return SurgeRuleResponse(
        id=rule.id,
        region_id=rule.region_id,
        name=rule.name,
        multiplier=float(rule.multiplier),
        time_start=rule.time_start.isoformat() if rule.time_start else None,
        time_end=rule.time_end.isoformat() if rule.time_end else None,
        days_of_week=rule.days_of_week,
        is_active=rule.is_active
    )


@router.delete("/surge-rules/{rule_id}", response_model=SuccessResponse)
async def delete_surge_rule(
    rule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete a surge pricing rule."""
    result = await db.execute(
        select(SurgeRule).where(SurgeRule.id == rule_id)
    )
    rule = result.scalar_one_or_none()
    
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Surge rule not found"
        )
    
    await db.delete(rule)
    
    # Audit log
    audit_log = AuditLog(
        actor_id=current_user.id,
        action="surge_rule.deleted",
        entity_type="surge_rule",
        entity_id=rule_id
    )
    db.add(audit_log)
    
    await db.commit()
    
    return SuccessResponse(
        success=True,
        message="Surge rule deleted"
    )


@router.get("/promotions", response_model=List[PromotionResponse])
async def list_promotions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List all promotions."""
    result = await db.execute(select(Promotion))
    promos = result.scalars().all()
    
    return [PromotionResponse(
        id=p.id,
        code=p.code,
        description=p.description,
        discount_type=p.discount_type,
        discount_value=float(p.discount_value),
        max_uses=p.max_uses,
        max_uses_per_user=p.max_uses_per_user,
        starts_at=p.starts_at,
        ends_at=p.ends_at,
        is_active=p.is_active
    ) for p in promos]


@router.post("/promotions", response_model=PromotionResponse, status_code=status.HTTP_201_CREATED)
async def create_promotion(
    request: PromotionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create a new promotion."""
    # Check if code already exists
    existing = await db.execute(
        select(Promotion).where(Promotion.code == request.code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Promotion code already exists"
        )
    
    promo = Promotion(
        code=request.code.upper(),
        description=request.description,
        discount_type=request.discount_type,
        discount_value=request.discount_value,
        max_uses=request.max_uses,
        max_uses_per_user=request.max_uses_per_user,
        starts_at=request.starts_at,
        ends_at=request.ends_at,
        is_active=True
    )
    db.add(promo)
    
    # Audit log
    audit_log = AuditLog(
        actor_id=current_user.id,
        action="promotion.created",
        entity_type="promotion",
        new_value={"code": promo.code, "discount_value": float(promo.discount_value)}
    )
    db.add(audit_log)
    
    await db.commit()
    await db.refresh(promo)
    
    return PromotionResponse(
        id=promo.id,
        code=promo.code,
        description=promo.description,
        discount_type=promo.discount_type,
        discount_value=float(promo.discount_value),
        max_uses=promo.max_uses,
        max_uses_per_user=promo.max_uses_per_user,
        starts_at=promo.starts_at,
        ends_at=promo.ends_at,
        is_active=promo.is_active
    )


@router.patch("/promotions/{promo_id}/toggle", response_model=PromotionResponse)
async def toggle_promotion(
    promo_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Toggle promotion active status."""
    result = await db.execute(
        select(Promotion).where(Promotion.id == promo_id)
    )
    promo = result.scalar_one_or_none()
    
    if not promo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Promotion not found"
        )
    
    promo.is_active = not promo.is_active
    
    await db.commit()
    await db.refresh(promo)
    
    return PromotionResponse(
        id=promo.id,
        code=promo.code,
        description=promo.description,
        discount_type=promo.discount_type,
        discount_value=float(promo.discount_value),
        max_uses=promo.max_uses,
        max_uses_per_user=promo.max_uses_per_user,
        starts_at=promo.starts_at,
        ends_at=promo.ends_at,
        is_active=promo.is_active
    )


@router.get("/audit-logs", response_model=AuditLogListResponse)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    actor_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List audit logs with pagination."""
    query = select(AuditLog)
    
    if action:
        query = query.where(AuditLog.action.ilike(f"%{action}%"))
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if actor_id:
        query = query.where(AuditLog.actor_id == actor_id)
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(AuditLog.created_at.desc())
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    # Get actor info
    log_responses = []
    for log in logs:
        actor = None
        if log.actor_id:
            actor_result = await db.execute(
                select(User).where(User.id == log.actor_id)
            )
            actor_user = actor_result.scalar_one_or_none()
            if actor_user:
                actor = UserResponse(
                    id=actor_user.id,
                    email=actor_user.email,
                    full_name=actor_user.full_name,
                    phone=actor_user.phone,
                    avatar_url=actor_user.avatar_url,
                    is_active=actor_user.is_active,
                    created_at=actor_user.created_at,
                    roles=[]
                )
        
        log_responses.append(AuditLogResponse(
            id=log.id,
            actor_id=log.actor_id,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            old_value=log.old_value,
            new_value=log.new_value,
            ip_address=log.ip_address,
            created_at=log.created_at,
            actor=actor
        ))
    
    total_pages = (total + page_size - 1) // page_size
    
    return AuditLogListResponse(
        items=log_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/drivers/pending", response_model=List[UserResponse])
async def list_pending_drivers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List drivers pending approval."""
    result = await db.execute(
        select(User)
        .join(DriverProfile, DriverProfile.user_id == User.id)
        .where(DriverProfile.status == "pending")
    )
    users = result.scalars().all()
    
    return [UserResponse(
        id=u.id,
        email=u.email,
        full_name=u.full_name,
        phone=u.phone,
        avatar_url=u.avatar_url,
        is_active=u.is_active,
        created_at=u.created_at,
        roles=["driver"]
    ) for u in users]


@router.post("/drivers/{driver_id}/approve", response_model=SuccessResponse)
async def approve_driver(
    driver_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Approve a driver account."""
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == driver_id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver profile not found"
        )
    
    profile.status = "approved"
    
    # Audit log
    audit_log = AuditLog(
        actor_id=current_user.id,
        action="driver.approved",
        entity_type="driver_profile",
        entity_id=driver_id
    )
    db.add(audit_log)
    
    await db.commit()
    
    return SuccessResponse(
        success=True,
        message="Driver approved"
    )


@router.post("/drivers/{driver_id}/reject", response_model=SuccessResponse)
async def reject_driver(
    driver_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Reject a driver account."""
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == driver_id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver profile not found"
        )
    
    profile.status = "rejected"
    
    # Audit log
    audit_log = AuditLog(
        actor_id=current_user.id,
        action="driver.rejected",
        entity_type="driver_profile",
        entity_id=driver_id
    )
    db.add(audit_log)
    
    await db.commit()
    
    return SuccessResponse(
        success=True,
        message="Driver rejected"
    )


# =============================================================================
# Fleet Overview (Real-time Map Data)
# =============================================================================

class FleetDriverResponse(BaseModel):
    """Driver data for fleet map."""
    id: int
    name: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    heading: Optional[float] = None
    speed: Optional[float] = None
    status: str  # available, busy, offline, on_break
    vehicle_type: Optional[str] = None
    plate_number: Optional[str] = None
    active_booking_id: Optional[int] = None
    active_booking_status: Optional[str] = None
    last_update: Optional[str] = None


class ActiveTripResponse(BaseModel):
    """Active trip data for fleet map."""
    booking_id: int
    driver_id: int
    client_name: str
    status: str
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    pickup_address: str
    dropoff_lat: Optional[float] = None
    dropoff_lng: Optional[float] = None
    dropoff_address: str


class FleetStatusResponse(BaseModel):
    """Fleet overview for admin map."""
    drivers: list
    active_trips: list
    stats: dict


@router.get("/fleet/status", response_model=FleetStatusResponse)
async def get_fleet_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get current fleet status including all drivers and active trips.
    Used by admin Fleet Live Map.
    """
    # Get all approved drivers with their profiles and vehicles
    drivers_result = await db.execute(
        select(User, DriverProfile, Vehicle)
        .join(DriverProfile, DriverProfile.user_id == User.id)
        .outerjoin(Vehicle, and_(
            Vehicle.driver_id == User.id,
            Vehicle.status == "active"
        ))
        .where(DriverProfile.status == "approved")
    )
    drivers_data = drivers_result.all()
    
    # Get all active bookings (not completed or cancelled)
    active_statuses = ["requested", "accepted", "driver_assigned", "driver_en_route_pickup", 
                       "driver_arrived", "in_progress", "searching"]
    bookings_result = await db.execute(
        select(Booking, User)
        .join(User, User.id == Booking.client_id)
        .where(Booking.status.in_(active_statuses))
    )
    active_bookings = bookings_result.all()
    
    # Build driver list
    drivers = []
    for user, profile, vehicle in drivers_data:
        # Check if driver has an active booking
        active_booking = next(
            (b for b, _ in active_bookings if b.driver_id == user.id),
            None
        )
        
        drivers.append({
            "id": str(user.id),
            "name": user.full_name or f"Driver {user.id}",
            "lat": None,  # Would come from real-time location tracking
            "lng": None,
            "heading": None,
            "speed": None,
            "status": profile.availability_status or "offline",
            "vehicle_type": f"{vehicle.make} {vehicle.model}" if vehicle else None,
            "plate_number": vehicle.license_plate if vehicle else None,
            "active_booking_id": str(active_booking.id) if active_booking else None,
            "active_booking_status": active_booking.status if active_booking else None,
            "last_update": datetime.utcnow().isoformat(),
        })
    
    # Build active trips list
    active_trips = []
    for booking, client in active_bookings:
        if booking.driver_id:  # Only trips with assigned drivers
            active_trips.append({
                "booking_id": str(booking.id),
                "driver_id": str(booking.driver_id),
                "client_name": client.full_name or f"Client {client.id}",
                "status": booking.status,
                "pickup_lat": float(booking.pickup_lat) if booking.pickup_lat else None,
                "pickup_lng": float(booking.pickup_lng) if booking.pickup_lng else None,
                "pickup_address": booking.pickup_address or "",
                "dropoff_lat": float(booking.dropoff_lat) if booking.dropoff_lat else None,
                "dropoff_lng": float(booking.dropoff_lng) if booking.dropoff_lng else None,
                "dropoff_address": booking.dropoff_address or "",
            })
    
    # Calculate stats
    stats = {
        "total_drivers": len(drivers),
        "available": len([d for d in drivers if d["status"] == "available"]),
        "busy": len([d for d in drivers if d["status"] == "busy"]),
        "on_break": len([d for d in drivers if d["status"] == "on_break"]),
        "offline": len([d for d in drivers if d["status"] == "offline"]),
        "active_trips": len(active_trips),
    }
    
    return FleetStatusResponse(
        drivers=drivers,
        active_trips=active_trips,
        stats=stats
    )


# =============================================================================
# Demo Data Management
# =============================================================================

from pydantic import BaseModel


class DemoDataStatusResponse(BaseModel):
    """Response for demo data status."""
    demo_data_loaded: bool
    demo_users_count: int
    demo_bookings_count: int
    can_load_demo_data: bool
    warning: str


class LoadDemoDataRequest(BaseModel):
    """Request to load demo data."""
    confirm_overwrite: bool = False


@router.get("/demo-data/status", response_model=DemoDataStatusResponse)
async def get_demo_data_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Check if demo data has been loaded."""
    # Check for demo users by email pattern
    demo_users_result = await db.execute(
        select(func.count()).select_from(User).where(
            User.email.like("%@seryvo.demo.net")
        )
    )
    demo_users_count = demo_users_result.scalar() or 0
    
    # Check for demo bookings
    demo_bookings_result = await db.execute(
        select(func.count()).select_from(Booking)
    )
    demo_bookings_count = demo_bookings_result.scalar() or 0
    
    demo_data_loaded = demo_users_count > 0
    
    return DemoDataStatusResponse(
        demo_data_loaded=demo_data_loaded,
        demo_users_count=demo_users_count,
        demo_bookings_count=demo_bookings_count,
        can_load_demo_data=True,
        warning="Loading demo data will create sample users, vehicles, bookings, and other data. This is intended for testing and demonstration purposes only."
    )


@router.post("/demo-data/load", response_model=SuccessResponse)
async def load_demo_data(
    request: LoadDemoDataRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Load demo data into the database.
    WARNING: This will add sample data for testing purposes.
    """
    if not request.confirm_overwrite:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must confirm by setting confirm_overwrite=true. WARNING: This will add demo users, bookings, and other sample data to your database."
        )
    
    from app.core.security import hash_password
    from datetime import datetime, timedelta
    import random
    
    # Demo password for all demo users
    demo_password = hash_password("demo123")
    
    # Get roles
    roles_result = await db.execute(select(Role))
    roles = {r.name: r.id for r in roles_result.scalars().all()}
    
    if not roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Roles not found. Please ensure the database is properly initialized."
        )
    
    created_users = []
    
    # Create demo users
    demo_users_data = [
        ("alice@seryvo.demo.net", "Alice Johnson", "client", "+1555000001"),
        ("bob@seryvo.demo.net", "Bob Smith", "client", "+1555000002"),
        ("charlie@seryvo.demo.net", "Charlie Brown", "client", "+1555000003"),
        ("mike@seryvo.demo.net", "Mike Driver", "driver", "+1555000010"),
        ("sarah@seryvo.demo.net", "Sarah Wheeler", "driver", "+1555000011"),
        ("tom@seryvo.demo.net", "Tom Cruise", "driver", "+1555000012"),
        ("support1@seryvo.demo.net", "Support Agent", "support", "+1555000020"),
    ]
    
    for email, name, role_name, phone in demo_users_data:
        # Check if user already exists
        existing = await db.execute(select(User).where(User.email == email))
        if existing.scalar_one_or_none():
            continue
        
        user = User(
            email=email,
            password_hash=demo_password,
            full_name=name,
            phone=phone,
            is_active=True,
        )
        db.add(user)
        await db.flush()
        
        # Assign role
        if role_name in roles:
            user_role = UserRole(user_id=user.id, role_id=roles[role_name])
            db.add(user_role)
        
        created_users.append((user, role_name))
    
    # Create driver profiles for demo drivers
    for user, role_name in created_users:
        if role_name == "driver":
            existing_profile = await db.execute(
                select(DriverProfile).where(DriverProfile.user_id == user.id)
            )
            if not existing_profile.scalar_one_or_none():
                profile = DriverProfile(
                    user_id=user.id,
                    status="approved",
                    availability_status="available",
                    rating_average=round(random.uniform(4.5, 5.0), 1),
                    total_ratings=random.randint(50, 200),
                    acceptance_rate=round(random.uniform(0.90, 0.98), 2),
                    cancellation_rate=round(random.uniform(0.01, 0.05), 2),
                )
                db.add(profile)
    
    # Create regions if not exist
    regions_data = [
        ("NYC", "New York Metro", "America/New_York", "USD", "Greater New York Area"),
        ("LA", "Los Angeles", "America/Los_Angeles", "USD", "Greater Los Angeles Area"),
        ("MIA", "Miami", "America/New_York", "USD", "Miami-Dade County"),
    ]
    
    for code, region_name, timezone, currency, region_desc in regions_data:
        existing = await db.execute(select(Region).where(Region.code == code))
        if not existing.scalar_one_or_none():
            db.add(Region(code=code, name=region_name, timezone=timezone, currency=currency, description=region_desc, is_active=True))
    
    # Create service types if not exist
    service_types_data = [
        ("SEDAN", "Executive Sedan", "Premium sedan for business travel", 3),
        ("SUV", "Luxury SUV", "Spacious SUV for families", 6),
        ("VAN", "Executive Van", "Large van for groups", 12),
        ("LIMO", "Stretch Limousine", "Luxury limousine for special events", 8),
    ]
    
    for code, name, desc, capacity in service_types_data:
        existing = await db.execute(select(ServiceType).where(ServiceType.code == code))
        if not existing.scalar_one_or_none():
            db.add(ServiceType(code=code, name=name, description=desc, base_capacity=capacity, is_active=True))
    
    # Create payment methods for demo clients (so they can make bookings)
    demo_cards = [
        ("visa", "4242", 12, 2027, "pm_card_visa_demo"),
        ("mastercard", "5555", 6, 2026, "pm_card_mastercard_demo"),
        ("amex", "0005", 3, 2028, "pm_card_amex_demo"),
    ]
    
    card_idx = 0
    for user, role_name in created_users:
        if role_name == "client":
            # Check if payment method already exists
            existing_pm = await db.execute(
                select(PaymentMethod).where(PaymentMethod.user_id == user.id)
            )
            if not existing_pm.scalar_one_or_none():
                card = demo_cards[card_idx % len(demo_cards)]
                pm = PaymentMethod(
                    user_id=user.id,
                    method_type="card",
                    brand=card[0],
                    last_four=card[1],
                    exp_month=card[2],
                    exp_year=card[3],
                    is_default=True,
                    stripe_payment_method_id=card[4],
                )
                db.add(pm)
                card_idx += 1
            
            # Also create client profile if missing
            existing_profile = await db.execute(
                select(ClientProfile).where(ClientProfile.user_id == user.id)
            )
            if not existing_profile.scalar_one_or_none():
                client_profile = ClientProfile(
                    user_id=user.id,
                    default_currency="USD",
                )
                db.add(client_profile)
    
    # Also add payment methods for existing demo clients who don't have them
    existing_demo_clients = await db.execute(
        select(User).join(UserRole).join(Role).where(
            User.email.like("%@seryvo.demo.net"),
            Role.name == "client"
        )
    )
    for client in existing_demo_clients.scalars().all():
        existing_pm = await db.execute(
            select(PaymentMethod).where(PaymentMethod.user_id == client.id)
        )
        if not existing_pm.scalar_one_or_none():
            card = demo_cards[card_idx % len(demo_cards)]
            pm = PaymentMethod(
                user_id=client.id,
                method_type="card",
                brand=card[0],
                last_four=card[1],
                exp_month=card[2],
                exp_year=card[3],
                is_default=True,
                stripe_payment_method_id=card[4],
            )
            db.add(pm)
            card_idx += 1
    
    # Audit log
    audit_log = AuditLog(
        actor_id=current_user.id,
        action="admin.demo_data_loaded",
        entity_type="system",
        entity_id=0,
        new_value={"users_created": len(created_users)}
    )
    db.add(audit_log)
    
    await db.commit()
    
    return SuccessResponse(
        success=True,
        message=f"Demo data loaded successfully. Created {len(created_users)} demo users."
    )


@router.delete("/demo-data/clear", response_model=SuccessResponse)
async def clear_demo_data(
    confirm: bool = Query(False, description="Must be true to confirm deletion"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Clear all demo data from the database.
    WARNING: This will permanently delete all demo users and their associated data.
    """
    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must confirm by setting confirm=true. WARNING: This will permanently delete all demo data."
        )
    
    # Get demo user IDs
    demo_users_result = await db.execute(
        select(User).where(User.email.like("%@seryvo.demo.net"))
    )
    demo_users = demo_users_result.scalars().all()
    demo_user_ids = [u.id for u in demo_users]
    
    if not demo_user_ids:
        return SuccessResponse(
            success=True,
            message="No demo data found to clear."
        )
    
    # Delete user roles
    from sqlalchemy import delete
    await db.execute(
        delete(UserRole).where(UserRole.user_id.in_(demo_user_ids))
    )
    
    # Delete driver profiles
    await db.execute(
        delete(DriverProfile).where(DriverProfile.user_id.in_(demo_user_ids))
    )
    
    # Delete demo users
    await db.execute(
        delete(User).where(User.id.in_(demo_user_ids))
    )
    
    # Audit log
    audit_log = AuditLog(
        actor_id=current_user.id,
        action="admin.demo_data_cleared",
        entity_type="system",
        entity_id=0,
        new_value={"users_deleted": len(demo_user_ids)}
    )
    db.add(audit_log)
    
    await db.commit()
    
    return SuccessResponse(
        success=True,
        message=f"Demo data cleared. Deleted {len(demo_user_ids)} demo users and their associated data."
    )


@router.delete("/demo-data/wipe-all", response_model=SuccessResponse)
async def wipe_all_demo_data(
    confirm: bool = Query(False, description="Must be true to confirm deletion"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Wipe all non-admin users and reset the database to a clean state.
    This preserves admin accounts but removes all other users, bookings, etc.
    WARNING: This is destructive and cannot be undone!
    """
    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must confirm by setting confirm=true. WARNING: This will permanently delete all non-admin data!"
        )
    
    from sqlalchemy import delete
    from app.models import (
        Booking, SupportTicket, SupportTicketMessage, Payment, BookingStop, 
        BookingEvent, DriverPayout, PromotionRedemption
    )
    
    # Get admin role ID
    admin_role_result = await db.execute(select(Role).where(Role.name == "admin"))
    admin_role = admin_role_result.scalar_one_or_none()
    
    if not admin_role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Admin role not found"
        )
    
    # Get all admin user IDs (to preserve)
    admin_users_result = await db.execute(
        select(UserRole.user_id).where(UserRole.role_id == admin_role.id)
    )
    admin_user_ids = [u for u in admin_users_result.scalars().all()]
    
    # Get all non-admin user IDs
    non_admin_users_result = await db.execute(
        select(User).where(User.id.not_in(admin_user_ids))
    )
    non_admin_users = non_admin_users_result.scalars().all()
    non_admin_user_ids = [u.id for u in non_admin_users]
    
    deleted_counts = {
        "users": len(non_admin_user_ids),
        "bookings": 0,
        "tickets": 0,
        "driver_profiles": 0,
        "payments": 0,
    }
    
    if non_admin_user_ids:
        # First, get all booking IDs for non-admin users (both as client and driver)
        bookings_result = await db.execute(
            select(Booking).where(
                (Booking.client_id.in_(non_admin_user_ids)) | 
                (Booking.driver_id.in_(non_admin_user_ids))
            )
        )
        bookings = bookings_result.scalars().all()
        booking_ids = [b.id for b in bookings]
        deleted_counts["bookings"] = len(booking_ids)
        
        if booking_ids:
            # Delete child records that reference bookings FIRST
            # 1. Delete payments
            payments_result = await db.execute(
                select(Payment).where(Payment.booking_id.in_(booking_ids))
            )
            deleted_counts["payments"] = len(payments_result.scalars().all())
            await db.execute(delete(Payment).where(Payment.booking_id.in_(booking_ids)))
            
            # 2. Delete booking stops
            await db.execute(delete(BookingStop).where(BookingStop.booking_id.in_(booking_ids)))
            
            # 3. Delete booking events
            await db.execute(delete(BookingEvent).where(BookingEvent.booking_id.in_(booking_ids)))
            
            # 4. Delete conversations and related records using raw SQL (model out of sync with DB)
            from sqlalchemy import text
            # First get conversation IDs for these bookings
            conv_result = await db.execute(
                text("SELECT id FROM conversations WHERE booking_id = ANY(:booking_ids)"),
                {"booking_ids": booking_ids}
            )
            conversation_ids = [row[0] for row in conv_result.fetchall()]
            if conversation_ids:
                # Delete messages, participants, and conversations
                await db.execute(
                    text("DELETE FROM messages WHERE conversation_id = ANY(:conv_ids)"),
                    {"conv_ids": conversation_ids}
                )
                await db.execute(
                    text("DELETE FROM conversation_messages WHERE conversation_id = ANY(:conv_ids)"),
                    {"conv_ids": conversation_ids}
                )
                await db.execute(
                    text("DELETE FROM conversation_participants WHERE conversation_id = ANY(:conv_ids)"),
                    {"conv_ids": conversation_ids}
                )
                await db.execute(
                    text("DELETE FROM conversations WHERE id = ANY(:conv_ids)"),
                    {"conv_ids": conversation_ids}
                )
            
            # 5. Delete promotion redemptions that reference these bookings
            await db.execute(delete(PromotionRedemption).where(PromotionRedemption.booking_id.in_(booking_ids)))
            
            # NOW delete bookings (after all child records are gone)
            await db.execute(
                delete(Booking).where(Booking.id.in_(booking_ids))
            )
        
        # Delete support ticket messages first, then tickets
        tickets_result = await db.execute(
            select(SupportTicket).where(SupportTicket.user_id.in_(non_admin_user_ids))
        )
        tickets = tickets_result.scalars().all()
        ticket_ids = [t.id for t in tickets]
        deleted_counts["tickets"] = len(ticket_ids)
        
        if ticket_ids:
            await db.execute(delete(SupportTicketMessage).where(SupportTicketMessage.ticket_id.in_(ticket_ids)))
            await db.execute(delete(SupportTicket).where(SupportTicket.id.in_(ticket_ids)))
        
        # Delete driver payouts
        await db.execute(delete(DriverPayout).where(DriverPayout.driver_id.in_(non_admin_user_ids)))
        
        # Delete promotion redemptions for non-admin users  
        await db.execute(delete(PromotionRedemption).where(PromotionRedemption.user_id.in_(non_admin_user_ids)))
        
        # Delete driver profiles
        profiles_result = await db.execute(
            select(DriverProfile).where(DriverProfile.user_id.in_(non_admin_user_ids))
        )
        deleted_counts["driver_profiles"] = len(profiles_result.scalars().all())
        await db.execute(
            delete(DriverProfile).where(DriverProfile.user_id.in_(non_admin_user_ids))
        )
        
        # Delete user roles for non-admin users
        await db.execute(
            delete(UserRole).where(UserRole.user_id.in_(non_admin_user_ids))
        )
        
        # Delete non-admin users
        await db.execute(
            delete(User).where(User.id.in_(non_admin_user_ids))
        )
    
    # Audit log
    audit_log = AuditLog(
        actor_id=current_user.id,
        action="admin.demo_data_wiped_all",
        entity_type="system",
        entity_id=0,
        new_value=deleted_counts
    )
    db.add(audit_log)
    
    await db.commit()
    
    return SuccessResponse(
        success=True,
        message=f"Database wiped. Deleted {deleted_counts['users']} users, {deleted_counts['bookings']} bookings, {deleted_counts['tickets']} tickets, {deleted_counts['driver_profiles']} driver profiles. Admin accounts preserved."
    )


# ===========================================
# Factory Reset Endpoint
# ===========================================

@router.delete("/factory-reset")
async def factory_reset(
    confirm: str = Query(..., description="Must be 'FACTORY_RESET' to confirm"),
    confirm_email: str = Query(..., description="Must match current admin's email to confirm"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    DANGER: Complete factory reset - wipes ALL data including admin accounts.
    After this, the platform will require initial setup (first user becomes admin).
    
    Requires two confirmations:
    1. confirm='FACTORY_RESET' - explicit string confirmation
    2. confirm_email - must match the current admin's email
    
    This action is IRREVERSIBLE and will:
    - Delete ALL users (including all admins)
    - Delete ALL bookings and payments
    - Delete ALL driver profiles and payouts
    - Delete ALL support tickets
    - Delete ALL conversations and messages
    - Delete ALL promotions and audit logs
    - Trigger first-time setup flow on next access
    """
    # Verify confirmations
    if confirm != "FACTORY_RESET":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid confirmation. Must pass confirm='FACTORY_RESET' to proceed."
        )
    
    if confirm_email.lower() != current_user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email confirmation does not match your admin account email."
        )
    
    from sqlalchemy import text
    from app.models import (
        Booking, SupportTicket, SupportTicketMessage, Payment, BookingStop, 
        BookingEvent, DriverPayout, PromotionRedemption
    )
    
    # Store actor info before deleting (for any logging purposes)
    actor_email = current_user.email
    actor_name = current_user.full_name
    
    # Begin comprehensive deletion in correct order
    deleted_counts = {
        "users": 0,
        "bookings": 0,
        "payments": 0,
        "tickets": 0,
        "driver_profiles": 0,
        "conversations": 0,
        "promotions": 0,
        "audit_logs": 0,
    }
    
    try:
        # 1. Get all booking IDs first
        bookings_result = await db.execute(select(Booking.id))
        booking_ids = [b for b in bookings_result.scalars().all()]
        deleted_counts["bookings"] = len(booking_ids)
        
        if booking_ids:
            # Delete payment records
            payments_result = await db.execute(select(func.count(Payment.id)).where(Payment.booking_id.in_(booking_ids)))
            deleted_counts["payments"] = payments_result.scalar() or 0
            await db.execute(delete(Payment).where(Payment.booking_id.in_(booking_ids)))
            
            # Delete booking stops and events
            await db.execute(delete(BookingStop).where(BookingStop.booking_id.in_(booking_ids)))
            await db.execute(delete(BookingEvent).where(BookingEvent.booking_id.in_(booking_ids)))
            
            # Delete conversations using raw SQL
            conv_result = await db.execute(
                text("SELECT id FROM conversations WHERE booking_id = ANY(:booking_ids)"),
                {"booking_ids": booking_ids}
            )
            conversation_ids = [row[0] for row in conv_result.fetchall()]
            deleted_counts["conversations"] = len(conversation_ids)
            
            if conversation_ids:
                await db.execute(text("DELETE FROM messages WHERE conversation_id = ANY(:conv_ids)"), {"conv_ids": conversation_ids})
                await db.execute(text("DELETE FROM conversation_messages WHERE conversation_id = ANY(:conv_ids)"), {"conv_ids": conversation_ids})
                await db.execute(text("DELETE FROM conversation_participants WHERE conversation_id = ANY(:conv_ids)"), {"conv_ids": conversation_ids})
                await db.execute(text("DELETE FROM conversations WHERE id = ANY(:conv_ids)"), {"conv_ids": conversation_ids})
            
            # Delete promotion redemptions
            await db.execute(delete(PromotionRedemption).where(PromotionRedemption.booking_id.in_(booking_ids)))
            
            # Delete bookings
            await db.execute(delete(Booking))
        
        # 2. Delete support tickets
        tickets_result = await db.execute(select(func.count(SupportTicket.id)))
        deleted_counts["tickets"] = tickets_result.scalar() or 0
        await db.execute(delete(SupportTicketMessage))
        await db.execute(delete(SupportTicket))
        
        # 3. Delete driver-related data
        profiles_result = await db.execute(select(func.count(DriverProfile.user_id)))
        deleted_counts["driver_profiles"] = profiles_result.scalar() or 0
        await db.execute(delete(DriverPayout))
        await db.execute(delete(DriverProfile))
        
        # 4. Delete remaining promotion redemptions and promotions
        await db.execute(delete(PromotionRedemption))
        promotions_result = await db.execute(select(func.count(Promotion.id)))
        deleted_counts["promotions"] = promotions_result.scalar() or 0
        
        # 5. Delete audit logs
        audit_result = await db.execute(select(func.count(AuditLog.id)))
        deleted_counts["audit_logs"] = audit_result.scalar() or 0
        await db.execute(delete(AuditLog))
        
        # 6. Delete user roles
        await db.execute(delete(UserRole))
        
        # 7. Delete ALL users (including admins)
        users_result = await db.execute(select(func.count(User.id)))
        deleted_counts["users"] = users_result.scalar() or 0
        await db.execute(delete(User))
        
        # 8. Delete roles (will be recreated on first setup)
        await db.execute(delete(Role))
        
        await db.commit()
        
        return {
            "success": True,
            "message": f"Factory reset complete. Deleted {deleted_counts['users']} users, {deleted_counts['bookings']} bookings, {deleted_counts['driver_profiles']} driver profiles. Platform will require initial setup on next access.",
            "deleted_counts": deleted_counts,
            "performed_by": actor_email,
            "requires_setup": True
        }
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Factory reset failed: {str(e)}. Database has been rolled back."
        )


# ===========================================
# User Provisioning Endpoints
# ===========================================

@router.post("/users/create", response_model=UserProvisioningResponse)
async def admin_create_user(
    request: AdminCreateUserRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Create a new user account. Admin can create users of any role including admin.
    If password is not provided, generates a temporary password.
    """
    # Check if email already exists
    result = await db.execute(
        select(User).where(User.email == request.email)
    )
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate role
    valid_roles = ["client", "driver", "support_agent", "admin"]
    if request.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {valid_roles}"
        )
    
    # Map API role name to database role name
    db_role_name = map_role_to_db(request.role)
    
    # Get the role from database
    role_result = await db.execute(
        select(Role).where(Role.name == db_role_name)
    )
    role = role_result.scalar_one_or_none()
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Role '{request.role}' not found in database"
        )
    
    # Generate password if not provided
    temp_password = None
    if request.password:
        password = request.password
    else:
        temp_password = secrets.token_urlsafe(12)
        password = temp_password
    
    # Create user
    user = User(
        email=request.email,
        password_hash=hash_password(password),
        full_name=request.full_name,
        phone=request.phone,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    
    # Assign role
    user_role = UserRole(user_id=user.id, role_id=role.id)
    db.add(user_role)
    
    # Create driver profile if driver role
    if request.role == "driver":
        driver_profile = DriverProfile(
            user_id=user.id,
            status="pending_verification",
            availability_status="offline",
        )
        db.add(driver_profile)
    
    # Audit log
    audit_log = AuditLog(
        actor_id=current_user.id,
        action="admin.user_created",
        entity_type="user",
        entity_id=user.id,
        new_value={
            "email": request.email,
            "role": request.role,
            "created_by_admin": True,
        }
    )
    db.add(audit_log)
    
    await db.commit()
    
    # Send invite email if requested
    invite_link = None
    if request.send_invite:
        try:
            from app.core.email import send_email
            
            # Determine portal URL based on role
            portal_paths = {
                "client": "",
                "driver": "/driver",
                "support_agent": "/support",
                "admin": "",
            }
            portal_path = portal_paths.get(request.role, "")
            base_url = "https://seryvo.vectorhost.net"
            invite_link = f"{base_url}{portal_path}"
            
            await send_email(
                to=request.email,
                subject="Welcome to Seryvo - Your Account Has Been Created",
                html=f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #3B82F6;">Welcome to Seryvo!</h1>
                    <p>Hi {request.full_name},</p>
                    <p>Your {request.role.replace('_', ' ').title()} account has been created by an administrator.</p>
                    <p><strong>Email:</strong> {request.email}</p>
                    {f'<p><strong>Temporary Password:</strong> {temp_password}</p>' if temp_password else ''}
                    <p>Please sign in at:</p>
                    <p><a href="{invite_link}" style="color: #3B82F6;">{invite_link}</a></p>
                    {f'<p style="color: #EF4444;"><strong>Important:</strong> Please change your password after your first login.</p>' if temp_password else ''}
                    <p>Best regards,<br>The Seryvo Team</p>
                </div>
                """
            )
        except Exception as e:
            # Log error but don't fail the user creation
            print(f"[Admin] Failed to send invite email: {e}")
    
    return UserProvisioningResponse(
        success=True,
        message=f"User created successfully with role '{request.role}'",
        user_id=user.id,
        temporary_password=temp_password,
        invite_link=invite_link,
    )


@router.put("/users/{user_id}/role", response_model=UserProvisioningResponse)
async def admin_update_user_role(
    user_id: int,
    request: AdminUpdateUserRoleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Update a user's role. Can change any role including promoting to admin.
    """
    # Get the user
    user_result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent self-demotion from admin
    if user.id == current_user.id and request.new_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own admin privileges"
        )
    
    # Validate new role
    valid_roles = ["client", "driver", "support_agent", "admin"]
    if request.new_role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {valid_roles}"
        )
    
    # Map API role name to database role name
    db_role_name = map_role_to_db(request.new_role)
    
    # Get the new role from database
    new_role_result = await db.execute(
        select(Role).where(Role.name == db_role_name)
    )
    new_role = new_role_result.scalar_one_or_none()
    
    if not new_role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Role '{request.new_role}' not found in database"
        )
    
    # Get current roles for audit log
    current_roles_result = await db.execute(
        select(Role.name).join(UserRole).where(UserRole.user_id == user_id)
    )
    old_roles = [r for r in current_roles_result.scalars().all()]
    
    # Remove all existing roles
    await db.execute(
        delete(UserRole).where(UserRole.user_id == user_id)
    )
    
    # Assign new role
    user_role = UserRole(user_id=user_id, role_id=new_role.id)
    db.add(user_role)
    
    # Create driver profile if changing to driver role
    if request.new_role == "driver":
        existing_profile = await db.execute(
            select(DriverProfile).where(DriverProfile.user_id == user_id)
        )
        if not existing_profile.scalar_one_or_none():
            driver_profile = DriverProfile(
                user_id=user_id,
                status="pending_verification",
                availability_status="offline",
            )
            db.add(driver_profile)
    
    # Audit log
    audit_log = AuditLog(
        actor_id=current_user.id,
        action="admin.user_role_changed",
        entity_type="user",
        entity_id=user_id,
        old_value={"roles": old_roles},
        new_value={"roles": [request.new_role]},
    )
    db.add(audit_log)
    
    await db.commit()
    
    return UserProvisioningResponse(
        success=True,
        message=f"User role updated to '{request.new_role}'",
        user_id=user_id,
    )


@router.post("/users/invite", response_model=UserProvisioningResponse)
async def admin_invite_user(
    request: AdminInviteUserRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Send an invitation email to a new user. Creates a pending account with a
    secure onboarding link.
    """
    # Check if email already exists
    result = await db.execute(
        select(User).where(User.email == request.email)
    )
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate role
    valid_roles = ["client", "driver", "support_agent", "admin"]
    if request.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {valid_roles}"
        )
    
    # Map API role name to database role name
    db_role_name = map_role_to_db(request.role)
    
    # Get the role from database
    role_result = await db.execute(
        select(Role).where(Role.name == db_role_name)
    )
    role = role_result.scalar_one_or_none()
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Role '{request.role}' not found in database"
        )
    
    # Generate temporary password and invite token
    temp_password = secrets.token_urlsafe(16)
    
    # Create user with temporary password (they'll be prompted to change it)
    user = User(
        email=request.email,
        password_hash=hash_password(temp_password),
        full_name=request.full_name,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    
    # Assign role
    user_role = UserRole(user_id=user.id, role_id=role.id)
    db.add(user_role)
    
    # Create driver profile if driver role
    if request.role == "driver":
        driver_profile = DriverProfile(
            user_id=user.id,
            license_number="PENDING",
            vehicle_make="",
            vehicle_model="",
            vehicle_year=2020,
            vehicle_color="",
            license_plate="PENDING",
            core_status="pending_verification",
            availability_status="offline",
        )
        db.add(driver_profile)
    
    # Generate invite token (JWT with user info)
    invite_token = create_access_token(
        data={
            "sub": str(user.id),
            "type": "invite",
            "email": request.email,
            "role": request.role,
        },
        expires_delta=timedelta(days=7)  # Invite valid for 7 days
    )
    
    # Determine portal URL based on role
    portal_paths = {
        "client": "",
        "driver": "/driver",
        "support_agent": "/support",
        "admin": "",
    }
    portal_path = portal_paths.get(request.role, "")
    base_url = "https://seryvo.vectorhost.net"
    invite_link = f"{base_url}{portal_path}?invite={invite_token}"
    
    # Send invite email
    try:
        from app.core.email import send_email
        
        custom_message = f"<p>{request.message}</p>" if request.message else ""
        
        await send_email(
            to=request.email,
            subject=f"You're Invited to Join Seryvo as a {request.role.replace('_', ' ').title()}",
            html=f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #3B82F6;">You're Invited to Seryvo!</h1>
                <p>Hi {request.full_name},</p>
                <p>You've been invited to join Seryvo as a <strong>{request.role.replace('_', ' ').title()}</strong>.</p>
                {custom_message}
                <p>Click the button below to accept your invitation and set up your account:</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{invite_link}" 
                       style="background-color: #3B82F6; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 8px; display: inline-block;">
                        Accept Invitation
                    </a>
                </p>
                <p><strong>Your temporary password:</strong> {temp_password}</p>
                <p style="color: #EF4444;"><strong>Important:</strong> Please change your password after your first login.</p>
                <p style="color: #6B7280; font-size: 12px;">This invitation expires in 7 days.</p>
                <p>Best regards,<br>The Seryvo Team</p>
            </div>
            """
        )
    except Exception as e:
        # If email fails, still return success but note the failure
        print(f"[Admin] Failed to send invite email: {e}")
        return UserProvisioningResponse(
            success=True,
            message=f"User created but invite email failed to send. Share credentials manually.",
            user_id=user.id,
            temporary_password=temp_password,
        )
    
    # Audit log
    audit_log = AuditLog(
        actor_id=current_user.id,
        action="admin.user_invited",
        entity_type="user",
        entity_id=user.id,
        new_value={
            "email": request.email,
            "role": request.role,
            "invited_by": current_user.email,
        }
    )
    db.add(audit_log)
    
    await db.commit()
    
    return UserProvisioningResponse(
        success=True,
        message=f"Invitation sent to {request.email}",
        user_id=user.id,
        invite_link=invite_link,
    )


@router.delete("/users/{user_id}", response_model=SuccessResponse)
async def admin_delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Delete a user account. Cannot delete yourself.
    """
    # Prevent self-deletion
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account"
        )
    
    # Get the user
    user_result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user_email = user.email
    
    # Delete user roles
    await db.execute(
        delete(UserRole).where(UserRole.user_id == user_id)
    )
    
    # Delete driver profile if exists
    await db.execute(
        delete(DriverProfile).where(DriverProfile.user_id == user_id)
    )
    
    # Delete the user
    await db.delete(user)
    
    # Audit log
    audit_log = AuditLog(
        actor_id=current_user.id,
        action="admin.user_deleted",
        entity_type="user",
        entity_id=user_id,
        old_value={"email": user_email},
    )
    db.add(audit_log)
    
    await db.commit()
    
    return SuccessResponse(
        success=True,
        message=f"User {user_email} has been deleted"
    )


@router.put("/users/{user_id}/reset-password", response_model=UserProvisioningResponse)
async def admin_reset_user_password(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Reset a user's password and send them a new temporary password via email.
    """
    # Get the user
    user_result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Generate new temporary password
    temp_password = secrets.token_urlsafe(12)
    
    # Update password
    user.password_hash = hash_password(temp_password)
    
    # Send email with new password
    try:
        from app.core.email import send_email
        
        await send_email(
            to=user.email,
            subject="Your Seryvo Password Has Been Reset",
            html=f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #3B82F6;">Password Reset</h1>
                <p>Hi {user.full_name},</p>
                <p>Your password has been reset by an administrator.</p>
                <p><strong>Your new temporary password:</strong> {temp_password}</p>
                <p style="color: #EF4444;"><strong>Important:</strong> Please change your password after your next login.</p>
                <p>Best regards,<br>The Seryvo Team</p>
            </div>
            """
        )
    except Exception as e:
        print(f"[Admin] Failed to send password reset email: {e}")
    
    # Audit log
    audit_log = AuditLog(
        actor_id=current_user.id,
        action="admin.user_password_reset",
        entity_type="user",
        entity_id=user_id,
        new_value={"password_reset_by": current_user.email},
    )
    db.add(audit_log)
    
    await db.commit()
    
    return UserProvisioningResponse(
        success=True,
        message=f"Password reset for {user.email}",
        user_id=user_id,
        temporary_password=temp_password,
    )