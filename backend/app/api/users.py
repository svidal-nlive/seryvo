"""
Seryvo Platform - Users API Router
Handles user management, profiles, and admin user operations
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import hash_password
from app.core.dependencies import get_current_user, require_roles
from app.models import User, Role, UserRole, ClientProfile, AuditLog
from app.schemas import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserListResponse,
    RoleResponse,
    SuccessResponse,
)

router = APIRouter(prefix="/users", tags=["Users"])


# Use the require_roles function from dependencies
require_admin_or_support = require_roles(["admin", "support_agent"])
require_admin = require_roles(["admin"])


@router.get("", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_support)
):
    """List all users with pagination and filters."""
    query = select(User)
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                User.email.ilike(search_term),
                User.full_name.ilike(search_term),
                User.phone.ilike(search_term)
            )
        )
    
    # Apply active filter
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    
    # Apply role filter
    if role:
        query = query.join(UserRole).join(Role).where(Role.name == role)
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(User.created_at.desc())
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    # Get roles for each user
    user_responses = []
    for user in users:
        roles_result = await db.execute(
            select(Role.name)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(UserRole.user_id == user.id)
        )
        roles = [r[0] for r in roles_result.fetchall()]
        
        user_responses.append(UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            phone=user.phone,
            avatar_url=user.avatar_url,
            is_active=user.is_active,
            created_at=user.created_at,
            roles=roles
        ))
    
    total_pages = (total + page_size - 1) // page_size
    
    return UserListResponse(
        items=user_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/stats", response_model=dict)
async def get_user_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_support)
):
    """Get user statistics by role and status."""
    # Count users by role
    role_counts = {}
    roles = ["client", "driver", "support_agent", "admin"]
    
    for role_name in roles:
        count_query = (
            select(func.count(User.id))
            .join(UserRole, UserRole.user_id == User.id)
            .join(Role, Role.id == UserRole.role_id)
            .where(Role.name == role_name, User.is_active == True)
        )
        result = await db.execute(count_query)
        role_counts[role_name] = result.scalar() or 0
    
    # For drivers, also count by status (we'll use is_active as a proxy for now)
    # In a full implementation, you'd have a driver_status field
    active_drivers = role_counts.get("driver", 0)
    pending_drivers = 0  # Would need a pending_verification status
    suspended_drivers = 0  # Would need a suspended status
    
    return {
        "total_clients": role_counts.get("client", 0),
        "total_drivers": role_counts.get("driver", 0),
        "active_drivers": active_drivers,
        "pending_drivers": pending_drivers,
        "suspended_drivers": suspended_drivers,
        "total_support_agents": role_counts.get("support_agent", 0),
        "total_admins": role_counts.get("admin", 0),
    }


@router.get("/roles", response_model=List[RoleResponse])
async def list_roles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List all available roles."""
    result = await db.execute(select(Role))
    roles = result.scalars().all()
    return [RoleResponse(
        id=role.id,
        name=role.name,
        description=role.description
    ) for role in roles]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user by ID."""
    # Users can only view their own profile unless admin/support
    current_user_id = current_user.id
    user_roles = [ur.role.name for ur in current_user.roles]
    
    if user_id != current_user_id and not any(r in ["admin", "support_agent"] for r in user_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot view other users' profiles"
        )
    
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get roles
    roles_result = await db.execute(
        select(Role.name)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user.id)
    )
    roles = [r[0] for r in roles_result.fetchall()]
    
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


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    request: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create a new user (admin only)."""
    # Check if email exists
    result = await db.execute(
        select(User).where(User.email == request.email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
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
    
    # Assign roles
    for role_name in request.roles:
        role_result = await db.execute(
            select(Role).where(Role.name == role_name)
        )
        role = role_result.scalar_one_or_none()
        if role:
            user_role = UserRole(user_id=user.id, role_id=role.id)
            db.add(user_role)
    
    # Create audit log
    audit_log = AuditLog(
        actor_id=current_user.id,
        action="user.created",
        entity_type="user",
        entity_id=user.id,
        new_value={"email": user.email, "roles": request.roles}
    )
    db.add(audit_log)
    
    await db.commit()
    await db.refresh(user)
    
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        created_at=user.created_at,
        roles=request.roles
    )


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    request: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user profile."""
    current_user_id = current_user.id
    user_roles = [ur.role.name for ur in current_user.roles]
    is_admin = "admin" in user_roles
    
    # Users can only update their own profile unless admin
    if user_id != current_user_id and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update other users' profiles"
        )
    
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Store old values for audit
    old_values = {
        "full_name": user.full_name,
        "phone": user.phone,
        "is_active": user.is_active
    }
    
    # Update fields
    if request.full_name is not None:
        user.full_name = request.full_name
    if request.phone is not None:
        user.phone = request.phone
    if request.avatar_url is not None:
        user.avatar_url = request.avatar_url
    if request.is_active is not None and is_admin:
        user.is_active = request.is_active
    
    # Create audit log
    new_values = {
        "full_name": user.full_name,
        "phone": user.phone,
        "is_active": user.is_active
    }
    
    if old_values != new_values:
        audit_log = AuditLog(
            actor_id=current_user_id,
            action="user.updated",
            entity_type="user",
            entity_id=user.id,
            old_value=old_values,
            new_value=new_values
        )
        db.add(audit_log)
    
    await db.commit()
    await db.refresh(user)
    
    # Get roles
    roles_result = await db.execute(
        select(Role.name)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user.id)
    )
    roles = [r[0] for r in roles_result.fetchall()]
    
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


@router.delete("/{user_id}", response_model=SuccessResponse)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Soft delete a user (deactivate)."""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Soft delete - deactivate user
    user.is_active = False
    
    # Create audit log
    audit_log = AuditLog(
        actor_id=current_user.id,
        action="user.deleted",
        entity_type="user",
        entity_id=user.id
    )
    db.add(audit_log)
    
    await db.commit()
    
    return SuccessResponse(
        success=True,
        message="User deactivated successfully"
    )


@router.post("/{user_id}/roles/{role_name}", response_model=SuccessResponse)
async def assign_role(
    user_id: int,
    role_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Assign a role to a user."""
    # Get user
    user_result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get role
    role_result = await db.execute(
        select(Role).where(Role.name == role_name)
    )
    role = role_result.scalar_one_or_none()
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # Check if already assigned
    existing = await db.execute(
        select(UserRole).where(
            UserRole.user_id == user_id,
            UserRole.role_id == role.id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role already assigned"
        )
    
    # Assign role
    user_role = UserRole(user_id=user_id, role_id=role.id)
    db.add(user_role)
    
    # Audit log
    audit_log = AuditLog(
        actor_id=current_user.id,
        action="user.role_assigned",
        entity_type="user",
        entity_id=user_id,
        new_value={"role": role_name}
    )
    db.add(audit_log)
    
    await db.commit()
    
    return SuccessResponse(
        success=True,
        message=f"Role '{role_name}' assigned to user"
    )


@router.delete("/{user_id}/roles/{role_name}", response_model=SuccessResponse)
async def remove_role(
    user_id: int,
    role_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Remove a role from a user."""
    # Get role
    role_result = await db.execute(
        select(Role).where(Role.name == role_name)
    )
    role = role_result.scalar_one_or_none()
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # Find user role
    result = await db.execute(
        select(UserRole).where(
            UserRole.user_id == user_id,
            UserRole.role_id == role.id
        )
    )
    user_role = result.scalar_one_or_none()
    
    if not user_role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User does not have this role"
        )
    
    await db.delete(user_role)
    
    # Audit log
    audit_log = AuditLog(
        actor_id=current_user.id,
        action="user.role_removed",
        entity_type="user",
        entity_id=user_id,
        old_value={"role": role_name}
    )
    db.add(audit_log)
    
    await db.commit()
    
    return SuccessResponse(
        success=True,
        message=f"Role '{role_name}' removed from user"
    )


