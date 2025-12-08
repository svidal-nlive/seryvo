"""
Organizations API Router

Handles multi-tenant organization management:
- CRUD operations for organizations
- Member management (add, remove, update roles)
- Organization switching for multi-org users
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.models import Organization, OrganizationMember, User
from app.schemas import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationResponse,
    OrganizationMemberCreate,
    OrganizationMemberUpdate,
    OrganizationMemberResponse,
    OrganizationListResponse,
    SuccessResponse,
)

router = APIRouter(prefix="/organizations", tags=["Organizations"])


# ===========================================
# Organization CRUD
# ===========================================

@router.get("", response_model=OrganizationListResponse)
async def list_organizations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    List all organizations (admin only).
    """
    query = select(Organization)
    count_query = select(func.count(Organization.id))
    
    # Apply filters
    if is_active is not None:
        query = query.where(Organization.is_active == is_active)
        count_query = count_query.where(Organization.is_active == is_active)
    
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (Organization.name.ilike(search_filter)) |
            (Organization.slug.ilike(search_filter))
        )
        count_query = count_query.where(
            (Organization.name.ilike(search_filter)) |
            (Organization.slug.ilike(search_filter))
        )
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(Organization.created_at.desc())
    
    result = await db.execute(query)
    organizations = result.scalars().all()
    
    # Get member counts
    items = []
    for org in organizations:
        member_count_result = await db.execute(
            select(func.count(OrganizationMember.id))
            .where(OrganizationMember.organization_id == org.id)
            .where(OrganizationMember.is_active == True)
        )
        member_count = member_count_result.scalar() or 0
        
        org_dict = {
            "id": org.id,
            "slug": org.slug,
            "name": org.name,
            "logo_url": org.logo_url,
            "primary_color": org.primary_color,
            "secondary_color": org.secondary_color,
            "timezone": org.timezone,
            "currency": org.currency,
            "country_code": org.country_code,
            "phone_prefix": org.phone_prefix,
            "contact_email": org.contact_email,
            "contact_phone": org.contact_phone,
            "address": org.address,
            "subscription_tier": org.subscription_tier,
            "max_drivers": org.max_drivers,
            "max_bookings_per_month": org.max_bookings_per_month,
            "features": org.features,
            "is_active": org.is_active,
            "suspended_at": org.suspended_at,
            "suspension_reason": org.suspension_reason,
            "created_at": org.created_at,
            "updated_at": org.updated_at,
            "member_count": member_count,
        }
        items.append(OrganizationResponse(**org_dict))
    
    return OrganizationListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(
    data: OrganizationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Create a new organization (admin only).
    """
    # Check if slug already exists
    existing = await db.execute(
        select(Organization).where(Organization.slug == data.slug)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Organization with slug '{data.slug}' already exists"
        )
    
    org = Organization(
        slug=data.slug,
        name=data.name,
        logo_url=data.logo_url,
        primary_color=data.primary_color,
        secondary_color=data.secondary_color,
        timezone=data.timezone,
        currency=data.currency,
        country_code=data.country_code,
        phone_prefix=data.phone_prefix,
        contact_email=data.contact_email,
        contact_phone=data.contact_phone,
        address=data.address,
    )
    db.add(org)
    await db.commit()
    await db.refresh(org)
    
    # Add creator as org_admin
    member = OrganizationMember(
        organization_id=org.id,
        user_id=current_user.id,
        role="org_admin",
        is_primary=False,
        is_active=True,
        invited_by=None,
    )
    db.add(member)
    await db.commit()
    
    return OrganizationResponse(
        id=org.id,
        slug=org.slug,
        name=org.name,
        logo_url=org.logo_url,
        primary_color=org.primary_color,
        secondary_color=org.secondary_color,
        timezone=org.timezone,
        currency=org.currency,
        country_code=org.country_code,
        phone_prefix=org.phone_prefix,
        contact_email=org.contact_email,
        contact_phone=org.contact_phone,
        address=org.address,
        subscription_tier=org.subscription_tier,
        max_drivers=org.max_drivers,
        max_bookings_per_month=org.max_bookings_per_month,
        features=org.features,
        is_active=org.is_active,
        suspended_at=org.suspended_at,
        suspension_reason=org.suspension_reason,
        created_at=org.created_at,
        updated_at=org.updated_at,
        member_count=1,
    )


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(
    org_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get organization by ID.
    Users can only view organizations they belong to, admins can view all.
    """
    result = await db.execute(
        select(Organization).where(Organization.id == org_id)
    )
    org = result.scalar_one_or_none()
    
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Check access (admin can view all, others only their orgs)
    is_admin = any(ur.role.name == "admin" for ur in current_user.roles)
    if not is_admin:
        member_check = await db.execute(
            select(OrganizationMember)
            .where(OrganizationMember.organization_id == org_id)
            .where(OrganizationMember.user_id == current_user.id)
            .where(OrganizationMember.is_active == True)
        )
        if not member_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a member of this organization"
            )
    
    # Get member count
    member_count_result = await db.execute(
        select(func.count(OrganizationMember.id))
        .where(OrganizationMember.organization_id == org.id)
        .where(OrganizationMember.is_active == True)
    )
    member_count = member_count_result.scalar() or 0
    
    return OrganizationResponse(
        id=org.id,
        slug=org.slug,
        name=org.name,
        logo_url=org.logo_url,
        primary_color=org.primary_color,
        secondary_color=org.secondary_color,
        timezone=org.timezone,
        currency=org.currency,
        country_code=org.country_code,
        phone_prefix=org.phone_prefix,
        contact_email=org.contact_email,
        contact_phone=org.contact_phone,
        address=org.address,
        subscription_tier=org.subscription_tier,
        max_drivers=org.max_drivers,
        max_bookings_per_month=org.max_bookings_per_month,
        features=org.features,
        is_active=org.is_active,
        suspended_at=org.suspended_at,
        suspension_reason=org.suspension_reason,
        created_at=org.created_at,
        updated_at=org.updated_at,
        member_count=member_count,
    )


@router.patch("/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: int,
    data: OrganizationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Update organization (admin only).
    """
    result = await db.execute(
        select(Organization).where(Organization.id == org_id)
    )
    org = result.scalar_one_or_none()
    
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(org, field, value)
    
    await db.commit()
    await db.refresh(org)
    
    # Get member count
    member_count_result = await db.execute(
        select(func.count(OrganizationMember.id))
        .where(OrganizationMember.organization_id == org.id)
        .where(OrganizationMember.is_active == True)
    )
    member_count = member_count_result.scalar() or 0
    
    return OrganizationResponse(
        id=org.id,
        slug=org.slug,
        name=org.name,
        logo_url=org.logo_url,
        primary_color=org.primary_color,
        secondary_color=org.secondary_color,
        timezone=org.timezone,
        currency=org.currency,
        country_code=org.country_code,
        phone_prefix=org.phone_prefix,
        contact_email=org.contact_email,
        contact_phone=org.contact_phone,
        address=org.address,
        subscription_tier=org.subscription_tier,
        max_drivers=org.max_drivers,
        max_bookings_per_month=org.max_bookings_per_month,
        features=org.features,
        is_active=org.is_active,
        suspended_at=org.suspended_at,
        suspension_reason=org.suspension_reason,
        created_at=org.created_at,
        updated_at=org.updated_at,
        member_count=member_count,
    )


@router.delete("/{org_id}", response_model=SuccessResponse)
async def delete_organization(
    org_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Delete organization (admin only).
    This will cascade delete all members.
    """
    result = await db.execute(
        select(Organization).where(Organization.id == org_id)
    )
    org = result.scalar_one_or_none()
    
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Prevent deleting the default organization
    if org.slug == "default":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the default organization"
        )
    
    await db.delete(org)
    await db.commit()
    
    return SuccessResponse(message=f"Organization '{org.name}' deleted successfully")


# ===========================================
# Organization Members
# ===========================================

@router.get("/{org_id}/members", response_model=list[OrganizationMemberResponse])
async def list_organization_members(
    org_id: int,
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List members of an organization.
    """
    # Check org exists
    org_check = await db.execute(
        select(Organization).where(Organization.id == org_id)
    )
    if not org_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Check access
    is_admin = any(ur.role.name == "admin" for ur in current_user.roles)
    if not is_admin:
        member_check = await db.execute(
            select(OrganizationMember)
            .where(OrganizationMember.organization_id == org_id)
            .where(OrganizationMember.user_id == current_user.id)
            .where(OrganizationMember.is_active == True)
        )
        if not member_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a member of this organization"
            )
    
    query = (
        select(OrganizationMember, User)
        .join(User, OrganizationMember.user_id == User.id)
        .where(OrganizationMember.organization_id == org_id)
    )
    
    if not include_inactive:
        query = query.where(OrganizationMember.is_active == True)
    
    result = await db.execute(query)
    rows = result.all()
    
    members = []
    for member, user in rows:
        members.append(OrganizationMemberResponse(
            id=member.id,
            organization_id=member.organization_id,
            user_id=member.user_id,
            role=member.role,
            is_primary=member.is_primary,
            is_active=member.is_active,
            joined_at=member.joined_at,
            invited_by=member.invited_by,
            user_email=user.email,
            user_full_name=user.full_name,
        ))
    
    return members


@router.post("/{org_id}/members", response_model=OrganizationMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_organization_member(
    org_id: int,
    data: OrganizationMemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Add a member to an organization (admin only).
    """
    # Check org exists
    org_check = await db.execute(
        select(Organization).where(Organization.id == org_id)
    )
    if not org_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Check user exists
    user_result = await db.execute(
        select(User).where(User.id == data.user_id)
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if already a member
    existing = await db.execute(
        select(OrganizationMember)
        .where(OrganizationMember.organization_id == org_id)
        .where(OrganizationMember.user_id == data.user_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this organization"
        )
    
    member = OrganizationMember(
        organization_id=org_id,
        user_id=data.user_id,
        role=data.role,
        is_primary=data.is_primary,
        is_active=True,
        invited_by=current_user.id,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)
    
    return OrganizationMemberResponse(
        id=member.id,
        organization_id=member.organization_id,
        user_id=member.user_id,
        role=member.role,
        is_primary=member.is_primary,
        is_active=member.is_active,
        joined_at=member.joined_at,
        invited_by=member.invited_by,
        user_email=user.email,
        user_full_name=user.full_name,
    )


@router.patch("/{org_id}/members/{member_id}", response_model=OrganizationMemberResponse)
async def update_organization_member(
    org_id: int,
    member_id: int,
    data: OrganizationMemberUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Update organization member (admin only).
    """
    result = await db.execute(
        select(OrganizationMember, User)
        .join(User, OrganizationMember.user_id == User.id)
        .where(OrganizationMember.id == member_id)
        .where(OrganizationMember.organization_id == org_id)
    )
    row = result.one_or_none()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
    
    member, user = row
    
    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(member, field, value)
    
    await db.commit()
    await db.refresh(member)
    
    return OrganizationMemberResponse(
        id=member.id,
        organization_id=member.organization_id,
        user_id=member.user_id,
        role=member.role,
        is_primary=member.is_primary,
        is_active=member.is_active,
        joined_at=member.joined_at,
        invited_by=member.invited_by,
        user_email=user.email,
        user_full_name=user.full_name,
    )


@router.delete("/{org_id}/members/{member_id}", response_model=SuccessResponse)
async def remove_organization_member(
    org_id: int,
    member_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Remove member from organization (admin only).
    """
    result = await db.execute(
        select(OrganizationMember)
        .where(OrganizationMember.id == member_id)
        .where(OrganizationMember.organization_id == org_id)
    )
    member = result.scalar_one_or_none()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
    
    await db.delete(member)
    await db.commit()
    
    return SuccessResponse(message="Member removed from organization")


# ===========================================
# User's Organizations
# ===========================================

@router.get("/my/memberships", response_model=list[OrganizationResponse])
async def get_my_organizations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get organizations the current user belongs to.
    """
    result = await db.execute(
        select(Organization, OrganizationMember)
        .join(OrganizationMember, Organization.id == OrganizationMember.organization_id)
        .where(OrganizationMember.user_id == current_user.id)
        .where(OrganizationMember.is_active == True)
        .where(Organization.is_active == True)
    )
    rows = result.all()
    
    orgs = []
    for org, member in rows:
        # Get member count for each org
        member_count_result = await db.execute(
            select(func.count(OrganizationMember.id))
            .where(OrganizationMember.organization_id == org.id)
            .where(OrganizationMember.is_active == True)
        )
        member_count = member_count_result.scalar() or 0
        
        orgs.append(OrganizationResponse(
            id=org.id,
            slug=org.slug,
            name=org.name,
            logo_url=org.logo_url,
            primary_color=org.primary_color,
            secondary_color=org.secondary_color,
            timezone=org.timezone,
            currency=org.currency,
            country_code=org.country_code,
            phone_prefix=org.phone_prefix,
            contact_email=org.contact_email,
            contact_phone=org.contact_phone,
            address=org.address,
            subscription_tier=org.subscription_tier,
            max_drivers=org.max_drivers,
            max_bookings_per_month=org.max_bookings_per_month,
            features=org.features,
            is_active=org.is_active,
            suspended_at=org.suspended_at,
            suspension_reason=org.suspension_reason,
            created_at=org.created_at,
            updated_at=org.updated_at,
            member_count=member_count,
        ))
    
    return orgs
