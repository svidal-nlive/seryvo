# RBAC Matrix v2

Granular role and permission model for Seryvo.

---

## 1. Roles

- External:
  - `client`
  - `driver`
- Internal:
  - `support_t1`
  - `support_t2`
  - `admin_business`
  - `admin_super`

---

## 2. Capabilities Matrix (Excerpt)

| Resource / Action                  | Client | Driver | Support T1 | Support T2 | Admin Business | Admin Super |
|------------------------------------|:------:|:------:|:----------:|:----------:|:--------------:|:-----------:|
| View own bookings                  |   ✔    |   ✔    |     ✔      |     ✔      |       ✔        |     ✔       |
| Create booking                     |   ✔    |        |     ✔*     |     ✔*     |       ✔*       |     ✔*      |
| Cancel own booking (policy-bound)  |   ✔    |        |     ✔      |     ✔      |       ✔        |     ✔       |
| Adjust booking fare                |        |        |     ✖      |     ✔      |       ✔        |     ✔       |
| Waive cancellation fee             |        |        |   Limited  |     ✔      |       ✔        |     ✔       |
| Suspend driver                     |        |        |     ✖      |     ✖      |     Limited    |     ✔       |
| Modify pricing rules               |        |        |     ✖      |     ✖      |       ✔        |     ✔       |
| Manage RBAC roles                  |        |        |     ✖      |     ✖      |       ✖        |     ✔       |
| Impersonate client view            |        |        |     ✔      |     ✔      |       ✔        |     ✔       |
| Impersonate driver view            |        |        |     ✔      |     ✔      |       ✔        |     ✔       |

`✔*` indicates internal creation on behalf of client via Support/Admin.

---

## 3. Enforcement Layer

- Authorization implemented via:
  - API gateway / middleware.
  - Claims in JWT tokens (`role`, `permissions`).
- Every endpoint in OpenAPI spec must:
  - Declare required roles/permissions.
  - Reference this matrix.

---

## 4. Impersonation Rules

- Only internal roles may impersonate:
  - Must be logged with:
    - `impersonator_id`
    - `impersonated_user_id`
    - Reason code.
- No impersonation allowed for `admin_super`.

---

## 5. Auditing Requirements

Any action that:
- Changes booking states.
- Impacts money (fare, fees, payouts).
- Changes roles/permissions.

Must generate an audit record with:
- Who, what, when, where (IP, device where possible).
