"""
Seryvo Platform - Demo Data Seed Script
Creates demo data for testing and development

Run with: python -m app.scripts.seed_demo_data
Or from container: docker exec seryvo-backend python -m app.scripts.seed_demo_data
"""
import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
import random

from passlib.context import CryptContext
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker, engine
from app.models import (
    Role, User, UserRole, Permission, RolePermission,
    ClientProfile, DriverProfile, SavedLocation, Vehicle, DriverDocument,
    Region, ServiceType, PricingRule, SurgeRule, Promotion,
    Booking, BookingStop, BookingEvent,
    SupportTicket, SupportTicketMessage, Payment, PaymentMethod, AuditLog,
    UserVerification,
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


# Demo password for all users
DEMO_PASSWORD = "demo123"
DEMO_PASSWORD_HASH = hash_password(DEMO_PASSWORD)


async def clear_existing_data(session: AsyncSession):
    """Clear existing demo data (in reverse dependency order)."""
    print("Clearing existing data...")
    
    # Delete in reverse order of dependencies
    tables = [
        AuditLog,
        UserVerification,
        SupportTicketMessage,
        BookingEvent, BookingStop, Payment, Booking,
        SupportTicket, PaymentMethod,
        DriverDocument, Vehicle, SavedLocation,
        DriverProfile, ClientProfile,
        UserRole, User,
        RolePermission, Permission,
        PricingRule, SurgeRule, Promotion,
        ServiceType, Region, Role,
    ]
    
    for table in tables:
        try:
            await session.execute(delete(table))
        except Exception as e:
            print(f"  Warning: Could not clear {table.__tablename__}: {e}")
    
    await session.commit()
    print("✓ Cleared existing data")


async def seed_roles(session: AsyncSession) -> dict:
    """Create roles and permissions."""
    print("Seeding roles...")
    
    roles_data = [
        ("client", "Regular customer who books rides"),
        ("driver", "Verified driver who fulfills bookings"),
        ("support", "Support agent handling tickets"),
        ("admin", "Platform administrator with full access"),
    ]
    
    roles = {}
    for name, description in roles_data:
        role = Role(name=name, description=description)
        session.add(role)
        roles[name] = role
    
    await session.flush()
    
    # Create permissions
    permissions_data = [
        ("users.read", "View users"),
        ("users.create", "Create users"),
        ("users.update", "Update users"),
        ("users.delete", "Delete users"),
        ("bookings.read", "View bookings"),
        ("bookings.create", "Create bookings"),
        ("bookings.update", "Update bookings"),
        ("bookings.cancel", "Cancel bookings"),
        ("drivers.read", "View drivers"),
        ("drivers.approve", "Approve drivers"),
        ("drivers.manage", "Manage driver settings"),
        ("tickets.read", "View support tickets"),
        ("tickets.update", "Update tickets"),
        ("tickets.assign", "Assign tickets"),
        ("admin.dashboard", "View admin dashboard"),
        ("admin.reports", "View reports"),
        ("admin.settings", "Manage settings"),
        ("admin.pricing", "Manage pricing"),
        ("admin.promotions", "Manage promotions"),
        ("admin.audit", "View audit logs"),
    ]
    
    permissions = []
    for name, desc in permissions_data:
        perm = Permission(name=name, description=desc)
        session.add(perm)
        permissions.append(perm)
    
    await session.flush()
    
    # Assign all permissions to admin
    for perm in permissions:
        session.add(RolePermission(role_id=roles["admin"].id, permission_id=perm.id))
    
    # Assign support permissions
    support_perms = [p for p in permissions if 'tickets' in p.name or 'users.read' in p.name or 'bookings.read' in p.name]
    for perm in support_perms:
        session.add(RolePermission(role_id=roles["support"].id, permission_id=perm.id))
    
    await session.flush()
    print(f"✓ Created {len(roles)} roles and {len(permissions)} permissions")
    return roles


async def seed_regions_and_services(session: AsyncSession) -> tuple:
    """Create regions and service types."""
    print("Seeding regions and service types...")
    
    # Regions
    regions_data = [
        ("metro", "Metro Area", "America/Los_Angeles", "Downtown and surrounding suburbs"),
        ("airport", "Airport Zone", "America/Los_Angeles", "Airport terminals and nearby hotels"),
        ("suburban", "Suburban", "America/Los_Angeles", "Residential suburban areas"),
    ]
    
    regions = {}
    for code, name, tz, description in regions_data:
        region = Region(
            code=code, 
            name=name, 
            timezone=tz,
            description=description, 
            currency="USD",
            is_active=True
        )
        session.add(region)
        regions[name] = region
    
    # Service Types
    services_data = [
        ("standard", "Standard", "Economy vehicle, up to 4 passengers", 4),
        ("comfort", "Comfort", "Mid-range vehicle with extra legroom", 4),
        ("premium", "Premium", "Luxury vehicle with premium amenities", 4),
        ("xl", "XL", "Large vehicle for groups up to 6", 6),
        ("van", "Van", "Van for large groups or luggage", 8),
    ]
    
    services = {}
    for code, name, description, capacity in services_data:
        service = ServiceType(
            code=code, name=name, description=description,
            base_capacity=capacity, is_active=True
        )
        session.add(service)
        services[code] = service
    
    await session.flush()
    print(f"✓ Created {len(regions)} regions, {len(services)} service types")
    return regions, services


async def seed_pricing(session: AsyncSession, regions: dict, services: dict):
    """Create pricing rules."""
    print("Seeding pricing rules...")
    
    pricing_configs = [
        ("Metro Area", "standard", 3.00, 1.50, 0.30, 8.00),
        ("Metro Area", "comfort", 5.00, 2.00, 0.40, 12.00),
        ("Metro Area", "premium", 8.00, 3.00, 0.60, 20.00),
        ("Metro Area", "xl", 6.00, 2.50, 0.50, 15.00),
        ("Airport Zone", "standard", 5.00, 2.00, 0.35, 25.00),
        ("Airport Zone", "premium", 12.00, 4.00, 0.75, 40.00),
    ]
    
    for region_name, service_code, base, per_km, per_min, min_fare in pricing_configs:
        region = regions.get(region_name)
        service = services.get(service_code)
        
        pricing = PricingRule(
            region_id=region.id if region else None,
            service_type_id=service.id if service else None,
            base_fare=base,
            per_km=per_km,
            per_minute=per_min,
            minimum_fare=min_fare,
            currency="USD",
            is_active=True,
        )
        session.add(pricing)
    
    await session.flush()
    print(f"✓ Created {len(pricing_configs)} pricing rules")


async def seed_surge_rules(session: AsyncSession, regions: dict):
    """Create surge pricing rules."""
    print("Seeding surge rules...")
    
    surge_configs = [
        ("Rush Hour Morning", "Metro Area", 1.5, "07:00", "09:00", "mon,tue,wed,thu,fri"),
        ("Rush Hour Evening", "Metro Area", 1.5, "17:00", "19:00", "mon,tue,wed,thu,fri"),
        ("Weekend Night", "Metro Area", 1.3, "22:00", "02:00", "fri,sat"),
        ("Airport Peak", "Airport Zone", 1.4, "06:00", "10:00", "mon,tue,wed,thu,fri,sat,sun"),
    ]
    
    for name, region_name, multiplier, start, end, days in surge_configs:
        region = regions.get(region_name)
        surge = SurgeRule(
            region_id=region.id if region else None,
            name=name,
            multiplier=multiplier,
            time_start=start,
            time_end=end,
            days_of_week=days,
            is_active=True,
        )
        session.add(surge)
    
    await session.flush()
    print(f"✓ Created {len(surge_configs)} surge rules")


async def seed_promotions(session: AsyncSession):
    """Create promotional codes."""
    print("Seeding promotions...")
    
    now = datetime.utcnow()
    promos = [
        ("WELCOME20", "20% off first ride", "percentage", 20, 1000, 1, now - timedelta(days=30), now + timedelta(days=60)),
        ("FLAT5", "$5 off any ride", "fixed", 5, 500, 3, now - timedelta(days=7), now + timedelta(days=30)),
        ("VIP50", "50% off for VIP members", "percentage", 50, 100, 5, now - timedelta(days=1), now + timedelta(days=90)),
        ("SUMMER10", "Summer special 10% off", "percentage", 10, 2000, None, now, now + timedelta(days=45)),
    ]
    
    for code, desc, dtype, value, max_uses, per_user, starts, ends in promos:
        promo = Promotion(
            code=code,
            description=desc,
            discount_type=dtype,
            discount_value=value,
            max_uses=max_uses,
            max_uses_per_user=per_user,
            starts_at=starts,
            ends_at=ends,
            is_active=True,
        )
        session.add(promo)
    
    await session.flush()
    print(f"✓ Created {len(promos)} promotions")


async def seed_users(session: AsyncSession, roles: dict) -> dict:
    """Create demo users for each role."""
    print("Seeding users...")
    
    users_data = [
        # Clients
        ("alice@demo.com", "Alice Johnson", "client", "+1-555-0101"),
        ("bob@demo.com", "Bob Williams", "client", "+1-555-0102"),
        ("carol@demo.com", "Carol Davis", "client", "+1-555-0103"),
        
        # Drivers
        ("mike@demo.com", "Mike Chen", "driver", "+1-555-0201"),
        ("sarah@demo.com", "Sarah Miller", "driver", "+1-555-0202"),
        ("james@demo.com", "James Wilson", "driver", "+1-555-0203"),
        ("emma@demo.com", "Emma Brown", "driver", "+1-555-0204"),
        
        # Support
        ("support1@demo.com", "Lisa Support", "support", "+1-555-0301"),
        ("support2@demo.com", "Tom Support", "support", "+1-555-0302"),
        
        # Admin
        ("admin@demo.com", "David Admin", "admin", "+1-555-0401"),
    ]
    
    users = {}
    for email, name, role_name, phone in users_data:
        user = User(
            email=email,
            full_name=name,
            password_hash=DEMO_PASSWORD_HASH,
            phone=phone,
            is_active=True,
            avatar_url=f"https://api.dicebear.com/7.x/avataaars/svg?seed={name.split()[0].lower()}",
        )
        session.add(user)
        await session.flush()
        
        # Assign role
        role = roles[role_name]
        user_role = UserRole(user_id=user.id, role_id=role.id)
        session.add(user_role)
        
        # Create verification record
        verification = UserVerification(
            user_id=user.id,
            email_verified=True,
            email_verified_at=datetime.utcnow(),
            phone_verified=False,
        )
        session.add(verification)
        
        users[email] = user
    
    await session.flush()
    print(f"✓ Created {len(users)} users")
    return users


async def seed_profiles(session: AsyncSession, users: dict, services: dict):
    """Create client and driver profiles."""
    print("Seeding profiles...")
    
    # Client profiles
    client_emails = ["alice@demo.com", "bob@demo.com", "carol@demo.com"]
    for email in client_emails:
        user = users[email]
        profile = ClientProfile(
            user_id=user.id,
            default_currency="USD",
        )
        session.add(profile)
        await session.flush()
        
        # Add saved locations for first client
        if email == "alice@demo.com":
            home = SavedLocation(
                client_id=user.id,
                label="Home",
                address_line1="123 Main Street",
                city="San Francisco",
                state="CA",
                postal_code="94102",
                latitude=37.7749,
                longitude=-122.4194,
                is_default=True,
            )
            work = SavedLocation(
                client_id=user.id,
                label="Work",
                address_line1="456 Market Street",
                city="San Francisco",
                state="CA",
                postal_code="94105",
                latitude=37.7897,
                longitude=-122.3972,
            )
            session.add_all([home, work])
    
    # Driver profiles with vehicles
    driver_configs = [
        ("mike@demo.com", "approved", "available", 4.8, 156, 95.0, 2.0, "standard", "Toyota", "Camry", 2022, "Silver", "ABC123"),
        ("sarah@demo.com", "approved", "available", 4.9, 203, 97.0, 1.5, "comfort", "Honda", "Accord", 2023, "Black", "XYZ789"),
        ("james@demo.com", "approved", "offline", 4.7, 89, 92.0, 3.0, "premium", "BMW", "5 Series", 2023, "White", "LUX001"),
        ("emma@demo.com", "approved", "offline", 4.6, 45, 90.0, 4.0, "xl", "Chevrolet", "Suburban", 2022, "Gray", "XL2024"),
    ]
    
    for email, status, avail, rating, total_ratings, accept_rate, cancel_rate, svc_code, make, model, year, color, plate in driver_configs:
        user = users[email]
        profile = DriverProfile(
            user_id=user.id,
            status=status,
            availability_status=avail,
            rating_average=rating,
            total_ratings=total_ratings,
            total_trips=total_ratings,  # Assume each rating is from a trip
            acceptance_rate=accept_rate,
            cancellation_rate=cancel_rate,
        )
        session.add(profile)
        await session.flush()
        
        service = services.get(svc_code)
        vehicle = Vehicle(
            driver_id=user.id,
            make=make,
            model=model,
            year=year,
            color=color,
            license_plate=plate,
            capacity=service.base_capacity if service else 4,
            service_type_id=service.id if service else None,
            status="approved",
            is_active=True,
        )
        session.add(vehicle)
        
        # Add driver documents
        docs = [
            ("drivers_license", "approved"),
            ("vehicle_registration", "approved"),
            ("insurance", "approved"),
            ("background_check", "approved"),
        ]
        for doc_type, doc_status in docs:
            doc = DriverDocument(
                driver_id=user.id,
                doc_type=doc_type,
                file_url=f"https://storage.example.com/docs/{user.id}/{doc_type}.pdf",
                status=doc_status,
                expires_at=datetime.utcnow() + timedelta(days=365),
            )
            session.add(doc)
    
    await session.flush()
    print("✓ Created client and driver profiles")


async def seed_payment_methods(session: AsyncSession, users: dict):
    """Create payment methods for clients with Stripe test payment method IDs."""
    print("Seeding payment methods...")
    
    client_emails = ["alice@demo.com", "bob@demo.com", "carol@demo.com"]
    
    cards = [
        ("visa", "4242", 12, 2027, "pm_card_visa"),
        ("mastercard", "4444", 6, 2026, "pm_card_mastercard"),
        ("amex", "0005", 3, 2028, "pm_card_amex"),
    ]
    
    for i, email in enumerate(client_emails):
        user = users[email]
        card = cards[i % len(cards)]
        pm = PaymentMethod(
            user_id=user.id,
            method_type="card",
            brand=card[0],
            last_four=card[1],
            exp_month=card[2],
            exp_year=card[3],
            is_default=True,
            stripe_payment_method_id=card[4],
        )
        session.add(pm)
    
    await session.flush()
    print("✓ Created payment methods with Stripe test tokens")


async def seed_bookings(session: AsyncSession, users: dict, services: dict):
    """Create sample bookings with various statuses."""
    print("Seeding bookings...")
    
    now = datetime.utcnow()
    
    clients = [users["alice@demo.com"], users["bob@demo.com"], users["carol@demo.com"]]
    drivers = [users["mike@demo.com"], users["sarah@demo.com"], users["james@demo.com"]]
    
    # Sample locations
    locations = [
        ("123 Main St, San Francisco, CA", 37.7749, -122.4194),
        ("456 Market St, San Francisco, CA", 37.7897, -122.3972),
        ("San Francisco International Airport", 37.6213, -122.3790),
        ("Pier 39, San Francisco, CA", 37.8087, -122.4098),
        ("Golden Gate Park, San Francisco, CA", 37.7694, -122.4862),
        ("Union Square, San Francisco, CA", 37.7879, -122.4074),
    ]
    
    bookings_data = [
        # (status, created_offset_mins, completed_offset_mins, fare, client_rating, driver_rating)
        ("completed", -5*24*60, -5*24*60 + 60, 45.00, 5, 5),
        ("completed", -4*24*60, -4*24*60 + 30, 28.50, 4, 5),
        ("completed", -3*24*60, -3*24*60 + 45, 62.00, 5, 4),
        ("completed", -2*24*60, -2*24*60 + 30, 35.00, 5, 5),
        ("completed", -1*24*60, -1*24*60 + 60, 52.00, 4, 4),
        ("in_progress", -20, None, 35.00, None, None),
        ("confirmed", 60, None, 40.00, None, None),
        ("requested", 120, None, 55.00, None, None),
        ("scheduled", 24*60 + 600, None, 48.00, None, None),
        ("cancelled", -3*60, None, 30.00, None, None),
    ]
    
    service_list = list(services.values())
    
    for i, (status, created_offset, completed_offset, fare, client_rating, driver_rating) in enumerate(bookings_data):
        client = clients[i % len(clients)]
        driver = drivers[i % len(drivers)] if status in ["completed", "in_progress", "confirmed"] else None
        
        pickup = locations[i % len(locations)]
        dropoff = locations[(i + 1) % len(locations)]
        service = service_list[i % len(service_list)]
        
        created_at = now + timedelta(minutes=created_offset)
        completed_at = (now + timedelta(minutes=completed_offset)) if completed_offset else None
        
        booking = Booking(
            client_id=client.id,
            driver_id=driver.id if driver else None,
            service_type_id=service.id,
            status=status,
            is_asap=(status != "scheduled"),
            pickup_address=pickup[0],
            pickup_lat=pickup[1],
            pickup_lng=pickup[2],
            dropoff_address=dropoff[0],
            dropoff_lat=dropoff[1],
            dropoff_lng=dropoff[2],
            requested_pickup_at=created_at if status == "scheduled" else None,
            started_at=created_at if status in ["completed", "in_progress"] else None,
            completed_at=completed_at,
            cancelled_at=created_at if status == "cancelled" else None,
            passenger_count=random.randint(1, 3),
            luggage_count=random.randint(0, 2),
            special_notes="Demo booking" if i == 0 else None,
            estimated_distance_km=Decimal(str(random.uniform(5, 25))),
            estimated_duration_min=random.randint(15, 45),
            base_fare=Decimal("5.00"),
            distance_fare=Decimal(str(round(fare * 0.4, 2))),
            time_fare=Decimal(str(round(fare * 0.2, 2))),
            surge_multiplier=Decimal("1.0"),
            final_fare=Decimal(str(fare)) if status == "completed" else None,
            driver_earnings=Decimal(str(round(fare * 0.75, 2))) if status == "completed" else None,
            platform_fee=Decimal(str(round(fare * 0.25, 2))) if status == "completed" else None,
            client_rating=client_rating,
            driver_rating=driver_rating,
            created_at=created_at,
        )
        session.add(booking)
        await session.flush()
        
        # Add stops
        pickup_stop = BookingStop(
            booking_id=booking.id,
            sequence=0,
            address=pickup[0],
            lat=Decimal(str(pickup[1])),
            lng=Decimal(str(pickup[2])),
            stop_type="pickup",
        )
        dropoff_stop = BookingStop(
            booking_id=booking.id,
            sequence=1,
            address=dropoff[0],
            lat=Decimal(str(dropoff[1])),
            lng=Decimal(str(dropoff[2])),
            stop_type="dropoff",
        )
        session.add_all([pickup_stop, dropoff_stop])
        
        # Add events
        event = BookingEvent(
            booking_id=booking.id,
            event_type="booking_created",
            description=f"Booking created with status {status}",
            event_metadata={"initial_status": status},
            created_at=created_at,
        )
        session.add(event)
        
        if status == "completed":
            event2 = BookingEvent(
                booking_id=booking.id,
                event_type="trip_completed",
                actor_id=driver.id if driver else None,
                description="Trip completed successfully",
                event_metadata={"final_fare": str(fare)},
                created_at=completed_at,
            )
            session.add(event2)
        
        # Add payment for completed bookings
        if status == "completed":
            payment = Payment(
                booking_id=booking.id,
                amount=Decimal(str(fare)),
                currency="USD",
                payment_method="card",
                payment_status="completed",
                created_at=completed_at,
                completed_at=completed_at,
            )
            session.add(payment)
    
    await session.flush()
    print(f"✓ Created {len(bookings_data)} bookings with stops and events")


async def seed_support_tickets(session: AsyncSession, users: dict):
    """Create sample support tickets."""
    print("Seeding support tickets...")
    
    now = datetime.utcnow()
    
    tickets_data = [
        ("alice@demo.com", "Payment issue", "billing", "medium", "open", "I was charged twice for my last ride"),
        ("bob@demo.com", "Driver complaint", "driver", "high", "in_progress", "Driver was very rude during my trip"),
        ("carol@demo.com", "Promo code not working", "promo", "low", "resolved", "WELCOME20 code didn't apply"),
        ("alice@demo.com", "Lost item", "lost_item", "medium", "open", "I left my phone in the car"),
    ]
    
    support_user = users.get("support1@demo.com")
    
    for email, subject, category, priority, status, description in tickets_data:
        user = users[email]
        ticket = SupportTicket(
            user_id=user.id,
            assigned_to=support_user.id if status == "in_progress" else None,
            subject=subject,
            category=category,
            priority=priority,
            status=status,
            description=description,
            created_at=now - timedelta(days=random.randint(1, 7)),
        )
        session.add(ticket)
        await session.flush()
        
        # Add initial message
        msg = SupportTicketMessage(
            ticket_id=ticket.id,
            sender_id=user.id,
            message=description,
            is_internal=False,
        )
        session.add(msg)
        
        # Add support response for in_progress tickets
        if status == "in_progress" and support_user:
            response = SupportTicketMessage(
                ticket_id=ticket.id,
                sender_id=support_user.id,
                message="Thank you for reaching out. We're looking into this issue.",
                is_internal=False,
            )
            session.add(response)
    
    await session.flush()
    print(f"✓ Created {len(tickets_data)} support tickets with messages")


async def main():
    """Run the complete seed process."""
    print("\n" + "=" * 50)
    print("Seryvo Platform - Demo Data Seeding")
    print("=" * 50 + "\n")
    
    async with async_session_maker() as session:
        try:
            # Clear existing data
            await clear_existing_data(session)
            
            # Seed in order of dependencies
            roles = await seed_roles(session)
            regions, services = await seed_regions_and_services(session)
            await seed_pricing(session, regions, services)
            await seed_surge_rules(session, regions)
            await seed_promotions(session)
            users = await seed_users(session, roles)
            await seed_profiles(session, users, services)
            await seed_payment_methods(session, users)
            await seed_bookings(session, users, services)
            await seed_support_tickets(session, users)
            
            await session.commit()
            
            print("\n" + "=" * 50)
            print("✅ Demo data seeding complete!")
            print("=" * 50)
            print("\nDemo Accounts (password: demo123):")
            print("-" * 40)
            print("👤 Clients:")
            print("   alice@demo.com, bob@demo.com, carol@demo.com")
            print("🚗 Drivers:")
            print("   mike@demo.com, sarah@demo.com, james@demo.com, emma@demo.com")
            print("🎧 Support:")
            print("   support1@demo.com, support2@demo.com")
            print("👑 Admin:")
            print("   admin@demo.com")
            print("-" * 40 + "\n")
            
        except Exception as e:
            await session.rollback()
            print(f"\n❌ Error during seeding: {e}")
            import traceback
            traceback.print_exc()
            raise


if __name__ == "__main__":
    asyncio.run(main())
