"""initial schema

Revision ID: 001
Revises: 
Create Date: 2025-12-03

This migration creates the initial Seryvo platform database schema.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ===== Core RBAC Tables =====
    op.create_table('roles',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(50), nullable=False, unique=True),
        sa.Column('description', sa.Text(), nullable=True),
    )
    
    op.create_table('permissions',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(100), nullable=False, unique=True),
        sa.Column('description', sa.Text(), nullable=True),
    )
    
    op.create_table('role_permissions',
        sa.Column('role_id', sa.Integer(), sa.ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('permission_id', sa.Integer(), sa.ForeignKey('permissions.id', ondelete='CASCADE'), primary_key=True),
    )
    
    # ===== Users Table =====
    op.create_table('users',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True, index=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('avatar_url', sa.String(500), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    
    op.create_table('user_roles',
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('role_id', sa.Integer(), sa.ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True),
    )
    
    # ===== Service Types Table =====
    op.create_table('service_types',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('code', sa.String(50), nullable=False, unique=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('base_capacity', sa.Integer(), nullable=False, default=4),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
    )
    
    # ===== Regions Table =====
    op.create_table('regions',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('code', sa.String(50), nullable=False, unique=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('timezone', sa.String(50), nullable=True),
        sa.Column('currency', sa.String(3), nullable=False, default='USD'),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
    )
    
    # ===== Driver Profiles =====
    op.create_table('driver_profiles',
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('status', sa.String(50), nullable=False, default='pending'),
        sa.Column('availability_status', sa.String(50), nullable=False, default='offline'),
        sa.Column('current_lat', sa.Numeric(10, 7), nullable=True),
        sa.Column('current_lng', sa.Numeric(10, 7), nullable=True),
        sa.Column('location_updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rating_average', sa.Numeric(3, 2), nullable=True),
        sa.Column('total_ratings', sa.Integer(), nullable=True, default=0),
        sa.Column('total_trips', sa.Integer(), nullable=True, default=0),
        sa.Column('acceptance_rate', sa.Numeric(5, 2), nullable=True),
        sa.Column('cancellation_rate', sa.Numeric(5, 2), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    
    # ===== Client Profiles =====
    op.create_table('client_profiles',
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('default_payment_method_id', sa.Integer(), nullable=True),
        sa.Column('default_currency', sa.String(3), nullable=False, default='USD'),
        sa.Column('rating_average', sa.Numeric(3, 2), nullable=True),
        sa.Column('total_trips', sa.Integer(), nullable=True, default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    
    # ===== Vehicles =====
    op.create_table('vehicles',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('driver_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('service_type_id', sa.Integer(), sa.ForeignKey('service_types.id'), nullable=True),
        sa.Column('make', sa.String(100), nullable=True),
        sa.Column('model', sa.String(100), nullable=True),
        sa.Column('year', sa.Integer(), nullable=True),
        sa.Column('color', sa.String(50), nullable=True),
        sa.Column('license_plate', sa.String(50), nullable=True),
        sa.Column('capacity', sa.Integer(), nullable=False, default=4),
        sa.Column('status', sa.String(50), nullable=False, default='pending'),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    
    # ===== Driver Documents =====
    op.create_table('driver_documents',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('driver_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('document_type', sa.String(100), nullable=False),
        sa.Column('file_url', sa.String(500), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, default='pending'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reviewed_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    
    # ===== Bookings =====
    op.create_table('bookings',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('client_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('driver_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('service_type_id', sa.Integer(), sa.ForeignKey('service_types.id'), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, default='requested'),
        sa.Column('is_asap', sa.Boolean(), nullable=False, default=True),
        sa.Column('pickup_address', sa.String(500), nullable=False),
        sa.Column('pickup_lat', sa.Numeric(10, 7), nullable=True),
        sa.Column('pickup_lng', sa.Numeric(10, 7), nullable=True),
        sa.Column('dropoff_address', sa.String(500), nullable=False),
        sa.Column('dropoff_lat', sa.Numeric(10, 7), nullable=True),
        sa.Column('dropoff_lng', sa.Numeric(10, 7), nullable=True),
        sa.Column('requested_pickup_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('passenger_count', sa.Integer(), nullable=False, default=1),
        sa.Column('luggage_count', sa.Integer(), nullable=False, default=0),
        sa.Column('special_notes', sa.Text(), nullable=True),
        sa.Column('estimated_distance_km', sa.Numeric(10, 2), nullable=True),
        sa.Column('estimated_duration_min', sa.Integer(), nullable=True),
        sa.Column('base_fare', sa.Numeric(10, 2), nullable=True),
        sa.Column('distance_fare', sa.Numeric(10, 2), nullable=True),
        sa.Column('time_fare', sa.Numeric(10, 2), nullable=True),
        sa.Column('surge_multiplier', sa.Numeric(5, 2), nullable=True),
        sa.Column('extras_total', sa.Numeric(10, 2), nullable=True),
        sa.Column('tax_total', sa.Numeric(10, 2), nullable=True),
        sa.Column('discount_total', sa.Numeric(10, 2), nullable=True),
        sa.Column('final_fare', sa.Numeric(10, 2), nullable=True),
        sa.Column('driver_earnings', sa.Numeric(10, 2), nullable=True),
        sa.Column('platform_fee', sa.Numeric(10, 2), nullable=True),
        sa.Column('client_rating', sa.Integer(), nullable=True),
        sa.Column('client_feedback', sa.Text(), nullable=True),
        sa.Column('driver_rating', sa.Integer(), nullable=True),
        sa.Column('driver_feedback', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index('ix_bookings_client_id', 'bookings', ['client_id'])
    op.create_index('ix_bookings_driver_id', 'bookings', ['driver_id'])
    op.create_index('ix_bookings_status', 'bookings', ['status'])
    
    # ===== Booking Stops (for multi-stop trips) =====
    op.create_table('booking_stops',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('booking_id', sa.Integer(), sa.ForeignKey('bookings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sequence', sa.Integer(), nullable=False),
        sa.Column('address', sa.String(500), nullable=False),
        sa.Column('lat', sa.Numeric(10, 7), nullable=True),
        sa.Column('lng', sa.Numeric(10, 7), nullable=True),
        sa.Column('stop_type', sa.String(50), nullable=False),
        sa.Column('arrived_at', sa.DateTime(timezone=True), nullable=True),
    )
    
    # ===== Booking Events (timeline) =====
    op.create_table('booking_events',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('booking_id', sa.Integer(), sa.ForeignKey('bookings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('event_type', sa.String(100), nullable=False),
        sa.Column('actor_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    
    # ===== Payments =====
    op.create_table('payment_methods',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('method_type', sa.String(50), nullable=False),
        sa.Column('last_four', sa.String(4), nullable=True),
        sa.Column('brand', sa.String(50), nullable=True),
        sa.Column('exp_month', sa.Integer(), nullable=True),
        sa.Column('exp_year', sa.Integer(), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=False, default=False),
        sa.Column('stripe_payment_method_id', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    
    op.create_table('payments',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('booking_id', sa.Integer(), sa.ForeignKey('bookings.id'), nullable=False),
        sa.Column('payment_method_id', sa.Integer(), sa.ForeignKey('payment_methods.id'), nullable=True),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, default='USD'),
        sa.Column('status', sa.String(50), nullable=False, default='pending'),
        sa.Column('stripe_payment_intent_id', sa.String(255), nullable=True),
        sa.Column('refund_amount', sa.Numeric(10, 2), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    
    op.create_table('driver_payouts',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('driver_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, default='USD'),
        sa.Column('status', sa.String(50), nullable=False, default='pending'),
        sa.Column('period_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    
    # ===== Promotions =====
    op.create_table('promotions',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('code', sa.String(50), nullable=False, unique=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('discount_type', sa.String(50), nullable=False),
        sa.Column('discount_value', sa.Numeric(10, 2), nullable=False),
        sa.Column('max_discount', sa.Numeric(10, 2), nullable=True),
        sa.Column('min_fare', sa.Numeric(10, 2), nullable=True),
        sa.Column('usage_limit', sa.Integer(), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=False, default=0),
        sa.Column('valid_from', sa.DateTime(timezone=True), nullable=True),
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    
    op.create_table('promotion_redemptions',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('promotion_id', sa.Integer(), sa.ForeignKey('promotions.id'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('booking_id', sa.Integer(), sa.ForeignKey('bookings.id'), nullable=True),
        sa.Column('discount_applied', sa.Numeric(10, 2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    
    # ===== Pricing =====
    op.create_table('pricing_rules',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('service_type_id', sa.Integer(), sa.ForeignKey('service_types.id'), nullable=True),
        sa.Column('region_id', sa.Integer(), sa.ForeignKey('regions.id'), nullable=True),
        sa.Column('base_fare', sa.Numeric(10, 2), nullable=False),
        sa.Column('per_km', sa.Numeric(10, 2), nullable=False),
        sa.Column('per_minute', sa.Numeric(10, 2), nullable=False),
        sa.Column('minimum_fare', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, default='USD'),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    
    op.create_table('surge_rules',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('region_id', sa.Integer(), sa.ForeignKey('regions.id'), nullable=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('multiplier', sa.Numeric(5, 2), nullable=False),
        sa.Column('condition_type', sa.String(50), nullable=True),
        sa.Column('condition_value', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('valid_from', sa.DateTime(timezone=True), nullable=True),
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    
    # ===== Support =====
    op.create_table('support_tickets',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('booking_id', sa.Integer(), sa.ForeignKey('bookings.id'), nullable=True),
        sa.Column('assigned_to', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('priority', sa.String(50), nullable=False, default='medium'),
        sa.Column('status', sa.String(50), nullable=False, default='open'),
        sa.Column('subject', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    
    # ===== Messaging =====
    op.create_table('conversations',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('booking_id', sa.Integer(), sa.ForeignKey('bookings.id'), nullable=True),
        sa.Column('ticket_id', sa.Integer(), sa.ForeignKey('support_tickets.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    
    op.create_table('conversation_participants',
        sa.Column('conversation_id', sa.Integer(), sa.ForeignKey('conversations.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('last_read_at', sa.DateTime(timezone=True), nullable=True),
    )
    
    op.create_table('messages',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('conversation_id', sa.Integer(), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sender_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_system', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    
    # ===== Audit Logs =====
    op.create_table('audit_logs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('entity_type', sa.String(100), nullable=True),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('old_values', sa.JSON(), nullable=True),
        sa.Column('new_values', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_audit_logs_entity', 'audit_logs', ['entity_type', 'entity_id'])
    
    # ===== Saved Addresses =====
    op.create_table('saved_addresses',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('label', sa.String(100), nullable=False),
        sa.Column('address', sa.String(500), nullable=False),
        sa.Column('lat', sa.Numeric(10, 7), nullable=True),
        sa.Column('lng', sa.Numeric(10, 7), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('saved_addresses')
    op.drop_index('ix_audit_logs_entity', table_name='audit_logs')
    op.drop_table('audit_logs')
    op.drop_table('messages')
    op.drop_table('conversation_participants')
    op.drop_table('conversations')
    op.drop_table('support_tickets')
    op.drop_table('surge_rules')
    op.drop_table('pricing_rules')
    op.drop_table('promotion_redemptions')
    op.drop_table('promotions')
    op.drop_table('driver_payouts')
    op.drop_table('payments')
    op.drop_table('payment_methods')
    op.drop_table('booking_events')
    op.drop_table('booking_stops')
    op.drop_index('ix_bookings_status', table_name='bookings')
    op.drop_index('ix_bookings_driver_id', table_name='bookings')
    op.drop_index('ix_bookings_client_id', table_name='bookings')
    op.drop_table('bookings')
    op.drop_table('driver_documents')
    op.drop_table('vehicles')
    op.drop_table('client_profiles')
    op.drop_table('driver_profiles')
    op.drop_table('regions')
    op.drop_table('service_types')
    op.drop_table('user_roles')
    op.drop_table('users')
    op.drop_table('role_permissions')
    op.drop_table('permissions')
    op.drop_table('roles')
