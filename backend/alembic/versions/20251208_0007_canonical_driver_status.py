"""Standardize driver and document status values to canonical enums

Revision ID: 007
Revises: 006
Create Date: 2025-12-08

This migration updates status values to use canonical enum values:
- driver_profiles.status: 'pending' -> 'pending_verification', 'approved' -> 'active'
- vehicles.status: 'pending' -> 'pending_approval', 'approved' -> 'approved' (already correct)
- driver_documents.status: 'pending' -> 'pending_review'
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '007'
down_revision: Union[str, None] = '006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Update status values to use canonical enum values."""
    # Driver Profiles
    op.execute("""
        UPDATE driver_profiles 
        SET status = 'pending_verification' 
        WHERE status = 'pending'
    """)
    op.execute("""
        UPDATE driver_profiles 
        SET status = 'active' 
        WHERE status = 'approved'
    """)
    
    # Vehicles
    op.execute("""
        UPDATE vehicles 
        SET status = 'pending_approval' 
        WHERE status = 'pending'
    """)
    
    # Driver Documents
    op.execute("""
        UPDATE driver_documents 
        SET status = 'pending_review' 
        WHERE status = 'pending'
    """)


def downgrade() -> None:
    """Revert to legacy status values."""
    # Driver Profiles
    op.execute("""
        UPDATE driver_profiles 
        SET status = 'pending' 
        WHERE status = 'pending_verification'
    """)
    op.execute("""
        UPDATE driver_profiles 
        SET status = 'approved' 
        WHERE status = 'active'
    """)
    
    # Vehicles
    op.execute("""
        UPDATE vehicles 
        SET status = 'pending' 
        WHERE status = 'pending_approval'
    """)
    
    # Driver Documents
    op.execute("""
        UPDATE driver_documents 
        SET status = 'pending' 
        WHERE status = 'pending_review'
    """)
