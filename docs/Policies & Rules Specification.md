# Policies & Rules Specification
# Policies & Rules Specification

Defines platform-wide operational rules for:
- Driver assignment
- Cancellations and refunds
- Scheduling & lead times
- Grace periods, waiting fees, no-shows
- Surge and dynamic pricing inputs

---

## 1. Driver Assignment Policy

### 1.1 Dispatch Strategy

Primary dispatch mode: **nearest-eligible-driver with scoring**.

Scoring function (example):

$$
score = w_d \cdot distance\_score + w_t \cdot time\_since\_last\_trip + w_r \cdot rating\_score
$$

Where:
- `distance_score`: normalized inverse distance to pickup.
- `time_since_last_trip`: preference to drivers who have been idle longer.
- `rating_score`: favor higher-rated drivers.
- Weights `w_d`, `w_t`, `w_r` configurable per market.

### 1.2 Eligibility Rules

Driver is eligible if:
- Status = `active`
- Availability = `available`
- Within max pickup radius (e.g., 10 km).
- No blocking flags (compliance, document expired, ongoing dispute).
- Vehicle matches requested category (e.g., standard, XL, premium).

### 1.3 Offer Flow

- For each `requested` booking:
  1. Compute candidate list and scores.
  2. Offer to top N drivers sequentially or in parallel.
  3. If no acceptance within `assignment_timeout_seconds`, transition booking to `canceled_by_system` and notify client (or retry with broader radius).

All parameters (`N`, timeouts, radius) are market-configurable and versioned.

---

## 2. Cancellation & Refund Policies

### 2.1 Free Cancellation Windows

- **Before driver assigned (`draft`, `requested`)**:
  - Client: free cancellation.
- **After driver assigned, before `driver_en_route_pickup`**:
  - Client: free cancellation up to X minutes; after that, cancellation fee Y.
- **After `driver_en_route_pickup` or `driver_arrived`**:
  - Client: cancellation fee by default (unless special conditions).

### 2.2 Driver Cancellations

- Driver cancellations after assignment create friction and may impact:
  - Driver reliability score.
  - Access to high-demand periods.
- Multiple late cancellations trigger review and potential `suspended` status.

### 2.3 No-Show & Waiting Fees

- **Driver Wait at Pickup**:
  - First G minutes free (grace period).
  - After that, per-minute waiting fee, up to a cap.
- **Client No-Show**:
  - If client does not appear within H minutes of `driver_arrived`:
    - Mark `no_show_client`.
    - Charge no-show fee (configurable).
- **Driver No-Show**:
  - If driver fails to arrive or move toward pickup:
    - Mark `no_show_driver`.
    - No charge to client; potential compensation credit.
    - Driver reliability negatively impacted.

---

## 3. Scheduling & Lead-Time Constraints

- Minimum lead time for scheduled bookings: e.g., 15 minutes.
- Maximum lead time: e.g., 30 days.
- Rescheduling:
  - Client may reschedule if:
    - New time is within allowed window.
    - Change happens before cutoff (e.g., 60 minutes before pickup).
  - Rescheduling close to pickup time may incur adjustment or be disallowed.

---

## 4. Dynamic Pricing & Surge

- Surge is applied per geo-zone and time window.
- Inputs:
  - Real-time demand/supply ratio.
  - Event-based boosts (concerts, holidays).
- Outputs:
  - Multiplier or base fare adjustments.
  - Surge label and explanation for transparency.

Policies:
- Always show estimated fare (or range) before confirmation.
- Indicate surge with clear UI labels ("High demand", etc.).
- Cap maximum multiplier per market (regulatory or business).

---

## 5. Policy Overrides

Support/Admin may override policy outcomes in controlled fashion:
- Waive fees.
- Issue credits/refunds.
- Manually reassign drivers or rebook clients.

All overrides:
- Must be logged with reason code and internal note.
- Visible in Support dashboard and audit logs.

---

## 6. Versioning & Market Differences

- Policies are versioned (e.g., `policy_version` stored on bookings).
- Markets can define overrides while keeping a global default.
- Changes to policies must be:
  - Effective from a date/time.
  - Non-retroactive to completed bookings unless explicitly decided.

Refer to:
- `Booking State Machine.md` for effect on states.
- `Payments and Earnings Specification.md` for fee allocation between platform and drivers.

Defines platform-wide operational rules for:
- Driver assignment
- Cancellations and refunds
- Scheduling & lead times
- Grace periods, waiting fees, no-shows
- Surge and dynamic pricing inputs

---

## 1. Driver Assignment Policy

### 1.1 Dispatch Strategy

Primary dispatch mode: **nearest-eligible-driver with scoring**.

Scoring function (example):

$$
score = w_d \cdot distance\_score + w_t \cdot time\_since\_last\_trip + w_r \cdot rating\_score
$$

Where:
- `distance_score`: normalized inverse distance to pickup.
- `time_since_last_trip`: preference to drivers who have been idle longer.
- `rating_score`: favor higher-rated drivers.
- Weights `w_d`, `w_t`, `w_r` configurable per market.

### 1.2 Eligibility Rules

Driver is eligible if:
- Status = `active`
- Availability = `available`
- Within max pickup radius (e.g., 10 km).
- No blocking flags (compliance, document expired, ongoing dispute).
- Vehicle matches requested category (e.g., standard, XL, premium).

### 1.3 Offer Flow

- For each `requested` booking:
  1. Compute candidate list and scores.
  2. Offer to top N drivers sequentially or in parallel.
  3. If no acceptance within `assignment_timeout_seconds`, transition booking to `canceled_by_system` and notify client (or retry with broader radius).

All parameters (`N`, timeouts, radius) are market-configurable and versioned.

---

## 2. Cancellation & Refund Policies

### 2.1 Free Cancellation Windows

- **Before driver assigned (`draft`, `requested`)**:
  - Client: free cancellation.
- **After driver assigned, before `driver_en_route_pickup`**:
  - Client: free cancellation up to X minutes; after that, cancellation fee Y.
- **After `driver_en_route_pickup` or `driver_arrived`**:
  - Client: cancellation fee by default (unless special conditions).

### 2.2 Driver Cancellations

- Driver cancellations after assignment create friction and may impact:
  - Driver reliability score.
  - Access to high-demand periods.
- Multiple late cancellations trigger review and potential `suspended` status.

### 2.3 No-Show & Waiting Fees

- **Driver Wait at Pickup**:
  - First G minutes free (grace period).
  - After that, per-minute waiting fee, up to a cap.
- **Client No-Show**:
  - If client does not appear within H minutes of `driver_arrived`:
    - Mark `no_show_client`.
    - Charge no-show fee (configurable).
- **Driver No-Show**:
  - If driver fails to arrive or move toward pickup:
    - Mark `no_show_driver`.
    - No charge to client; potential compensation credit.
    - Driver reliability negatively impacted.

---

## 3. Scheduling & Lead-Time Constraints

- Minimum lead time for scheduled bookings: e.g., 15 minutes.
- Maximum lead time: e.g., 30 days.
- Rescheduling:
  - Client may reschedule if:
    - New time is within allowed window.
    - Change happens before cutoff (e.g., 60 minutes before pickup).
  - Rescheduling close to pickup time may incur adjustment or be disallowed.

---

## 4. Dynamic Pricing & Surge

- Surge is applied per geo-zone and time window.
- Inputs:
  - Real-time demand/supply ratio.
  - Event-based boosts (concerts, holidays).
- Outputs:
  - Multiplier or base fare adjustments.
  - Surge label and explanation for transparency.

Policies:
- Always show estimated fare (or range) before confirmation.
- Indicate surge with clear UI labels ("High demand", etc.).
- Cap maximum multiplier per market (regulatory or business.

---

## 5. Policy Overrides

Support/Admin may override policy outcomes in controlled fashion:
- Waive fees.
- Issue credits/refunds.
- Manually reassign drivers or rebook clients.

All overrides:
- Must be logged with reason code and internal note.
- Visible in Support dashboard and audit logs.

---

## 6. Versioning & Market Differences

- Policies are versioned (e.g., `policy_version` stored on bookings).
- Markets can define overrides while keeping a global default.
- Changes to policies must be:
  - Effective from a date/time.
  - Non-retroactive to completed bookings unless explicitly decided.

Refer to:
- "Booking State Machine" for effect on states.
- "Payments & Earnings Specification" for fee allocation between platform and drivers.