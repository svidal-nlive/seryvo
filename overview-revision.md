# Seryvo Platform - Comprehensive Overview & Architecture Revision

> **Document Purpose**: This document serves as the single source of truth for the Seryvo transport booking platform. It defines domain models, schemas, entities, relationships, communication patterns, naming conventions, and architectural recommendations for building a production-ready, SaaS-enabled platform.

> **Last Updated**: December 8, 2025

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Implementation Analysis](#2-current-implementation-analysis)
3. [Domain Models & Entities](#3-domain-models--entities)
4. [Schema Alignment & Naming Conventions](#4-schema-alignment--naming-conventions)
5. [API Architecture](#5-api-architecture)
6. [Multi-Tenancy & SaaS Architecture](#6-multi-tenancy--saas-architecture)
7. [Responsive Design Guidelines](#7-responsive-design-guidelines)
8. [Identified Issues & Inconsistencies](#8-identified-issues--inconsistencies)
9. [Recommended Improvements](#9-recommended-improvements)
10. [Migration Strategy](#10-migration-strategy)
11. [Appendix](#11-appendix)

---

## 1. Executive Summary

### 1.1 Platform Overview

Seryvo is a transport booking platform designed to compete with services like Uber and Lyft. It provides a multi-role system connecting:

- **Clients** (passengers requesting transportation)
- **Drivers** (service providers fulfilling bookings)
- **Support Agents** (staff handling issues and escalations)
- **Administrators** (system managers overseeing operations, pricing, compliance)

### 1.2 Current Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS |
| **Backend** | FastAPI (Python 3.11+) + SQLAlchemy 2.0 |
| **Database** | PostgreSQL 15 |
| **Cache/Messaging** | Redis |
| **Real-time** | WebSockets (native FastAPI) |
| **Payments** | Stripe |
| **Containerization** | Docker + Docker Compose |

### 1.3 Key Architectural Principles

1. **Role-Based Access Control (RBAC)** - Permissions scoped by role
2. **Event-Driven State Machine** - Booking lifecycle managed via state transitions
3. **API-First Design** - RESTful API with OpenAPI documentation
4. **Responsive-First UI** - Mobile-optimized with desktop support

---

## 2. Current Implementation Analysis

### 2.1 What's Implemented

#### Backend (FastAPI)

| Feature | Status | Notes |
|---------|--------|-------|
| User Authentication (JWT) | ✅ Complete | Login, register, token refresh, password reset |
| Role Management | ✅ Complete | Client, Driver, Support, Admin roles |
| Booking CRUD | ✅ Complete | Create, read, update, cancel bookings |
| Multi-stop Trips | ✅ Complete | BookingStop model with sequence |
| Driver Management | ✅ Complete | Profile, status, location, vehicles |
| Document Uploads | ✅ Complete | Driver documents with review workflow |
| Pricing Engine | ✅ Complete | Base fare, per-km, per-minute, surge |
| Support Tickets | ✅ Complete | Create, assign, respond, resolve |
| Payment Methods | ✅ Complete | Stripe integration scaffolding |
| WebSocket | ✅ Complete | Real-time notifications and tracking |
| Audit Logging | ✅ Complete | Action tracking for compliance |

#### Frontend (React)

| Feature | Status | Notes |
|---------|--------|-------|
| Login/Authentication | ✅ Complete | JWT-based with token refresh |
| Client Dashboard | ✅ Complete | Book trips, view history, manage profile |
| Driver Dashboard | ✅ Complete | Accept jobs, manage availability, earnings |
| Support Dashboard | ✅ Complete | Ticket management, customer lookup |
| Admin Dashboard | ✅ Complete | User management, pricing, reports |
| Real-time Updates | ✅ Complete | WebSocket integration |
| Responsive Layout | ⚠️ Partial | Sidebar/header work; some views need polish |
| Dark Mode | ✅ Complete | Theme context with toggle |

### 2.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React + Vite)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Client    │  │   Driver    │  │   Support   │  │    Admin    │         │
│  │  Dashboard  │  │  Dashboard  │  │  Dashboard  │  │  Dashboard  │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                │                 │
│         └────────────────┴────────────────┴────────────────┘                 │
│                                    │                                         │
│                        ┌───────────┴───────────┐                             │
│                        │   AuthContext + API   │                             │
│                        │   Services + WebSocket│                             │
│                        └───────────┬───────────┘                             │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │ HTTPS / WSS
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (FastAPI)                                  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                           API Routers                                    │ │
│  │  /api/v1/auth    /api/v1/users    /api/v1/bookings   /api/v1/drivers   │ │
│  │  /api/v1/admin   /api/v1/support  /api/v1/payments   /api/v1/ws        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│  ┌─────────────────────────────────┴─────────────────────────────────────┐   │
│  │                         Core Services                                  │   │
│  │  Security │ Dependencies │ Email │ Stripe │ Push Notifications        │   │
│  └─────────────────────────────────┬─────────────────────────────────────┘   │
│                                    │                                         │
│  ┌─────────────────────────────────┴─────────────────────────────────────┐   │
│  │                       SQLAlchemy Models                                │   │
│  │  User │ Booking │ DriverProfile │ Vehicle │ SupportTicket │ Payment   │   │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
            ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
            │ PostgreSQL  │  │    Redis    │  │   Stripe    │
            │  Database   │  │   Cache     │  │   Payments  │
            └─────────────┘  └─────────────┘  └─────────────┘
```

---

## 3. Domain Models & Entities

### 3.1 Entity Relationship Diagram

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│      roles       │       │     users        │       │   user_roles     │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │◄──────│ id (PK)          │◄──────│ user_id (FK)     │
│ name             │       │ email            │       │ role_id (FK)     │
│ description      │       │ phone            │       └──────────────────┘
└──────────────────┘       │ password_hash    │
                           │ full_name        │
                           │ avatar_url       │
                           │ is_active        │
                           │ created_at       │
                           │ updated_at       │
                           └────────┬─────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│ client_profiles  │       │ driver_profiles  │       │     bookings     │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ user_id (PK,FK)  │       │ user_id (PK,FK)  │       │ id (PK)          │
│ default_currency │       │ status           │       │ client_id (FK)   │
│ default_language │       │ availability_status│     │ driver_id (FK)   │
│ rating_average   │       │ current_lat      │       │ service_type_id  │
│ total_trips      │       │ current_lng      │       │ status           │
│ created_at       │       │ rating_average   │       │ pickup_address   │
└──────────────────┘       │ total_ratings    │       │ dropoff_address  │
                           │ acceptance_rate  │       │ requested_pickup_at│
                           │ cancellation_rate│       │ final_fare       │
                           │ created_at       │       │ ...              │
                           └────────┬─────────┘       └────────┬─────────┘
                                    │                          │
                                    ▼                          ▼
                           ┌──────────────────┐       ┌──────────────────┐
                           │    vehicles      │       │  booking_stops   │
                           ├──────────────────┤       ├──────────────────┤
                           │ id (PK)          │       │ id (PK)          │
                           │ driver_id (FK)   │       │ booking_id (FK)  │
                           │ make, model      │       │ sequence         │
                           │ year, color      │       │ address          │
                           │ license_plate    │       │ lat, lng         │
                           │ capacity         │       │ stop_type        │
                           │ service_type_id  │       │ arrived_at       │
                           │ is_active        │       └──────────────────┘
                           └──────────────────┘
```

### 3.2 Core Entities

#### 3.2.1 User

The central identity entity. All users share a common base with role-specific profiles.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer (PK) | Unique identifier |
| `email` | String(255) | Unique email address |
| `phone` | String(50) | Phone number (optional) |
| `password_hash` | String(255) | Bcrypt hashed password |
| `full_name` | String(255) | Display name |
| `avatar_url` | String(500) | Profile image URL |
| `is_active` | Boolean | Account status |
| `created_at` | DateTime | Creation timestamp |
| `updated_at` | DateTime | Last update timestamp |

**Relationships**:
- Has many `UserRole` (many-to-many with `Role`)
- Has one `ClientProfile` (optional)
- Has one `DriverProfile` (optional)
- Has many `Booking` as client
- Has many `Booking` as driver

#### 3.2.2 Role

Defines user capabilities within the system.

| Value | Description |
|-------|-------------|
| `client` | End-user booking transportation |
| `driver` | Service provider fulfilling bookings |
| `support` | Customer support staff (stored as 'support' in DB, mapped to 'support_agent' in API) |
| `admin` | System administrator with full access |

**⚠️ Naming Inconsistency**: Database stores `support`, API/frontend uses `support_agent`. This requires mapping in the API layer.

#### 3.2.3 Booking

The core transaction entity representing a transportation request.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer (PK) | Unique identifier |
| `client_id` | Integer (FK) | Reference to requesting user |
| `driver_id` | Integer (FK) | Reference to assigned driver (nullable) |
| `service_type_id` | Integer (FK) | Service tier (standard, premium, van) |
| `status` | String(50) | Current lifecycle state |
| `is_asap` | Boolean | Immediate vs scheduled booking |
| `pickup_address` | String(500) | Pickup location text |
| `pickup_lat/lng` | Decimal(10,7) | Pickup coordinates |
| `dropoff_address` | String(500) | Dropoff location text |
| `dropoff_lat/lng` | Decimal(10,7) | Dropoff coordinates |
| `requested_pickup_at` | DateTime | Scheduled pickup time |
| `confirmed_at` | DateTime | When driver accepted |
| `started_at` | DateTime | Trip start time |
| `completed_at` | DateTime | Trip completion time |
| `cancelled_at` | DateTime | Cancellation time |
| `passenger_count` | Integer | Number of passengers |
| `luggage_count` | Integer | Number of luggage items |
| `special_notes` | Text | Special requirements |
| `base_fare` | Decimal(10,2) | Base fare amount |
| `distance_fare` | Decimal(10,2) | Distance-based fare |
| `time_fare` | Decimal(10,2) | Time-based fare |
| `surge_multiplier` | Decimal(5,2) | Surge pricing factor |
| `final_fare` | Decimal(10,2) | Total calculated fare |
| `driver_earnings` | Decimal(10,2) | Amount driver earns |
| `platform_fee` | Decimal(10,2) | Platform commission |
| `client_rating` | Integer | Driver's rating of client (1-5) |
| `driver_rating` | Integer | Client's rating of driver (1-5) |

**Relationships**:
- Belongs to `User` (client)
- Belongs to `User` (driver, optional)
- Belongs to `ServiceType`
- Has many `BookingStop`
- Has many `BookingEvent`

#### 3.2.4 BookingStop

Represents stops in a multi-stop trip.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer (PK) | Unique identifier |
| `booking_id` | Integer (FK) | Parent booking |
| `sequence` | Integer | Order of stop (0, 1, 2...) |
| `address` | String(500) | Full address text |
| `lat` | Decimal(10,7) | Latitude |
| `lng` | Decimal(10,7) | Longitude |
| `stop_type` | String(50) | 'pickup', 'dropoff', or 'waypoint' |
| `arrived_at` | DateTime | When driver arrived (nullable) |

#### 3.2.5 DriverProfile

Extended profile for drivers.

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | Integer (PK, FK) | Reference to user |
| `status` | String(50) | Onboarding status (pending, approved, suspended, banned) |
| `availability_status` | String(50) | Runtime status (offline, available, busy) |
| `current_lat/lng` | Decimal(10,7) | Last known location |
| `location_updated_at` | DateTime | Location timestamp |
| `rating_average` | Decimal(3,2) | Average rating (0.00-5.00) |
| `total_ratings` | Integer | Number of ratings received |
| `acceptance_rate` | Decimal(5,2) | Job acceptance percentage |
| `cancellation_rate` | Decimal(5,2) | Cancellation percentage |

**⚠️ Status Naming**: The `status` field uses simplified values (`pending`, `approved`) but should align with canonical definitions (`pending_verification`, `active`, `suspended`, `banned`).

#### 3.2.6 Vehicle

Driver's registered vehicles.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer (PK) | Unique identifier |
| `driver_id` | Integer (FK) | Reference to user |
| `service_type_id` | Integer (FK) | Eligible service tier |
| `make` | String(100) | Vehicle manufacturer |
| `model` | String(100) | Vehicle model |
| `year` | Integer | Manufacturing year |
| `color` | String(50) | Vehicle color |
| `license_plate` | String(50) | License plate number |
| `capacity` | Integer | Passenger capacity |
| `status` | String(50) | Approval status |
| `is_active` | Boolean | Currently active |

#### 3.2.7 SupportTicket

Customer support issue tracking.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer (PK) | Unique identifier |
| `user_id` | Integer (FK) | Ticket creator |
| `assigned_to` | Integer (FK) | Assigned support agent |
| `booking_id` | Integer (FK) | Related booking (optional) |
| `category` | String(100) | Issue category |
| `status` | String(50) | Ticket status (open, in_progress, resolved, closed) |
| `priority` | String(50) | Priority level (low, medium, high, urgent) |
| `subject` | String(255) | Issue title |
| `description` | Text | Issue details |

### 3.3 Booking Status State Machine

```
                                    ┌─────────────────────┐
                                    │       draft         │
                                    │ (quote/cart stage)  │
                                    └──────────┬──────────┘
                                               │ client confirms
                                               ▼
                                    ┌─────────────────────┐
                           ┌────────│     requested       │────────┐
                           │        │ (searching driver)  │        │
                           │        └──────────┬──────────┘        │
                           │                   │                   │
                   timeout/│                   │ driver accepts    │ client cancels
                   no driver                   │                   │
                           │                   ▼                   │
                           │        ┌─────────────────────┐        │
                           │        │  driver_assigned    │        │
                           │        │ (driver confirmed)  │        │
                           │        └──────────┬──────────┘        │
                           │                   │                   │
                           │                   │ driver starts     │
                           │                   ▼                   │
                           │        ┌─────────────────────┐        │
                           │        │driver_en_route_pickup│       │
                           │        │ (headed to pickup)  │        │
                           │        └──────────┬──────────┘        │
                           │                   │                   │
                           │                   │ driver arrives    │
                           │                   ▼                   │
                           │        ┌─────────────────────┐        │
                           │        │   driver_arrived    │────────┤
                           │        │ (waiting for client)│        │
                           │        └──────────┬──────────┘        │
                           │                   │                   │
                           │    ┌──────────────┼──────────────┐    │
                           │    │ client boards│              │    │
                           │    ▼              │ no-show      │    │
                           │ ┌─────────────┐   │              │    │
                           │ │ in_progress │   │              │    │
                           │ │(trip active)│   │              │    │
                           │ └──────┬──────┘   │              │    │
                           │        │          │              │    │
                           │        │ complete │              │    │
                           │        ▼          ▼              ▼    │
┌───────────────────────┐  │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ canceled_by_system    │◄─┘ │  completed  │ │no_show_client│ │canceled_by_ │
│ (timeout/failure)     │    │(trip done)  │ │(client MIA) │ │client       │
└───────────────────────┘    └──────┬──────┘ └─────────────┘ └─────────────┘
                                    │
                        ┌───────────┴───────────┐
                        │ dispute within window │
                        ▼                       ▼
               ┌─────────────┐          ┌─────────────┐
               │  disputed   │──────────│  refunded   │
               │(under review)│resolution│(with refund)│
               └─────────────┘          └─────────────┘
```

### 3.4 Canonical Status Values

#### Booking Status

| Status | Description | Who Triggers |
|--------|-------------|--------------|
| `draft` | Quote/cart stage, not yet confirmed | Client |
| `requested` | Client confirmed, searching for driver | Client |
| `driver_assigned` | Driver accepted booking | Dispatch/Driver |
| `driver_en_route_pickup` | Driver heading to pickup | Driver |
| `driver_arrived` | Driver at pickup, waiting | Driver |
| `in_progress` | Client onboard, trip active | Driver |
| `completed` | Trip completed successfully | Driver |
| `canceled_by_client` | Client cancelled | Client |
| `canceled_by_driver` | Driver cancelled | Driver |
| `canceled_by_system` | System cancelled (timeout, failure) | System |
| `no_show_client` | Client didn't show up | Driver/System |
| `no_show_driver` | Driver didn't show up | System |
| `disputed` | Under dispute review | Client/Support |
| `refunded` | Resolved with refund | Support/Admin |

#### Driver Platform Status

| Status | Description |
|--------|-------------|
| `pending_verification` | Awaiting document review |
| `inactive` | Approved but not allowed to work |
| `active` | Fully approved, can accept jobs |
| `suspended` | Temporarily blocked |
| `banned` | Permanently blocked |

#### Driver Availability Status

| Status | Description |
|--------|-------------|
| `offline` | Not accepting jobs |
| `available` | Online and ready for jobs |
| `on_trip` | Currently on a booking |
| `on_break` | Online but not accepting (future) |

---

## 4. Schema Alignment & Naming Conventions

### 4.1 Naming Standards

| Layer | Convention | Example |
|-------|------------|---------|
| **Database Tables** | snake_case, plural | `bookings`, `user_roles` |
| **Database Columns** | snake_case | `created_at`, `is_active` |
| **SQLAlchemy Models** | PascalCase, singular | `Booking`, `UserRole` |
| **Pydantic Schemas** | PascalCase + suffix | `BookingResponse`, `BookingCreate` |
| **API Endpoints** | kebab-case or snake_case | `/api/v1/bookings`, `/api/v1/drivers/jobs` |
| **Frontend Types** | PascalCase | `Booking`, `BookingStatus` |
| **JSON Fields** | snake_case | `client_id`, `pickup_address` |

### 4.2 Type Conventions

| Type | Database | Python | TypeScript |
|------|----------|--------|------------|
| **IDs** | `BIGSERIAL` / `INTEGER` | `int` | `number \| string` (UUID for future) |
| **Timestamps** | `TIMESTAMPTZ` | `datetime` | `string` (ISO 8601) |
| **Money** | `NUMERIC(10,2)` | `Decimal` | `number` (consider cents) |
| **Coordinates** | `NUMERIC(10,7)` | `float` | `number` |
| **Booleans** | `BOOLEAN` | `bool` | `boolean` |
| **Enums** | `VARCHAR(50)` | `str` (literal types) | `string` (union types) |

### 4.3 API Response Standards

All list endpoints should return paginated responses:

```typescript
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
```

All error responses should follow:

```typescript
interface ErrorResponse {
  error: string;
  detail?: string;
  field_errors?: Record<string, string[]>;
}
```

---

## 5. API Architecture

### 5.1 API Routes Overview

| Router | Prefix | Primary Purpose |
|--------|--------|-----------------|
| `auth` | `/api/v1/auth` | Authentication, registration, password reset |
| `users` | `/api/v1/users` | User profile management |
| `bookings` | `/api/v1/bookings` | Booking CRUD, client operations |
| `drivers` | `/api/v1/drivers` | Driver operations, job management |
| `admin` | `/api/v1/admin` | Admin operations, reports, user management |
| `support` | `/api/v1/support` | Support ticket management |
| `payments` | `/api/v1/payments` | Payment methods, transactions |
| `ws` | `/api/v1/ws` | WebSocket connections |
| `notifications` | `/api/v1/notifications` | Push notification subscriptions |

### 5.2 Authentication Flow

```
┌─────────┐       ┌─────────┐       ┌─────────┐
│ Client  │       │ Backend │       │   DB    │
└────┬────┘       └────┬────┘       └────┬────┘
     │ POST /auth/login │                │
     │ {email, password}│                │
     │──────────────────►                │
     │                  │ SELECT user    │
     │                  │────────────────►
     │                  │◄────────────────
     │                  │ verify password│
     │                  │ create JWT     │
     │◄──────────────────                │
     │ {access_token,   │                │
     │  refresh_token}  │                │
     │                  │                │
     │ GET /bookings    │                │
     │ Authorization:   │                │
     │ Bearer <token>   │                │
     │──────────────────►                │
     │                  │ decode JWT     │
     │                  │ check roles    │
     │                  │────────────────►
     │                  │◄────────────────
     │◄──────────────────                │
     │ {bookings}       │                │
```

### 5.3 WebSocket Architecture

WebSocket connections are role-aware and support:

1. **Real-time booking updates** - Status changes, driver location
2. **Driver job offers** - Push new booking offers to available drivers
3. **Chat messages** - In-trip communication
4. **Notifications** - System alerts, ticket updates

```typescript
// WebSocket message format
interface WebSocketMessage {
  type: 'booking_update' | 'driver_location' | 'job_offer' | 'chat_message' | 'notification';
  payload: unknown;
  timestamp: string;
}
```

### 5.4 Key Endpoints Reference

#### Authentication
- `POST /auth/setup` - First-time platform setup (creates admin)
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Token refresh
- `POST /auth/password-reset` - Request password reset

#### Bookings
- `GET /bookings` - List user's bookings
- `POST /bookings` - Create new booking
- `GET /bookings/{id}` - Get booking details
- `PATCH /bookings/{id}` - Update booking
- `POST /bookings/{id}/cancel` - Cancel booking
- `POST /bookings/{id}/rate` - Rate completed booking
- `POST /bookings/estimate` - Get price estimate

#### Drivers
- `GET /drivers/profile` - Get driver profile
- `PATCH /drivers/status` - Update availability
- `POST /drivers/location` - Update location
- `GET /drivers/jobs/available` - List available jobs
- `GET /drivers/jobs/current` - Get current active job
- `POST /drivers/jobs/{id}/accept` - Accept job offer
- `POST /drivers/jobs/{id}/arrive` - Mark arrived at pickup
- `POST /drivers/jobs/{id}/start` - Start trip
- `POST /drivers/jobs/{id}/complete` - Complete trip

#### Admin
- `GET /admin/dashboard` - Dashboard statistics
- `GET /admin/users` - List all users
- `POST /admin/users` - Create user
- `PATCH /admin/users/{id}` - Update user
- `GET /admin/reports/revenue` - Revenue reports
- `GET /admin/drivers/pending` - Pending driver approvals
- `POST /admin/drivers/{id}/approve` - Approve driver

---

## 6. Multi-Tenancy & SaaS Architecture

### 6.1 Current State

The current implementation is **single-tenant** - one platform instance serves one organization.

### 6.2 Proposed Multi-Tenant Architecture

For SaaS readiness, we recommend implementing **Organization-based multi-tenancy**:

```
┌─────────────────────────────────────────────────────────────────┐
│                       Seryvo Platform                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Organization A │  │  Organization B │  │  Organization C │  │
│  │  (NYC Rides)    │  │  (LA Transport) │  │  (Miami Cabs)   │  │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤  │
│  │ • Admins        │  │ • Admins        │  │ • Admins        │  │
│  │ • Drivers       │  │ • Drivers       │  │ • Drivers       │  │
│  │ • Support Staff │  │ • Support Staff │  │ • Support Staff │  │
│  │ • Clients       │  │ • Clients       │  │ • Clients       │  │
│  │ • Bookings      │  │ • Bookings      │  │ • Bookings      │  │
│  │ • Pricing Rules │  │ • Pricing Rules │  │ • Pricing Rules │  │
│  │ • Regions       │  │ • Regions       │  │ • Regions       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 New Entities for Multi-Tenancy

#### Organization

```sql
CREATE TABLE organizations (
    id              BIGSERIAL PRIMARY KEY,
    slug            VARCHAR(50) UNIQUE NOT NULL,  -- url-safe identifier
    name            VARCHAR(255) NOT NULL,
    logo_url        VARCHAR(500),
    primary_color   VARCHAR(7),                   -- hex color for branding
    secondary_color VARCHAR(7),
    timezone        VARCHAR(50) NOT NULL DEFAULT 'UTC',
    currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    subscription_tier VARCHAR(50) NOT NULL DEFAULT 'starter',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Organization Membership

```sql
CREATE TABLE organization_members (
    id              BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(50) NOT NULL,  -- org_admin, support, driver, client
    is_primary      BOOLEAN NOT NULL DEFAULT FALSE,  -- user's primary org
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);
```

### 6.4 Data Isolation Strategy

| Entity | Isolation Level | Strategy |
|--------|-----------------|----------|
| `users` | Shared | Users can belong to multiple orgs |
| `organizations` | N/A | Top-level tenant entity |
| `organization_members` | Shared | Links users to orgs |
| `bookings` | Per-Org | `organization_id` column |
| `drivers` | Per-Org | Via `organization_members` |
| `pricing_rules` | Per-Org | `organization_id` column |
| `regions` | Per-Org | `organization_id` column |
| `support_tickets` | Per-Org | `organization_id` column |
| `promotions` | Per-Org | `organization_id` column |

### 6.5 API Changes for Multi-Tenancy

1. **Org Context Header**: `X-Organization-ID` or subdomain-based routing
2. **Scoped Queries**: All queries filtered by `organization_id`
3. **Cross-Org Access**: Super-admin only
4. **Org Switching**: Users with multiple memberships can switch context

---

## 7. Responsive Design Guidelines

### 7.1 Breakpoint System

| Breakpoint | Min Width | Target Devices |
|------------|-----------|----------------|
| `xs` | 0px | Small phones |
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets (portrait) |
| `lg` | 1024px | Tablets (landscape), small laptops |
| `xl` | 1280px | Laptops, desktops |
| `2xl` | 1536px | Large desktops |

### 7.2 Layout Patterns

#### Mobile-First Navigation

```
┌──────────────────────────────────────┐
│ [≡]  Seryvo          [🔔] [👤]      │  ◄─ Header with hamburger menu
├──────────────────────────────────────┤
│                                      │
│          Main Content Area           │
│                                      │
│                                      │
│                                      │
└──────────────────────────────────────┘
        │
        ▼ Menu opens as slide-over
┌──────────────────┐
│ Navigation       │
│ ─────────────────│
│ Dashboard        │
│ Bookings         │
│ Profile          │
│ Settings         │
└──────────────────┘
```

#### Desktop Sidebar Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ Seryvo                                              [🔔] [👤]    │
├───────────────┬──────────────────────────────────────────────────┤
│               │                                                  │
│  Navigation   │              Main Content Area                   │
│  ───────────  │                                                  │
│  Dashboard    │                                                  │
│  Bookings     │                                                  │
│  Profile      │                                                  │
│  Settings     │                                                  │
│               │                                                  │
│               │                                                  │
└───────────────┴──────────────────────────────────────────────────┘
     240px                      Flexible
```

### 7.3 Component Responsiveness Guidelines

#### Modals

| Screen Size | Modal Behavior |
|-------------|----------------|
| Mobile (`< md`) | Full-screen overlay with slide-up animation |
| Tablet (`md-lg`) | Centered modal, 80% width, max 600px |
| Desktop (`>= lg`) | Centered modal, fixed width (500-700px) |

#### Forms

| Screen Size | Layout |
|-------------|--------|
| Mobile | Single column, full width inputs |
| Tablet | Two-column where appropriate |
| Desktop | Two-column with sidebars for help text |

#### Tables

| Screen Size | Strategy |
|-------------|----------|
| Mobile | Card-based layout, hide less critical columns |
| Tablet | Horizontal scroll with sticky first column |
| Desktop | Full table with all columns visible |

#### Maps

| Screen Size | Behavior |
|-------------|----------|
| Mobile | Full-width, fixed height (300-400px), controls simplified |
| Tablet | Full-width, larger height (400-500px) |
| Desktop | Side-by-side with form/details panel |

### 7.4 Touch vs Pointer Optimization

| Interaction | Touch (Mobile) | Pointer (Desktop) |
|-------------|----------------|-------------------|
| Button size | Min 44x44px | Min 32x32px |
| Spacing | 16px between tap targets | 8px between elements |
| Hover states | Not applicable | Show on hover |
| Swipe gestures | Enable for lists, cards | Disable |
| Right-click | Not applicable | Context menus |

### 7.5 Current Responsive Issues

1. **TripDetailsModal** - Needs full-screen mobile treatment
2. **UserManagementTable** - Needs card view for mobile
3. **PricingManagement** - Form layout cramped on mobile
4. **Admin Dashboard Stats** - Grid needs responsive breakpoints
5. **Booking Flow** - Multi-step wizard needs mobile optimization

---

## 8. Identified Issues & Inconsistencies

### 8.1 Schema Misalignments

| Issue | Location | Impact | Severity |
|-------|----------|--------|----------|
| Role naming: `support` vs `support_agent` | DB vs API/Frontend | Requires mapping layer | Medium |
| Driver status: simplified vs canonical | `DriverProfile.status` | Confusion on allowed values | Medium |
| Booking status: legacy values still used | API uses `pending`, `accepted` | Not aligned with canonical definitions | High |
| Integer IDs vs UUIDs | All tables use INT | Future scalability concern | Low |
| Money as floats | Frontend uses `number` | Precision issues | Medium |

### 8.2 Missing Features

| Feature | Current State | Recommended |
|---------|---------------|-------------|
| Organization/Tenant support | Not implemented | Add for SaaS readiness |
| Audit logging completeness | Partial | Log all state changes |
| Rate limiting | Not implemented | Add per-endpoint limits |
| API versioning | `/api/v1` exists | Implement version negotiation |
| Soft deletes | Partial (`is_active`) | Standardize across all entities |
| Full-text search | Not implemented | Add for support ticket search |

### 8.3 Code Quality Issues

| Issue | Location | Impact |
|-------|----------|--------|
| Duplicate response builders | `bookings.py`, `drivers.py` | DRY violation |
| Inconsistent error handling | Various API files | Unpredictable error responses |
| Missing input validation | Some Pydantic schemas | Security risk |
| Hardcoded values | Pricing defaults, timeouts | Should be configurable |

### 8.4 Frontend Issues

| Issue | Location | Impact |
|-------|----------|--------|
| Legacy types coexist with canonical | `types.ts`, `types/index.ts` | Confusion, potential bugs |
| Duplicate type definitions | Root `types.ts` and `src/types/` | Maintenance burden |
| Incomplete responsive handling | Various views | Poor mobile UX |
| Missing loading states | Some API calls | Poor perceived performance |

---

## 9. Recommended Improvements

### 9.1 Immediate Priorities (P0)

1. **Standardize Booking Status Values**
   - Update backend to use canonical status enum
   - Create migration script for existing data
   - Update all API responses

2. **Fix Role Naming Inconsistency**
   - Choose one: `support` or `support_agent`
   - Update database, API, and frontend consistently
   - Document the chosen convention

3. **Consolidate Frontend Types**
   - Remove legacy type definitions
   - Single source of truth in `src/types/index.ts`
   - Remove root-level `types.ts`

### 9.2 Short-Term (P1)

1. **Add Organization Entity**
   - Create migration for `organizations` and `organization_members`
   - Add `organization_id` to relevant tables
   - Update API to scope queries

2. **Improve Responsive Design**
   - Audit all views for mobile responsiveness
   - Implement card-based mobile table views
   - Add full-screen mobile modals

3. **Enhance Error Handling**
   - Create standardized error response class
   - Add error code enumeration
   - Implement consistent try/catch in API layer

### 9.3 Medium-Term (P2)

1. **Migrate to UUIDs**
   - Update all primary keys to UUID
   - Update foreign key references
   - Update API schemas

2. **Implement Money as Integer Cents**
   - Change all monetary fields to store cents
   - Update calculations to use integer math
   - Format for display in frontend

3. **Add Comprehensive Testing**
   - Unit tests for all models
   - Integration tests for API endpoints
   - E2E tests for critical flows

### 9.4 Long-Term (P3)

1. **Implement Event Sourcing**
   - Store all state changes as events
   - Enable audit replay
   - Support analytics and debugging

2. **Add GraphQL API**
   - Offer alternative to REST
   - Enable flexible client queries
   - Reduce over-fetching

3. **Implement Microservices Split**
   - Separate booking, payments, notifications
   - Enable independent scaling
   - Improve fault isolation

---

## 10. Migration Strategy

### 10.1 Database Migration Plan

```sql
-- Phase 1: Add organization support
ALTER TABLE users ADD COLUMN created_by_org_id BIGINT;

CREATE TABLE organizations (...);
CREATE TABLE organization_members (...);

-- Phase 2: Add org_id to key tables
ALTER TABLE bookings ADD COLUMN organization_id BIGINT;
ALTER TABLE pricing_rules ADD COLUMN organization_id BIGINT;
ALTER TABLE regions ADD COLUMN organization_id BIGINT;
ALTER TABLE support_tickets ADD COLUMN organization_id BIGINT;

-- Phase 3: Migrate existing data to default org
INSERT INTO organizations (slug, name) VALUES ('default', 'Default Organization');
UPDATE bookings SET organization_id = 1 WHERE organization_id IS NULL;
-- etc.

-- Phase 4: Make org_id NOT NULL
ALTER TABLE bookings ALTER COLUMN organization_id SET NOT NULL;
```

### 10.2 API Migration Strategy

1. **Version API endpoints** (`/api/v2/...`)
2. **Deprecation notices** in response headers
3. **Parallel operation** period for v1 and v2
4. **Client migration** with breaking change documentation
5. **Sunset v1** after migration period

### 10.3 Frontend Migration Strategy

1. **Feature flags** for new organization features
2. **Progressive type updates** with adapter functions
3. **Component-by-component** responsive improvements
4. **A/B testing** for UX changes

---

## 11. Appendix

### 11.1 Glossary

| Term | Definition |
|------|------------|
| **Booking** | A customer's request for transportation (canonical term) |
| **Trip** | UI-friendly synonym for booking |
| **Client** | End-user requesting transportation |
| **Driver** | Service provider fulfilling bookings |
| **Leg** | Single origin-destination segment in multi-stop booking |
| **Stop** | A waypoint in a multi-stop booking |
| **Surge** | Dynamic pricing multiplier during high demand |
| **Organization** | Tenant entity in multi-tenant architecture |

### 11.2 Reference Documents

- `docs/Platform Canonical Definitions.md` - Authoritative enum definitions
- `docs/Booking State Machine.md` - State transition rules
- `docs/RBAC Matrix v2.md` - Permission matrix
- `docs/SCHEMA_FIELD_MAPPING.md` - Field alignment reference
- `docs/Product Requirements Document.md` - Full PRD

### 11.3 File Structure Reference

```
seryvo-service/
├── backend/
│   ├── app/
│   │   ├── api/           # API routers
│   │   ├── core/          # Config, security, dependencies
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   └── main.py        # FastAPI app entry
│   └── alembic/           # Database migrations
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React context providers
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API services
│   │   ├── types/         # TypeScript types
│   │   └── views/         # Page components
│   └── types.ts           # Legacy types (to be consolidated)
└── docs/                  # Documentation
```

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-08 | AI Assistant | Initial comprehensive overview |

---

*This document should be updated as the platform evolves. All team members should refer to this as the single source of truth for architectural decisions and naming conventions.*
