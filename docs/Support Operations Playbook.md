# Support Operations Playbook

Operational guidelines for Support tiers handling client and driver issues.

---

## 1. Support Tiers & Responsibilities

- **Tier 1 (T1)**:
  - First-line contact.
  - Handle common issues using standard macros.
  - Limited monetary authority (small credits/refunds).
- **Tier 2 (T2)**:
  - Complex cases and edge scenarios.
  - Larger monetary authority.
  - Can modify bookings more deeply (within policy).
- **Admin/Ops**:
  - Final escalation.
  - Can override policies, adjust payouts, and modify system settings.

---

## 2. Ticket Categories

Examples:

- Billing & Payments
- Trip Issues (delays, route, behavior)
- Cancellation & No-Show Disputes
- Driver Onboarding & Documents
- Technical / App Issues
- Safety & Incident Reports (special handling)

Each category:
- Has a default owner tier.
- Has standard resolution paths & macros.

---

## 3. Booking Modification Boundaries

### 3.1 Allowed Actions (T1)

- Change pickup/dropoff **before** `driver_assigned` or early in `requested`.
- Apply small-time adjustments (e.g., correct scheduled time within tolerance).
- Apply small fixed credits/refunds (configurable max per case).
- Re-send receipts and notifications.

### 3.2 Allowed Actions (T2)

- Adjust fare components after review (distance/time corrections, promo re-application).
- Override cancellation/no-show fees within defined thresholds.
- Re-open or re-create bookings in certain states (with clear audit log).
- Mark specific events (e.g., driver no-show) after investigation.

### 3.3 Admin-Only Actions

- Hard state overrides outside of normal state machine.
- Driver suspensions and reactivations.
- Manual payouts or clawbacks.
- Configuration changes to policies and surge rules.

All modifications must:
- Be logged in `booking_events` or dedicated audit tables.
- Include `support_agent_id`, reason code, and free-text internal note.

---

## 4. Internal Notes & Macros

- **Internal notes**:
  - Never visible to client/driver.
  - Required when:
    - Money is involved.
    - State is modified.
    - Safety concerns present.
- **Macros**:
  - Pre-written templates per category:
    - Cancellation explanation.
    - No-show justification.
    - Compensation offers.
  - Must be localizable per market.

---

## 5. Escalation SLAs

Indicative (customize later):

- High severity (safety, fraud): immediate T2/Admin escalation, < 15 min response.
- Medium severity (payment issues, large monetary impact): T2 within < 4 hours.
- Low severity (minor UX, receipt issues): T1 within < 24 hours.

---

## 6. Dashboard Requirements (Linkage)

Support dashboards MUST:

- Surface:
  - Booking timeline (events from `Booking State Machine.md`).
  - Applied policies (cancellation windows, fees).
  - Prior tickets for same client/driver.
- Provide:
  - Safe, permission-scoped actions (buttons/forms) aligned to this playbook.
  - Confirmation modals summarizing impact (fees, refunds, notifications).
