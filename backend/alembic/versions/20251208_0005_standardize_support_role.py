"""Standardize support role naming to support_agent

Revision ID: 006
Revises: 005
Create Date: 2025-12-08

This migration standardizes the support role naming:
- Changes 'support' to 'support_agent' in the roles table
- Ensures frontend and backend use the same value
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '006'
down_revision: Union[str, None] = '005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Change 'support' role to 'support_agent' for consistency with frontend."""
    # Update the role name in the roles table
    op.execute("""
        UPDATE roles 
        SET name = 'support_agent' 
        WHERE name = 'support'
    """)
    
    # Update description to be clearer
    op.execute("""
        UPDATE roles 
        SET description = 'Customer support agent with ticket management access'
        WHERE name = 'support_agent'
    """)


def downgrade() -> None:
    """Revert to 'support' role name."""
    op.execute("""
        UPDATE roles 
        SET name = 'support' 
        WHERE name = 'support_agent'
    """)
    
    op.execute("""
        UPDATE roles 
        SET description = 'Customer support staff'
        WHERE name = 'support'
    """)
