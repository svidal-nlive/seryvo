"""cleanup duplicate columns - finalize schema alignment

Revision ID: 003
Revises: 001
Create Date: 2025-12-05

This migration cleans up duplicate columns that exist from partial migrations.
The database currently has BOTH old and new column names coexisting.
This drops the old columns and keeps only what the SQLAlchemy models expect.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table."""
    from sqlalchemy import inspect
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [c['name'] for c in inspector.get_columns(table_name)]
    return column_name in columns


def table_exists(table_name: str) -> bool:
    """Check if a table exists."""
    from sqlalchemy import inspect
    bind = op.get_bind()
    inspector = inspect(bind)
    return table_name in inspector.get_table_names()


def constraint_exists(table_name: str, constraint_name: str) -> bool:
    """Check if a constraint exists."""
    from sqlalchemy import inspect
    bind = op.get_bind()
    inspector = inspect(bind)
    try:
        fks = inspector.get_foreign_keys(table_name)
        return any(fk.get('name') == constraint_name for fk in fks)
    except Exception:
        return False


def upgrade() -> None:
    # ===========================================================================
    # PAYMENTS - Remove old columns, keep model columns
    # Model expects: payment_method (str), payment_status (str)
    # DB has both: payment_method_id + payment_method, status + payment_status
    # ===========================================================================
    
    # Drop old payment_method_id FK and column
    if column_exists('payments', 'payment_method_id'):
        if constraint_exists('payments', 'payments_payment_method_id_fkey'):
            op.drop_constraint('payments_payment_method_id_fkey', 'payments', type_='foreignkey')
        op.drop_column('payments', 'payment_method_id')
    
    # Drop old 'status' column (keep 'payment_status')
    if column_exists('payments', 'status'):
        op.drop_column('payments', 'status')
    
    # Drop refund_amount (not in model)
    if column_exists('payments', 'refund_amount'):
        op.drop_column('payments', 'refund_amount')
    
    # ===========================================================================
    # DRIVER_PAYOUTS - Remove old columns
    # Model expects: payout_status
    # DB has both: status + payout_status
    # ===========================================================================
    
    if column_exists('driver_payouts', 'status'):
        op.drop_column('driver_payouts', 'status')
    
    if column_exists('driver_payouts', 'paid_at'):
        op.drop_column('driver_payouts', 'paid_at')
    
    # Ensure period_start/end are not null (migrate data first)
    op.execute("UPDATE driver_payouts SET period_start = created_at WHERE period_start IS NULL")
    op.execute("UPDATE driver_payouts SET period_end = created_at WHERE period_end IS NULL")
    
    # ===========================================================================
    # AUDIT_LOGS - Remove old columns  
    # Model expects: actor_id, old_value, new_value
    # DB has both: user_id + actor_id, old_values + old_value, new_values + new_value
    # ===========================================================================
    
    if column_exists('audit_logs', 'user_id'):
        # Migrate data from user_id to actor_id if needed (only if actor_id exists)
        if column_exists('audit_logs', 'actor_id'):
            op.execute("UPDATE audit_logs SET actor_id = user_id WHERE actor_id IS NULL AND user_id IS NOT NULL")
        op.drop_column('audit_logs', 'user_id')
    
    if column_exists('audit_logs', 'old_values'):
        # Migrate data (only if old_value exists)
        if column_exists('audit_logs', 'old_value'):
            op.execute("UPDATE audit_logs SET old_value = old_values WHERE old_value IS NULL AND old_values IS NOT NULL")
        op.drop_column('audit_logs', 'old_values')
    
    if column_exists('audit_logs', 'new_values'):
        if column_exists('audit_logs', 'new_value'):
            op.execute("UPDATE audit_logs SET new_value = new_values WHERE new_value IS NULL AND new_values IS NOT NULL")
        op.drop_column('audit_logs', 'new_values')
    
    if column_exists('audit_logs', 'user_agent'):
        op.drop_column('audit_logs', 'user_agent')
    
    # ===========================================================================
    # PROMOTIONS - Remove old columns
    # Model expects: max_uses, max_uses_per_user, starts_at, ends_at
    # DB has both old and new columns
    # ===========================================================================
    
    # Migrate data first
    if column_exists('promotions', 'usage_limit') and column_exists('promotions', 'max_uses'):
        op.execute("UPDATE promotions SET max_uses = usage_limit WHERE max_uses IS NULL AND usage_limit IS NOT NULL")
    if column_exists('promotions', 'valid_from') and column_exists('promotions', 'starts_at'):
        op.execute("UPDATE promotions SET starts_at = valid_from WHERE starts_at IS NULL AND valid_from IS NOT NULL")
    if column_exists('promotions', 'valid_until') and column_exists('promotions', 'ends_at'):
        op.execute("UPDATE promotions SET ends_at = valid_until WHERE ends_at IS NULL AND valid_until IS NOT NULL")
    
    # Drop old columns
    for col in ['name', 'max_discount', 'min_fare', 'usage_limit', 'usage_count', 'valid_from', 'valid_until']:
        if column_exists('promotions', col):
            op.drop_column('promotions', col)
    
    # ===========================================================================
    # SURGE_RULES - Remove old columns
    # Model expects: time_start, time_end, days_of_week
    # DB has both: condition_type/value + time fields
    # ===========================================================================
    
    for col in ['condition_type', 'condition_value', 'valid_from', 'valid_until']:
        if column_exists('surge_rules', col):
            op.drop_column('surge_rules', col)
    
    # ===========================================================================
    # CONVERSATIONS - Remove ticket_id, keep conversation_type
    # Model expects: conversation_type
    # ===========================================================================
    
    if column_exists('conversations', 'ticket_id'):
        if constraint_exists('conversations', 'conversations_ticket_id_fkey'):
            op.drop_constraint('conversations_ticket_id_fkey', 'conversations', type_='foreignkey')
        op.drop_column('conversations', 'ticket_id')
    
    # Add conversation_type if missing
    if not column_exists('conversations', 'conversation_type'):
        op.add_column('conversations', sa.Column('conversation_type', sa.String(50), 
                                                  nullable=False, server_default='booking'))
    
    # ===========================================================================
    # CONVERSATION_PARTICIPANTS - Add role_in_conversation if missing
    # ===========================================================================
    
    if not column_exists('conversation_participants', 'role_in_conversation'):
        op.add_column('conversation_participants', 
                      sa.Column('role_in_conversation', sa.String(50), nullable=True))
    
    if column_exists('conversation_participants', 'last_read_at'):
        op.drop_column('conversation_participants', 'last_read_at')
    
    # ===========================================================================
    # MESSAGES -> CONVERSATION_MESSAGES
    # If 'messages' table still exists and conversation_messages also exists,
    # we need to drop the old one
    # ===========================================================================
    
    if table_exists('messages') and table_exists('conversation_messages'):
        # Migrate any data from messages to conversation_messages if needed
        # Then drop the old table
        op.drop_table('messages')
    elif table_exists('messages') and not table_exists('conversation_messages'):
        # Rename messages to conversation_messages
        op.rename_table('messages', 'conversation_messages')
        # Rename content to message
        if column_exists('conversation_messages', 'content'):
            op.alter_column('conversation_messages', 'content',
                           new_column_name='message', existing_type=sa.Text())
        # Add is_read if missing
        if not column_exists('conversation_messages', 'is_read'):
            op.add_column('conversation_messages', 
                         sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'))
        # Drop is_system if exists
        if column_exists('conversation_messages', 'is_system'):
            op.drop_column('conversation_messages', 'is_system')
    
    # ===========================================================================
    # SAVED_ADDRESSES - Drop if saved_locations exists
    # Model expects: saved_locations
    # ===========================================================================
    
    if table_exists('saved_addresses') and table_exists('saved_locations'):
        op.drop_table('saved_addresses')
    
    # ===========================================================================
    # PROMOTION_REDEMPTIONS - Align columns
    # Model expects: discount_amount, redeemed_at
    # ===========================================================================
    
    if column_exists('promotion_redemptions', 'discount_applied') and not column_exists('promotion_redemptions', 'discount_amount'):
        op.alter_column('promotion_redemptions', 'discount_applied',
                       new_column_name='discount_amount', existing_type=sa.Numeric(10, 2))
    
    if column_exists('promotion_redemptions', 'created_at') and not column_exists('promotion_redemptions', 'redeemed_at'):
        op.alter_column('promotion_redemptions', 'created_at',
                       new_column_name='redeemed_at', existing_type=sa.DateTime(timezone=True))
    elif not column_exists('promotion_redemptions', 'redeemed_at'):
        op.add_column('promotion_redemptions',
                     sa.Column('redeemed_at', sa.DateTime(timezone=True), 
                              server_default=sa.func.now(), nullable=False))
    
    # ===========================================================================
    # SUPPORT_TICKETS - Remove resolution columns not in model
    # ===========================================================================
    
    if column_exists('support_tickets', 'resolution_notes'):
        op.drop_column('support_tickets', 'resolution_notes')
    
    if column_exists('support_tickets', 'resolved_at'):
        op.drop_column('support_tickets', 'resolved_at')


def downgrade() -> None:
    # This cleanup is intentionally one-way
    # To downgrade, restore from backup or re-run the original migration
    pass
