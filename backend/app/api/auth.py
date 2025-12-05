"""
Seryvo Platform - Auth API Router
Handles authentication, registration, and token management
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    verify_password,
    hash_password,
    decode_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from app.core.dependencies import get_current_user, CurrentUser
from app.core.email_service import EmailService
from app.models import User, Role, UserRole
from app.schemas import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    RefreshTokenRequest,
    PasswordResetRequest,
    PasswordResetVerify,
    PasswordResetConfirm,
    UserResponse,
    SuccessResponse,
    ErrorResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# =============================================================================
# Role Mapping (Database → Frontend)
# =============================================================================

# The database stores 'support' but frontend expects 'support_agent'
ROLE_DB_TO_FRONTEND = {
    "support": "support_agent",
}

ROLE_FRONTEND_TO_DB = {
    "support_agent": "support",
}


def map_roles_to_frontend(db_roles: list[str]) -> list[str]:
    """Map database role names to frontend role names."""
    return [ROLE_DB_TO_FRONTEND.get(role, role) for role in db_roles]


def map_role_to_db(frontend_role: str) -> str:
    """Map frontend role name to database role name."""
    return ROLE_FRONTEND_TO_DB.get(frontend_role, frontend_role)


# =============================================================================
# Setup Status (First-User-Becomes-Admin Pattern)
# =============================================================================

class SetupStatusResponse(BaseModel):
    """Response for setup status check."""
    is_setup_complete: bool
    user_count: int
    requires_admin_setup: bool
    message: str


class FirstUserSetupRequest(BaseModel):
    """Request for first user (admin) setup."""
    email: str
    password: str
    full_name: str
    phone: Optional[str] = None


@router.get("/setup-status", response_model=SetupStatusResponse)
async def get_setup_status(
    db: AsyncSession = Depends(get_db)
):
    """
    Check if the platform has been set up (first user registered).
    This endpoint is public and used to show the setup wizard.
    """
    # Count users
    result = await db.execute(select(func.count(User.id)))
    user_count = result.scalar() or 0
    
    is_setup_complete = user_count > 0
    
    return SetupStatusResponse(
        is_setup_complete=is_setup_complete,
        user_count=user_count,
        requires_admin_setup=not is_setup_complete,
        message="Platform ready" if is_setup_complete else "First-time setup required. Create an admin account."
    )


@router.post("/setup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def first_user_setup(
    request: FirstUserSetupRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Create the first admin user during initial setup.
    Only works if no users exist in the database.
    """
    # Verify no users exist
    result = await db.execute(select(func.count(User.id)))
    user_count = result.scalar() or 0
    
    if user_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Platform already set up. Use normal registration.",
        )
    
    # Ensure roles exist (create if not)
    roles_to_create = [
        ("admin", "System administrator with full access"),
        ("support", "Customer support staff"),
        ("driver", "Driver/chauffeur"),
        ("client", "Customer/passenger"),
    ]
    
    for role_name, role_desc in roles_to_create:
        existing_role = await db.execute(select(Role).where(Role.name == role_name))
        if not existing_role.scalar_one_or_none():
            db.add(Role(name=role_name, description=role_desc))
    await db.flush()
    
    # Create the admin user
    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        full_name=request.full_name,
        phone=request.phone,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    
    # Assign admin role
    admin_role = await db.execute(select(Role).where(Role.name == "admin"))
    role = admin_role.scalar_one_or_none()
    
    if role:
        user_role = UserRole(user_id=user.id, role_id=role.id)
        db.add(user_role)
    
    await db.commit()
    await db.refresh(user)
    
    # Create tokens
    roles = ["admin"]
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "roles": roles},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = create_access_token(
        data={"sub": str(user.id), "type": "refresh"},
        expires_delta=timedelta(days=7)
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate user and return JWT tokens."""
    # Find user by email
    result = await db.execute(
        select(User).where(User.email == request.email)
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )
    
    # Get user roles
    roles_result = await db.execute(
        select(Role.name)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user.id)
    )
    db_roles = [r[0] for r in roles_result.fetchall()]
    roles = map_roles_to_frontend(db_roles)
    
    # Create tokens
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "roles": roles},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = create_access_token(
        data={"sub": str(user.id), "type": "refresh"},
        expires_delta=timedelta(days=7)
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user account."""
    # Check if email already exists
    result = await db.execute(
        select(User).where(User.email == request.email)
    )
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Validate role - client, driver, and support_agent can self-register
    # Admin accounts must be created by existing admins
    valid_roles = ["client", "driver", "support_agent"]
    if request.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {valid_roles}",
        )
    
    # Create user
    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        full_name=request.full_name,
        phone=request.phone,
    )
    db.add(user)
    await db.flush()  # Get user ID
    
    # Assign role
    role_result = await db.execute(
        select(Role).where(Role.name == request.role)
    )
    role = role_result.scalar_one_or_none()
    
    if role:
        user_role = UserRole(user_id=user.id, role_id=role.id)
        db.add(user_role)
    
    await db.commit()
    await db.refresh(user)
    
    # Create tokens
    roles = [request.role]
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "roles": roles},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = create_access_token(
        data={"sub": str(user.id), "type": "refresh"},
        expires_delta=timedelta(days=7)
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token using refresh token."""
    payload = decode_token(request.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    
    user_id = int(payload.get("sub"))
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    
    # Get user roles
    roles_result = await db.execute(
        select(Role.name)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user.id)
    )
    db_roles = [r[0] for r in roles_result.fetchall()]
    roles = map_roles_to_frontend(db_roles)
    
    # Create new tokens
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "roles": roles},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    new_refresh_token = create_access_token(
        data={"sub": str(user.id), "type": "refresh"},
        expires_delta=timedelta(days=7)
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer"
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current authenticated user info."""
    # Get user roles
    roles_result = await db.execute(
        select(Role.name)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == current_user.id)
    )
    db_roles = [r[0] for r in roles_result.fetchall()]
    roles = map_roles_to_frontend(db_roles)
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        phone=current_user.phone,
        avatar_url=current_user.avatar_url,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        roles=roles
    )


@router.post("/password-reset", response_model=SuccessResponse)
async def request_password_reset(
    request: PasswordResetRequest,
    db: AsyncSession = Depends(get_db)
):
    """Request password reset OTP code via email."""
    from app.core.otp import check_otp_cooldown, create_otp
    from app.core.email_service import EmailService
    
    result = await db.execute(
        select(User).where(User.email == request.email)
    )
    user = result.scalar_one_or_none()
    
    if user:
        # Check cooldown
        can_send, remaining = await check_otp_cooldown(db, request.email, "email")
        if not can_send:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {remaining} seconds before requesting another code"
            )
        
        # Create OTP for password reset
        otp = await create_otp(
            db=db,
            identifier=request.email,
            identifier_type="email",
            purpose="password_reset",
            user_id=user.id
        )
        
        # Send OTP email
        try:
            await EmailService.send_otp_email(
                to_email=request.email,
                otp_code=otp.code,
                purpose="password_reset"
            )
            print(f"[Password Reset] OTP sent to {request.email}")
        except Exception as e:
            print(f"[Password Reset Error] Failed to send email: {e}")
            # Log the code for development
            print(f"[DEV] Password Reset OTP for {request.email}: {otp.code}")
    
    # Always return success (don't reveal if email exists)
    return SuccessResponse(
        success=True,
        message="If the email exists, a verification code has been sent"
    )


@router.post("/password-reset/verify", response_model=SuccessResponse)
async def verify_password_reset_otp(
    request: PasswordResetVerify,
    db: AsyncSession = Depends(get_db)
):
    """Verify password reset OTP code and return a reset token."""
    from app.core.otp import verify_otp
    
    success, message, token = await verify_otp(
        db=db,
        identifier=request.email,
        identifier_type="email",
        code=request.code,
        purpose="password_reset"
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return SuccessResponse(
        success=True,
        message="Code verified successfully",
        data={"reset_token": token}
    )


@router.post("/password-reset/confirm", response_model=SuccessResponse)
async def confirm_password_reset(
    request: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db)
):
    """Confirm password reset with verified OTP token."""
    # Verify the reset token (from OTP verification)
    payload = decode_token(request.token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    
    # Token can be either from OTP verification or old-style password reset
    token_type = payload.get("type")
    
    if token_type == "otp_verified" and payload.get("purpose") == "password_reset":
        # New OTP-based flow - email is in "sub"
        email = payload.get("sub")
        result = await db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
    elif token_type == "password_reset":
        # Old link-based flow (for backwards compatibility)
        user_id = int(payload.get("sub"))
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token type",
        )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Update password
    user.password_hash = hash_password(request.new_password)
    await db.commit()
    
    return SuccessResponse(
        success=True,
        message="Password has been reset successfully"
    )


@router.post("/logout", response_model=SuccessResponse)
async def logout(
    current_user: User = Depends(get_current_user)
):
    """Logout current user (client-side token invalidation)."""
    # In a real implementation with refresh tokens stored server-side,
    # this would invalidate the refresh token
    return SuccessResponse(
        success=True,
        message="Logged out successfully"
    )


# =============================================================================
# OTP Verification Endpoints
# =============================================================================

from app.schemas import (
    OTPSendRequest,
    OTPSendResponse,
    OTPVerifyRequest,
    OTPVerifyResponse,
    UserVerificationResponse,
    RegisterWithOTPRequest,
)
from app.core.otp import (
    check_otp_cooldown,
    create_otp,
    verify_otp,
    send_otp,
    mask_identifier,
    get_or_create_user_verification,
    mark_email_verified,
    mark_phone_verified,
    OTP_EXPIRY_MINUTES,
)
from app.models import UserVerification


@router.post("/otp/send", response_model=OTPSendResponse)
async def send_otp_code(
    request: OTPSendRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Send OTP verification code to email or phone.
    
    Purposes:
    - registration: Verify email/phone before creating account
    - login: Two-factor authentication
    - password_reset: Verify identity for password reset
    - phone_verify: Verify phone number for existing user
    """
    # Validate purpose
    valid_purposes = ["registration", "login", "password_reset", "phone_verify"]
    if request.purpose not in valid_purposes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid purpose. Must be one of: {valid_purposes}",
        )
    
    # Check cooldown
    can_send, remaining = await check_otp_cooldown(
        db, request.identifier, request.identifier_type
    )
    if not can_send:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {remaining} seconds before requesting another code",
        )
    
    # For registration, check if identifier already exists
    if request.purpose == "registration":
        if request.identifier_type == "email":
            existing = await db.execute(
                select(User).where(User.email == request.identifier)
            )
            if existing.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This email is already registered",
                )
        # For phone, we could check if phone is taken too
    
    # Create OTP
    otp = await create_otp(
        db,
        identifier=request.identifier,
        identifier_type=request.identifier_type,
        purpose=request.purpose,
    )
    
    # Send OTP
    sent = await send_otp(
        request.identifier,
        request.identifier_type,
        otp.code,
        request.purpose
    )
    
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification code. Please try again.",
        )
    
    return OTPSendResponse(
        success=True,
        message=f"Verification code sent to your {request.identifier_type}",
        expires_in_seconds=OTP_EXPIRY_MINUTES * 60,
        masked_identifier=mask_identifier(request.identifier, request.identifier_type),
    )


@router.post("/otp/verify", response_model=OTPVerifyResponse)
async def verify_otp_code(
    request: OTPVerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Verify OTP code.
    
    Returns a verification token on success that can be used for:
    - Completing registration (purpose=registration)
    - Completing password reset (purpose=password_reset)
    """
    success, message, verification_token = await verify_otp(
        db,
        identifier=request.identifier,
        identifier_type=request.identifier_type,
        code=request.code,
        purpose=request.purpose,
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        )
    
    return OTPVerifyResponse(
        success=True,
        message=message,
        verification_token=verification_token,
    )


@router.post("/register-with-otp", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_with_otp(
    request: RegisterWithOTPRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user with OTP verification.
    
    Requires a verification_token from successful OTP verification.
    """
    # Verify the verification token
    payload = decode_token(request.verification_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token",
        )
    
    if payload.get("type") != "otp_verified":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token type",
        )
    
    # Check that the verified identifier matches the registration email
    verified_identifier = payload.get("sub")
    identifier_type = payload.get("identifier_type")
    
    if identifier_type == "email" and verified_identifier != request.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email does not match verified email",
        )
    
    # Check if email already exists
    result = await db.execute(
        select(User).where(User.email == request.email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Validate role
    valid_roles = ["client", "driver"]
    if request.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {valid_roles}",
        )
    
    # Create user
    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        full_name=request.full_name,
        phone=request.phone,
    )
    db.add(user)
    await db.flush()
    
    # Assign role
    role_result = await db.execute(
        select(Role).where(Role.name == request.role)
    )
    role = role_result.scalar_one_or_none()
    if role:
        user_role = UserRole(user_id=user.id, role_id=role.id)
        db.add(user_role)
    
    # Mark email as verified
    if identifier_type == "email":
        verification = UserVerification(
            user_id=user.id,
            email_verified=True,
            email_verified_at=datetime.now(timezone.utc),
        )
        db.add(verification)
    
    await db.commit()
    await db.refresh(user)
    
    # Create tokens
    roles = [request.role]
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "roles": roles},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = create_access_token(
        data={"sub": str(user.id), "type": "refresh"},
        expires_delta=timedelta(days=7)
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )


@router.get("/verification-status", response_model=UserVerificationResponse)
async def get_verification_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's verification status for email and phone."""
    verification = await get_or_create_user_verification(db, current_user.id)
    
    return UserVerificationResponse(
        user_id=current_user.id,
        email_verified=verification.email_verified,
        email_verified_at=verification.email_verified_at,
        phone_verified=verification.phone_verified,
        phone_verified_at=verification.phone_verified_at,
    )


@router.post("/verify-phone", response_model=UserVerificationResponse)
async def verify_phone_number(
    request: OTPVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Verify phone number for existing user.
    
    User must be logged in. Verifies the OTP code and marks phone as verified.
    """
    if request.identifier_type != "phone":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint is for phone verification only",
        )
    
    success, message, _ = await verify_otp(
        db,
        identifier=request.identifier,
        identifier_type="phone",
        code=request.code,
        purpose="phone_verify",
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        )
    
    # Update user's phone if different
    if current_user.phone != request.identifier:
        current_user.phone = request.identifier
    
    # Mark phone as verified
    verification = await mark_phone_verified(db, current_user.id)
    
    return UserVerificationResponse(
        user_id=current_user.id,
        email_verified=verification.email_verified,
        email_verified_at=verification.email_verified_at,
        phone_verified=verification.phone_verified,
        phone_verified_at=verification.phone_verified_at,
    )

