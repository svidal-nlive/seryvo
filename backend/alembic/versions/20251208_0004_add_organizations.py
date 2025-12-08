"""Add multi-tenancy organization tables

Revision ID: 005
Revises: 004
Create Date: 2025-12-08

This migration adds multi-tenancy support through Organizations.
- Creates organizations table for tenant management
- Creates organization_members table for user-org relationships
- Adds organization_id foreign key to bookings, regions, pricing_rules, 
  support_tickets, and promotions
- Creates default organization and migrates existing data
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '005'
down_revision: Union[str, None] = '004'
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
    # Create Organizations Table
    # ===========================================================================
    op.create_table('organizations',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('slug', sa.String(50), nullable=False, unique=True, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('logo_url', sa.String(500), nullable=True),
        sa.Column('primary_color', sa.String(7), nullable=True),
        sa.Column('secondary_color', sa.String(7), nullable=True),
        sa.Column('timezone', sa.String(50), nullable=False, server_default='UTC'),
        sa.Column('currency', sa.String(3), nullable=False, server_default='USD'),
        sa.Column('country_code', sa.String(2), nullable=True),
        sa.Column('phone_prefix', sa.String(10), nullable=True),
        sa.Column('contact_email', sa.String(255), nullable=True),
        sa.Column('contact_phone', sa.String(50), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('subscription_tier', sa.String(50), nullable=False, server_default='starter'),
        sa.Column('max_drivers', sa.Integer(), nullable=True),
        sa.Column('max_bookings_per_month', sa.Integer(), nullable=True),
        sa.Column('features', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('suspended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('suspension_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    
    # ===========================================================================
    # Create Organization Members Table
    # ===========================================================================
    op.create_table('organization_members',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('role', sa.String(50), nullable=False),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('invited_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
    )
    op.create_index('ix_org_members_unique', 'organization_members', ['organization_id', 'user_id'], unique=True)
    
    # ===========================================================================
    # Add organization_id to existing tables
    # ===========================================================================
    
    # Bookings
    if not column_exists('bookings', 'organization_id'):
        op.add_column('bookings', sa.Column('organization_id', sa.Integer(), nullable=True))
        op.create_index('ix_bookings_organization_id', 'bookings', ['organization_id'])
        op.create_foreign_key(
            'fk_bookings_organization_id', 'bookings', 'organizations',
            ['organization_id'], ['id'], ondelete='SET NULL'
        )
    
    # Regions
    if not column_exists('regions', 'organization_id'):
        op.add_column('regions', sa.Column('organization_id', sa.Integer(), nullable=True))
        op.create_index('ix_regions_organization_id', 'regions', ['organization_id'])
        op.create_foreign_key(
            'fk_regions_organization_id', 'regions', 'organizations',
            ['organization_id'], ['id'], ondelete='SET NULL'
        )
    
    # Pricing Rules
    if not column_exists('pricing_rules', 'organization_id'):
        op.add_column('pricing_rules', sa.Column('organization_id', sa.Integer(), nullable=True))
        op.create_index('ix_pricing_rules_organization_id', 'pricing_rules', ['organization_id'])
        op.create_foreign_key(
            'fk_pricing_rules_organization_id', 'pricing_rules', 'organizations',
            ['organization_id'], ['id'], ondelete='SET NULL'
        )
    
    # Support Tickets
    if not column_exists('support_tickets', 'organization_id'):
        op.add_column('support_tickets', sa.Column('organization_id', sa.Integer(), nullable=True))
        op.create_index('ix_support_tickets_organization_id', 'support_tickets', ['organization_id'])
        op.create_foreign_key(
            'fk_support_tickets_organization_id', 'support_tickets', 'organizations',
            ['organization_id'], ['id'], ondelete='SET NULL'
        )
    
    # Promotions
    if not column_exists('promotions', 'organization_id'):
        op.add_column('promotions', sa.Column('organization_id', sa.Integer(), nullable=True))
        op.create_index('ix_promotions_organization_id', 'promotions', ['organization_id'])
        op.create_foreign_key(
            'fk_promotions_organization_id', 'promotions', 'organizations',
            ['organization_id'], ['id'], ondelete='SET NULL'
        )
    
    # ===========================================================================
    # Create Default Organization and Migrate Existing Data
    # ===========================================================================
    
    # Insert default organization
    op.execute("""
        INSERT INTO organizations (slug, name, subscription_tier, is_active)
        VALUES ('default', 'Default Organization', 'enterprise', true)
    """)
    
    # Migrate all existing data to default organization
    op.execute("""
        UPDATE bookings SET organization_id = (SELECT id FROM organizations WHERE slug = 'default')
        WHERE organization_id IS NULL
    """)
    
    op.execute("""
        UPDATE regions SET organization_id = (SELECT id FROM organizations WHERE slug = 'default')
        WHERE organization_id IS NULL
    """)
    
    op.execute("""
        UPDATE pricing_rules SET organization_id = (SELECT id FROM organizations WHERE slug = 'default')
        WHERE organization_id IS NULL
    """)
    
    op.execute("""
        UPDATE support_tickets SET organization_id = (SELECT id FROM organizations WHERE slug = 'default')
        WHERE organization_id IS NULL
    """)
    
    op.execute("""
        UPDATE promotions SET organization_id = (SELECT id FROM organizations WHERE slug = 'default')
        WHERE organization_id IS NULL
    """)
    
    # Add all existing users as members of the default organization
    op.execute("""
        INSERT INTO organization_members (organization_id, user_id, role, is_primary, is_active)
        SELECT 
            (SELECT id FROM organizations WHERE slug = 'default'),
            u.id,
            COALESCE(
                (SELECT r.name FROM user_roles ur 
                 JOIN roles r ON ur.role_id = r.id 
                 WHERE ur.user_id = u.id 
                 LIMIT 1),
                'client'
            ),
            true,
            true
        FROM users u
    """)


def downgrade() -> None:
    # ===========================================================================
    # Remove organization_id from tables
    # ===========================================================================
    
    # Promotions
    if column_exists('promotions', 'organization_id'):
        op.drop_constraint('fk_promotions_organization_id', 'promotions', type_='foreignkey')
        op.drop_index('ix_promotions_organization_id', table_name='promotions')
        op.drop_column('promotions', 'organization_id')
    
    # Support Tickets
    if column_exists('support_tickets', 'organization_id'):
        op.drop_constraint('fk_support_tickets_organization_id', 'support_tickets', type_='foreignkey')
        op.drop_index('ix_support_tickets_organization_id', table_name='support_tickets')
        op.drop_column('support_tickets', 'organization_id')
    
    # Pricing Rules
    if column_exists('pricing_rules', 'organization_id'):
        op.drop_constraint('fk_pricing_rules_organization_id', 'pricing_rules', type_='foreignkey')
        op.drop_index('ix_pricing_rules_organization_id', table_name='pricing_rules')
        op.drop_column('pricing_rules', 'organization_id')
    
    # Regions
    if column_exists('regions', 'organization_id'):
        op.drop_constraint('fk_regions_organization_id', 'regions', type_='foreignkey')
        op.drop_index('ix_regions_organization_id', table_name='regions')
        op.drop_column('regions', 'organization_id')
    
    # Bookings
    if column_exists('bookings', 'organization_id'):
        op.drop_constraint('fk_bookings_organization_id', 'bookings', type_='foreignkey')
        op.drop_index('ix_bookings_organization_id', table_name='bookings')
        op.drop_column('bookings', 'organization_id')
    
    # ===========================================================================
    # Drop Organization Tables
    # ===========================================================================
    
    if table_exists('organization_members'):
        op.drop_index('ix_org_members_unique', table_name='organization_members')
        op.drop_table('organization_members')
    
    if table_exists('organizations'):
        op.drop_table('organizations')
