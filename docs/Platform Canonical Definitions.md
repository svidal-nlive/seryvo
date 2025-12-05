# Platform Canonical Definitions
# Platform Canonical Definitions

Authoritative source for shared language, enums, and core flows across:
- Product Requirements Document
- Database Schema
- REST API design
- OpenAPI specs
- Dashboard docs and feature matrices

All other documents MUST align with these definitions.

---

## 1. Core Domain Terms

- **Booking**: A customer’s request for one or more rides between locations, with timing and pricing attached. This is the canonical term (do NOT use "trip" or "job" in specs; UI copies may localize).
- **Ride / Leg**: A single origin–destination segment within a booking (e.g., multi-stop itinerary → multiple legs).
- **Client**: End-user requesting transportation services (sometimes "rider" in UX copy).
- **Driver**: Service provider fulfilling bookings.
- **Support Agent**: Human operator handling tickets, adjustments, and escalations.
- **Admin**: Internal user managing configuration, compliance, pricing, and system-wide settings.

---

## 2. Entity Identifiers & Conventions

- All primary resources use UUIDv4 as canonical identifiers: `booking_id`, `client_id`, `driver_id`, `vehicle_id`, `payment_id`.
- Time fields are in ISO 8601 UTC (`2025-01-01T12:00:00Z`).
- Monetary fields use:
  - `amount` as integer in minor units (e.g., cents).
  - `currency` as ISO 4217 (e.g., `USD`, `EUR`).

---

## 3. Driver Status Enum

Canonical driver status values:

- `pending_verification`: Driver has registered but documents/background checks are not fully approved.
- `inactive`: Approved but not currently allowed to receive jobs (e.g., temporarily disabled).
- `active`: Fully approved and allowed to toggle availability.
- `suspended`: Temporarily blocked due to compliance or behavior issues.
- `banned`: Permanently blocked from the platform.

### Driver Availability Sub-States

- `offline`: Not sending heartbeats; not available for assignments.
- `available`: Online and eligible to receive offers.
- `on_trip`: Assigned and handling a live booking.
- `on_break`: Online but not eligible for new offers (optional, future).

All related tables and APIs MUST use these exact enums (or stable mappings if provider requires different internal representation).

---

## 4. Booking Status Enum (High-Level)

Canonical booking lifecycle high-level states:

- `draft`: Created but not yet confirmed by client (quote/cart-like).
- `requested`: Client confirmed; looking for a driver.
- `driver_assigned`: Driver accepted but has not yet started trip.
- `driver_en_route_pickup`: Driver is en route to pickup location.
- `driver_arrived`: Driver is at pickup; waiting for client.
- `in_progress`: Client onboard; trip in progress.
- `completed`: Trip completed successfully.
- `canceled_by_client`: Canceled by client under applicable policy.
- `canceled_by_driver`: Canceled by driver.
- `canceled_by_system`: Canceled automatically (timeout, payment failure, etc.).
- `no_show_client`: Driver arrived and waited; rider did not show.
- `no_show_driver`: Driver did not show (rare, escalated).
- `disputed`: Completed but under dispute/review.
- `refunded`: Resolved with refund/adjustment (may be a sub-state or flag).

All downstream specs must treat these as the canonical states. Specialization (e.g., `in_progress_pickup`, `in_progress_dropoff`) can be handled via sub-status or derived flags, but not by inventing new main enums.

---

### 4.1 Legacy → Canonical Status Mapping

For existing implementations and database records that used legacy booking statuses, use the following mapping when migrating:

- `pending` → `requested`
- `accepted` → `driver_assigned`
- `en_route` → `driver_en_route_pickup`
- `arrived` → `driver_arrived`
- `in_progress` → `in_progress`
- `completed` → `completed`
- `cancelled` → one of:
  - `canceled_by_client`
  - `canceled_by_driver`
  - `canceled_by_system`

During migration, if the actor is not stored, default to `canceled_by_system` and progressively improve data quality as more context becomes available.

New systems SHOULD use only the canonical statuses; the legacy names should appear only in historical data and migration tooling.

---

## 5. Role Capabilities (Overview)

High-level summary; detailed matrix lives in `RBAC Matrix v2.md`.

- **Client**:
  - Create/modify/cancel own bookings (subject to policies).
  - View past trips, invoices, and receipts.
  - Manage payment methods and profile.
  - Contact support; rate and review trips.

- **Driver**:
  - Toggle availability.
  - Accept/decline job offers.
  - Navigate to pickup/dropoff.
  - Mark states: arrived, start trip, complete trip.
  - View earnings, payouts, performance metrics.

- **Support Agent**:
  - Search bookings, clients, drivers.
  - View event timelines and audit logs.
  - Perform constrained modifications (time, route, pricing adjustments) subject to playbook.
  - Trigger refunds/credits within approved thresholds.
  - Add internal notes and escalate.

- **Admin**:
  - All Support capabilities plus:
  - Manage pricing, promotions, and policies.
  - Manage driver onboarding, document validation, and suspensions.
  - Configure system-wide settings (surge rules, assignment policies).
  - Manage RBAC roles and permissions.

---

## 6. Naming & Terminology Rules

- Use **"booking"** in all data models and APIs.
- UI copy can say "trip" but underlying models, logs, and metrics use "booking".
- Use **"client"** in backoffice and schemas; "rider" is viewed as a label in UX only.
- Do not mix spelling variants in canonical names:
  - API + DB use `canceled`.
  - UI copy can localize.

---

## 7. Cross-Document Dependencies

- Database schemas MUST:
  - Use these enums for columns or map provider-specific values to these.
- OpenAPI specs MUST:
  - Refer to enums defined here.
  - Provide consistent descriptions.
- Feature matrices & dashboard docs MUST:
  - Reference canonical role names & booking states.
  - Avoid introducing new role labels or state names without updating this document first.

---

## 8. Change Management

Any change to enums or critical terminology:
1. Propose update here.
2. Review for impact on:
   - DB migrations
   - API backward compatibility
   - Dashboards and analytics
3. Once approved, update all downstream docs and implementations.

Authoritative source for shared language, enums, and core flows across:
- Product Requirements Document
- Database Schema
- REST API design
- OpenAPI specs
- Dashboard docs and feature matrices

All other documents MUST align with these definitions.

---

## 1. Core Domain Terms

- **Booking**: A customer’s request for one or more rides between locations, with timing and pricing attached. This is the canonical term (do NOT use "trip" or "job" in specs; UI copies may localize).
- **Ride / Leg**: A single origin–destination segment within a booking (e.g., multi-stop itinerary → multiple legs).
- **Client**: End-user requesting transportation services (sometimes "rider" in UX copy).
- **Driver**: Service provider fulfilling bookings.
- **Support Agent**: Human operator handling tickets, adjustments, and escalations.
- **Admin**: Internal user managing configuration, compliance, pricing, and system-wide settings.

---

## 2. Entity Identifiers & Conventions

- All primary resources use UUIDv4 as canonical identifiers: `booking_id`, `client_id`, `driver_id`, `vehicle_id`, `payment_id`.
- Time fields are in ISO 8601 UTC (`2025-01-01T12:00:00Z`).
- Monetary fields use:
  - `amount` as integer in minor units (e.g., cents).
  - `currency` as ISO 4217 (e.g., `USD`, `EUR`).

---

## 3. Driver Status Enum

Canonical driver status values:

- `pending_verification`: Driver has registered but documents/background checks are not fully approved.
- `inactive`: Approved but not currently allowed to receive jobs (e.g., temporarily disabled).
- `active`: Fully approved and allowed to toggle availability.
- `suspended`: Temporarily blocked due to compliance or behavior issues.
- `banned`: Permanently blocked from the platform.

### Driver Availability Sub-States

- `offline`: Not sending heartbeats; not available for assignments.
- `available`: Online and eligible to receive offers.
- `on_trip`: Assigned and handling a live booking.
- `on_break`: Online but not eligible for new offers (optional, future).

All related tables and APIs MUST use these exact enums (or stable mappings if provider requires different internal representation).

---

## 4. Booking Status Enum (High-Level)

Canonical booking lifecycle high-level states:

- `draft`: Created but not yet confirmed by client (quote/cart-like).
- `requested`: Client confirmed; looking for a driver.
- `driver_assigned`: Driver accepted but has not yet started trip.
- `driver_en_route_pickup`: Driver is en route to pickup location.
- `driver_arrived`: Driver is at pickup; waiting for client.
- `in_progress`: Client onboard; trip in progress.
- `completed`: Trip completed successfully.
- `cancelled_by_client`: Cancelled by client under applicable policy.
- `cancelled_by_driver`: Cancelled by driver.
- `cancelled_by_system`: Cancelled automatically (timeout, payment failure, etc.).
- `no_show_client`: Driver arrived and waited; rider did not show.
- `no_show_driver`: Driver did not show (rare, escalated).
- `disputed`: Completed but under dispute/review.
- `refunded`: Resolved with refund/adjustment (may be a sub-state or flag).

All downstream specs must treat these as the canonical states. Specialization (e.g., `in_progress_pickup`, `in_progress_dropoff`) can be handled via sub-status or derived flags, but not by inventing new main enums.

---

## 5. Role Capabilities (Overview)

High-level summary; detailed matrix lives in "RBAC Matrix v2" doc.

- **Client**:
  - Create/modify/cancel own bookings (subject to policies).
  - View past trips, invoices, and receipts.
  - Manage payment methods and profile.
  - Contact support; rate and review trips.

- **Driver**:
  - Toggle availability.
  - Accept/decline job offers.
  - Navigate to pickup/dropoff.
  - Mark states: arrived, start trip, complete trip.
  - View earnings, payouts, performance metrics.

- **Support Agent (T1/T2)**:
  - Search bookings, clients, drivers.
  - View event timelines and audit logs.
  - Perform constrained modifications (time, route, pricing adjustments) subject to playbook.
  - Trigger refunds/credits within approved thresholds.
  - Add internal notes and escalate.

- **Admin**:
  - All Support capabilities plus:
  - Manage pricing, promotions, and policies.
  - Manage driver onboarding, document validation, and suspensions.
  - Configure system-wide settings (surge rules, assignment policies).
  - Manage RBAC roles and permissions.

---

## 6. Naming & Terminology Rules

- Use **"booking"** in all data models and APIs.
- UI copy can say "trip" but underlying models, logs, and metrics use "booking".
- Use **"client"** in backoffice and schemas; "rider" is viewed as a label in UX only.
- Do not mix **British/American** variations in canonical names (`canceled` vs `cancelled`); choose one:
  - API + DB use `canceled`.
  - UI copy can localize.

---

## 7. Cross-Document Dependencies

- Database schemas MUST:
  - Use these enums for columns or map provider-specific values to these.
- OpenAPI specs MUST:
  - Refer to enums defined here.
  - Provide consistent descriptions.
- Feature matrices & dashboard docs MUST:
  - Reference canonical role names & booking states.
  - Avoid introducing new role labels or state names without updating this document first.

---

## 8. Change Management

Any change to enums or critical terminology:
1. Propose update here.
2. Review for impact on:
   - DB migrations
   - API backward compatibility
   - Dashboards and analytics
3. Once approved, update all downstream docs and implementations.