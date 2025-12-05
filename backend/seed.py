"""
Seryvo Platform - Database Initialization Script
Creates required roles and permissions only. No demo data.
Demo data can be loaded via the Admin Settings panel.
"""
import asyncio
from sqlalchemy import select

from app.core.database import async_session, init_db
from app.models import Role, Permission, RolePermission


async def init_database():
    """Initialize the database with required roles and permissions."""
    print("Initializing database...")
    await init_db()
    
    async with async_session() as db:
        # Check if roles already exist
        existing_roles = await db.execute(select(Role))
        if existing_roles.scalar_one_or_none():
            print("Database already initialized. Skipping...")
            return
        
        print("Setting up roles and permissions...")
        
        # ===== Roles =====
        roles = [
            Role(name="admin", description="System administrator with full access"),
            Role(name="support", description="Customer support staff"),
            Role(name="driver", description="Driver/chauffeur"),
            Role(name="client", description="Customer/passenger"),
        ]
        db.add_all(roles)
        await db.flush()
        
        role_map = {r.name: r.id for r in roles}
        print(f"✅ Created {len(roles)} roles")
        
        # ===== Permissions =====
        permissions = [
            # User management
            Permission(name="users.read", description="View users"),
            Permission(name="users.create", description="Create users"),
            Permission(name="users.update", description="Update users"),
            Permission(name="users.delete", description="Delete users"),
            # Booking management
            Permission(name="bookings.read", description="View bookings"),
            Permission(name="bookings.create", description="Create bookings"),
            Permission(name="bookings.update", description="Update bookings"),
            Permission(name="bookings.cancel", description="Cancel bookings"),
            # Driver management
            Permission(name="drivers.read", description="View drivers"),
            Permission(name="drivers.approve", description="Approve drivers"),
            Permission(name="drivers.manage", description="Manage driver settings"),
            # Support
            Permission(name="tickets.read", description="View support tickets"),
            Permission(name="tickets.update", description="Update tickets"),
            Permission(name="tickets.assign", description="Assign tickets"),
            # Admin
            Permission(name="admin.dashboard", description="View admin dashboard"),
            Permission(name="admin.reports", description="View reports"),
            Permission(name="admin.settings", description="Manage settings"),
            Permission(name="admin.pricing", description="Manage pricing"),
            Permission(name="admin.promotions", description="Manage promotions"),
            Permission(name="admin.audit", description="View audit logs"),
        ]
        db.add_all(permissions)
        await db.flush()
        print(f"✅ Created {len(permissions)} permissions")
        
        # ===== Role-Permission Mapping =====
        admin_permissions = [p.id for p in permissions]  # Admin gets all
        support_permissions = [p.id for p in permissions if 'tickets' in p.name or 'users.read' in p.name or 'bookings.read' in p.name]
        
        for perm_id in admin_permissions:
            db.add(RolePermission(role_id=role_map["admin"], permission_id=perm_id))
        
        for perm_id in support_permissions:
            db.add(RolePermission(role_id=role_map["support"], permission_id=perm_id))
        
        await db.flush()
        print("✅ Assigned permissions to roles")
        
        await db.commit()
        
        print("\n" + "="*50)
        print("✅ Database initialization completed!")
        print("="*50)
        print("\n📋 Next Steps:")
        print("  1. Visit the app to complete first-time setup")
        print("  2. The first user to register becomes the admin")
        print("  3. Use Admin Settings to load demo data if needed")
        print()


if __name__ == "__main__":
    asyncio.run(init_database())
