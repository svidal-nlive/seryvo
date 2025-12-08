"""
Seryvo Platform - Payments API Router
Handles payment methods, transactions, and billing
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.enums import BookingStatus, PaymentStatus
from app.models import (
    User, PaymentMethod, Payment, Booking, DriverPayout
)
from app.schemas import (
    PaymentMethodCreate,
    PaymentMethodResponse,
    PaymentResponse,
    DriverPayoutResponse,
    SuccessResponse,
)

router = APIRouter(prefix="/payments", tags=["Payments"])


# Role dependencies
require_admin = require_roles(["admin"])


# ===========================================
# Payment Methods
# ===========================================

@router.get("/methods", response_model=List[PaymentMethodResponse])
async def list_payment_methods(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List current user's payment methods."""
    result = await db.execute(
        select(PaymentMethod)
        .where(PaymentMethod.user_id == current_user.id)
        .order_by(PaymentMethod.is_default.desc(), PaymentMethod.created_at.desc())
    )
    methods = result.scalars().all()
    
    return [PaymentMethodResponse(
        id=m.id,
        user_id=m.user_id,
        method_type=m.method_type,
        last_four=m.last_four,
        brand=m.brand,
        exp_month=m.exp_month,
        exp_year=m.exp_year,
        is_default=m.is_default,
        created_at=m.created_at,
    ) for m in methods]


@router.post("/methods", response_model=PaymentMethodResponse, status_code=status.HTTP_201_CREATED)
async def add_payment_method(
    request: PaymentMethodCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a new payment method."""
    # If this is the first method or marked as default, update other methods
    if request.is_default:
        await db.execute(
            select(PaymentMethod)
            .where(PaymentMethod.user_id == current_user.id)
        )
        # Mark all existing as non-default
        existing = await db.execute(
            select(PaymentMethod).where(PaymentMethod.user_id == current_user.id)
        )
        for method in existing.scalars().all():
            method.is_default = False
    
    # Check if this is the first payment method (make it default)
    count_result = await db.execute(
        select(func.count()).select_from(PaymentMethod)
        .where(PaymentMethod.user_id == current_user.id)
    )
    is_first = count_result.scalar() == 0
    
    method = PaymentMethod(
        user_id=current_user.id,
        method_type=request.method_type,
        last_four=request.last_four,
        brand=request.brand,
        exp_month=request.exp_month,
        exp_year=request.exp_year,
        is_default=request.is_default or is_first,
        stripe_payment_method_id=request.stripe_payment_method_id,
    )
    db.add(method)
    await db.commit()
    await db.refresh(method)
    
    return PaymentMethodResponse(
        id=method.id,
        user_id=method.user_id,
        method_type=method.method_type,
        last_four=method.last_four,
        brand=method.brand,
        exp_month=method.exp_month,
        exp_year=method.exp_year,
        is_default=method.is_default,
        created_at=method.created_at,
    )


@router.delete("/methods/{method_id}", response_model=SuccessResponse)
async def remove_payment_method(
    method_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a payment method."""
    result = await db.execute(
        select(PaymentMethod).where(
            PaymentMethod.id == method_id,
            PaymentMethod.user_id == current_user.id
        )
    )
    method = result.scalar_one_or_none()
    
    if not method:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment method not found"
        )
    
    was_default = method.is_default
    await db.delete(method)
    
    # If deleted was default, make another one default
    if was_default:
        other_result = await db.execute(
            select(PaymentMethod)
            .where(PaymentMethod.user_id == current_user.id)
            .order_by(PaymentMethod.created_at.desc())
            .limit(1)
        )
        other = other_result.scalar_one_or_none()
        if other:
            other.is_default = True
    
    await db.commit()
    
    return SuccessResponse(success=True, message="Payment method removed")


@router.patch("/methods/{method_id}/default", response_model=PaymentMethodResponse)
async def set_default_payment_method(
    method_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Set a payment method as default."""
    result = await db.execute(
        select(PaymentMethod).where(
            PaymentMethod.id == method_id,
            PaymentMethod.user_id == current_user.id
        )
    )
    method = result.scalar_one_or_none()
    
    if not method:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment method not found"
        )
    
    # Unset other defaults
    all_result = await db.execute(
        select(PaymentMethod).where(PaymentMethod.user_id == current_user.id)
    )
    for m in all_result.scalars().all():
        m.is_default = (m.id == method_id)
    
    await db.commit()
    await db.refresh(method)
    
    return PaymentMethodResponse(
        id=method.id,
        user_id=method.user_id,
        method_type=method.method_type,
        last_four=method.last_four,
        brand=method.brand,
        exp_month=method.exp_month,
        exp_year=method.exp_year,
        is_default=method.is_default,
        created_at=method.created_at,
    )


# ===========================================
# Payment History
# ===========================================

@router.get("/history", response_model=List[PaymentResponse])
async def get_payment_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get payment history for current user's bookings."""
    # Get bookings where user is client
    result = await db.execute(
        select(Payment)
        .join(Booking, Payment.booking_id == Booking.id)
        .where(Booking.client_id == current_user.id)
        .order_by(Payment.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    payments = result.scalars().all()
    
    return [PaymentResponse(
        id=p.id,
        booking_id=p.booking_id,
        amount=float(p.amount),
        currency=p.currency,
        payment_method=p.payment_method,
        payment_status=p.payment_status,
        stripe_payment_intent_id=p.stripe_payment_intent_id,
        stripe_charge_id=p.stripe_charge_id,
        failure_reason=p.failure_reason,
        created_at=p.created_at,
        completed_at=p.completed_at,
    ) for p in payments]


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get payment details."""
    result = await db.execute(
        select(Payment)
        .join(Booking, Payment.booking_id == Booking.id)
        .where(
            Payment.id == payment_id,
            Booking.client_id == current_user.id
        )
    )
    payment = result.scalar_one_or_none()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    return PaymentResponse(
        id=payment.id,
        booking_id=payment.booking_id,
        amount=float(payment.amount),
        currency=payment.currency,
        payment_method=payment.payment_method,
        payment_status=payment.payment_status,
        stripe_payment_intent_id=payment.stripe_payment_intent_id,
        stripe_charge_id=payment.stripe_charge_id,
        failure_reason=payment.failure_reason,
        created_at=payment.created_at,
        completed_at=payment.completed_at,
    )


# ===========================================
# Driver Payouts
# ===========================================

@router.get("/driver/payouts", response_model=List[DriverPayoutResponse])
async def get_driver_payouts(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["driver", "admin"]))
):
    """Get payout history for driver."""
    result = await db.execute(
        select(DriverPayout)
        .where(DriverPayout.driver_id == current_user.id)
        .order_by(DriverPayout.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    payouts = result.scalars().all()
    
    return [DriverPayoutResponse(
        id=p.id,
        driver_id=p.driver_id,
        amount=float(p.amount),
        currency=p.currency,
        payout_status=p.payout_status,
        stripe_transfer_id=p.stripe_transfer_id,
        period_start=p.period_start,
        period_end=p.period_end,
        bookings_count=p.bookings_count,
        failure_reason=p.failure_reason,
        created_at=p.created_at,
        completed_at=p.completed_at,
    ) for p in payouts]


@router.get("/driver/earnings/summary")
async def get_earnings_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["driver", "admin"]))
):
    """Get earnings summary for driver."""
    from datetime import timedelta
    
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)
    
    # Today's earnings
    today_result = await db.execute(
        select(func.sum(Booking.driver_earnings))
        .where(
            Booking.driver_id == current_user.id,
            Booking.status == BookingStatus.COMPLETED.value,
            Booking.completed_at >= today_start
        )
    )
    today_earnings = today_result.scalar() or 0
    
    # This week's earnings
    week_result = await db.execute(
        select(func.sum(Booking.driver_earnings))
        .where(
            Booking.driver_id == current_user.id,
            Booking.status == BookingStatus.COMPLETED.value,
            Booking.completed_at >= week_start
        )
    )
    week_earnings = week_result.scalar() or 0
    
    # This month's earnings
    month_result = await db.execute(
        select(func.sum(Booking.driver_earnings))
        .where(
            Booking.driver_id == current_user.id,
            Booking.status == BookingStatus.COMPLETED.value,
            Booking.completed_at >= month_start
        )
    )
    month_earnings = month_result.scalar() or 0
    
    # Total earnings
    total_result = await db.execute(
        select(func.sum(Booking.driver_earnings))
        .where(
            Booking.driver_id == current_user.id,
            Booking.status == BookingStatus.COMPLETED.value
        )
    )
    total_earnings = total_result.scalar() or 0
    
    # Pending payout
    pending_result = await db.execute(
        select(func.sum(DriverPayout.amount))
        .where(
            DriverPayout.driver_id == current_user.id,
            DriverPayout.payout_status == "pending"
        )
    )
    pending_payout = pending_result.scalar() or 0
    
    return {
        "today": float(today_earnings),
        "this_week": float(week_earnings),
        "this_month": float(month_earnings),
        "total": float(total_earnings),
        "pending_payout": float(pending_payout),
        "currency": "USD",
    }


# ===========================================
# Admin: Refunds & Adjustments
# ===========================================

@router.post("/{payment_id}/refund", response_model=PaymentResponse)
async def process_refund(
    payment_id: int,
    amount: Optional[float] = None,
    reason: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Process a refund for a payment (admin only)."""
    result = await db.execute(
        select(Payment).where(Payment.id == payment_id)
    )
    payment = result.scalar_one_or_none()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    if payment.status not in PaymentStatus.refundable_statuses():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot refund this payment"
        )
    
    refund_amount = amount or float(payment.amount)
    if refund_amount > float(payment.amount):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refund amount exceeds payment amount"
        )
    
    payment.refund_amount = refund_amount
    payment.status = PaymentStatus.REFUNDED.value if refund_amount == float(payment.amount) else PaymentStatus.PARTIALLY_REFUNDED.value
    
    await db.commit()
    await db.refresh(payment)
    
    return PaymentResponse(
        id=payment.id,
        booking_id=payment.booking_id,
        payment_method_id=payment.payment_method_id,
        amount=float(payment.amount),
        currency=payment.currency,
        status=payment.status,
        stripe_payment_intent_id=payment.stripe_payment_intent_id,
        refund_amount=float(payment.refund_amount) if payment.refund_amount else None,
        created_at=payment.created_at,
    )


# ===========================================
# Stripe Integration Endpoints
# ===========================================

@router.post("/stripe/payment-intent")
async def create_stripe_payment_intent(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a Stripe PaymentIntent for a booking.
    
    Returns client_secret for frontend to complete payment.
    Uses TEST MODE - no real charges.
    """
    from app.core.stripe_service import stripe_service
    from app.core.config import settings
    
    # Validate booking belongs to user
    result = await db.execute(
        select(Booking).where(
            Booking.id == booking_id,
            Booking.client_id == current_user.id
        )
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    if booking.status not in ["requested", "confirmed", "in_progress"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot create payment for booking in {booking.status} status"
        )
    
    # Calculate amount in cents
    amount_cents = int(float(booking.final_fare or booking.base_fare or 0) * 100)
    
    if amount_cents <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment amount"
        )
    
    # Create PaymentIntent
    result = await stripe_service.create_payment_intent(
        amount=amount_cents,
        currency="usd",
        description=f"Seryvo Ride #{booking.id}",
        metadata={
            "booking_id": str(booking.id),
            "user_id": str(current_user.id),
            "service_type": booking.service_type_id or "standard",
        }
    )
    
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("error", "Failed to create payment intent")
        )
    
    # Store PaymentIntent ID in payment record
    payment_result = await db.execute(
        select(Payment).where(Payment.booking_id == booking_id)
    )
    payment = payment_result.scalar_one_or_none()
    
    if payment:
        payment.stripe_payment_intent_id = result["payment_intent_id"]
    else:
        payment = Payment(
            booking_id=booking_id,
            amount=float(booking.final_fare or booking.base_fare),
            currency="USD",
            payment_status="pending",
            stripe_payment_intent_id=result["payment_intent_id"],
        )
        db.add(payment)
    
    await db.commit()
    
    return {
        "success": True,
        "client_secret": result["client_secret"],
        "payment_intent_id": result["payment_intent_id"],
        "amount": result["amount"],
        "currency": result["currency"],
        "is_test_mode": stripe_service.is_test_mode(),
        "test_cards": stripe_service.TEST_CARDS if stripe_service.is_test_mode() else None,
    }


@router.post("/stripe/confirm/{payment_intent_id}")
async def confirm_stripe_payment(
    payment_intent_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Confirm that a Stripe payment was successful.
    Called by frontend after payment completion.
    """
    from app.core.stripe_service import stripe_service
    from datetime import datetime
    
    # Get PaymentIntent status from Stripe
    result = await stripe_service.get_payment_intent(payment_intent_id)
    
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Failed to retrieve payment status")
        )
    
    # Find our payment record
    payment_result = await db.execute(
        select(Payment)
        .join(Booking, Payment.booking_id == Booking.id)
        .where(
            Payment.stripe_payment_intent_id == payment_intent_id,
            Booking.client_id == current_user.id
        )
    )
    payment = payment_result.scalar_one_or_none()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    # Update payment status based on Stripe status
    stripe_status = result.get("status")
    
    if stripe_status == "succeeded":
        payment.payment_status = PaymentStatus.COMPLETED.value
        payment.completed_at = datetime.utcnow()
        payment.payment_method = "card"
    elif stripe_status == "requires_payment_method":
        payment.payment_status = PaymentStatus.FAILED.value
        payment.failure_reason = "Payment method required"
    elif stripe_status == "requires_action":
        payment.payment_status = PaymentStatus.PENDING.value
    elif stripe_status == "canceled":
        payment.payment_status = PaymentStatus.CANCELLED.value
    else:
        payment.payment_status = stripe_status
    
    await db.commit()
    
    return {
        "success": stripe_status == "succeeded",
        "status": payment.payment_status,
        "amount": result.get("amount"),
        "amount_received": result.get("amount_received"),
    }


@router.get("/stripe/status")
async def get_stripe_status():
    """Get Stripe integration status (test mode info)."""
    from app.core.stripe_service import stripe_service
    from app.core.config import settings
    
    return {
        "enabled": bool(settings.stripe_secret_key),
        "is_test_mode": stripe_service.is_test_mode(),
        "test_cards": stripe_service.TEST_CARDS if stripe_service.is_test_mode() else None,
        "message": "Stripe is in TEST MODE - no real charges will be made" if stripe_service.is_test_mode() else "Stripe is in LIVE MODE",
    }
