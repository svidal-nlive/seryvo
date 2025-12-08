"""Migrate to canonical status values

Revision ID: 004
Revises: 003
Create Date: 2025-12-08

This migration updates all status columns to use canonical values as defined
in app/core/enums.py and docs/Platform Canonical Definitions.md.

Legacy values are mapped to canonical values:
- Booking status: pending/searching → requested, accepted → driver_assigned, etc.
- Driver platform status: pending → pending_verification
- Vehicle status: pending → pending_approval
- Document status: pending → pending_review
- Payment status: (already mostly canonical)
- Ticket status: (already mostly canonical)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table."""
    from sqlalchemy import inspect
    bind = op.get_bind()
    inspector = inspect(bind)
    try:
        columns = [c['name'] for c in inspector.get_columns(table_name)]
        return column_name in columns
    except Exception:
        return False


def table_exists(table_name: str) -> bool:
    """Check if a table exists."""
    from sqlalchemy import inspect
    bind = op.get_bind()
    inspector = inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    # ===========================================================================
    # BOOKINGS - Migrate legacy status values to canonical
    # ===========================================================================
    # Legacy mappings based on LEGACY_STATUS_MAP in enums.py:
    # pending → requested
    # searching → requested  
    # accepted → driver_assigned
    # en_route → driver_en_route_pickup
    # arrived → driver_arrived
    # in_progress → in_progress (no change)
    # completed → completed (no change)
    # cancelled → canceled_by_system (default; more specific values should be set)
    
    if table_exists('bookings') and column_exists('bookings', 'status'):
        # Update legacy booking statuses
        op.execute("""
            UPDATE bookings SET status = 'requested' 
            WHERE status IN ('pending', 'searching')
        """)
        op.execute("""
            UPDATE bookings SET status = 'driver_assigned' 
            WHERE status = 'accepted'
        """)
        op.execute("""
            UPDATE bookings SET status = 'driver_en_route_pickup' 
            WHERE status = 'en_route'
        """)
        op.execute("""
            UPDATE bookings SET status = 'driver_arrived' 
            WHERE status = 'arrived'
        """)
        # cancelled → Use more specific cancellation status based on context
        # For now, map to canceled_by_system as default
        op.execute("""
            UPDATE bookings SET status = 'canceled_by_system' 
            WHERE status = 'cancelled'
        """)
    
    # ===========================================================================
    # DRIVER_PROFILES - Migrate platform status values
    # ===========================================================================
    # Canonical: pending_verification, inactive, active, suspended, banned
    # Legacy: pending → pending_verification
    
    if table_exists('driver_profiles') and column_exists('driver_profiles', 'status'):
        op.execute("""
            UPDATE driver_profiles SET status = 'pending_verification' 
            WHERE status = 'pending'
        """)
    
    # Availability status should already be canonical:
    # offline, available, on_trip, on_break
    # But check for any legacy 'online' value
    if table_exists('driver_profiles') and column_exists('driver_profiles', 'availability_status'):
        op.execute("""
            UPDATE driver_profiles SET availability_status = 'available' 
            WHERE availability_status = 'online'
        """)
    
    # ===========================================================================
    # VEHICLES - Migrate status values
    # ===========================================================================
    # Canonical: pending_approval, approved, rejected, inactive
    # Legacy: pending → pending_approval
    
    if table_exists('vehicles') and column_exists('vehicles', 'status'):
        op.execute("""
            UPDATE vehicles SET status = 'pending_approval' 
            WHERE status = 'pending'
        """)
        op.execute("""
            UPDATE vehicles SET status = 'approved' 
            WHERE status = 'active'
        """)
    
    # ===========================================================================
    # DRIVER_DOCUMENTS - Migrate status values
    # ===========================================================================
    # Canonical: pending_review, approved, rejected, expired
    # Legacy: pending → pending_review
    
    if table_exists('driver_documents') and column_exists('driver_documents', 'status'):
        op.execute("""
            UPDATE driver_documents SET status = 'pending_review' 
            WHERE status = 'pending'
        """)
    
    # ===========================================================================
    # PAYMENTS - Migrate status values (if status column exists)
    # ===========================================================================
    # Canonical: pending, processing, captured, completed, failed, cancelled, 
    #            refunded, partially_refunded
    # The 003 migration may have dropped 'status' in favor of 'payment_status'
    
    if table_exists('payments'):
        # Check both possible column names
        if column_exists('payments', 'payment_status'):
            # Normalize any legacy values
            op.execute("""
                UPDATE payments SET payment_status = 'cancelled' 
                WHERE payment_status = 'canceled'
            """)
        elif column_exists('payments', 'status'):
            op.execute("""
                UPDATE payments SET status = 'cancelled' 
                WHERE status = 'canceled'
            """)
    
    # ===========================================================================
    # DRIVER_PAYOUTS - Migrate status values
    # ===========================================================================
    # Canonical: pending, processing, completed, failed
    # The 003 migration may have dropped 'status' in favor of 'payout_status'
    
    if table_exists('driver_payouts'):
        if column_exists('driver_payouts', 'payout_status'):
            # Normalize any variations
            op.execute("""
                UPDATE driver_payouts SET payout_status = 'completed' 
                WHERE payout_status = 'paid'
            """)
        elif column_exists('driver_payouts', 'status'):
            op.execute("""
                UPDATE driver_payouts SET status = 'completed' 
                WHERE status = 'paid'
            """)
    
    # ===========================================================================
    # SUPPORT_TICKETS - Migrate status values
    # ===========================================================================
    # Canonical: open, in_progress, waiting_on_client, waiting_on_driver,
    #            resolved, closed, escalated
    # Should already be mostly canonical, but normalize any variations
    
    if table_exists('support_tickets') and column_exists('support_tickets', 'status'):
        op.execute("""
            UPDATE support_tickets SET status = 'in_progress' 
            WHERE status = 'in-progress'
        """)
        op.execute("""
            UPDATE support_tickets SET status = 'waiting_on_client' 
            WHERE status IN ('waiting_client', 'pending_client')
        """)
        op.execute("""
            UPDATE support_tickets SET status = 'waiting_on_driver' 
            WHERE status IN ('waiting_driver', 'pending_driver')
        """)


def downgrade() -> None:
    """Revert canonical statuses to legacy values.
    
    Note: This is a lossy operation. Some canonical values (like specific
    cancellation reasons) will be collapsed back to generic legacy values.
    """
    
    # ===========================================================================
    # BOOKINGS - Revert to legacy status values
    # ===========================================================================
    if table_exists('bookings') and column_exists('bookings', 'status'):
        op.execute("""
            UPDATE bookings SET status = 'pending' 
            WHERE status = 'requested'
        """)
        op.execute("""
            UPDATE bookings SET status = 'accepted' 
            WHERE status = 'driver_assigned'
        """)
        op.execute("""
            UPDATE bookings SET status = 'en_route' 
            WHERE status = 'driver_en_route_pickup'
        """)
        op.execute("""
            UPDATE bookings SET status = 'arrived' 
            WHERE status = 'driver_arrived'
        """)
        # All cancellation types back to generic 'cancelled'
        op.execute("""
            UPDATE bookings SET status = 'cancelled' 
            WHERE status IN ('canceled_by_client', 'canceled_by_driver', 
                           'canceled_by_system', 'no_show_client', 'no_show_driver')
        """)
    
    # ===========================================================================
    # DRIVER_PROFILES - Revert platform status
    # ===========================================================================
    if table_exists('driver_profiles') and column_exists('driver_profiles', 'status'):
        op.execute("""
            UPDATE driver_profiles SET status = 'pending' 
            WHERE status = 'pending_verification'
        """)
    
    if table_exists('driver_profiles') and column_exists('driver_profiles', 'availability_status'):
        op.execute("""
            UPDATE driver_profiles SET availability_status = 'online' 
            WHERE availability_status = 'available'
        """)
    
    # ===========================================================================
    # VEHICLES - Revert status
    # ===========================================================================
    if table_exists('vehicles') and column_exists('vehicles', 'status'):
        op.execute("""
            UPDATE vehicles SET status = 'pending' 
            WHERE status = 'pending_approval'
        """)
        op.execute("""
            UPDATE vehicles SET status = 'active' 
            WHERE status = 'approved'
        """)
    
    # ===========================================================================
    # DRIVER_DOCUMENTS - Revert status
    # ===========================================================================
    if table_exists('driver_documents') and column_exists('driver_documents', 'status'):
        op.execute("""
            UPDATE driver_documents SET status = 'pending' 
            WHERE status = 'pending_review'
        """)
    
    # ===========================================================================
    # PAYMENTS - Revert status
    # ===========================================================================
    if table_exists('payments'):
        if column_exists('payments', 'payment_status'):
            op.execute("""
                UPDATE payments SET payment_status = 'canceled' 
                WHERE payment_status = 'cancelled'
            """)
        elif column_exists('payments', 'status'):
            op.execute("""
                UPDATE payments SET status = 'canceled' 
                WHERE status = 'cancelled'
            """)
    
    # ===========================================================================
    # DRIVER_PAYOUTS - Revert status
    # ===========================================================================
    if table_exists('driver_payouts'):
        if column_exists('driver_payouts', 'payout_status'):
            op.execute("""
                UPDATE driver_payouts SET payout_status = 'paid' 
                WHERE payout_status = 'completed'
            """)
        elif column_exists('driver_payouts', 'status'):
            op.execute("""
                UPDATE driver_payouts SET status = 'paid' 
                WHERE status = 'completed'
            """)
    
    # ===========================================================================
    # SUPPORT_TICKETS - Revert status
    # ===========================================================================
    if table_exists('support_tickets') and column_exists('support_tickets', 'status'):
        op.execute("""
            UPDATE support_tickets SET status = 'in-progress' 
            WHERE status = 'in_progress'
        """)
