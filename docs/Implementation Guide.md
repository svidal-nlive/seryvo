# Seryvo Transport Booking Platform — Implementation Guide

This guide explains how to implement the production system using the
**canonical specs** in `docs/` while reusing the **layout and interaction
patterns** from `demo-concept/`. All new implementation code should live in
`project/`.

---

## 1. Directories & Code Ownership

- `demo-concept/`
  - High-fidelity prototype and UX sandbox.
  - Contains non-canonical types (`Job`, `JobStatus`, etc.).
  - Used as a visual/style reference only.

- `project/`
  - Source of truth for production-ready frontend implementation.
  - Uses canonical names (`booking`, `client`, `driver`, etc.).
  - Aligns with:
    - `Platform Canonical Definitions.md`
    - `Product Requirements Document.md`
    - `Database Schema (SQL-ready).md`
    - `OpenAPI 3.0 FULL spec.md` & `MVP spec.md`

- `docs/`
  - Requirements, specs, and reference material.
  - This guide (`Implementation Guide.md`) sits here as the glue between
    product specs and implementation.

---

## 2. Canonical Domain Model (Frontend)

All new UI and services in `project/` must use the types defined in
`project/types.ts`.

Key elements:

- **Identifiers & time**
  - `UUID` — string alias for `uuidv4` IDs.
  - `IsoDateTime` — ISO 8601 UTC timestamp strings.

- **Roles** (`Role`)
  - `client`, `driver`, `support_agent`, `admin`.
  - Implemented as a discriminated union on top of `BaseUser` in
    `project/types.ts`:
    - `Client`, `Driver`, `SupportAgent`, `Admin`.

- **Driver status enums**
  - `DriverCoreStatus` — onboarding/compliance state.
    - `pending_verification`, `inactive`, `active`, `suspended`, `banned`.
  - `DriverAvailabilityStatus` — runtime availability state.
    - `offline`, `available`, `on_trip`, `on_break`.

- **Booking status enum** (`BookingStatus`)
  - Exactly as defined in **Platform Canonical Definitions**:
    - `draft`, `requested`, `driver_assigned`, `driver_en_route_pickup`,
      `driver_arrived`, `in_progress`, `completed`,
      `canceled_by_client`, `canceled_by_driver`, `canceled_by_system`,
      `no_show_client`, `no_show_driver`, `disputed`, `refunded`.

- **Money & pricing**
  - `MoneyAmount` — `{ amount: number; currency: string }` (minor units).
  - `BookingPriceBreakdown` — base, distance, time, extras, tax,
    discount, and `grand_total`.

- **Locations & rides**
  - `Location` — address + optional lat/lng and `place_id`.
  - `RideLeg` — individual origin–destination leg within a booking,
    with `sequence_index` for ordering.

- **Booking** (`Booking`)
  - Canonical representation of a client request:
    - `booking_id`, `client_id`, optional `driver_id`.
    - `status`, `created_at`, `requested_pickup_at`, `completed_at`.
    - `is_asap` flag (ASAP vs scheduled).
    - `legs: RideLeg[]` — multi-stop support.
    - Passenger & luggage counts.
    - Accessibility requirements and notes.
    - `service_type` and `options`.
    - `price_breakdown?: BookingPriceBreakdown`.
    - `timeline: BookingTimelineEvent[]`.
    - Client rating and feedback fields.

- **Messaging & support**
  - `ChatSession`, `Message` for booking-bound and support chats.
  - `SupportTicket` for ticket queue, status, priority, and category.

See `project/types.ts` for the exact field names and shapes.

---

## 3. Legacy Demo Compatibility Layer

To make it easy to migrate from `demo-concept/` to `project/`,
`project/types.ts` also defines a small **legacy compatibility layer** that
mirrors the prototype’s `types.ts`:

- `UserRole`, `JobStatus`, `LegacyUser`, `LegacyJob`, etc.
- These should be used **only** when integrating with existing demo code or
  while incrementally porting components.

### 3.1 Status Mapping

Two helper functions provide a canonical mapping between old and new
status enums:

- `mapJobStatusToBookingStatus(status: JobStatus): BookingStatus`
  - Uses the mapping described in **Platform Canonical Definitions**:
    - `PENDING` → `requested`
    - `ACCEPTED` → `driver_assigned`
    - `EN_ROUTE` → `driver_en_route_pickup`
    - `ARRIVED` → `driver_arrived`
    - `IN_PROGRESS` → `in_progress`
    - `COMPLETED` → `completed`
    - `CANCELLED` → `canceled_by_system` (actor-specific choice deferred to
      backend or higher-level logic).

- `mapBookingStatusToJobStatus(status: BookingStatus): JobStatus`
  - Canonical → legacy mapping for UI widgets that still expect
    `JobStatus`:
    - `requested` / `draft` → `PENDING`
    - `driver_assigned` → `ACCEPTED`
    - `driver_en_route_pickup` → `EN_ROUTE`
    - `driver_arrived` → `ARRIVED`
    - `in_progress` → `IN_PROGRESS`
    - `completed`, `refunded`, `disputed` → `COMPLETED`
    - Any canceled / no-show → `CANCELLED`.

New code that speaks to real APIs should **not** use `JobStatus` directly;
that enum exists only to support existing demo views while they are being
ported.

---

## 4. Implementation Phases (Frontend)

The implementation will proceed in four main phases, all under `project/`.

### Phase 1 — Canonical Types & Client Booking Flow

- Use `project/types.ts` across new React components.
- Implement a Client dashboard that:
  - Creates `Booking` objects using the canonical fields.
  - Supports:
    - Pickup/dropoff selection with multi-leg support.
    - ASAP vs scheduled bookings.
    - Passenger/luggage/accessibility options.
    - Service type selection and price breakdown display.
  - Stores timeline events using `BookingTimelineEvent`.

### Phase 2 — Driver & Support Dashboards

- Driver dashboard:
  - Show bookings by canonical `BookingStatus`.
  - Allow transitions: `requested` → `driver_assigned` →
    `driver_en_route_pickup` → `driver_arrived` → `in_progress` →
    `completed`.
  - Reflect canonical driver availability enums.

- Support dashboard:
  - Use `SupportTicket`, `ChatSession`, and `Booking` views.
  - Show booking timelines and chat logs.

### Phase 3 — Admin & Configuration

- Admin dashboard for managing users, pricing, regions, and policies,
  all keyed by canonical enums (`Role`, `BookingStatus`, driver enums).

### Phase 4 — API Integration

- Replace any mock adapters with a real HTTP client generated from the
  OpenAPI specs.
- Ensure that values sent over the wire match the enums and conventions
  in `Platform Canonical Definitions.md` and `Database Schema (SQL-ready).md`.

---

## 5. Coding Conventions

- **Terminology**
  - Use "booking" and `Booking*` in all models and APIs.
  - UI copy may say "trip" or "ride" where appropriate, but internal
    types must remain canonical.

- **Enums**
  - Do not invent new status strings without first updating
    `Platform Canonical Definitions.md`.
  - When integrating with providers that use different enums, map them
    to the canonical enums at the boundary layer (e.g., adapter
    services).

- **Money & time**
  - Always use `MoneyAmount` for currency-bearing fields.
  - Always use `IsoDateTime` strings for timestamps on the frontend.

This guide will evolve as we implement phases and wire the frontend to the
real backend. All new features should be added here with references to the
relevant `docs/*` spec sections.