"""
Seryvo Platform - Push Notification Service
Uses WebPush API (FREE - W3C standard)

No external service costs - uses browser Push API directly.
Requires VAPID keys for authentication.

Generate keys:
  npx web-push generate-vapid-keys
  or
  python -c "from py_vapid import Vapid; v = Vapid(); v.generate_keys(); print('Public:', v.public_key.urlsafe_b64encode()); print('Private:', v.private_key.urlsafe_b64encode())"
"""
import json
from typing import Optional, Dict, Any, List
from datetime import datetime

try:
    from pywebpush import webpush, WebPushException
    WEBPUSH_AVAILABLE = True
except ImportError:
    WEBPUSH_AVAILABLE = False
    webpush = None
    WebPushException = Exception

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings


class PushService:
    """
    Push notification service using Web Push API.
    
    Free to use - no external service costs.
    Uses VAPID (Voluntary Application Server Identification) for authentication.
    """
    
    @staticmethod
    def is_configured() -> bool:
        """Check if WebPush is properly configured."""
        return (
            WEBPUSH_AVAILABLE and
            bool(settings.vapid_public_key) and
            bool(settings.vapid_private_key)
        )
    
    @staticmethod
    def get_vapid_public_key() -> Optional[str]:
        """Get VAPID public key for client subscription."""
        return settings.vapid_public_key if PushService.is_configured() else None
    
    @staticmethod
    async def send_notification(
        subscription_info: Dict[str, Any],
        title: str,
        body: str,
        icon: Optional[str] = None,
        badge: Optional[str] = None,
        url: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
        ttl: int = 86400  # Time to live in seconds (24 hours default)
    ) -> Dict[str, Any]:
        """
        Send a push notification to a single subscription.
        
        Args:
            subscription_info: Browser push subscription object
            title: Notification title
            body: Notification body text
            icon: URL to notification icon
            badge: URL to badge icon
            url: URL to open when notification is clicked
            data: Additional data to send with notification
            ttl: Time to live on push server
            
        Returns:
            Dict with success status
        """
        if not PushService.is_configured():
            print(f"[DEV PUSH] Title: {title}")
            print(f"[DEV PUSH] Body: {body}")
            return {
                "success": True,
                "message": "Push logged (WebPush not configured)"
            }
        
        # Build notification payload
        payload = {
            "notification": {
                "title": title,
                "body": body,
                "icon": icon or "/icons/notification-icon.png",
                "badge": badge or "/icons/badge-icon.png",
                "vibrate": [100, 50, 100],
                "requireInteraction": True,
                "data": {
                    "url": url or "/",
                    **(data or {})
                }
            }
        }
        
        try:
            webpush(
                subscription_info=subscription_info,
                data=json.dumps(payload),
                vapid_private_key=settings.vapid_private_key,
                vapid_claims={
                    "sub": settings.vapid_mailto
                },
                ttl=ttl
            )
            
            return {"success": True}
            
        except WebPushException as e:
            error_info = {
                "success": False,
                "error": str(e),
            }
            
            # Check for specific error codes
            if e.response is not None:
                error_info["status_code"] = e.response.status_code
                
                # 410 Gone - subscription expired
                if e.response.status_code == 410:
                    error_info["expired"] = True
                    error_info["message"] = "Subscription expired"
                    
                # 404 Not Found - subscription invalid
                elif e.response.status_code == 404:
                    error_info["invalid"] = True
                    error_info["message"] = "Subscription not found"
            
            print(f"[Push Error] {error_info}")
            return error_info
        
        except Exception as e:
            print(f"[Push Error] Unexpected error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    @staticmethod
    async def send_to_user(
        db: AsyncSession,
        user_id: int,
        title: str,
        body: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Send push notification to all subscriptions for a user.
        
        Args:
            db: Database session
            user_id: Target user ID
            title: Notification title
            body: Notification body
            **kwargs: Additional args passed to send_notification
            
        Returns:
            Dict with sent/failed counts
        """
        from app.models import PushSubscription
        
        # Get all active subscriptions for user
        result = await db.execute(
            select(PushSubscription).where(
                PushSubscription.user_id == user_id,
                PushSubscription.is_active == True
            )
        )
        subscriptions = result.scalars().all()
        
        if not subscriptions:
            return {
                "success": True,
                "sent": 0,
                "failed": 0,
                "message": "No active subscriptions"
            }
        
        sent = 0
        failed = 0
        expired_subs = []
        
        for sub in subscriptions:
            # Build subscription info from stored data
            subscription_info = {
                "endpoint": sub.endpoint,
                "keys": json.loads(sub.keys_json) if sub.keys_json else {}
            }
            
            result = await PushService.send_notification(
                subscription_info=subscription_info,
                title=title,
                body=body,
                **kwargs
            )
            
            if result.get("success"):
                sent += 1
            else:
                failed += 1
                # Mark expired/invalid subscriptions for cleanup
                if result.get("expired") or result.get("invalid"):
                    expired_subs.append(sub)
        
        # Clean up expired subscriptions
        for sub in expired_subs:
            sub.is_active = False
        
        if expired_subs:
            await db.commit()
        
        return {
            "success": sent > 0,
            "sent": sent,
            "failed": failed,
        }
    
    @staticmethod
    async def send_to_users(
        db: AsyncSession,
        user_ids: List[int],
        title: str,
        body: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Send push notification to multiple users.
        """
        total_sent = 0
        total_failed = 0
        
        for user_id in user_ids:
            result = await PushService.send_to_user(
                db=db,
                user_id=user_id,
                title=title,
                body=body,
                **kwargs
            )
            total_sent += result.get("sent", 0)
            total_failed += result.get("failed", 0)
        
        return {
            "success": total_sent > 0,
            "sent": total_sent,
            "failed": total_failed,
        }
    
    # ===================================================
    # Notification Templates
    # ===================================================
    
    @staticmethod
    async def notify_driver_new_ride(
        db: AsyncSession,
        driver_id: int,
        booking_id: int,
        pickup_address: str,
        estimated_fare: float
    ) -> Dict[str, Any]:
        """Notify driver of new ride request."""
        return await PushService.send_to_user(
            db=db,
            user_id=driver_id,
            title="New Ride Request! 🚗",
            body=f"Pickup at {pickup_address[:50]}... - ${estimated_fare:.2f}",
            data={
                "type": "new_ride",
                "booking_id": booking_id,
            },
            url=f"/driver/rides/{booking_id}"
        )
    
    @staticmethod
    async def notify_client_driver_assigned(
        db: AsyncSession,
        client_id: int,
        booking_id: int,
        driver_name: str,
        eta_minutes: int
    ) -> Dict[str, Any]:
        """Notify client that driver is assigned."""
        return await PushService.send_to_user(
            db=db,
            user_id=client_id,
            title="Driver On The Way! 🚗",
            body=f"{driver_name} will arrive in {eta_minutes} minutes",
            data={
                "type": "driver_assigned",
                "booking_id": booking_id,
            },
            url=f"/rides/{booking_id}/track"
        )
    
    @staticmethod
    async def notify_client_driver_arrived(
        db: AsyncSession,
        client_id: int,
        booking_id: int,
        driver_name: str
    ) -> Dict[str, Any]:
        """Notify client that driver has arrived."""
        return await PushService.send_to_user(
            db=db,
            user_id=client_id,
            title="Driver Has Arrived! 📍",
            body=f"{driver_name} is waiting at your pickup location",
            data={
                "type": "driver_arrived",
                "booking_id": booking_id,
            },
            url=f"/rides/{booking_id}"
        )
    
    @staticmethod
    async def notify_client_ride_complete(
        db: AsyncSession,
        client_id: int,
        booking_id: int,
        total_fare: float
    ) -> Dict[str, Any]:
        """Notify client that ride is complete."""
        return await PushService.send_to_user(
            db=db,
            user_id=client_id,
            title="Ride Complete! ✅",
            body=f"Total: ${total_fare:.2f} - Rate your driver",
            data={
                "type": "ride_complete",
                "booking_id": booking_id,
            },
            url=f"/rides/{booking_id}/receipt"
        )
    
    @staticmethod
    async def notify_driver_payment_received(
        db: AsyncSession,
        driver_id: int,
        amount: float,
        booking_id: int
    ) -> Dict[str, Any]:
        """Notify driver of payment received."""
        return await PushService.send_to_user(
            db=db,
            user_id=driver_id,
            title="Payment Received! 💰",
            body=f"You earned ${amount:.2f} from ride #{booking_id}",
            data={
                "type": "payment_received",
                "booking_id": booking_id,
            },
            url="/driver/earnings"
        )


# Singleton instance
push_service = PushService()
