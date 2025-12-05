"""
Seryvo Platform - Email Notification Service
Uses Resend API (FREE TIER: 3,000 emails/month, 100/day)

https://resend.com/docs/send-with-python
"""
import os
from typing import Optional, List, Dict, Any
from datetime import datetime

try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False
    resend = None

from app.core.config import settings


# Initialize Resend
if RESEND_AVAILABLE and settings.resend_api_key:
    resend.api_key = settings.resend_api_key


class EmailService:
    """
    Email notification service using Resend.
    
    Free tier limits:
    - 3,000 emails/month
    - 100 emails/day
    - 1 domain
    """
    
    @staticmethod
    def is_configured() -> bool:
        """Check if Resend is properly configured."""
        return RESEND_AVAILABLE and bool(settings.resend_api_key)
    
    @staticmethod
    async def send_email(
        to: List[str],
        subject: str,
        html: str,
        text: Optional[str] = None,
        reply_to: Optional[str] = None,
        tags: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Send an email via Resend.
        
        Args:
            to: List of recipient email addresses
            subject: Email subject
            html: HTML content
            text: Plain text content (optional)
            reply_to: Reply-to address (optional)
            tags: Resend tags for tracking (optional)
            
        Returns:
            Dict with success status and email ID or error
        """
        if not EmailService.is_configured():
            # Development fallback - log email instead
            print(f"[DEV EMAIL] To: {to}")
            print(f"[DEV EMAIL] Subject: {subject}")
            print(f"[DEV EMAIL] Body: {html[:200]}...")
            return {
                "success": True,
                "id": "dev-mode-no-email-sent",
                "message": "Email logged (Resend not configured)"
            }
        
        try:
            params: resend.Emails.SendParams = {
                "from": settings.resend_from_email,
                "to": to,
                "subject": subject,
                "html": html,
            }
            
            if text:
                params["text"] = text
            
            if reply_to:
                params["reply_to"] = reply_to
            
            if tags:
                params["tags"] = tags
            
            response = resend.Emails.send(params)
            
            return {
                "success": True,
                "id": response.get("id"),
            }
            
        except Exception as e:
            print(f"[Email Error] Failed to send email: {e}")
            return {
                "success": False,
                "error": str(e),
            }
    
    # ===================================================
    # Email Templates
    # ===================================================
    
    @staticmethod
    def _base_template(content: str, title: str = "Seryvo") -> str:
        """Wrap content in base email template."""
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .header {{
            text-align: center;
            margin-bottom: 30px;
        }}
        .logo {{
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
        }}
        .content {{
            margin-bottom: 30px;
        }}
        .button {{
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff !important;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
        }}
        .footer {{
            text-align: center;
            font-size: 12px;
            color: #666;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }}
        .info-box {{
            background-color: #f8fafc;
            border-left: 4px solid #2563eb;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 4px 4px 0;
        }}
        .highlight {{
            font-size: 32px;
            font-weight: bold;
            color: #2563eb;
            text-align: center;
            padding: 20px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🚗 Seryvo</div>
        </div>
        <div class="content">
            {content}
        </div>
        <div class="footer">
            <p>This email was sent by Seryvo Platform</p>
            <p>© {datetime.now().year} Seryvo. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""
    
    @staticmethod
    async def send_booking_confirmation(
        to_email: str,
        booking_id: int,
        pickup_address: str,
        dropoff_address: str,
        scheduled_time: Optional[datetime] = None,
        estimated_fare: float = 0.0,
        service_type: str = "Standard"
    ) -> Dict[str, Any]:
        """Send booking confirmation email."""
        time_str = scheduled_time.strftime("%B %d, %Y at %I:%M %p") if scheduled_time else "As soon as possible"
        
        content = f"""
        <h2>Booking Confirmed! 🎉</h2>
        <p>Your ride has been successfully booked.</p>
        
        <div class="info-box">
            <p><strong>Booking ID:</strong> #{booking_id}</p>
            <p><strong>Service:</strong> {service_type}</p>
            <p><strong>Pickup:</strong> {pickup_address}</p>
            <p><strong>Drop-off:</strong> {dropoff_address}</p>
            <p><strong>Scheduled:</strong> {time_str}</p>
            <p><strong>Estimated Fare:</strong> ${estimated_fare:.2f}</p>
        </div>
        
        <p>We'll notify you when a driver accepts your ride.</p>
        """
        
        return await EmailService.send_email(
            to=[to_email],
            subject=f"Booking Confirmed - Ride #{booking_id}",
            html=EmailService._base_template(content, "Booking Confirmed"),
            tags=[{"name": "type", "value": "booking_confirmation"}]
        )
    
    @staticmethod
    async def send_driver_assigned(
        to_email: str,
        booking_id: int,
        driver_name: str,
        vehicle_info: str,
        eta_minutes: int = 5
    ) -> Dict[str, Any]:
        """Send driver assignment notification."""
        content = f"""
        <h2>Driver On The Way! 🚗</h2>
        <p>Great news! A driver has accepted your ride.</p>
        
        <div class="info-box">
            <p><strong>Driver:</strong> {driver_name}</p>
            <p><strong>Vehicle:</strong> {vehicle_info}</p>
            <p><strong>ETA:</strong> {eta_minutes} minutes</p>
        </div>
        
        <p>Your driver is heading to your pickup location now.</p>
        <p>You can track their progress in the Seryvo app.</p>
        """
        
        return await EmailService.send_email(
            to=[to_email],
            subject=f"Driver Assigned - Ride #{booking_id}",
            html=EmailService._base_template(content, "Driver Assigned"),
            tags=[{"name": "type", "value": "driver_assigned"}]
        )
    
    @staticmethod
    async def send_ride_receipt(
        to_email: str,
        booking_id: int,
        pickup_address: str,
        dropoff_address: str,
        driver_name: str,
        distance: float,
        duration_minutes: int,
        base_fare: float,
        total_fare: float,
        payment_method: str = "Card",
        completed_at: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Send ride completion receipt."""
        completed_str = completed_at.strftime("%B %d, %Y at %I:%M %p") if completed_at else datetime.now().strftime("%B %d, %Y at %I:%M %p")
        
        content = f"""
        <h2>Ride Complete! ✅</h2>
        <p>Thank you for riding with Seryvo.</p>
        
        <div class="highlight">${total_fare:.2f}</div>
        
        <div class="info-box">
            <p><strong>Booking ID:</strong> #{booking_id}</p>
            <p><strong>Date:</strong> {completed_str}</p>
            <p><strong>Driver:</strong> {driver_name}</p>
        </div>
        
        <h3>Trip Details</h3>
        <p><strong>From:</strong> {pickup_address}</p>
        <p><strong>To:</strong> {dropoff_address}</p>
        <p><strong>Distance:</strong> {distance:.1f} miles</p>
        <p><strong>Duration:</strong> {duration_minutes} minutes</p>
        
        <h3>Fare Breakdown</h3>
        <p><strong>Base Fare:</strong> ${base_fare:.2f}</p>
        <p><strong>Total:</strong> ${total_fare:.2f}</p>
        <p><strong>Payment:</strong> {payment_method}</p>
        
        <p style="text-align: center; margin-top: 20px;">
            <a href="#" class="button">Rate Your Driver</a>
        </p>
        """
        
        return await EmailService.send_email(
            to=[to_email],
            subject=f"Your Seryvo Receipt - ${total_fare:.2f}",
            html=EmailService._base_template(content, "Ride Receipt"),
            tags=[{"name": "type", "value": "receipt"}]
        )
    
    @staticmethod
    async def send_otp_email(
        to_email: str,
        otp_code: str,
        purpose: str = "verification"
    ) -> Dict[str, Any]:
        """Send OTP verification email."""
        purpose_text = {
            "registration": "complete your registration",
            "login": "log in to your account",
            "password_reset": "reset your password",
            "verification": "verify your account",
            "phone_update": "update your phone number",
        }.get(purpose, "verify your identity")
        
        content = f"""
        <h2>Verification Code</h2>
        <p>Use this code to {purpose_text}:</p>
        
        <div class="highlight">{otp_code}</div>
        
        <p style="text-align: center;">This code expires in <strong>5 minutes</strong>.</p>
        
        <p style="color: #666; font-size: 14px;">
            If you didn't request this code, you can safely ignore this email.
            Someone may have entered your email address by mistake.
        </p>
        """
        
        return await EmailService.send_email(
            to=[to_email],
            subject=f"Your Seryvo Verification Code: {otp_code}",
            html=EmailService._base_template(content, "Verification Code"),
            tags=[{"name": "type", "value": "otp"}]
        )
    
    @staticmethod
    async def send_password_reset(
        to_email: str,
        reset_token: str,
        reset_url: str
    ) -> Dict[str, Any]:
        """Send password reset email."""
        content = f"""
        <h2>Reset Your Password</h2>
        <p>We received a request to reset your password.</p>
        
        <p style="text-align: center; margin: 30px 0;">
            <a href="{reset_url}" class="button">Reset Password</a>
        </p>
        
        <p style="color: #666; font-size: 14px;">
            This link expires in 1 hour. If you didn't request a password reset,
            you can safely ignore this email.
        </p>
        """
        
        return await EmailService.send_email(
            to=[to_email],
            subject="Reset Your Seryvo Password",
            html=EmailService._base_template(content, "Password Reset"),
            tags=[{"name": "type", "value": "password_reset"}]
        )
    
    @staticmethod
    async def send_welcome_email(
        to_email: str,
        user_name: str
    ) -> Dict[str, Any]:
        """Send welcome email to new users."""
        content = f"""
        <h2>Welcome to Seryvo! 👋</h2>
        <p>Hi {user_name},</p>
        
        <p>Thank you for joining Seryvo! We're excited to have you on board.</p>
        
        <p>With Seryvo, you can:</p>
        <ul>
            <li>🚗 Book rides instantly or schedule ahead</li>
            <li>📍 Track your driver in real-time</li>
            <li>💳 Pay securely with saved cards</li>
            <li>⭐ Rate drivers and provide feedback</li>
        </ul>
        
        <p style="text-align: center; margin: 30px 0;">
            <a href="#" class="button">Book Your First Ride</a>
        </p>
        
        <p>Questions? Our support team is here to help!</p>
        """
        
        return await EmailService.send_email(
            to=[to_email],
            subject="Welcome to Seryvo! 🚗",
            html=EmailService._base_template(content, "Welcome"),
            tags=[{"name": "type", "value": "welcome"}]
        )
    
    @staticmethod
    async def send_driver_offer_notification(
        to_email: str,
        driver_name: str,
        booking_id: int,
        pickup_address: str,
        estimated_fare: float,
        estimated_earnings: float
    ) -> Dict[str, Any]:
        """Send email to driver about new ride offer."""
        content = f"""
        <h2>New Ride Request! 🚗</h2>
        <p>Hi {driver_name},</p>
        
        <p>A new ride is available near you:</p>
        
        <div class="info-box">
            <p><strong>Pickup:</strong> {pickup_address}</p>
            <p><strong>Estimated Fare:</strong> ${estimated_fare:.2f}</p>
            <p><strong>Your Earnings:</strong> ${estimated_earnings:.2f}</p>
        </div>
        
        <p style="text-align: center; margin: 30px 0;">
            <a href="#" class="button">View in App</a>
        </p>
        
        <p style="color: #666; font-size: 14px;">
            Open the Seryvo Driver app to accept this ride.
        </p>
        """
        
        return await EmailService.send_email(
            to=[to_email],
            subject="New Ride Request Available",
            html=EmailService._base_template(content, "New Ride"),
            tags=[{"name": "type", "value": "driver_offer"}]
        )


# Singleton instance
email_service = EmailService()
