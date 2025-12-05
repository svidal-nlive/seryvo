// Canonical frontend domain types for the Seryvo Transport Booking Platform.
// These are aligned with `docs/Platform Canonical Definitions.md` and
// are intended to be shared across all React views in `project/`.

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
  default_currency?: string; // e.g. "USD"
}

// Driver core platform status (onboarding / compliance).
export type DriverCoreStatus =
  | 'pending_verification'
  | 'inactive'
  | 'active'
  | 'suspended'
  | 'banned';

// Driver availability for assignment (runtime state).
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
  /** integer minor units, e.g. cents */
  amount: number;
  /** ISO 4217 currency code, e.g. "USD" */
  currency: string;
}

/** ISO 8601 UTC timestamp (e.g. 2025-01-01T12:00:00Z). */
export type IsoDateTime = string;

// ---- Locations & Rides ----------------------------------------------------

export interface Location {
  address_line: string;
  lat?: number;
  lng?: number;
  place_id?: string; // Optional provider-specific ID for autocomplete / maps.
}

export interface RideLeg {
  leg_id: UUID;
  booking_id: UUID;
  sequence_index: number; // 0-based ordering within a booking
  pickup: Location;
  dropoff: Location;
  estimated_distance_km?: number;
  estimated_duration_sec?: number;
}

// ---- Booking Lifecycle ----------------------------------------------------

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
  extras_total?: MoneyAmount; // e.g. tolls, surcharges
  tax_total?: MoneyAmount;
  discount_total?: MoneyAmount;
  grand_total: MoneyAmount;
}

export type ServiceTypeCode = 'standard' | 'premium' | 'van' | 'cargo';

export interface Booking {
  booking_id: UUID;
  client_id: UUID;
  driver_id?: UUID;

  status: BookingStatus;
  created_at: IsoDateTime;
  requested_pickup_at?: IsoDateTime; // For scheduled bookings.
  confirmed_at?: IsoDateTime;
  completed_at?: IsoDateTime;

  is_asap: boolean;

  /** Canonical representation of a multi-leg ride. */
  legs: RideLeg[];

  passenger_count?: number;
  luggage_count?: number;
  accessibility_requirements?: string[]; // e.g. ["wheelchair", "child_seat"]
  special_notes?: string;

  service_type: ServiceTypeCode;
  options?: string[]; // e.g. ["pet_friendly", "female_driver_preferred"]

  price_breakdown?: BookingPriceBreakdown;

  timeline: BookingTimelineEvent[];

  // Ratings & feedback (client → driver, possibly driver → client later).
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

  assignee_id?: UUID; // support_agent or admin
}

// ---- Legacy Demo Compatibility Layer -------------------------------------

// These mirror the existing `demo-concept/types.ts` so that the demo UI
// can be gradually migrated to canonical "booking" terminology. New code
// should prefer the canonical types above.

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

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}

// Mapping helpers (to be used by services / adapters when migrating
// from the demo `Job` model to the canonical `Booking` model).

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
      // Actor-specific cancellation should be inferred elsewhere.
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
