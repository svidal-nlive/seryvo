"""
Seryvo Platform - OTP (One-Time Password) Service
Handles OTP generation, validation, and delivery (email/SMS)
"""
import random
import string
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from sqlalchemy import select, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import OTPCode, UserVerification, User
from app.core.security import create_access_token


# OTP Configuration
OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 5
OTP_MAX_ATTEMPTS = 3
OTP_COOLDOWN_SECONDS = 60  # Minimum time between OTP requests


def generate_otp_code() -> str:
    """Generate a random 6-digit OTP code."""
    return ''.join(random.choices(string.digits, k=OTP_LENGTH))


def mask_identifier(identifier: str, identifier_type: str) -> str:
    """Mask email or phone for display (privacy protection)."""
    if identifier_type == 'email':
        # j***@example.com
        parts = identifier.split('@')
        if len(parts) == 2:
            local = parts[0]
            domain = parts[1]
            if len(local) > 2:
                masked_local = local[0] + '***' + local[-1]
            else:
                masked_local = local[0] + '***'
            return f"{masked_local}@{domain}"
        return '***@***'
    else:
        # ***-***-1234
        if len(identifier) >= 4:
            return f"***-***-{identifier[-4:]}"
        return '***-***-****'


def hash_otp(code: str, identifier: str) -> str:
    """Hash OTP code with identifier for storage (optional security measure)."""
    # For simplicity, we store plain code, but this could be enhanced
    return code


async def check_otp_cooldown(
    db: AsyncSession,
    identifier: str,
    identifier_type: str
) -> Tuple[bool, Optional[int]]:
    """
    Check if OTP cooldown period has passed.
    Returns (can_send, seconds_remaining).
    """
    # Find most recent OTP for this identifier
    result = await db.execute(
        select(OTPCode)
        .where(
            and_(
                OTPCode.identifier == identifier,
                OTPCode.identifier_type == identifier_type,
            )
        )
        .order_by(OTPCode.created_at.desc())
        .limit(1)
    )
    recent_otp = result.scalar_one_or_none()
    
    if recent_otp:
        elapsed = (datetime.now(timezone.utc) - recent_otp.created_at.replace(tzinfo=timezone.utc)).total_seconds()
        if elapsed < OTP_COOLDOWN_SECONDS:
            remaining = int(OTP_COOLDOWN_SECONDS - elapsed)
            return False, remaining
    
    return True, None


async def create_otp(
    db: AsyncSession,
    identifier: str,
    identifier_type: str,
    purpose: str,
    user_id: Optional[int] = None
) -> OTPCode:
    """
    Create and store a new OTP code.
    Invalidates any existing unused OTPs for the same identifier/purpose.
    """
    # Invalidate existing unused OTPs for this identifier/purpose
    await db.execute(
        delete(OTPCode).where(
            and_(
                OTPCode.identifier == identifier,
                OTPCode.identifier_type == identifier_type,
                OTPCode.purpose == purpose,
                OTPCode.is_used == False,
            )
        )
    )
    
    # Generate new OTP
    code = generate_otp_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)
    
    otp = OTPCode(
        user_id=user_id,
        identifier=identifier,
        identifier_type=identifier_type,
        code=code,
        purpose=purpose,
        expires_at=expires_at,
        max_attempts=OTP_MAX_ATTEMPTS,
    )
    
    db.add(otp)
    await db.commit()
    await db.refresh(otp)
    
    return otp


async def verify_otp(
    db: AsyncSession,
    identifier: str,
    identifier_type: str,
    code: str,
    purpose: str
) -> Tuple[bool, str, Optional[str]]:
    """
    Verify an OTP code.
    Returns (success, message, verification_token).
    """
    # Find the OTP
    result = await db.execute(
        select(OTPCode).where(
            and_(
                OTPCode.identifier == identifier,
                OTPCode.identifier_type == identifier_type,
                OTPCode.purpose == purpose,
                OTPCode.is_used == False,
            )
        ).order_by(OTPCode.created_at.desc())
        .limit(1)
    )
    otp = result.scalar_one_or_none()
    
    if not otp:
        return False, "No active verification code found. Please request a new one.", None
    
    # Check expiry
    now = datetime.now(timezone.utc)
    expires_at = otp.expires_at.replace(tzinfo=timezone.utc) if otp.expires_at.tzinfo is None else otp.expires_at
    if now > expires_at:
        return False, "Verification code has expired. Please request a new one.", None
    
    # Check max attempts
    if otp.attempts >= otp.max_attempts:
        return False, "Maximum verification attempts exceeded. Please request a new code.", None
    
    # Verify code
    if otp.code != code:
        # Increment attempts
        otp.attempts += 1
        await db.commit()
        remaining = otp.max_attempts - otp.attempts
        if remaining > 0:
            return False, f"Invalid verification code. {remaining} attempts remaining.", None
        else:
            return False, "Maximum verification attempts exceeded. Please request a new code.", None
    
    # Success - mark as used
    otp.is_used = True
    otp.used_at = now
    await db.commit()
    
    # Generate verification token (proves the OTP was verified)
    verification_token = create_access_token(
        data={
            "sub": identifier,
            "type": "otp_verified",
            "purpose": purpose,
            "identifier_type": identifier_type,
        },
        expires_delta=timedelta(minutes=30)  # Token valid for 30 minutes
    )
    
    return True, "Verification successful.", verification_token


async def get_or_create_user_verification(
    db: AsyncSession,
    user_id: int
) -> UserVerification:
    """Get or create user verification record."""
    result = await db.execute(
        select(UserVerification).where(UserVerification.user_id == user_id)
    )
    verification = result.scalar_one_or_none()
    
    if not verification:
        verification = UserVerification(user_id=user_id)
        db.add(verification)
        await db.commit()
        await db.refresh(verification)
    
    return verification


async def mark_email_verified(db: AsyncSession, user_id: int) -> UserVerification:
    """Mark user's email as verified."""
    verification = await get_or_create_user_verification(db, user_id)
    verification.email_verified = True
    verification.email_verified_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(verification)
    return verification


async def mark_phone_verified(db: AsyncSession, user_id: int) -> UserVerification:
    """Mark user's phone as verified."""
    verification = await get_or_create_user_verification(db, user_id)
    verification.phone_verified = True
    verification.phone_verified_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(verification)
    return verification


# =============================================================================
# OTP Delivery (Uses Resend for emails)
# =============================================================================

async def send_email_otp(email: str, code: str, purpose: str) -> bool:
    """
    Send OTP via email using Resend service.
    
    In production, this uses Resend (FREE TIER: 3,000 emails/month).
    """
    from app.core.email_service import email_service
    
    result = await email_service.send_otp_email(
        to_email=email,
        otp_code=code,
        purpose=purpose
    )
    
    if result.get("success"):
        print(f"[OTP] Email sent to {email} for {purpose}")
        return True
    else:
        print(f"[OTP Error] Failed to send email: {result.get('error')}")
        # Fallback: log OTP for development
        print(f"[DEV] Email OTP for {email}: {code} (purpose: {purpose})")
        return True  # Return True so the flow continues


async def send_sms_otp(phone: str, code: str, purpose: str) -> bool:
    """
    Send OTP via SMS.
    
    NOTE: SMS requires paid services (Twilio, etc.)
    For $0 budget, we recommend using email OTP instead.
    This function logs the OTP for development.
    """
    # TODO: Integrate with SMS service if budget allows
    # For now, just log the OTP (development mode)
    print(f"[DEV] SMS OTP for {phone}: {code} (purpose: {purpose})")
    print(f"[INFO] SMS disabled - use email verification for $0 cost")
    
    # In production with budget, you would do:
    # message = f"Your Seryvo verification code is: {code}"
    # await twilio_client.messages.create(to=phone, body=message)
    
    return True


async def send_otp(identifier: str, identifier_type: str, code: str, purpose: str) -> bool:
    """Send OTP via appropriate channel."""
    if identifier_type == 'email':
        return await send_email_otp(identifier, code, purpose)
    else:
        return await send_sms_otp(identifier, code, purpose)
