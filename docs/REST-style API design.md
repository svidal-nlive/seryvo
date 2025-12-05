Below is a **REST-style API design** that lines up cleanly with the schema we just built.

Assumptions:

- Base path: `/api/v1`
    
- Auth: JWT in `Authorization: Bearer <token>`
    
- Role-based access enforced by middleware (client, driver, support, admin).
    

I’ll group endpoints by domain and point out which tables they map to.

---

## 1. Auth & Identity

### 1.1 Auth

**POST `/api/v1/auth/register`**  
Create a new user (usually client; driver signups can be separate).

- Tables: `users`, `user_roles`, `client_profiles` or `driver_profiles`.
    
- Role applied based on `role` field.
    

```jsonc
// Request
{
  "full_name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+15555555555",
  "password": "Secret123!",
  "role": "client"        // or "driver"
}

// Response
{
  "user": { "id": 1, "full_name": "Jane Doe", "email": "jane@example.com" },
  "token": "jwt_here"
}
```

**POST `/api/v1/auth/login`**

- Tables: `users`
    
- Returns JWT + basic user info.
    

**POST `/api/v1/auth/logout`** (optional if JWT-only)

**POST `/api/v1/auth/refresh`** (if using refresh tokens)

**POST `/api/v1/auth/forgot-password`**  
**POST `/api/v1/auth/reset-password`**

---

### 1.2 Current User

**GET `/api/v1/me`**

- Tables: `users`, `user_roles`, `client_profiles` or `driver_profiles`.
    

**PATCH `/api/v1/me`**

- Update basic profile fields (`users` + role-specific profile tables).
    

**GET `/api/v1/me/client-profile`**  
**PATCH `/api/v1/me/client-profile`**

- Tables: `client_profiles`, `saved_locations`
    

**GET `/api/v1/me/driver-profile`**  
**PATCH `/api/v1/me/driver-profile`**

- Tables: `driver_profiles`, `vehicles`, `driver_documents`
    

---

## 2. Regions, Service Types, Pricing

### 2.1 Regions

**GET `/api/v1/regions`**  
**GET `/api/v1/regions/:id`**

- Tables: `regions`
    

_Admin only:_

**POST `/api/v1/regions`**  
**PATCH `/api/v1/regions/:id`**  
**DELETE `/api/v1/regions/:id`**

### 2.2 Service Types

**GET `/api/v1/service-types`**

- Tables: `service_types`
    

_Admin only: POST/PATCH/DELETE `/api/v1/service-types/...`_

### 2.3 Pricing & Estimates

**GET `/api/v1/pricing/estimate`**

Compute fare estimate given pickup, dropoff, service type, etc.

- Uses: `pricing_rules`, `regions`, `service_types`, plus distance/time calculations.
    
- No DB write, just read + compute.
    

```http
GET /api/v1/pricing/estimate?service_type_id=1&pickup_lat=...&pickup_lng=...&dropoff_lat=...&dropoff_lng=...
```

---

## 3. Saved Locations (Client)

**GET `/api/v1/me/saved-locations`**  
**POST `/api/v1/me/saved-locations`**  
**PATCH `/api/v1/me/saved-locations/:id`**  
**DELETE `/api/v1/me/saved-locations/:id`**

- Table: `saved_locations`
    

---

## 4. Bookings & Trips

### 4.1 Client Booking Lifecycle

**POST `/api/v1/bookings`** (Client creates booking)

- Tables: `bookings`, `booking_stops`
    
- Body matches your “New Booking” flow.
    

```jsonc
{
  "service_type_id": 1,
  "region_id": 2,
  "scheduled_start_at": "2025-12-05T15:00:00Z", // null for ASAP
  "passenger_count": 2,
  "luggage_details": "2 suitcases",
  "special_requirements": "Wheelchair access",
  "stops": [
    { "position": 1, "label": "Pickup", "latitude": 40.1, "longitude": -73.9 },
    { "position": 2, "label": "Dropoff", "latitude": 40.5, "longitude": -73.6 }
  ],
  "promotion_code": "WELCOME10"
}
```

**GET `/api/v1/bookings`**

- Role-aware:
    
    - Client → own bookings (`client_id`)
        
    - Driver → bookings assigned to them (`driver_id`)
        
    - Support/Admin → filter by many fields
        

Query params: `status`, `from`, `to`, `region_id`, etc.

**GET `/api/v1/bookings/:id`**

- Tables: `bookings`, `booking_stops`, `booking_events`, `payments`, etc.
    

**POST `/api/v1/bookings/:id/cancel`**

- Tables: `bookings` (status, cancelled_at, cancel_reason, cancelled_by), `booking_events`.
    

```json
{
  "reason": "Change of plans"
}
```

_Support/Admin only:_

**PATCH `/api/v1/bookings/:id`**

- Limited modifications (change pickup note, assign driver, etc.).
    

**POST `/api/v1/bookings/:id/assign-driver`**

- Tables: `bookings` (driver_id), `booking_events`
    

---

### 4.2 Driver Trip Workflow

**GET `/api/v1/driver/jobs`**

Pending & upcoming jobs for currently authenticated driver.

- Tables: `bookings`
    
- Query params: `status=pending|accepted|in_progress|completed`
    

**POST `/api/v1/driver/jobs/:id/accept`**  
**POST `/api/v1/driver/jobs/:id/decline`**

- Tables: `bookings` (status), `booking_events`
    

**POST `/api/v1/driver/jobs/:id/arrive`**  
**POST `/api/v1/driver/jobs/:id/start`**  
**POST `/api/v1/driver/jobs/:id/complete`**

- Update booking status + `started_at` / `completed_at`
    
- Insert `booking_events`
    

**POST `/api/v1/driver/status`**

- Update driver online/offline state.
    
- Table: `driver_profiles` (you can store a `current_status` or separate table).
    

```json
{ "status": "online" } // or "offline", "break"
```

**POST `/api/v1/driver/location`**

- Location heartbeat when online / in-trip.
    
- Table: `booking_locations` (optional) or a separate `driver_locations` table.
    

```json
{ "latitude": 40.1, "longitude": -73.9, "booking_id": 123 } // booking_id optional
```

---

## 5. Payments & Methods

### 5.1 Payment Methods (Client)

**GET `/api/v1/payment-methods`**  
**POST `/api/v1/payment-methods`**  
**PATCH `/api/v1/payment-methods/:id`**  
**DELETE `/api/v1/payment-methods/:id`**

- Table: `payment_methods`
    

### 5.2 Payments

**POST `/api/v1/bookings/:id/pay`**

- Initiate/capture payment for booking.
    
- Tables: `payments`, `bookings` (update payment-related status/fields).
    

```json
{
  "payment_method_id": 10
}
```

**GET `/api/v1/payments/:id`**

- Table: `payments`
    

**POST `/api/v1/payments/:id/refund`** (Admin/Support)

- Updates `payments.status`, may create adjustment records (you can add a `refunds` table if needed).
    

---

## 6. Driver Earnings & Payouts

**GET `/api/v1/driver/earnings`**

- Summarized view for the logged-in driver.
    
- Uses: `bookings`, `payments` (where driver is assigned), or derived from `driver_payouts`.
    

**GET `/api/v1/driver/payouts`**

- Table: `driver_payouts`
    

_Admin only:_

**POST `/api/v1/admin/driver-payouts/generate`**  
Generate payout batches for a period.

---

## 7. Promotions

**GET `/api/v1/promotions/validate`**

- Validate a promo code without applying.
    

```http
GET /api/v1/promotions/validate?code=WELCOME10&booking_id=123
```

- Uses: `promotions`, `promotion_redemptions`
    

_Admin only:_

**POST `/api/v1/admin/promotions`**  
**PATCH `/api/v1/admin/promotions/:id`**  
**DELETE `/api/v1/admin/promotions/:id`**

---

## 8. Support Tickets

### 8.1 Client/Driver Side

**POST `/api/v1/support/tickets`**

- Tables: `support_tickets`, `support_ticket_messages`
    

```json
{
  "booking_id": 123,
  "category": "trip_issue",
  "subject": "Driver never arrived",
  "description": "Waited for 20 minutes..."
}
```

**GET `/api/v1/support/tickets`**  
Return tickets created by the logged-in user.

**GET `/api/v1/support/tickets/:id`**

**POST `/api/v1/support/tickets/:id/messages`**

- Add message (user-side or support-side).
    

---

### 8.2 Support Agent View

**GET `/api/v1/support/queue`**

- Queue of tickets with filters: `status`, `priority`, `category`, `assigned_to`.
    

**PATCH `/api/v1/support/tickets/:id`**

- Update status (`in_progress`, `resolved`, `closed`).
    
- Assign `assigned_to`.
    
- Adjust `priority`.
    

**POST `/api/v1/support/tickets/:id/messages`**

- Support responses or internal notes (`is_internal` flag).
    
- Tables: `support_ticket_messages`
    

---

## 9. Conversations (Chat)

We modeled generic `conversations` and `conversation_messages`.

### 9.1 Conversations

**GET `/api/v1/conversations`**

- List conversations for the logged-in user.
    
- Joins `conversation_participants`.
    

**POST `/api/v1/conversations`**

- Usually system-created when:
    
    - Booking is accepted (client + driver).
        
    - Support joins a thread.
        

```json
{
  "booking_id": 123,
  "participant_ids": [1, 45] // client, driver
}
```

**GET `/api/v1/conversations/:id`**

- Includes participants, basic metadata.
    

### 9.2 Messages

**GET `/api/v1/conversations/:id/messages`**

- Paginated list of messages.
    

**POST `/api/v1/conversations/:id/messages`**

- Create new message.
    

```json
{ "message": "I'm arriving in 5 minutes." }
```

- Tables: `conversation_messages`
    

---

## 10. Notifications

**GET `/api/v1/notifications`**

- Table: `notifications`
    

**PATCH `/api/v1/notifications/:id/read`**

```json
{ "is_read": true }
```

Optional:

**PATCH `/api/v1/notifications/read-all`**

- Mark all as read.
    

---

## 11. Admin Operations

### 11.1 Users & Roles

**GET `/api/v1/admin/users`**

- Filters by role, status, etc.
    

**GET `/api/v1/admin/users/:id`**  
**PATCH `/api/v1/admin/users/:id`**  
**PATCH `/api/v1/admin/users/:id/status`** (activate/deactivate)

**GET `/api/v1/admin/driver-documents`**  
Filter by `status=pending`.

**PATCH `/api/v1/admin/driver-documents/:id`**

- Approve/reject.
    

```json
{
  "status": "approved",
  "reviewed_by": 99
}
```

Tables: `users`, `user_roles`, `driver_documents`

---

### 11.2 Pricing, Regions, Surge

**CRUD** on:

- `/api/v1/admin/regions`
    
- `/api/v1/admin/service-types`
    
- `/api/v1/admin/pricing-rules`
    
- `/api/v1/admin/surge-rules`
    

All map 1:1 to `regions`, `service_types`, `pricing_rules`, `surge_rules`.

---

### 11.3 Analytics & Reports

These can be read-only endpoints that aggregate from multiple tables.

**GET `/api/v1/admin/reports/overview`**

- KPIs: trip volume, avg wait, cancellation rate, etc.
    

**GET `/api/v1/admin/reports/revenue`**

- Uses: `payments`, `bookings`
    

**GET `/api/v1/admin/reports/driver-performance`**

- Uses: `bookings`, `driver_profiles`, ratings.
    

---

### 11.4 Audit Logs

**GET `/api/v1/admin/audit-logs`**

- Filters: `actor_id`, `entity_type`, `date range`.
    
- Table: `audit_logs`
    

---

## 12. How This Lines Up With Tables (Quick Map)

- `users`, `user_roles`, `client_profiles`, `driver_profiles` → `/auth/*`, `/me/*`, `/admin/users/*`
    
- `saved_locations` → `/me/saved-locations/*`
    
- `regions`, `service_types`, `pricing_rules`, `surge_rules` → `/regions`, `/service-types`, `/pricing/*`, `/admin/*`
    
- `bookings`, `booking_stops`, `booking_events`, `booking_locations` → `/bookings/*`, `/driver/jobs/*`, `/driver/location`
    
- `payment_methods`, `payments`, `driver_payouts` → `/payment-methods/*`, `/bookings/:id/pay`, `/driver/payouts`
    
- `promotions`, `promotion_redemptions` → `/promotions/*`, `/admin/promotions/*`
    
- `support_tickets`, `support_ticket_messages` → `/support/tickets/*`, `/support/queue`
    
- `conversations`, `conversation_participants`, `conversation_messages` → `/conversations/*`
    
- `notifications` → `/notifications/*`
    
- `audit_logs` → `/admin/audit-logs`
    

---

If you want to go even deeper next, I can:

- Turn this into **OpenAPI/Swagger YAML or JSON**
    
- Propose **role-based middleware rules** (which endpoints are client/driver/support/admin)
    
- Or design a **frontend route map** that mirrors these API paths (`/client/bookings`, `/driver/jobs`, `/admin/dashboard`, etc.).