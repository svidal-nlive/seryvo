"""sync schema with models

Revision ID: 003
Revises: 002
Create Date: 2025-12-06

This migration ensures all database columns match the SQLAlchemy models.
Handles both fresh installs and updates to existing databases.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table."""
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    # ===== regions: add missing columns =====
    if not column_exists('regions', 'description'):
        op.add_column('regions', sa.Column('description', sa.Text(), nullable=True))
    if not column_exists('regions', 'geojson'):
        op.add_column('regions', sa.Column('geojson', sa.JSON(), nullable=True))
    if not column_exists('regions', 'created_at'):
        op.add_column('regions', sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))

    # ===== driver_profiles: add preferred_region_id =====
    if not column_exists('driver_profiles', 'preferred_region_id'):
        op.add_column('driver_profiles', sa.Column('preferred_region_id', sa.Integer(), sa.ForeignKey('regions.id'), nullable=True))

    # ===== client_profiles: add missing columns =====
    if not column_exists('client_profiles', 'default_language'):
        op.add_column('client_profiles', sa.Column('default_language', sa.String(10), nullable=True))
    if not column_exists('client_profiles', 'notes'):
        op.add_column('client_profiles', sa.Column('notes', sa.Text(), nullable=True))

    # ===== driver_documents: rename document_type to doc_type if needed =====
    if column_exists('driver_documents', 'document_type') and not column_exists('driver_documents', 'doc_type'):
        op.alter_column('driver_documents', 'document_type', new_column_name='doc_type')

    # ===== surge_rules: add time-based columns =====
    if not column_exists('surge_rules', 'time_start'):
        op.add_column('surge_rules', sa.Column('time_start', sa.String(10), nullable=True))
    if not column_exists('surge_rules', 'time_end'):
        op.add_column('surge_rules', sa.Column('time_end', sa.String(10), nullable=True))
    if not column_exists('surge_rules', 'days_of_week'):
        op.add_column('surge_rules', sa.Column('days_of_week', sa.String(50), nullable=True))

    # ===== promotions: add missing columns =====
    if not column_exists('promotions', 'max_uses'):
        op.add_column('promotions', sa.Column('max_uses', sa.Integer(), nullable=True))
    if not column_exists('promotions', 'max_uses_per_user'):
        op.add_column('promotions', sa.Column('max_uses_per_user', sa.Integer(), nullable=True))
    if not column_exists('promotions', 'starts_at'):
        op.add_column('promotions', sa.Column('starts_at', sa.DateTime(timezone=True), nullable=True))
    if not column_exists('promotions', 'ends_at'):
        op.add_column('promotions', sa.Column('ends_at', sa.DateTime(timezone=True), nullable=True))

    # ===== audit_logs: add missing columns =====
    if not column_exists('audit_logs', 'actor_id'):
        op.add_column('audit_logs', sa.Column('actor_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True))
    if not column_exists('audit_logs', 'old_value'):
        op.add_column('audit_logs', sa.Column('old_value', sa.JSON(), nullable=True))
    if not column_exists('audit_logs', 'new_value'):
        op.add_column('audit_logs', sa.Column('new_value', sa.JSON(), nullable=True))

    # ===== payments: add missing columns =====
    if not column_exists('payments', 'payment_method'):
        op.add_column('payments', sa.Column('payment_method', sa.String(50), nullable=True))
    if not column_exists('payments', 'payment_status'):
        op.add_column('payments', sa.Column('payment_status', sa.String(50), server_default='pending', nullable=True))
    if not column_exists('payments', 'stripe_charge_id'):
        op.add_column('payments', sa.Column('stripe_charge_id', sa.String(255), nullable=True))
    if not column_exists('payments', 'failure_reason'):
        op.add_column('payments', sa.Column('failure_reason', sa.Text(), nullable=True))
    if not column_exists('payments', 'completed_at'):
        op.add_column('payments', sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True))

    # ===== driver_payouts: add missing columns =====
    if not column_exists('driver_payouts', 'payout_status'):
        op.add_column('driver_payouts', sa.Column('payout_status', sa.String(50), server_default='pending', nullable=True))
    if not column_exists('driver_payouts', 'stripe_transfer_id'):
        op.add_column('driver_payouts', sa.Column('stripe_transfer_id', sa.String(255), nullable=True))
    if not column_exists('driver_payouts', 'bookings_count'):
        op.add_column('driver_payouts', sa.Column('bookings_count', sa.Integer(), server_default='0', nullable=True))
    if not column_exists('driver_payouts', 'failure_reason'):
        op.add_column('driver_payouts', sa.Column('failure_reason', sa.Text(), nullable=True))
    if not column_exists('driver_payouts', 'completed_at'):
        op.add_column('driver_payouts', sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True))

    # ===== promotion_redemptions: rename if needed =====
    if not column_exists('promotion_redemptions', 'discount_amount') and column_exists('promotion_redemptions', 'discount_applied'):
        op.alter_column('promotion_redemptions', 'discount_applied', new_column_name='discount_amount')
    if not column_exists('promotion_redemptions', 'redeemed_at') and column_exists('promotion_redemptions', 'created_at'):
        # Add redeemed_at as alias for created_at functionality
        pass  # created_at serves this purpose

    # ===== surcharges: create if not exists =====
    bind = op.get_bind()
    inspector = inspect(bind)
    if 'surcharges' not in inspector.get_table_names():
        op.create_table('surcharges',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('name', sa.String(100), nullable=False),
            sa.Column('surcharge_type', sa.String(50), nullable=False),
            sa.Column('amount', sa.Numeric(10, 2), nullable=False, default=0),
            sa.Column('is_percentage', sa.Boolean(), nullable=False, default=False),
            sa.Column('location_keywords', sa.Text(), nullable=True),
            sa.Column('applies_to_service_types', sa.String(255), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # ===== saved_locations: create if not exists =====
    if 'saved_locations' not in inspector.get_table_names():
        op.create_table('saved_locations',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('client_id', sa.Integer(), sa.ForeignKey('client_profiles.user_id', ondelete='CASCADE'), nullable=False),
            sa.Column('label', sa.String(50), nullable=False),
            sa.Column('address_line1', sa.String(255), nullable=True),
            sa.Column('address_line2', sa.String(255), nullable=True),
            sa.Column('city', sa.String(100), nullable=True),
            sa.Column('state', sa.String(100), nullable=True),
            sa.Column('postal_code', sa.String(50), nullable=True),
            sa.Column('country', sa.String(100), nullable=True),
            sa.Column('latitude', sa.Numeric(10, 7), nullable=True),
            sa.Column('longitude', sa.Numeric(10, 7), nullable=True),
            sa.Column('is_default', sa.Boolean(), nullable=False, default=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )


def downgrade() -> None:
    # Drop added columns (reverse order)
    op.drop_column('driver_payouts', 'completed_at')
    op.drop_column('driver_payouts', 'failure_reason')
    op.drop_column('driver_payouts', 'bookings_count')
    op.drop_column('driver_payouts', 'stripe_transfer_id')
    op.drop_column('driver_payouts', 'payout_status')
    
    op.drop_column('payments', 'completed_at')
    op.drop_column('payments', 'failure_reason')
    op.drop_column('payments', 'stripe_charge_id')
    op.drop_column('payments', 'payment_status')
    op.drop_column('payments', 'payment_method')
    
    op.drop_column('audit_logs', 'new_value')
    op.drop_column('audit_logs', 'old_value')
    op.drop_column('audit_logs', 'actor_id')
    
    op.drop_column('promotions', 'ends_at')
    op.drop_column('promotions', 'starts_at')
    op.drop_column('promotions', 'max_uses_per_user')
    op.drop_column('promotions', 'max_uses')
    
    op.drop_column('surge_rules', 'days_of_week')
    op.drop_column('surge_rules', 'time_end')
    op.drop_column('surge_rules', 'time_start')
    
    op.alter_column('driver_documents', 'doc_type', new_column_name='document_type')
    
    op.drop_column('client_profiles', 'notes')
    op.drop_column('client_profiles', 'default_language')
    
    op.drop_column('driver_profiles', 'preferred_region_id')
    
    op.drop_column('regions', 'created_at')
    op.drop_column('regions', 'geojson')
    op.drop_column('regions', 'description')
    
    op.drop_table('saved_locations')
    op.drop_table('surcharges')
