# Seryvo Platform - Schema & Response Field Mapping

This document provides a comprehensive mapping of all schema fields, their corresponding database model fields, and API response fields. It serves as the single source of truth for field definitions across the platform.

---

## Table of Contents

1. [BookingStop](#1-bookingstop)
2. [Booking](#2-booking)
3. [User](#3-user)
4. [DriverProfile](#4-driverprofile)
5. [Vehicle](#5-vehicle)
6. [DriverDocument](#6-driverdocument)
7. [SupportTicket](#7-supportticket)
8. [Payment](#8-payment)
9. [DriverPayout](#9-driverpayout)
10. [PaymentMethod](#10-paymentmethod)
11. [ServiceType](#11-servicetype)
12. [Region](#12-region)
13. [PricingRule](#13-pricingrule)
14. [Promotion](#14-promotion)
15. [Deprecation Notes](#deprecation-notes)

---

## 1. BookingStop

### Database Model (`BookingStop`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `booking_id` | Integer | FK to bookings |
| `sequence` | Integer | Order of stop (0, 1, 2...) |
| `address` | String(500) | Full address text |
| `lat` | Decimal(10,7) | Latitude coordinate |
| `lng` | Decimal(10,7) | Longitude coordinate |
| `stop_type` | String(50) | 'pickup', 'dropoff', or 'waypoint' |
| `arrived_at` | DateTime | When driver arrived at this stop |

### Schema (`BookingStopResponse`)

| Schema Field | Model Field | Notes |
|--------------|-------------|-------|
| `id` | `id` | ✅ Aligned |
| `sequence` | `sequence` | ✅ Aligned |
| `address` | `address` | ✅ Aligned |
| `lat` | `lat` | ✅ Aligned |
| `lng` | `lng` | ✅ Aligned |
| `stop_type` | `stop_type` | ✅ Aligned |
| `arrived_at` | `arrived_at` | ✅ Aligned |

### Deprecated Fields (Removed)

| Old Field | Replacement | Reason |
|-----------|-------------|--------|
| `position` | `sequence` | Naming consistency |
| `label` | N/A | Not used |
| `address_line1` | `address` | Simplified to single field |
| `city` | N/A | Embedded in address |
| `state` | N/A | Embedded in address |
| `latitude` | `lat` | Shortened for consistency |
| `longitude` | `lng` | Shortened for consistency |

---

## 2. Booking

### Database Model (`Booking`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `client_id` | Integer | FK to users |
| `driver_id` | Integer | FK to users (nullable) |
| `service_type_id` | Integer | FK to service_types |
| `status` | String(50) | Booking status |
| `is_asap` | Boolean | Whether this is an immediate booking |
| `pickup_address` | String(500) | Pickup address |
| `pickup_lat` | Decimal(10,7) | Pickup latitude |
| `pickup_lng` | Decimal(10,7) | Pickup longitude |
| `dropoff_address` | String(500) | Dropoff address |
| `dropoff_lat` | Decimal(10,7) | Dropoff latitude |
| `dropoff_lng` | Decimal(10,7) | Dropoff longitude |
| `requested_pickup_at` | DateTime | When pickup was requested |
| `confirmed_at` | DateTime | When booking was confirmed |
| `started_at` | DateTime | When trip started |
| `completed_at` | DateTime | When trip completed |
| `cancelled_at` | DateTime | When booking was cancelled |
| `passenger_count` | Integer | Number of passengers |
| `luggage_count` | Integer | Number of luggage items |
| `special_notes` | Text | Special requirements/notes |
| `estimated_distance_km` | Decimal(10,2) | Estimated distance |
| `estimated_duration_min` | Integer | Estimated duration |
| `base_fare` | Decimal(10,2) | Base fare amount |
| `distance_fare` | Decimal(10,2) | Distance-based fare |
| `time_fare` | Decimal(10,2) | Time-based fare |
| `surge_multiplier` | Decimal(5,2) | Surge pricing multiplier |
| `extras_total` | Decimal(10,2) | Extras/add-ons total |
| `tax_total` | Decimal(10,2) | Tax amount |
| `discount_total` | Decimal(10,2) | Discount amount |
| `final_fare` | Decimal(10,2) | Final calculated fare |
| `driver_earnings` | Decimal(10,2) | Amount driver earns |
| `platform_fee` | Decimal(10,2) | Platform fee |
| `client_rating` | Integer | Rating given by driver to client |
| `driver_rating` | Integer | Rating given by client to driver |
| `client_feedback` | Text | Feedback about client |
| `driver_feedback` | Text | Feedback about driver |
| `created_at` | DateTime | Record creation time |
| `updated_at` | DateTime | Last update time |

### Schema (`BookingResponse`)

| Schema Field | Model Field | Notes |
|--------------|-------------|-------|
| `id` | `id` | ✅ Aligned |
| `client_id` | `client_id` | ✅ Aligned |
| `driver_id` | `driver_id` | ✅ Aligned |
| `service_type_id` | `service_type_id` | ✅ Aligned |
| `status` | `status` | ✅ Aligned |
| `is_asap` | `is_asap` | ✅ Aligned |
| `pickup_address` | `pickup_address` | ✅ Aligned |
| `pickup_lat` | `pickup_lat` | ✅ Aligned |
| `pickup_lng` | `pickup_lng` | ✅ Aligned |
| `dropoff_address` | `dropoff_address` | ✅ Aligned |
| `dropoff_lat` | `dropoff_lat` | ✅ Aligned |
| `dropoff_lng` | `dropoff_lng` | ✅ Aligned |
| `requested_pickup_at` | `requested_pickup_at` | ✅ Aligned |
| `confirmed_at` | `confirmed_at` | ✅ Aligned |
| `started_at` | `started_at` | ✅ Aligned |
| `completed_at` | `completed_at` | ✅ Aligned |
| `cancelled_at` | `cancelled_at` | ✅ Aligned |
| `passenger_count` | `passenger_count` | ✅ Aligned |
| `luggage_count` | `luggage_count` | ✅ Aligned |
| `special_notes` | `special_notes` | ✅ Aligned |
| `estimated_distance_km` | `estimated_distance_km` | ✅ Aligned |
| `estimated_duration_min` | `estimated_duration_min` | ✅ Aligned |
| `base_fare` | `base_fare` | ✅ Aligned |
| `distance_fare` | `distance_fare` | ✅ Aligned |
| `time_fare` | `time_fare` | ✅ Aligned |
| `surge_multiplier` | `surge_multiplier` | ✅ Aligned |
| `extras_total` | `extras_total` | ✅ Aligned |
| `tax_total` | `tax_total` | ✅ Aligned |
| `discount_total` | `discount_total` | ✅ Aligned |
| `final_fare` | `final_fare` | ✅ Aligned |
| `driver_earnings` | `driver_earnings` | ✅ Aligned |
| `platform_fee` | `platform_fee` | ✅ Aligned |
| `client_rating` | `client_rating` | ✅ Aligned |
| `driver_rating` | `driver_rating` | ✅ Aligned |
| `client_feedback` | `client_feedback` | ✅ Aligned |
| `driver_feedback` | `driver_feedback` | ✅ Aligned |
| `created_at` | `created_at` | ✅ Aligned |
| `updated_at` | `updated_at` | ✅ Aligned |
| `stops` | (relation) | List of BookingStopResponse |
| `client` | (relation) | Optional UserResponse |
| `driver` | (relation) | Optional UserResponse |
| `service_type` | (relation) | Optional ServiceTypeResponse |

### Deprecated Fields (Removed)

| Old Field | Replacement | Reason |
|-----------|-------------|--------|
| `scheduled_start_at` | `requested_pickup_at` | Matches model naming |
| `luggage_details` | `luggage_count` | Changed to integer type |
| `special_requirements` | `special_notes` | Matches model naming |
| `cancel_reason` | N/A | Not in model, use booking events |
| `estimated_fare` | `base_fare`, `final_fare` | More specific fields |
| `currency` | N/A | Removed, use MoneyAmount pattern |

---

## 3. User

### Database Model (`User`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `email` | String(255) | Unique email address |
| `phone` | String(50) | Phone number (optional) |
| `password_hash` | String(255) | Hashed password |
| `full_name` | String(255) | User's full name |
| `avatar_url` | String(500) | Avatar image URL |
| `is_active` | Boolean | Account active status |
| `created_at` | DateTime | Record creation time |
| `updated_at` | DateTime | Last update time |

### Schema (`UserResponse`)

| Schema Field | Model Field | Notes |
|--------------|-------------|-------|
| `id` | `id` | ✅ Aligned |
| `email` | `email` | ✅ Aligned |
| `full_name` | `full_name` | ✅ Aligned |
| `phone` | `phone` | ✅ Aligned |
| `avatar_url` | `avatar_url` | ✅ Aligned |
| `is_active` | `is_active` | ✅ Aligned |
| `created_at` | `created_at` | ✅ Aligned |
| `roles` | (computed) | List of role names from UserRole relation |

---

## 4. DriverProfile

### Database Model (`DriverProfile`)

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | Integer | PK, FK to users |
| `status` | String(50) | Driver verification status |
| `availability_status` | String(50) | Current availability |
| `rating_average` | Decimal(3,2) | Average rating |
| `total_ratings` | Integer | Number of ratings received |
| `acceptance_rate` | Decimal(5,2) | Job acceptance rate |
| `cancellation_rate` | Decimal(5,2) | Cancellation rate |
| `preferred_region_id` | Integer | FK to regions |

### Schema (`DriverProfileResponse`)

| Schema Field | Model Field | Notes |
|--------------|-------------|-------|
| `user_id` | `user_id` | ✅ Aligned |
| `status` | `status` | ✅ Aligned |
| `availability_status` | `availability_status` | ✅ Aligned |
| `rating_average` | `rating_average` | ✅ Aligned |
| `total_ratings` | `total_ratings` | ✅ Aligned |
| `acceptance_rate` | `acceptance_rate` | ✅ Aligned |
| `cancellation_rate` | `cancellation_rate` | ✅ Aligned |

---

## 5. Vehicle

### Database Model (`Vehicle`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `driver_id` | Integer | FK to driver_profiles |
| `make` | String(100) | Vehicle make |
| `model` | String(100) | Vehicle model |
| `year` | Integer | Year of manufacture |
| `color` | String(50) | Vehicle color |
| `license_plate` | String(50) | License plate number |
| `capacity` | Integer | Passenger capacity |
| `service_type_id` | Integer | FK to service_types |
| `is_active` | Boolean | Vehicle active status |
| `created_at` | DateTime | Record creation time |

### Schema (`VehicleResponse`)

| Schema Field | Model Field | Notes |
|--------------|-------------|-------|
| `id` | `id` | ✅ Aligned |
| `make` | `make` | ✅ Aligned |
| `model` | `model` | ✅ Aligned |
| `year` | `year` | ✅ Aligned |
| `color` | `color` | ✅ Aligned |
| `license_plate` | `license_plate` | ✅ Aligned |
| `capacity` | `capacity` | ✅ Aligned |
| `is_active` | `is_active` | ✅ Aligned |

---

## 6. DriverDocument

### Database Model (`DriverDocument`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `driver_id` | Integer | FK to driver_profiles |
| `doc_type` | String(100) | Document type |
| `file_url` | Text | File storage URL |
| `status` | String(50) | Review status |
| `expires_at` | DateTime | Expiration date |
| `reviewed_by` | Integer | FK to users |
| `reviewed_at` | DateTime | Review timestamp |
| `rejection_reason` | Text | Reason if rejected |
| `created_at` | DateTime | Upload timestamp |

### Schema (`DriverDocumentResponse`)

| Schema Field | Model Field | Notes |
|--------------|-------------|-------|
| `id` | `id` | ✅ Aligned |
| `driver_id` | `driver_id` | ✅ Aligned |
| `doc_type` | `doc_type` | ✅ Aligned |
| `file_url` | `file_url` | ✅ Aligned |
| `status` | `status` | ✅ Aligned |
| `expires_at` | `expires_at` | ✅ Aligned |
| `reviewed_by` | `reviewed_by` | ✅ Aligned |
| `reviewed_at` | `reviewed_at` | ✅ Aligned |
| `rejection_reason` | `rejection_reason` | ✅ Aligned |
| `created_at` | `created_at` | ✅ Aligned |

---

## 7. SupportTicket

### Database Model (`SupportTicket`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `user_id` | Integer | FK to users (creator) |
| `assigned_to` | Integer | FK to users (assignee) |
| `booking_id` | Integer | FK to bookings |
| `category` | String(100) | Ticket category |
| `status` | String(50) | Ticket status |
| `priority` | String(50) | Priority level |
| `subject` | String(255) | Ticket subject |
| `description` | Text | Ticket description |
| `created_at` | DateTime | Creation timestamp |
| `updated_at` | DateTime | Last update |

### Schema (`TicketResponse`)

| Schema Field | Model Field | Notes |
|--------------|-------------|-------|
| `id` | `id` | ✅ Aligned |
| `created_by` | `user_id` | Renamed for clarity |
| `assigned_to` | `assigned_to` | ✅ Aligned |
| `booking_id` | `booking_id` | ✅ Aligned |
| `category` | `category` | ✅ Aligned |
| `status` | `status` | ✅ Aligned |
| `priority` | `priority` | ✅ Aligned |
| `subject` | `subject` | ✅ Aligned |
| `description` | `description` | ✅ Aligned |
| `created_at` | `created_at` | ✅ Aligned |
| `updated_at` | `updated_at` | ✅ Aligned |
| `creator` | (relation) | Optional UserResponse |
| `assignee` | (relation) | Optional UserResponse |
| `messages` | (relation) | List of TicketMessageResponse |

---

## 8. Payment

### Database Model (`Payment`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `booking_id` | Integer | FK to bookings |
| `amount` | Decimal(10,2) | Payment amount |
| `currency` | String(3) | Currency code (USD) |
| `payment_method` | String(50) | 'card', 'cash', 'wallet' |
| `payment_status` | String(50) | 'pending', 'completed', 'failed', 'refunded' |
| `stripe_payment_intent_id` | String(255) | Stripe payment intent |
| `stripe_charge_id` | String(255) | Stripe charge ID |
| `failure_reason` | Text | Failure reason if any |
| `created_at` | DateTime | Creation timestamp |
| `completed_at` | DateTime | Completion timestamp |

### Schema (`PaymentResponse`)

| Schema Field | Model Field | Notes |
|--------------|-------------|-------|
| `id` | `id` | ✅ Aligned |
| `booking_id` | `booking_id` | ✅ Aligned |
| `amount` | `amount` | ✅ Aligned |
| `currency` | `currency` | ✅ Aligned |
| `payment_method` | `payment_method` | ✅ Aligned |
| `payment_status` | `payment_status` | ✅ Aligned |
| `stripe_payment_intent_id` | `stripe_payment_intent_id` | ✅ Aligned |
| `stripe_charge_id` | `stripe_charge_id` | ✅ Aligned |
| `failure_reason` | `failure_reason` | ✅ Aligned |
| `created_at` | `created_at` | ✅ Aligned |
| `completed_at` | `completed_at` | ✅ Aligned |

### Deprecated Fields (Removed)

| Old Field | Replacement | Reason |
|-----------|-------------|--------|
| `status` | `payment_status` | Matches model naming |
| `payment_method_id` | `payment_method` | Simplified to string type |
| `refund_amount` | N/A | Not in current model |

---

## 9. DriverPayout

### Database Model (`DriverPayout`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `driver_id` | Integer | FK to users |
| `amount` | Decimal(10,2) | Payout amount |
| `currency` | String(3) | Currency code |
| `payout_status` | String(50) | 'pending', 'processing', 'completed', 'failed' |
| `stripe_transfer_id` | String(255) | Stripe transfer ID |
| `period_start` | DateTime | Pay period start |
| `period_end` | DateTime | Pay period end |
| `bookings_count` | Integer | Number of bookings in period |
| `failure_reason` | Text | Failure reason if any |
| `created_at` | DateTime | Creation timestamp |
| `completed_at` | DateTime | Completion timestamp |

### Schema (`DriverPayoutResponse`)

| Schema Field | Model Field | Notes |
|--------------|-------------|-------|
| `id` | `id` | ✅ Aligned |
| `driver_id` | `driver_id` | ✅ Aligned |
| `amount` | `amount` | ✅ Aligned |
| `currency` | `currency` | ✅ Aligned |
| `payout_status` | `payout_status` | ✅ Aligned |
| `stripe_transfer_id` | `stripe_transfer_id` | ✅ Aligned |
| `period_start` | `period_start` | ✅ Aligned |
| `period_end` | `period_end` | ✅ Aligned |
| `bookings_count` | `bookings_count` | ✅ Aligned |
| `failure_reason` | `failure_reason` | ✅ Aligned |
| `created_at` | `created_at` | ✅ Aligned |
| `completed_at` | `completed_at` | ✅ Aligned |

### Deprecated Fields (Removed)

| Old Field | Replacement | Reason |
|-----------|-------------|--------|
| `status` | `payout_status` | Matches model naming |
| `paid_at` | `completed_at` | Matches model naming |

---

## 10. PaymentMethod

### Database Model (`PaymentMethod`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `user_id` | Integer | FK to users |
| `method_type` | String(50) | 'card', 'bank_account' |
| `last_four` | String(4) | Last 4 digits |
| `brand` | String(50) | Card brand |
| `exp_month` | Integer | Expiry month |
| `exp_year` | Integer | Expiry year |
| `is_default` | Boolean | Default method flag |
| `stripe_payment_method_id` | String(255) | Stripe PM ID |
| `created_at` | DateTime | Creation timestamp |

### Schema (`PaymentMethodResponse`)

| Schema Field | Model Field | Notes |
|--------------|-------------|-------|
| `id` | `id` | ✅ Aligned |
| `user_id` | `user_id` | ✅ Aligned |
| `method_type` | `method_type` | ✅ Aligned |
| `last_four` | `last_four` | ✅ Aligned |
| `brand` | `brand` | ✅ Aligned |
| `exp_month` | `exp_month` | ✅ Aligned |
| `exp_year` | `exp_year` | ✅ Aligned |
| `is_default` | `is_default` | ✅ Aligned |
| `stripe_payment_method_id` | `stripe_payment_method_id` | ✅ Aligned |
| `created_at` | `created_at` | ✅ Aligned |

---

## 11. ServiceType

### Database Model (`ServiceType`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `code` | String(50) | Unique code |
| `name` | String(100) | Display name |
| `description` | Text | Description |
| `base_capacity` | Integer | Default capacity |
| `is_active` | Boolean | Active status |

### Schema (`ServiceTypeResponse`)

| Schema Field | Model Field | Notes |
|--------------|-------------|-------|
| `id` | `id` | ✅ Aligned |
| `code` | `code` | ✅ Aligned |
| `name` | `name` | ✅ Aligned |
| `description` | `description` | ✅ Aligned |
| `base_capacity` | `base_capacity` | ✅ Aligned |
| `is_active` | `is_active` | ✅ Aligned |

---

## 12. Region

### Database Model (`Region`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `name` | String(100) | Region name |
| `description` | Text | Description |
| `geojson` | JSON | Geographic boundary |
| `is_active` | Boolean | Active status |
| `created_at` | DateTime | Creation timestamp |

### Schema (`RegionResponse`)

| Schema Field | Model Field | Notes |
|--------------|-------------|-------|
| `id` | `id` | ✅ Aligned |
| `name` | `name` | ✅ Aligned |
| `description` | `description` | ✅ Aligned |
| `is_active` | `is_active` | ✅ Aligned |

---

## 13. PricingRule

### Database Model (`PricingRule`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `region_id` | Integer | FK to regions |
| `service_type_id` | Integer | FK to service_types |
| `base_fare` | Decimal(10,2) | Base fare |
| `per_km` | Decimal(10,2) | Per kilometer rate |
| `per_minute` | Decimal(10,2) | Per minute rate |
| `minimum_fare` | Decimal(10,2) | Minimum fare |
| `currency` | String(10) | Currency code |
| `is_active` | Boolean | Active status |
| `created_at` | DateTime | Creation timestamp |

### Schema (`PricingRuleResponse`)

| Schema Field | Model Field | Notes |
|--------------|-------------|-------|
| `id` | `id` | ✅ Aligned |
| `region_id` | `region_id` | ✅ Aligned |
| `service_type_id` | `service_type_id` | ✅ Aligned |
| `base_fare` | `base_fare` | ✅ Aligned |
| `per_km` | `per_km` | ✅ Aligned |
| `per_minute` | `per_minute` | ✅ Aligned |
| `minimum_fare` | `minimum_fare` | ✅ Aligned |
| `currency` | `currency` | ✅ Aligned |
| `is_active` | `is_active` | ✅ Aligned |

---

## 14. Promotion

### Database Model (`Promotion`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `code` | String(50) | Unique promo code |
| `description` | Text | Description |
| `discount_type` | String(20) | 'percentage' or 'fixed' |
| `discount_value` | Decimal(10,2) | Discount amount/percent |
| `max_uses` | Integer | Maximum total uses |
| `max_uses_per_user` | Integer | Max uses per user |
| `starts_at` | DateTime | Start date |
| `ends_at` | DateTime | End date |
| `is_active` | Boolean | Active status |
| `created_at` | DateTime | Creation timestamp |

### Schema (`PromotionResponse`)

| Schema Field | Model Field | Notes |
|--------------|-------------|-------|
| `id` | `id` | ✅ Aligned |
| `code` | `code` | ✅ Aligned |
| `description` | `description` | ✅ Aligned |
| `discount_type` | `discount_type` | ✅ Aligned |
| `discount_value` | `discount_value` | ✅ Aligned |
| `max_uses` | `max_uses` | ✅ Aligned |
| `max_uses_per_user` | `max_uses_per_user` | ✅ Aligned |
| `starts_at` | `starts_at` | ✅ Aligned |
| `ends_at` | `ends_at` | ✅ Aligned |
| `is_active` | `is_active` | ✅ Aligned |

---

## Deprecation Notes

### Phase 1 (Current Release)
The following fields have been deprecated and should not be used in new code:

#### BookingStop
- `position` → Use `sequence`
- `label` → Removed
- `address_line1` → Use `address`
- `city`, `state` → Embedded in `address`
- `latitude` → Use `lat`
- `longitude` → Use `lng`

#### Booking
- `scheduled_start_at` → Use `requested_pickup_at`
- `luggage_details` → Use `luggage_count` (integer)
- `special_requirements` → Use `special_notes`
- `cancel_reason` → Query booking events
- `estimated_fare` → Use `base_fare` or `final_fare`
- `currency` → Removed (use MoneyAmount pattern)


#### Payment
- `status` → Use `payment_status`
- `payment_method_id` → Use `payment_method` (string)

#### DriverPayout
- `status` → Use `payout_status`
- `paid_at` → Use `completed_at`

### Migration Guide

1. **Frontend**: Update all API call transformers to use new field names
2. **Backend**: Schemas have been updated; use helper functions for response building
3. **Tests**: Update all assertions to use aligned field names

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-04 | 1.1.0 | Fixed duplicate DriverEarnings schema class; fixed drivers.py history endpoint to use correct model fields; removed deprecated cancel_reason from booking update; fixed estimated_fare reference in job completion; added rejection_reason to DriverDocument model; renamed driver_documents.document_type to doc_type |
| 2025-12-04 | 1.0.0 | Initial schema alignment and documentation |

---

*This document is auto-maintained. Report discrepancies to the platform team.*

