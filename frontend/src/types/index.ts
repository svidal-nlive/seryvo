// Canonical frontend domain types for the Seryvo Transport Booking Platform.
// Aligned with `docs/Platform Canonical Definitions.md`.

export type UUID = string;

// ---- Core Role Types ------------------------------------------------------

export type Role = 'client' | 'driver' | 'support_agent' | 'admin';

export interface BaseUser {
  id: UUID;
  email: string;
  full_name: string;
  role: Role;
  avatar_url?: string;
}

export interface Client extends BaseUser {
  role: 'client';
  default_currency?: string;
}

export type DriverCoreStatus =
  | 'pending_verification'
  | 'inactive'
  | 'active'
  | 'suspended'
  | 'banned';

export type DriverAvailabilityStatus =
  | 'offline'
  | 'available'
  | 'on_trip'
  | 'on_break';

export interface Driver extends BaseUser {
  role: 'driver';
  core_status: DriverCoreStatus;
  availability_status: DriverAvailabilityStatus;
  vehicle_id?: UUID;
  rating_average?: number;
  rating_count?: number;
}

export interface SupportAgent extends BaseUser {
  role: 'support_agent';
}

export interface Admin extends BaseUser {
  role: 'admin';
}

// ---- Money & Time ---------------------------------------------------------

export interface MoneyAmount {
  amount: number;
  currency: string;
}

export type IsoDateTime = string;

// ---- Locations & Rides ----------------------------------------------------

export interface Location {
  address_line: string;
  lat?: number;
  lng?: number;
  place_id?: string;
}

export type SavedAddressLabel = 'home' | 'work' | 'other';

export interface SavedAddress {
  id: UUID;
  user_id: UUID;
  label: SavedAddressLabel;
  custom_name?: string;
  location: Location;
  is_default?: boolean;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

export interface RideLeg {
  leg_id: UUID;
  booking_id: UUID;
  sequence_index: number;
  pickup: Location;
  dropoff: Location;
  estimated_distance_km?: number;
  estimated_duration_sec?: number;
}

// ---- Vehicle --------------------------------------------------------------

export type VehicleStatus = 'active' | 'pending_approval' | 'inactive' | 'rejected';

export interface Vehicle {
  id: UUID;
  driver_id: UUID;
  make: string;
  model: string;
  year: number;
  color: string;
  license_plate: string;
  vin?: string;
  service_types: ServiceTypeCode[];
  capacity_passengers: number;
  capacity_luggage: number;
  accessibility_features: string[];
  photo_urls: {
    front?: string;
    back?: string;
    interior?: string;
    side?: string;
  };
  insurance_expiry?: IsoDateTime;
  registration_expiry?: IsoDateTime;
  inspection_expiry?: IsoDateTime;
  status: VehicleStatus;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

// ---- Booking Lifecycle ----------------------------------------------------

export interface DriverPreferences {
  female_driver_only?: boolean;
  verified_driver_only?: boolean;
  high_rated_only?: boolean; // 4.5+ rating
}

export type BookingStatus =
  | 'draft'
  | 'requested'
  | 'driver_assigned'
  | 'driver_en_route_pickup'
  | 'driver_arrived'
  | 'in_progress'
  | 'completed'
  | 'canceled_by_client'
  | 'canceled_by_driver'
  | 'canceled_by_system'
  | 'no_show_client'
  | 'no_show_driver'
  | 'disputed'
  | 'refunded';

export interface BookingTimelineEvent {
  event_id: UUID;
  booking_id: UUID;
  status: BookingStatus;
  occurred_at: IsoDateTime;
  actor_role?: Role;
  actor_id?: UUID;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface BookingPriceBreakdown {
  base_fare: MoneyAmount;
  distance_fare?: MoneyAmount;
  time_fare?: MoneyAmount;
  extras_total?: MoneyAmount;
  tax_total?: MoneyAmount;
  discount_total?: MoneyAmount;
  grand_total: MoneyAmount;
  driver_earnings?: MoneyAmount;
  platform_fee?: MoneyAmount;
}

export type ServiceTypeCode = 'standard' | 'premium' | 'van' | 'cargo';

export interface Booking {
  booking_id: UUID;
  client_id: UUID;
  driver_id?: UUID;

  status: BookingStatus;
  created_at: IsoDateTime;
  requested_pickup_at?: IsoDateTime;
  confirmed_at?: IsoDateTime;
  completed_at?: IsoDateTime;

  is_asap: boolean;
  legs: RideLeg[];

  passenger_count?: number;
  luggage_count?: number;
  accessibility_requirements?: string[];
  special_notes?: string;

  service_type: ServiceTypeCode;
  options?: string[];
  driver_preferences?: DriverPreferences;

  price_breakdown?: BookingPriceBreakdown;
  timeline: BookingTimelineEvent[];

  client_rating_value?: number;
  client_feedback_text?: string;
  client_feedback_tags?: string[];
}

// ---- Messaging ------------------------------------------------------------

export type ChatType = 'booking' | 'support';

export interface ChatSession {
  chat_id: UUID;
  type: ChatType;
  booking_id?: UUID;
  participant_ids: UUID[];
  participant_display_names: Record<string, string>;
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  message_id: UUID;
  chat_id: UUID;
  sender_id: UUID;
  sender_display_name: string;
  body: string;
  sent_at: IsoDateTime;
  read_by: UUID[];
}

// ---- Payment Methods ------------------------------------------------------

export type PaymentMethodType = 'card' | 'bank' | 'wallet';
export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';

export interface PaymentMethod {
  id: string;
  client_id: string;
  type: PaymentMethodType;
  brand: CardBrand;
  last4: string;
  expiry_month: number;
  expiry_year: number;
  is_default: boolean;
  holder_name: string;
  created_at: IsoDateTime;
}

// ---- Driver Payouts -------------------------------------------------------

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DriverPayout {
  id: UUID;
  driver_id: UUID;
  amount: MoneyAmount;
  period_start: IsoDateTime;
  period_end: IsoDateTime;
  trips_count: number;
  status: PayoutStatus;
  payout_method?: string;
  reference_number?: string;
  initiated_at: IsoDateTime;
  completed_at?: IsoDateTime;
}

// ---- Promo Codes ----------------------------------------------------------

export type PromoDiscountType = 'percentage' | 'fixed_amount';
export type PromoStatus = 'active' | 'inactive' | 'expired';

export interface PromoCode {
  id: string;
  code: string;
  description: string;
  discount_type: PromoDiscountType;
  discount_value: number; // percentage (0-100) or cents
  min_trip_amount_cents?: number;
  max_discount_cents?: number;
  usage_limit?: number;
  usage_count: number;
  per_user_limit?: number;
  valid_from: IsoDateTime;
  valid_until: IsoDateTime;
  status: PromoStatus;
  applicable_service_types?: ServiceTypeCode[];
  first_trip_only?: boolean;
  created_at: IsoDateTime;
  created_by: UUID;
}

export interface AppliedPromo {
  promo_id: string;
  code: string;
  discount_amount_cents: number;
}

// ---- Driver Documents -----------------------------------------------------

export type DocumentType =
  | 'drivers_license'
  | 'vehicle_registration'
  | 'insurance'
  | 'profile_photo'
  | 'vehicle_photo_front'
  | 'vehicle_photo_back'
  | 'vehicle_photo_interior'
  | 'background_check';

export type DocumentStatus = 'not_uploaded' | 'pending_review' | 'approved' | 'rejected' | 'expired';

export interface DriverDocument {
  id: string;
  driver_id: string;
  type: DocumentType;
  status: DocumentStatus;
  file_name?: string;
  file_url?: string;
  uploaded_at?: IsoDateTime;
  reviewed_at?: IsoDateTime;
  expiry_date?: IsoDateTime;
  rejection_reason?: string;
}

// ---- Support Tickets ------------------------------------------------------

export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_on_client'
  | 'waiting_on_driver'
  | 'resolved'
  | 'closed'
  | 'escalated';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TicketCategory =
  | 'trip_issue'
  | 'account_issue'
  | 'payment_dispute'
  | 'safety_incident'
  | 'other';

export interface SupportTicket {
  ticket_id: UUID;
  booking_id?: UUID;
  client_id?: UUID;
  driver_id?: UUID;

  created_at: IsoDateTime;
  updated_at: IsoDateTime;

  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;

  subject: string;
  public_description?: string;
  internal_notes?: string[];

  assignee_id?: UUID;
}

// ---- Legacy Demo Compatibility Layer -------------------------------------

export enum UserRole {
  CLIENT = 'CLIENT',
  DRIVER = 'DRIVER',
  SUPPORT = 'SUPPORT',
  ADMIN = 'ADMIN',
}

export enum JobStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EN_ROUTE = 'EN_ROUTE',
  ARRIVED = 'ARRIVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export type LegacyDriverStatus = 'ONLINE' | 'OFFLINE' | 'ON_BREAK' | 'ON_JOB';

export interface LegacyUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  rating?: number;
  driverStatus?: LegacyDriverStatus;
}

export interface LegacyLocation {
  address: string;
  lat?: number;
  lng?: number;
}

export interface LegacyPriceBreakdown {
  base: number;
  distance: number;
  options: number;
  tax: number;
  total: number;
}

export interface LegacyJobTimelineEvent {
  status: JobStatus;
  timestamp: string;
  description?: string;
}

export interface LegacyJob {
  id: string;
  clientId: string;
  clientName: string;
  driverId?: string;
  driverName?: string;
  pickup: LegacyLocation;
  dropoff: LegacyLocation;
  stops?: LegacyLocation[];
  status: JobStatus;
  price: number;
  breakdown?: LegacyPriceBreakdown;
  scheduledTime: string;
  isASAP?: boolean;
  createdAt: string;
  notes?: string;
  passengers?: number;
  luggage?: number;
  vehicleType?: string;
  options?: string[];
  timeline: LegacyJobTimelineEvent[];
  userRating?: number;
  userFeedback?: string;
  feedbackTags?: string[];
  paymentMethod?: string;
}

export interface LegacyMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  readBy: string[];
}

export interface LegacyChatSession {
  id: string;
  jobId?: string;
  participants: string[];
  participantNames: Record<string, string>;
  type: 'JOB' | 'SUPPORT';
  lastMessage?: LegacyMessage;
  unreadCount?: number;
}

export interface LegacyLog {
  id: string;
  timestamp: string;
  action: string;
  userId: string;
  details: string;
}

// Mapping helpers

export function mapJobStatusToBookingStatus(status: JobStatus): BookingStatus {
  switch (status) {
    case JobStatus.PENDING:
      return 'requested';
    case JobStatus.ACCEPTED:
      return 'driver_assigned';
    case JobStatus.EN_ROUTE:
      return 'driver_en_route_pickup';
    case JobStatus.ARRIVED:
      return 'driver_arrived';
    case JobStatus.IN_PROGRESS:
      return 'in_progress';
    case JobStatus.COMPLETED:
      return 'completed';
    case JobStatus.CANCELLED:
    default:
      return 'canceled_by_system';
  }
}

export function mapBookingStatusToJobStatus(status: BookingStatus): JobStatus {
  switch (status) {
    case 'requested':
    case 'draft':
      return JobStatus.PENDING;
    case 'driver_assigned':
      return JobStatus.ACCEPTED;
    case 'driver_en_route_pickup':
      return JobStatus.EN_ROUTE;
    case 'driver_arrived':
      return JobStatus.ARRIVED;
    case 'in_progress':
      return JobStatus.IN_PROGRESS;
    case 'completed':
    case 'refunded':
    case 'disputed':
      return JobStatus.COMPLETED;
    case 'canceled_by_client':
    case 'canceled_by_driver':
    case 'canceled_by_system':
    case 'no_show_client':
    case 'no_show_driver':
    default:
      return JobStatus.CANCELLED;
  }
}

// ─── Cancellation Policy Types ───────────────────────────────────────────────

export type CancellationFeeType = 'flat' | 'percentage';

export interface CancellationPolicy {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  // Free cancellation window (minutes after booking creation)
  free_cancel_window_minutes: number;
  // After driver assigned, free cancel for X minutes
  post_assignment_free_minutes: number;
  // Fee charged after free window expires
  cancellation_fee_type: CancellationFeeType;
  cancellation_fee_amount: number; // cents for flat, percentage points for percentage
  // No-show configuration
  no_show_wait_minutes: number; // Driver waits this long before marking no-show
  no_show_fee_cents: number;
  // Waiting fee configuration
  grace_period_minutes: number; // Free waiting at pickup
  waiting_fee_per_minute_cents: number;
  waiting_fee_cap_cents: number;
  // Driver cancellation penalty
  driver_cancel_penalty_cents: number;
  // Service types this policy applies to (empty = all)
  applies_to_service_types: string[];
  created_at: string;
  updated_at: string;
}

// ─── RBAC Types ──────────────────────────────────────────────────────────────

export type Permission = 
  | 'view_own_bookings'
  | 'create_booking'
  | 'cancel_own_booking'
  | 'view_all_bookings'
  | 'modify_any_booking'
  | 'adjust_fare'
  | 'waive_cancellation_fee'
  | 'apply_credit'
  | 'suspend_driver'
  | 'ban_driver'
  | 'modify_pricing'
  | 'manage_promo_codes'
  | 'view_users'
  | 'manage_users'
  | 'manage_roles'
  | 'view_audit_logs'
  | 'manage_documents'
  | 'impersonate_user'
  | 'view_analytics'
  | 'export_data'
  | 'manage_policies'
  | 'manage_surcharges';

export type DetailedRole = 
  | 'client'
  | 'driver'
  | 'support_t1'
  | 'support_t2'
  | 'admin_business'
  | 'admin_super';

export interface RolePermissions {
  role: DetailedRole;
  displayName: string;
  description: string;
  permissions: Permission[];
  isEditable: boolean;
}

// ─── Audit Trail Types ───────────────────────────────────────────────────────

export type AuditAction = 
  | 'user_login'
  | 'user_logout'
  | 'booking_created'
  | 'booking_updated'
  | 'booking_cancelled'
  | 'status_changed'
  | 'fare_adjusted'
  | 'fee_waived'
  | 'credit_applied'
  | 'refund_issued'
  | 'driver_suspended'
  | 'driver_activated'
  | 'driver_banned'
  | 'user_created'
  | 'user_updated'
  | 'role_changed'
  | 'permission_updated'
  | 'pricing_updated'
  | 'promo_code_created'
  | 'promo_code_updated'
  | 'document_approved'
  | 'document_rejected'
  | 'policy_updated'
  | 'surcharge_updated'
  | 'impersonation_started'
  | 'impersonation_ended';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditLogEntry {
  id: UUID;
  action: AuditAction;
  severity: AuditSeverity;
  actor_id: UUID;
  actor_name: string;
  actor_role: Role;
  target_type?: 'user' | 'booking' | 'driver' | 'policy' | 'pricing' | 'promo_code';
  target_id?: UUID;
  target_name?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  occurred_at: IsoDateTime;
}

// ─── Surcharge Types ─────────────────────────────────────────────────────────

export type SurchargeType = 'airport' | 'toll' | 'peak_hours' | 'holiday' | 'custom';

export interface Surcharge {
  id: UUID;
  name: string;
  type: SurchargeType;
  description?: string;
  amount_cents: number;
  is_percentage: boolean; // If true, amount_cents is a percentage (e.g., 1500 = 15%)
  applies_to_pickup: boolean;
  applies_to_dropoff: boolean;
  location_keywords?: string[]; // e.g., ['JFK', 'LaGuardia', 'Newark']
  geofence_radius_km?: number;
  coordinates?: { lat: number; lng: number };
  is_active: boolean;
  service_types: ServiceTypeCode[];
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}
