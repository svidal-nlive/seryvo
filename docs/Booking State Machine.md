# Booking State Machine
# Booking State Machine

Authoritative model of booking lifecycle, transitions, and actors.

---

## 1. States

(Refer to `Platform Canonical Definitions.md` for formal enum list.)

Core states:

- `draft`
- `requested`
- `driver_assigned`
- `driver_en_route_pickup`
- `driver_arrived`
- `in_progress`
- `completed`
- `canceled_by_client`
- `canceled_by_driver`
- `canceled_by_system`
- `no_show_client`
- `no_show_driver`
- `disputed`
- `refunded`

---

## 2. Transitions Table

Each row: From → To, Who/What can trigger, Preconditions, Side effects.

| From                     | To                        | Triggered By        | Preconditions                               | Side Effects                                          |
|--------------------------|---------------------------|---------------------|---------------------------------------------|-------------------------------------------------------|
| `draft`                  | `requested`               | Client              | All required fields provided; payment OK    | Authorization hold on payment; create booking_events |
| `requested`              | `driver_assigned`         | Dispatch engine     | Eligible drivers available                  | Notify client & driver; lock fare/ETA snapshot       |
| `driver_assigned`        | `driver_en_route_pickup`  | Driver              | Driver accepted; still within lead-time     | Start driver navigation; notify client               |
| `driver_en_route_pickup` | `driver_arrived`          | Driver              | Driver within arrival radius                | Start arrival timer for no-show/fees                 |
| `driver_arrived`         | `in_progress`             | Driver              | Client on board; within grace window        | Start trip meter; begin distance/time tracking       |
| `in_progress`            | `completed`               | Driver              | Reached final dropoff                       | Stop tracking; finalize fare; charge payment         |
| `requested`              | `canceled_by_client`      | Client              | Within free cancel window or fee applied    | Cancel dispatch; optionally apply cancellation fee   |
| `driver_assigned`        | `canceled_by_system`      | System              | No driver acceptance within timeout         | Notify client; optionally re-offer or suggest retry  |
| `driver_arrived`         | `no_show_client`          | System/Driver       | Client no-show beyond grace period          | Charge no-show fee; notify client & support          |
| `driver_assigned`/`driver_en_route_pickup` | `no_show_driver` | System | Driver inactivity or non-arrival detected   | Notify client; rematch or cancel; flag driver        |
| `completed`              | `disputed`                | Client/Support      | Within dispute window                       | Freeze payout until resolved; create support ticket  |
| `disputed`               | `refunded`                | Support/Admin       | Resolution decision                          | Issue partial/full refund; adjust driver earnings    |

---

## 3. Automatic Time-Based Transitions

- **Assignment timeout**:
  - `requested` → `canceled_by_system` after X seconds if no driver accepts.
- **Arrival no-show**:
  - `driver_arrived` → `no_show_client` after grace period, if driver marks no-show or system detects no client boarding.
- **Driver no-show**:
  - `driver_assigned` or `driver_en_route_pickup` → `no_show_driver` if driver fails to move or arrive within a configured window.

Parameters (to be set in `Policies & Rules Specification.md`):
- `assignment_timeout_seconds`
- `pickup_grace_period_minutes`
- `driver_no_show_timeout_minutes`

---

## 4. Who Can Modify Bookings in Each State

- **Client**:
  - Can cancel from `draft`, `requested`, `driver_assigned`, `driver_en_route_pickup` subject to policy and fees.
  - Can change pickup time/location while in `draft` or `requested` (limits defined elsewhere).
- **Driver**:
  - Can cancel from `driver_assigned`, `driver_en_route_pickup`, `driver_arrived` (with stronger scrutiny/logging).
- **Support**:
  - Can override or correct states in controlled ways (see `Support Operations Playbook.md`) with mandatory internal notes.
- **System**:
  - Can auto-cancel or transition based on policy and telemetry.

---

## 5. Events & Audit Logging

For each transition, log to `booking_events` table (per DB schema):

- `booking_id`
- `from_state`
- `to_state`
- `triggered_by` (`client`, `driver`, `support`, `system`)
- `triggered_by_id` (optional, if actor-specific)
- `reason_code` (see Policies & Error docs)
- `metadata` (JSON: GPS location, timing, client app info, etc.)
- `created_at`

All dashboards should display this event timeline as the single source of truth for "what happened when".

---

## 6. Notifications

Map transitions to notifications:

- `requested` → `driver_assigned`:
  - Notify client and assigned driver.
- `driver_arrived`:
  - Notify client with "driver arrived" + waiting clock.
- `in_progress` → `completed`:
  - Notify client with receipt link; notify driver with earnings summary.
- Any transition to `canceled_*` or `no_show_*`:
  - Notify client and/or driver with policy explanation and fee/credit details.

Notifications are delivered via:
- Push
- In-app banners
- Email/SMS (for critical cases, configurable)

Definition of payloads and channels is in `Real-Time Services Architecture.md`.

Authoritative model of booking lifecycle, transitions, and actors.

---

## 1. States

(Refer to "Platform Canonical Definitions" for formal enum list.)

Core states:

- `draft`
- `requested`
- `driver_assigned`
- `driver_en_route_pickup`
- `driver_arrived`
- `in_progress`
- `completed`
- `canceled_by_client`
- `canceled_by_driver`
- `canceled_by_system`
- `no_show_client`
- `no_show_driver`
- `disputed`
- `refunded`

---

## 2. Transitions Table

Each row: From → To, Who/What can trigger, Preconditions, Side effects.

Example subset (you can expand with precise conditions):

| From                  | To                       | Triggered By        | Preconditions                               | Side Effects                                          |
|-----------------------|--------------------------|---------------------|---------------------------------------------|-------------------------------------------------------|
| `draft`               | `requested`              | Client              | All required fields provided; payment OK    | Authorization hold on payment; create booking_events |
| `requested`           | `driver_assigned`        | Dispatch engine     | Eligible drivers available                   | Notify client & driver; lock fare/ETA snapshot       |
| `driver_assigned`     | `driver_en_route_pickup` | Driver              | Driver accepted; still within lead-time     | Start driver navigation; notify client               |
| `driver_en_route_pickup` | `driver_arrived`     | Driver              | Driver within arrival radius                | Start arrival timer for no-show/fees                 |
| `driver_arrived`      | `in_progress`            | Driver              | Client on board; within grace window        | Start trip meter; begin distance/time tracking       |
| `in_progress`         | `completed`              | Driver              | Reached final dropoff                       | Stop tracking; finalize fare; charge payment         |
| `requested`           | `canceled_by_client`     | Client              | Within free cancel window or fee applied    | Cancel dispatch; optionally apply cancellation fee   |
| `driver_assigned`     | `canceled_by_system`     | System              | No driver acceptance within timeout         | Notify client; optionally re-offer or suggest retry  |
| `driver_arrived`      | `no_show_client`         | System/Driver       | Client no-show beyond grace period          | Charge no-show fee; notify client & support          |
| `completed`           | `disputed`               | Client/Support      | Within dispute window                       | Freeze payout until resolved; create support ticket  |
| `disputed`            | `refunded`               | Support/Admin       | Resolution decision                          | Issue partial/full refund; adjust driver earnings    |

---

## 3. Automatic Time-Based Transitions

- **Assignment timeout**:
  - `requested` → `canceled_by_system` after X seconds if no driver accepts.
- **Arrival no-show**:
  - `driver_arrived` → `no_show_client` after grace period, if driver marks no-show or system detects no client boarding.
- **Driver no-show**:
  - `driver_assigned` or `driver_en_route_pickup` → `no_show_driver` if driver fails to move or arrive within a configured window.

Parameters (to be set in Policies & Rules doc):
- `assignment_timeout_seconds`
- `pickup_grace_period_minutes`
- `driver_no_show_timeout_minutes`

---

## 4. Who Can Modify Bookings in Each State

- **Client**:
  - Can cancel from `draft`, `requested`, `driver_assigned`, `driver_en_route_pickup` subject to policy and fees.
  - Can change pickup time/location while in `draft` or `requested` (limits defined elsewhere).
- **Driver**:
  - Can cancel from `driver_assigned`, `driver_en_route_pickup`, `driver_arrived` (with stronger scrutiny/logging).
- **Support**:
  - Can override or correct states in controlled ways (see Support Playbook) with mandatory internal notes.
- **System**:
  - Can auto-cancel or transition based on policy and telemetry.

---

## 5. Events & Audit Logging

For each transition, log to `booking_events` table (per DB schema):

- `booking_id`
- `from_state`
- `to_state`
- `triggered_by` (`client`, `driver`, `support`, `system`)
- `triggered_by_id` (optional, if actor-specific)
- `reason_code` (see Policies & Error docs)
- `metadata` (JSON: GPS location, timing, client app info, etc.)
- `created_at`

All dashboards should display this event timeline as the single source of truth for "what happened when".

---

## 6. Notifications

Map transitions to notifications:

- `requested` → `driver_assigned`:
  - Notify client and assigned driver.
- `driver_arrived`:
  - Notify client with "driver arrived" + waiting clock.
- `in_progress` → `completed`:
  - Notify client with receipt link; notify driver with earnings summary.
- Any transition to `canceled_*` or `no_show_*`:
  - Notify client and/or driver with policy explanation and fee/credit details.

Notifications are delivered via:
- Push
- In-app banners
- Email/SMS (for critical cases, configurable)

Definition of payloads and channels is in the Real-Time Architecture document.