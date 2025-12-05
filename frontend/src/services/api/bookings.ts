/**
 * Bookings API module.
 * Handles CRUD operations for ride bookings.
 */

import api from '../api';
import type {
  Booking,
  BookingStatus,
  ServiceTypeCode,
  IsoDateTime,
  Role,
} from '../../types';

// ---- Request/Response Types ----

export interface CreateBookingRequest {
  is_asap: boolean;
  pickup_address: string;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_address: string;
  dropoff_lat?: number;
  dropoff_lng?: number;
  requested_pickup_at?: IsoDateTime;
  passenger_count?: number;
  luggage_count?: number;
  service_type: ServiceTypeCode;
  special_notes?: string;
  accessibility_requirements?: string[];
  stops?: { address: string; lat?: number; lng?: number }[];
}

export interface UpdateBookingStatusRequest {
  status: BookingStatus;
  actor_id?: string;
  actor_role?: Role;
  reason?: string;
}

export interface RateBookingRequest {
  rating: number;
  comment?: string;
  tags?: string[];
}

export interface BookingListParams {
  client_id?: number;
  driver_id?: number;
  status?: BookingStatus;
  skip?: number;
  limit?: number;
}

// Backend response types (may differ from frontend types)
interface BackendBooking {
  id: number;
  client_id: number;
  driver_id?: number;
  status: BookingStatus;
  is_asap: boolean;
  pickup_address: string;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_address: string;
  dropoff_lat?: number;
  dropoff_lng?: number;
  requested_pickup_at?: string;
  confirmed_at?: string;
  completed_at?: string;
  passenger_count: number;
  luggage_count: number;
  service_type: ServiceTypeCode;
  special_notes?: string;
  base_fare?: number;
  distance_fare?: number;
  time_fare?: number;
  extras_total?: number;
  tax_total?: number;
  discount_total?: number;
  grand_total?: number;
  driver_earnings?: number;
  platform_fee?: number;
  client_rating?: number;
  client_feedback?: string;
  created_at: string;
  updated_at: string;
}

// ---- Transform Functions ----

/**
 * Transform backend booking to frontend Booking type.
 */
function transformBooking(b: BackendBooking): Booking {
  return {
    booking_id: String(b.id),
    client_id: String(b.client_id),
    driver_id: b.driver_id ? String(b.driver_id) : undefined,
    status: b.status,
    created_at: b.created_at,
    requested_pickup_at: b.requested_pickup_at,
    confirmed_at: b.confirmed_at,
    completed_at: b.completed_at,
    is_asap: b.is_asap,
    legs: [
      {
        leg_id: `leg-${b.id}-0`,
        booking_id: String(b.id),
        sequence_index: 0,
        pickup: {
          address_line: b.pickup_address,
          lat: b.pickup_lat,
          lng: b.pickup_lng,
        },
        dropoff: {
          address_line: b.dropoff_address,
          lat: b.dropoff_lat,
          lng: b.dropoff_lng,
        },
        estimated_distance_km: undefined,
        estimated_duration_sec: undefined,
      },
    ],
    passenger_count: b.passenger_count,
    luggage_count: b.luggage_count,
    service_type: b.service_type,
    special_notes: b.special_notes,
    price_breakdown: b.grand_total
      ? {
          base_fare: { amount: b.base_fare || 0, currency: 'USD' },
          distance_fare: b.distance_fare ? { amount: b.distance_fare, currency: 'USD' } : undefined,
          time_fare: b.time_fare ? { amount: b.time_fare, currency: 'USD' } : undefined,
          extras_total: b.extras_total ? { amount: b.extras_total, currency: 'USD' } : undefined,
          tax_total: b.tax_total ? { amount: b.tax_total, currency: 'USD' } : undefined,
          discount_total: b.discount_total ? { amount: b.discount_total, currency: 'USD' } : undefined,
          grand_total: { amount: b.grand_total, currency: 'USD' },
          driver_earnings: b.driver_earnings ? { amount: b.driver_earnings, currency: 'USD' } : undefined,
          platform_fee: b.platform_fee ? { amount: b.platform_fee, currency: 'USD' } : undefined,
        }
      : undefined,
    timeline: [],
    client_rating_value: b.client_rating,
    client_feedback_text: b.client_feedback,
  };
}

// ---- API Functions ----

/**
 * Get a list of bookings with optional filters.
 */
export async function getBookings(params?: BookingListParams): Promise<Booking[]> {
  const searchParams = new URLSearchParams();
  if (params?.client_id) searchParams.set('client_id', String(params.client_id));
  if (params?.driver_id) searchParams.set('driver_id', String(params.driver_id));
  if (params?.status) searchParams.set('status', params.status);
  if (params?.skip) searchParams.set('skip', String(params.skip));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  const endpoint = query ? `/bookings?${query}` : '/bookings';
  
  const bookings = await api.get<BackendBooking[]>(endpoint);
  return bookings.map(transformBooking);
}

/**
 * Get a single booking by ID.
 */
export async function getBookingById(bookingId: string): Promise<Booking> {
  const booking = await api.get<BackendBooking>(`/bookings/${bookingId}`);
  return transformBooking(booking);
}

/**
 * Create a new booking.
 */
export async function createBooking(data: CreateBookingRequest): Promise<Booking> {
  const booking = await api.post<BackendBooking>('/bookings', data);
  return transformBooking(booking);
}

/**
 * Update a booking's status.
 */
export async function updateBookingStatus(
  bookingId: string,
  data: UpdateBookingStatusRequest
): Promise<Booking> {
  const booking = await api.patch<BackendBooking>(`/bookings/${bookingId}/status`, data);
  return transformBooking(booking);
}

/**
 * Rate a completed booking.
 */
export async function rateBooking(bookingId: string, data: RateBookingRequest): Promise<Booking> {
  const booking = await api.post<BackendBooking>(`/bookings/${bookingId}/rate`, data);
  return transformBooking(booking);
}

/**
 * Cancel a booking.
 */
export async function cancelBooking(bookingId: string, reason?: string): Promise<Booking> {
  const booking = await api.post<BackendBooking>(`/bookings/${bookingId}/cancel`, { reason });
  return transformBooking(booking);
}

/**
 * Get bookings for the current user (client or driver).
 */
export async function getMyBookings(): Promise<Booking[]> {
  const bookings = await api.get<BackendBooking[]>('/bookings/my');
  return bookings.map(transformBooking);
}

/**
 * Accept a booking (driver only).
 */
export async function acceptBooking(bookingId: string): Promise<Booking> {
  const booking = await api.post<BackendBooking>(`/bookings/${bookingId}/accept`);
  return transformBooking(booking);
}

/**
 * Start a trip (driver only).
 */
export async function startTrip(bookingId: string): Promise<Booking> {
  return updateBookingStatus(bookingId, { status: 'in_progress' });
}

/**
 * Complete a trip (driver only).
 */
export async function completeTrip(bookingId: string): Promise<Booking> {
  return updateBookingStatus(bookingId, { status: 'completed' });
}

export const bookingsApi = {
  getBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
  rateBooking,
  cancelBooking,
  getMyBookings,
  acceptBooking,
  startTrip,
  completeTrip,
};

export default bookingsApi;
