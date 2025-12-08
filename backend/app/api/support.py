"""
Seryvo Platform - Support API Router
Handles support tickets and messaging
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.enums import TicketStatus
from app.models import (
    User, SupportTicket, TicketMessage, Booking, AuditLog
)
from app.schemas import (
    TicketCreate,
    TicketUpdate,
    TicketMessageCreate,
    TicketMessageResponse,
    TicketResponse,
    TicketListResponse,
    UserResponse,
    SuccessResponse,
)

router = APIRouter(prefix="/support/tickets", tags=["Support"])


# Role dependency for support-only endpoints
require_support = require_roles(["admin", "support_agent"])


@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    request: TicketCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new support ticket."""
    user_id = current_user.id
    
    # Validate booking if provided
    if request.booking_id:
        booking_result = await db.execute(
            select(Booking).where(Booking.id == request.booking_id)
        )
        booking = booking_result.scalar_one_or_none()
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found"
            )
        # Check if user is related to the booking
        user_roles = [ur.role.name for ur in current_user.roles]
        is_staff = any(r in ["admin", "support_agent"] for r in user_roles)
        if not is_staff and booking.client_id != user_id and booking.driver_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to create ticket for this booking"
            )
    
    ticket = SupportTicket(
        user_id=user_id,
        booking_id=request.booking_id,
        category=request.category,
        status=TicketStatus.OPEN.value,
        priority=request.priority,
        subject=request.subject,
        description=request.description
    )
    db.add(ticket)
    await db.flush()
    
    # Create initial message from description
    initial_message = TicketMessage(
        ticket_id=ticket.id,
        sender_id=user_id,
        message=request.description,
        is_internal=False
    )
    db.add(initial_message)
    
    await db.commit()
    await db.refresh(ticket)
    
    # Get creator info
    creator_result = await db.execute(
        select(User).where(User.id == user_id)
    )
    creator = creator_result.scalar_one_or_none()
    
    creator_response = None
    if creator:
        creator_response = UserResponse(
            id=creator.id,
            email=creator.email,
            full_name=creator.full_name,
            phone=creator.phone,
            avatar_url=creator.avatar_url,
            is_active=creator.is_active,
            created_at=creator.created_at,
            roles=[]
        )
    
    return TicketResponse(
        id=ticket.id,
        created_by=ticket.user_id,
        assigned_to=ticket.assigned_to,
        booking_id=ticket.booking_id,
        category=ticket.category,
        status=ticket.status,
        priority=ticket.priority,
        subject=ticket.subject,
        description=ticket.description,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        creator=creator_response,
        assignee=None,
        messages=[]
    )


@router.get("", response_model=TicketListResponse)
async def list_tickets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List support tickets."""
    user_id = current_user.id
    user_roles = [ur.role.name for ur in current_user.roles]
    is_staff = any(r in ["admin", "support_agent"] for r in user_roles)
    
    query = select(SupportTicket)
    
    # Non-staff can only see their own tickets
    if not is_staff:
        query = query.where(SupportTicket.user_id == user_id)
    
    # Apply filters
    if status_filter:
        query = query.where(SupportTicket.status == status_filter)
    if priority:
        query = query.where(SupportTicket.priority == priority)
    if category:
        query = query.where(SupportTicket.category == category)
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                SupportTicket.subject.ilike(search_term),
                SupportTicket.description.ilike(search_term)
            )
        )
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(SupportTicket.created_at.desc())
    
    result = await db.execute(query)
    tickets = result.scalars().all()
    
    ticket_responses = []
    for ticket in tickets:
        # Get creator
        creator_result = await db.execute(
            select(User).where(User.id == ticket.user_id)
        )
        creator = creator_result.scalar_one_or_none()
        creator_response = None
        if creator:
            creator_response = UserResponse(
                id=creator.id,
                email=creator.email,
                full_name=creator.full_name,
                phone=creator.phone,
                avatar_url=creator.avatar_url,
                is_active=creator.is_active,
                created_at=creator.created_at,
                roles=[]
            )
        
        # Get assignee
        assignee_response = None
        if ticket.assigned_to:
            assignee_result = await db.execute(
                select(User).where(User.id == ticket.assigned_to)
            )
            assignee = assignee_result.scalar_one_or_none()
            if assignee:
                assignee_response = UserResponse(
                    id=assignee.id,
                    email=assignee.email,
                    full_name=assignee.full_name,
                    phone=assignee.phone,
                    avatar_url=assignee.avatar_url,
                    is_active=assignee.is_active,
                    created_at=assignee.created_at,
                    roles=[]
                )
        
        ticket_responses.append(TicketResponse(
            id=ticket.id,
            created_by=ticket.user_id,
            assigned_to=ticket.assigned_to,
            booking_id=ticket.booking_id,
            category=ticket.category,
            status=ticket.status,
            priority=ticket.priority,
            subject=ticket.subject,
            description=ticket.description,
            created_at=ticket.created_at,
            updated_at=ticket.updated_at,
            creator=creator_response,
            assignee=assignee_response,
            messages=[]
        ))
    
    total_pages = (total + page_size - 1) // page_size
    
    return TicketListResponse(
        items=ticket_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get ticket details with messages."""
    user_id = current_user.id
    user_roles = [ur.role.name for ur in current_user.roles]
    is_staff = any(r in ["admin", "support_agent"] for r in user_roles)
    
    result = await db.execute(
        select(SupportTicket).where(SupportTicket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    # Check access
    if not is_staff and ticket.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this ticket"
        )
    
    # Get messages
    messages_result = await db.execute(
        select(TicketMessage)
        .where(TicketMessage.ticket_id == ticket_id)
        .order_by(TicketMessage.created_at.asc())
    )
    messages = messages_result.scalars().all()
    
    message_responses = []
    for msg in messages:
        # Skip internal messages for non-staff
        if msg.is_internal and not is_staff:
            continue
        
        sender_result = await db.execute(
            select(User).where(User.id == msg.sender_id)
        )
        sender = sender_result.scalar_one_or_none()
        sender_response = None
        if sender:
            sender_response = UserResponse(
                id=sender.id,
                email=sender.email,
                full_name=sender.full_name,
                phone=sender.phone,
                avatar_url=sender.avatar_url,
                is_active=sender.is_active,
                created_at=sender.created_at,
                roles=[]
            )
        
        message_responses.append(TicketMessageResponse(
            id=msg.id,
            sender_id=msg.sender_id,
            message=msg.message,
            is_internal=msg.is_internal,
            created_at=msg.created_at,
            sender=sender_response
        ))
    
    # Get creator
    creator_result = await db.execute(
        select(User).where(User.id == ticket.user_id)
    )
    creator = creator_result.scalar_one_or_none()
    creator_response = None
    if creator:
        creator_response = UserResponse(
            id=creator.id,
            email=creator.email,
            full_name=creator.full_name,
            phone=creator.phone,
            avatar_url=creator.avatar_url,
            is_active=creator.is_active,
            created_at=creator.created_at,
            roles=[]
        )
    
    # Get assignee
    assignee_response = None
    if ticket.assigned_to:
        assignee_result = await db.execute(
            select(User).where(User.id == ticket.assigned_to)
        )
        assignee = assignee_result.scalar_one_or_none()
        if assignee:
            assignee_response = UserResponse(
                id=assignee.id,
                email=assignee.email,
                full_name=assignee.full_name,
                phone=assignee.phone,
                avatar_url=assignee.avatar_url,
                is_active=assignee.is_active,
                created_at=assignee.created_at,
                roles=[]
            )
    
    return TicketResponse(
        id=ticket.id,
        created_by=ticket.user_id,
        assigned_to=ticket.assigned_to,
        booking_id=ticket.booking_id,
        category=ticket.category,
        status=ticket.status,
        priority=ticket.priority,
        subject=ticket.subject,
        description=ticket.description,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        creator=creator_response,
        assignee=assignee_response,
        messages=message_responses
    )


@router.patch("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: int,
    request: TicketUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_support)
):
    """Update ticket status, priority, or assignment."""
    user_id = current_user.id
    
    result = await db.execute(
        select(SupportTicket).where(SupportTicket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    old_values = {
        "status": ticket.status,
        "priority": ticket.priority,
        "assigned_to": ticket.assigned_to
    }
    
    if request.status is not None:
        ticket.status = request.status
    if request.priority is not None:
        ticket.priority = request.priority
    if request.assigned_to is not None:
        ticket.assigned_to = request.assigned_to
    
    # Audit log
    new_values = {
        "status": ticket.status,
        "priority": ticket.priority,
        "assigned_to": ticket.assigned_to
    }
    
    if old_values != new_values:
        audit_log = AuditLog(
            actor_id=user_id,
            action="ticket.updated",
            entity_type="support_ticket",
            entity_id=ticket.id,
            old_value=old_values,
            new_value=new_values
        )
        db.add(audit_log)
    
    await db.commit()
    await db.refresh(ticket)
    
    # Get creator
    creator_result = await db.execute(
        select(User).where(User.id == ticket.user_id)
    )
    creator = creator_result.scalar_one_or_none()
    creator_response = None
    if creator:
        creator_response = UserResponse(
            id=creator.id,
            email=creator.email,
            full_name=creator.full_name,
            phone=creator.phone,
            avatar_url=creator.avatar_url,
            is_active=creator.is_active,
            created_at=creator.created_at,
            roles=[]
        )
    
    return TicketResponse(
        id=ticket.id,
        created_by=ticket.user_id,
        assigned_to=ticket.assigned_to,
        booking_id=ticket.booking_id,
        category=ticket.category,
        status=ticket.status,
        priority=ticket.priority,
        subject=ticket.subject,
        description=ticket.description,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        creator=creator_response,
        assignee=None,
        messages=[]
    )


@router.post("/{ticket_id}/messages", response_model=TicketMessageResponse, status_code=status.HTTP_201_CREATED)
async def add_ticket_message(
    ticket_id: int,
    request: TicketMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a message to a ticket."""
    user_id = current_user.id
    user_roles = [ur.role.name for ur in current_user.roles]
    is_staff = any(r in ["admin", "support_agent"] for r in user_roles)
    
    result = await db.execute(
        select(SupportTicket).where(SupportTicket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    # Check access
    if not is_staff and ticket.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to message on this ticket"
        )
    
    # Only staff can create internal messages
    is_internal = request.is_internal and is_staff
    
    message = TicketMessage(
        ticket_id=ticket_id,
        sender_id=user_id,
        message=request.message,
        is_internal=is_internal
    )
    db.add(message)
    
    # Reopen ticket if customer replies to closed ticket
    if ticket.status == TicketStatus.CLOSED.value and ticket.user_id == user_id:
        ticket.status = TicketStatus.OPEN.value
    
    await db.commit()
    await db.refresh(message)
    
    # Get sender info
    sender_result = await db.execute(
        select(User).where(User.id == user_id)
    )
    sender = sender_result.scalar_one_or_none()
    sender_response = None
    if sender:
        sender_response = UserResponse(
            id=sender.id,
            email=sender.email,
            full_name=sender.full_name,
            phone=sender.phone,
            avatar_url=sender.avatar_url,
            is_active=sender.is_active,
            created_at=sender.created_at,
            roles=[]
        )
    
    return TicketMessageResponse(
        id=message.id,
        sender_id=message.sender_id,
        message=message.message,
        is_internal=message.is_internal,
        created_at=message.created_at,
        sender=sender_response
    )


@router.post("/{ticket_id}/close", response_model=SuccessResponse)
async def close_ticket(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_support)
):
    """Close a support ticket."""
    result = await db.execute(
        select(SupportTicket).where(SupportTicket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    ticket.status = TicketStatus.CLOSED.value
    ticket.resolved_at = datetime.utcnow()
    
    await db.commit()
    
    return SuccessResponse(
        success=True,
        message="Ticket closed"
    )


