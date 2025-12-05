# System Error & Edge Case Specification

Defines:
- Error taxonomy
- HTTP ↔ business error mapping
- Idempotency & retries
- Domain-specific edge cases and fallbacks

---

## 1. Error Categories

High-level categories:

- `VALIDATION_ERROR`
- `AUTHENTICATION_ERROR`
- `AUTHORIZATION_ERROR`
- `RESOURCE_NOT_FOUND`
- `CONFLICT`
- `RATE_LIMITED`
- `INTERNAL_ERROR`
- `THIRD_PARTY_ERROR` (e.g., payment provider)
- `BUSINESS_RULE_VIOLATION` (e.g., cancellation window exceeded)

Common schema (aligned with `ErrorResponse` in OpenAPI):

```json
{
  "code": "string_machine_readable",
  "message": "Human-readable message",
  "category": "VALIDATION_ERROR|...",
  "details": {
    "field": "optional additional data"
  },
  "correlation_id": "uuid"
}
```

---

## 2. HTTP to Business Error Mapping (Examples)

- `400`:
  - `VALIDATION_ERROR`, `BUSINESS_RULE_VIOLATION`
- `401`:
  - `AUTHENTICATION_ERROR`
- `403`:
  - `AUTHORIZATION_ERROR`
- `404`:
  - `RESOURCE_NOT_FOUND`
- `409`:
  - `CONFLICT` (e.g., invalid booking state transition)
- `429`:
  - `RATE_LIMITED`
- `500` / `502` / `503`:
  - `INTERNAL_ERROR` or `THIRD_PARTY_ERROR`

---

## 3. Idempotency & Retries

- For operations that create or mutate state (e.g., create booking, charge payment):
  - Clients MUST send an `Idempotency-Key` header.
- Server behavior:
  - If same key + request body seen before:
    - Return original response (success or failure).
  - If different body with same key:
    - Return `409 CONFLICT`.

Retry guidelines:
- Safe to retry on:
  - Network timeouts.
  - 5xx errors from idempotent endpoints.
- Client SDKs should implement exponential back-off.

---

## 4. Domain Edge Cases

Examples (expand as needed):

- Booking modification while in `in_progress`:
  - Disallow major changes (pickup/dropoff) but allow small notes.
- Payment authorization succeeded but capture failed:
  - Mark booking as `completed` but `payment_status = failed`.
  - Trigger automatic retry and support workflow.
- Driver-document expiry:
  - If critical doc expired:
    - Transition driver status from `active` to `inactive`.
    - Disallow new assignments.
    - Notify driver and support.

---

## 5. Rate Limiting

- Public APIs (client/driver apps):
  - Per-IP and per-user token limits (e.g., 60 req/min).
- Backoffice APIs:
  - Softer limits but still enforced for abuse detection.
- Response:
  - `429 RATE_LIMITED` + headers `Retry-After`.

---

## 6. Logging & Observability

- Every 5xx must be logged with stack trace (server side only).
- All requests carry:
  - `X-Request-Id` (correlation).
  - `X-Client-Version`, where applicable.

- Error dashboards:
  - Group by `code`, `category`, `endpoint`, `market`.
