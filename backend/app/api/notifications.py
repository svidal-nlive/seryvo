"""
Seryvo Platform - Notifications API Router
Handles email and push notifications
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.email_service import email_service
from app.models import User

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ===========================================
# Email Service Status
# ===========================================

@router.get("/email/status")
async def get_email_status():
    """Get email service configuration status."""
    from app.core.config import settings
    
    return {
        "configured": email_service.is_configured(),
        "provider": "Resend" if email_service.is_configured() else "Development (console)",
        "from_email": settings.resend_from_email,
        "free_tier_limits": {
            "monthly": 3000,
            "daily": 100,
        }
    }


@router.post("/email/test")
async def send_test_email(
    to_email: str = Body(..., embed=True),
    current_user: User = Depends(require_roles(["admin"]))
):
    """Send a test email (admin only)."""
    result = await email_service.send_email(
        to=[to_email],
        subject="Seryvo Test Email",
        html=email_service._base_template(
            f"""
            <h2>Test Email ✅</h2>
            <p>This is a test email from Seryvo Platform.</p>
            <p>If you received this, your email configuration is working correctly!</p>
            <p><strong>Sent by:</strong> {current_user.email}</p>
            <p><strong>Timestamp:</strong> {datetime.utcnow().isoformat()}</p>
            """,
            "Test Email"
        )
    )
    
    return {
        "success": result.get("success", False),
        "message": "Test email sent" if result.get("success") else result.get("error"),
        "email_id": result.get("id"),
    }


# ===========================================
# Push Notification Status
# ===========================================

@router.get("/push/status")
async def get_push_status():
    """Get push notification configuration status."""
    from app.core.config import settings
    
    vapid_configured = bool(settings.vapid_public_key and settings.vapid_private_key)
    
    return {
        "configured": vapid_configured,
        "provider": "WebPush (Free)" if vapid_configured else "Not configured",
        "vapid_public_key": settings.vapid_public_key if vapid_configured else None,
        "message": "WebPush uses the free W3C Push API standard" if vapid_configured else "Configure VAPID keys to enable push notifications",
    }


@router.get("/push/vapid-public-key")
async def get_vapid_public_key():
    """Get VAPID public key for client-side subscription."""
    from app.core.config import settings
    
    if not settings.vapid_public_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Push notifications not configured"
        )
    
    return {
        "vapid_public_key": settings.vapid_public_key
    }


# ===========================================
# Push Subscription Management
# ===========================================

@router.post("/push/subscribe")
async def subscribe_to_push(
    subscription: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Register a push subscription for the current user.
    
    Expected subscription format from browser:
    {
        "endpoint": "https://fcm.googleapis.com/...",
        "keys": {
            "p256dh": "...",
            "auth": "..."
        }
    }
    """
    from app.models import PushSubscription
    import json
    
    # Check if subscription already exists
    result = await db.execute(
        select(PushSubscription).where(
            PushSubscription.user_id == current_user.id,
            PushSubscription.endpoint == subscription.get("endpoint")
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        # Update existing subscription
        existing.keys_json = json.dumps(subscription.get("keys", {}))
        existing.updated_at = datetime.utcnow()
    else:
        # Create new subscription
        push_sub = PushSubscription(
            user_id=current_user.id,
            endpoint=subscription.get("endpoint"),
            keys_json=json.dumps(subscription.get("keys", {})),
        )
        db.add(push_sub)
    
    await db.commit()
    
    return {
        "success": True,
        "message": "Push subscription registered"
    }


@router.delete("/push/unsubscribe")
async def unsubscribe_from_push(
    endpoint: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Unregister a push subscription."""
    from app.models import PushSubscription
    
    result = await db.execute(
        select(PushSubscription).where(
            PushSubscription.user_id == current_user.id,
            PushSubscription.endpoint == endpoint
        )
    )
    subscription = result.scalar_one_or_none()
    
    if subscription:
        await db.delete(subscription)
        await db.commit()
    
    return {
        "success": True,
        "message": "Push subscription removed"
    }


@router.post("/push/test")
async def send_test_push(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a test push notification to the current user."""
    from app.core.push_service import push_service
    
    result = await push_service.send_to_user(
        db=db,
        user_id=current_user.id,
        title="Test Notification",
        body="Push notifications are working! 🎉",
        data={"type": "test"}
    )
    
    return {
        "success": result.get("success", False),
        "sent": result.get("sent", 0),
        "failed": result.get("failed", 0),
        "message": "Test notification sent" if result.get("sent", 0) > 0 else "No active subscriptions found"
    }
