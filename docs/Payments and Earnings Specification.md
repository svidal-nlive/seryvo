# Payments & Earnings Specification

Defines end-to-end flows for:
- Client payments
- Driver earnings & payouts
- Fees, commissions, and adjustments
- Disputes, refunds, and reconciliations

---

## 1. High-Level Model

- **Booking**:
  - Has one or more **payment intents**.
  - Has a fare breakdown (base, time, distance, fees, surge, discounts).
- **Payment**:
  - Authorization & capture lifecycle with provider.
- **Earnings**:
  - Driver’s share for each completed booking.
- **Payout**:
  - Aggregation of earnings over a period to driver’s bank.

---

## 2. Client Payment Flow

1. **Authorization**:
   - At `requested` or `driver_assigned`, create a payment intent:
     - Amount: estimated fare + buffer.
     - State: `authorized`.
2. **Capture**:
   - At `completed`, calculate final fare.
   - Capture up to authorized amount (adjust if needed).
3. **Adjustments**:
   - Small post-trip adjustments:
     - Additional time/distance → incremental charge.
     - Refunds/discounts → partial refund.
4. **Edge Cases**:
   - Auth success, capture fail:
     - Mark booking as `completed` but `payment_status = failed`.
     - Trigger automatic retry and support workflow.

---

## 3. Fare Breakdown

Store per booking:

- `base_fare`
- `distance_component`
- `time_component`
- `surge_multiplier` or `surge_amount`
- `fees` (platform, regulatory)
- `taxes`
- `discounts` (promos, coupons)
- `total_fare`

All values in minor units + currency.

---

## 4. Commission & Driver Earnings

- Default model:
  - **Driver share** = (total_fare - taxes - third-party fees) × (1 - platform_commission_rate)
- Commission rate:
  - Configurable by market, time, and vehicle category.
- Additional:
  - Bonuses and incentives can be modeled as separate earnings rows.

---

## 5. Payouts

- Payout cycle:
  - Weekly (or configurable).
  - Minimum payout threshold.
- Process:
  - Aggregate earnings by driver & currency.
  - Deduct:
    - Chargebacks / clawbacks.
    - Fees owed by driver (e.g., device rental).
  - Initiate transfer via payout provider (e.g., bank transfer).
- States:
  - `payout_pending`
  - `payout_in_progress`
  - `payout_completed`
  - `payout_failed`

---

## 6. Refunds & Disputes

- Client dispute creates:
  - `dispute` entity referencing booking & payment.
- Outcomes:
  - No change.
  - Partial refund.
  - Full refund.
- Impact on driver:
  - Rules define:
    - When platform absorbs cost.
    - When driver earnings are adjusted.
- All changes:
  - Logged as earnings adjustments with reason codes.

---

## 7. Reconciliation

- Daily job:
  - Reconcile platform records with payment provider exports.
  - Detect mismatches:
    - Missing captures.
    - Duplicates.
- Reports:
  - Per-market and global reconciliation summaries.
