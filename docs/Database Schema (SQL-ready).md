Below is a **PostgreSQL-ready schema** that covers the core of your PRD and feature matrix.

This schema assumes canonical enums and lifecycles defined in:
- `Platform Canonical Definitions.md`
- `Booking State Machine.md`
- `Policies & Rules Specification.md`

If you’re using MySQL or another RDBMS later, it’s easy to adapt (mostly data types + `SERIAL` vs `AUTO_INCREMENT`).

---

```sql
-- =========================================
-- TRANSPORT BOOKING PLATFORM - DB SCHEMA
-- Dialect: PostgreSQL
-- =========================================

-- -------------------------
-- 1. Core RBAC & Users
-- -------------------------

CREATE TABLE roles (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'client', 'driver', 'support', 'admin'
    description     TEXT
);

CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(50),
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A user can technically have multiple roles (if you want that flexibility)
CREATE TABLE user_roles (
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id         BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Optional: for fine-grained permissions in future
CREATE TABLE permissions (
    id              BIGSERIAL PRIMARY KEY,
    code            VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'BOOKING_MODIFY', 'PRICING_MANAGE'
    description     TEXT
);

CREATE TABLE role_permissions (
    role_id         BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- -------------------------
-- 2. Profiles (Client / Driver)
-- -------------------------

CREATE TABLE client_profiles (
    user_id         BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    default_language VARCHAR(10),
    notes           TEXT
);

CREATE TABLE driver_profiles (
    user_id         BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    status          VARCHAR(50) NOT NULL DEFAULT 'pending_verification', -- pending_verification / inactive / active / suspended / banned (see Platform Canonical Definitions.md)
    rating_average  NUMERIC(3,2) DEFAULT 0.0,
    total_ratings   INT NOT NULL DEFAULT 0,
    preferred_region_id BIGINT,
    CONSTRAINT fk_driver_region
        FOREIGN KEY (preferred_region_id) REFERENCES regions(id)
        DEFERRABLE INITIALLY DEFERRED
);

-- Saved locations for clients
CREATE TABLE saved_locations (
    id              BIGSERIAL PRIMARY KEY,
    client_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label           VARCHAR(50) NOT NULL, -- 'Home', 'Work', etc.
    address_line1   VARCHAR(255),
    address_line2   VARCHAR(255),
    city            VARCHAR(100),
    state           VARCHAR(100),
    postal_code     VARCHAR(50),
    country         VARCHAR(100),
    latitude        NUMERIC(10, 7),
    longitude       NUMERIC(10, 7),
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Driver vehicles
CREATE TABLE vehicles (
    id              BIGSERIAL PRIMARY KEY,
    driver_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    make            VARCHAR(100),
    model           VARCHAR(100),
    year            INT,
    color           VARCHAR(50),
    license_plate   VARCHAR(50),
    capacity        INT, -- number of passengers
    service_type_id BIGINT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_vehicle_service_type
        FOREIGN KEY (service_type_id) REFERENCES service_types(id)
        DEFERRABLE INITIALLY DEFERRED
);

-- Driver documents (license, insurance, etc.)
CREATE TABLE driver_documents (
    id              BIGSERIAL PRIMARY KEY,
    driver_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doc_type        VARCHAR(100) NOT NULL, -- 'license', 'insurance', etc.
    file_url        TEXT NOT NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending/approved/rejected
    expires_at      TIMESTAMPTZ,
    reviewed_by     BIGINT REFERENCES users(id), -- admin/support
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------
-- 3. Regions, Service Types & Pricing
-- -------------------------

CREATE TABLE regions (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    geojson         JSONB, -- optional: geofence polygon
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE service_types (
    id              BIGSERIAL PRIMARY KEY,
    code            VARCHAR(50) UNIQUE NOT NULL, -- 'standard', 'premium', 'van', 'cargo'
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE pricing_rules (
    id              BIGSERIAL PRIMARY KEY,
    region_id       BIGINT REFERENCES regions(id) ON DELETE SET NULL,
    service_type_id BIGINT REFERENCES service_types(id) ON DELETE SET NULL,
    base_fare       NUMERIC(10,2) NOT NULL DEFAULT 0,
    per_km          NUMERIC(10,2) NOT NULL DEFAULT 0,
    per_minute      NUMERIC(10,2) NOT NULL DEFAULT 0,
    minimum_fare    NUMERIC(10,2) NOT NULL DEFAULT 0,
    currency        VARCHAR(10) NOT NULL DEFAULT 'USD',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional: surge / dynamic pricing rules
CREATE TABLE surge_rules (
    id              BIGSERIAL PRIMARY KEY,
    region_id       BIGINT REFERENCES regions(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    multiplier      NUMERIC(5,2) NOT NULL DEFAULT 1.0,
    starts_at       TIMESTAMPTZ NOT NULL,
    ends_at         TIMESTAMPTZ NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------
-- 4. Promotions
-- -------------------------

CREATE TABLE promotions (
    id              BIGSERIAL PRIMARY KEY,
    code            VARCHAR(50) UNIQUE NOT NULL,
    description     TEXT,
    discount_type   VARCHAR(20) NOT NULL, -- 'percentage' or 'fixed'
    discount_value  NUMERIC(10,2) NOT NULL,
    max_uses        INT,
    max_uses_per_user INT,
    starts_at       TIMESTAMPTZ,
    ends_at         TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE promotion_redemptions (
    id              BIGSERIAL PRIMARY KEY,
    promotion_id    BIGINT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id      BIGINT REFERENCES bookings(id) ON DELETE SET NULL,
    redeemed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------
-- 5. Booking & Trip Model
-- -------------------------

CREATE TABLE bookings (
    id              BIGSERIAL PRIMARY KEY,
    client_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    driver_id       BIGINT REFERENCES users(id) ON DELETE SET NULL,
    region_id       BIGINT REFERENCES regions(id) ON DELETE SET NULL,
    service_type_id BIGINT REFERENCES service_types(id) ON DELETE SET NULL,

    status          VARCHAR(50) NOT NULL, -- see Booking State Machine.md for allowed values
    -- see Booking State Machine.md for allowed values
    -- e.g. 'pending', 'accepted', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled'

    scheduled_start_at  TIMESTAMPTZ,   -- for scheduled rides
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    cancelled_at        TIMESTAMPTZ,
    cancel_reason       TEXT,
    cancelled_by        BIGINT REFERENCES users(id), -- who cancelled

    passenger_count     INT,
    luggage_details     TEXT,
    special_requirements TEXT, -- wheelchair, child seat, etc.

    estimated_fare      NUMERIC(10,2),
    final_fare          NUMERIC(10,2),
    currency            VARCHAR(10) NOT NULL DEFAULT 'USD',

    promotion_id        BIGINT REFERENCES promotions(id) ON DELETE SET NULL,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stops for multi-stop trips (pickup is usually position 1)
CREATE TABLE booking_stops (
    id              BIGSERIAL PRIMARY KEY,
    booking_id      BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    position        INT NOT NULL, -- 1 = pickup, last = final dropoff
    label           VARCHAR(100),
    address_line1   VARCHAR(255),
    address_line2   VARCHAR(255),
    city            VARCHAR(100),
    state           VARCHAR(100),
    postal_code     VARCHAR(50),
    country         VARCHAR(100),
    latitude        NUMERIC(10, 7),
    longitude       NUMERIC(10, 7),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trip/booking events (status changes, driver assignment changes, etc.)
CREATE TABLE booking_events (
    id              BIGSERIAL PRIMARY KEY,
    booking_id      BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    event_type      VARCHAR(100) NOT NULL, 
    -- e.g. 'status_change', 'driver_assigned', 'driver_arrived', 'trip_started', 'trip_completed'
    old_value       TEXT,
    new_value       TEXT,
    triggered_by    BIGINT REFERENCES users(id), -- user or system (nullable)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional: location tracking snapshots
CREATE TABLE booking_locations (
    id              BIGSERIAL PRIMARY KEY,
    booking_id      BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    driver_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    latitude        NUMERIC(10,7) NOT NULL,
    longitude       NUMERIC(10,7) NOT NULL,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------
-- 6. Payments, Receipts & Earnings
-- -------------------------

CREATE TABLE payment_methods (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider        VARCHAR(50) NOT NULL, -- 'stripe', 'paypal', etc.
    provider_ref    VARCHAR(255) NOT NULL, -- tokenized id
    brand           VARCHAR(50),
    last4           VARCHAR(4),
    exp_month       INT,
    exp_year        INT,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
    id              BIGSERIAL PRIMARY KEY,
    booking_id      BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- usually client
    amount          NUMERIC(10,2) NOT NULL,
    currency        VARCHAR(10) NOT NULL DEFAULT 'USD',
    status          VARCHAR(50) NOT NULL, -- 'pending', 'authorized', 'captured', 'refunded', 'failed'
    provider        VARCHAR(50) NOT NULL,
    provider_payment_id VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Aggregated earnings / payout records for drivers (per payout run)
CREATE TABLE driver_payouts (
    id              BIGSERIAL PRIMARY KEY,
    driver_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    total_earnings  NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_trips     INT NOT NULL DEFAULT 0,
    status          VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending/processing/paid
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at         TIMESTAMPTZ
);

-- -------------------------
-- 7. Support Tickets & Communication
-- -------------------------

CREATE TABLE support_tickets (
    id              BIGSERIAL PRIMARY KEY,
    created_by      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_to     BIGINT REFERENCES users(id), -- support agent
    booking_id      BIGINT REFERENCES bookings(id) ON DELETE SET NULL,
    category        VARCHAR(100) NOT NULL, -- 'trip_issue','payment','account','safety'
    status          VARCHAR(50) NOT NULL DEFAULT 'open', -- open/in_progress/resolved/closed
    priority        VARCHAR(50) NOT NULL DEFAULT 'normal', -- low/normal/high/urgent
    subject         VARCHAR(255) NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE support_ticket_messages (
    id              BIGSERIAL PRIMARY KEY,
    ticket_id       BIGINT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message         TEXT NOT NULL,
    is_internal     BOOLEAN NOT NULL DEFAULT FALSE, -- internal note vs user-visible
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generic conversation model for in-app chat (per booking or standalone)
CREATE TABLE conversations (
    id              BIGSERIAL PRIMARY KEY,
    booking_id      BIGINT REFERENCES bookings(id) ON DELETE SET NULL,
    type            VARCHAR(50) NOT NULL DEFAULT 'booking', 
    -- 'booking', 'support', etc.
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE conversation_participants (
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_in_conversation VARCHAR(50), -- 'client','driver','support','admin'
    PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE conversation_messages (
    id              BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------
-- 8. Notifications
-- -------------------------

CREATE TABLE notifications (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(100) NOT NULL, -- 'trip_status','promotion','system'
    title           VARCHAR(255),
    body            TEXT,
    data            JSONB, -- extra metadata
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------
-- 9. Audit Logs
-- -------------------------

CREATE TABLE audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    actor_id        BIGINT REFERENCES users(id), -- admin/support/system
    action          VARCHAR(255) NOT NULL, -- 'CREATE_USER', 'UPDATE_PRICING', etc.
    entity_type     VARCHAR(100) NOT NULL, -- 'user','booking','pricing_rule','driver_document', etc.
    entity_id       BIGINT,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------
-- 10. Useful Indexes
-- -------------------------

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_bookings_client_id ON bookings(client_id);
CREATE INDEX idx_bookings_driver_id ON bookings(driver_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_booking_stops_booking_id ON booking_stops(booking_id);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_booking_id ON support_tickets(booking_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_booking_locations_booking_id ON booking_locations(booking_id);
```
