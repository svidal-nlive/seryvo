# Real-Time Services Architecture

Specifies real-time channels and protocols for:
- Live driver tracking
- Chat between client and driver/support
- Presence/availability status
- System notifications

---

## 1. Transport Layer

Default: **WebSocket** for bidirectional real-time communication.

Fallbacks:
- Long-lived HTTP (SSE) for platforms where WebSocket is unreliable.
- Push notifications for backgrounded/closed apps.

Authentication:
- Short-lived JWT with:
  - `sub`: user ID
  - `role`: `client` / `driver` / `support` / `admin`
  - `scopes`: channels allowed to subscribe/publish
- Token refresh flow via REST API.

---

## 2. Channels & Topics

### 2.1 Tracking Channel

- Channel pattern (per booking): `booking.{booking_id}.tracking`
- Subscribers:
  - Client app (for their bookings).
  - Support (for any ongoing booking).
- Payload example:
  ```json
  {
    "type": "driver_location_update",
    "booking_id": "uuid",
    "driver_id": "uuid",
    "lat": 12.3456,
    "lng": -12.3456,
    "bearing": 90.0,
    "speed_kmh": 35.0,
    "timestamp": "2025-01-01T12:00:00Z"
  }
  ```

### 2.2 Chat Channel

- Channel pattern: `booking.{booking_id}.chat`
- Message payload:
  ```json
  {
    "type": "chat_message",
    "booking_id": "uuid",
    "from_role": "client|driver|support",
    "from_id": "uuid",
    "message_id": "uuid",
    "content": "string",
    "sent_at": "2025-01-01T12:00:00Z"
  }
  ```

### 2.3 System Events

- Channel pattern: `user.{user_id}.events`
- Used for:
  - Booking status changes.
  - Assignment offers.
  - Policy-related notices (surge, cancellation, etc.).

---

## 3. Location Update Policy

- Driver app sends heartbeats every X seconds when:
  - `availability = available`
  - or `booking_status ∈ {driver_en_route_pickup, driver_arrived, in_progress}`

Constraints:
- Throttling on server side:
  - Only emit location updates to subscribers at max Y updates per second.
- Low-battery / low-data mode:
  - Allow reduced frequency.
- Missing heartbeats:
  - After N missed intervals, mark driver as `offline` and notify.

---

## 4. Reconnection & Reliability

- Clients must support:
  - Reconnect with back-off strategy.
  - Resubscribe to active channels after reconnect.
- Server retains:
  - Minimal event history per booking (last N chat messages + last known location).
- For critical events (booking assignment, cancellation):
  - Always backstop with push notification and email/SMS where possible.

---

## 5. Security & Privacy

- Channel access controlled via role- and booking-based ACL:
  - Client can only subscribe to `booking.{booking_id}` if they own the booking.
  - Driver can only subscribe if assigned.
  - Support/Admin may subscribe via backoffice with additional auditing.
- PII minimization in payloads:
  - No full addresses in raw tracking events—client already has them.
  - Use booking ID references instead.

---

## 6. Monitoring & Metrics

Track:
- Connection success/failure rates by platform.
- Average message latency.
- Missed heartbeat rates.
- Chat engagement (messages per booking).
