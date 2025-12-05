/**
 * Admin API module.
 * Handles admin dashboard operations, statistics, and system configuration.
 */

import api from '../api';
import type {
  PromoCode,
  PromoStatus,
  ServiceTypeCode,
  CancellationPolicy,
} from '../../types';

// ---- Types ----

export interface DashboardStats {
  total_bookings: number;
  active_bookings: number;
  completed_bookings: number;
  total_drivers: number;
  available_drivers: number;
  open_tickets: number;
  total_revenue: number;
  today_bookings: number;
  today_revenue: number;
}

export interface RevenueReport {
  period: string;
  total_revenue: number;
  platform_fees: number;
  driver_earnings: number;
  trips_completed: number;
}

export interface PromoCodeResponse {
  id: number;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  max_discount_cents?: number;
  min_trip_amount_cents?: number;
  usage_limit?: number;
  usage_count: number;
  per_user_limit?: number;
  valid_from: string;
  valid_until: string;
  status: PromoStatus;
  first_trip_only?: boolean;
  applicable_service_types?: ServiceTypeCode[];
  created_at: string;
  created_by: number;
}

export interface CreatePromoCodeRequest {
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  max_discount_cents?: number;
  min_trip_amount_cents?: number;
  usage_limit?: number;
  per_user_limit?: number;
  valid_from: string;
  valid_until: string;
  status: PromoStatus;
  first_trip_only?: boolean;
  applicable_service_types?: ServiceTypeCode[];
}

export interface CancellationPolicyResponse {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  free_cancel_window_minutes: number;
  post_assignment_free_minutes: number;
  cancellation_fee_type: 'flat' | 'percentage';
  cancellation_fee_amount: number;
  no_show_wait_minutes: number;
  no_show_fee_cents: number;
  grace_period_minutes: number;
  waiting_fee_per_minute_cents: number;
  waiting_fee_cap_cents: number;
  driver_cancel_penalty_cents: number;
  applies_to_service_types: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateCancellationPolicyRequest {
  name: string;
  description: string;
  is_active: boolean;
  free_cancel_window_minutes: number;
  post_assignment_free_minutes: number;
  cancellation_fee_type: 'flat' | 'percentage';
  cancellation_fee_amount: number;
  no_show_wait_minutes: number;
  no_show_fee_cents: number;
  grace_period_minutes: number;
  waiting_fee_per_minute_cents: number;
  waiting_fee_cap_cents: number;
  driver_cancel_penalty_cents: number;
  applies_to_service_types: string[];
}

export interface AuditLogEntry {
  id: number;
  action: string;
  actor_id: number;
  actor_email: string;
  target_type: string;
  target_id?: number;
  details: Record<string, unknown>;
  timestamp: string;
  ip_address?: string;
}

// ---- Transform Functions ----

function transformPromoCode(p: PromoCodeResponse): PromoCode {
  return {
    id: String(p.id),
    code: p.code,
    description: p.description,
    discount_type: p.discount_type,
    discount_value: p.discount_value,
    max_discount_cents: p.max_discount_cents,
    min_trip_amount_cents: p.min_trip_amount_cents,
    usage_limit: p.usage_limit,
    usage_count: p.usage_count,
    per_user_limit: p.per_user_limit,
    valid_from: p.valid_from,
    valid_until: p.valid_until,
    status: p.status,
    first_trip_only: p.first_trip_only,
    applicable_service_types: p.applicable_service_types,
    created_at: p.created_at,
    created_by: String(p.created_by),
  };
}

function transformCancellationPolicy(cp: CancellationPolicyResponse): CancellationPolicy {
  return {
    id: String(cp.id),
    name: cp.name,
    description: cp.description,
    is_active: cp.is_active,
    free_cancel_window_minutes: cp.free_cancel_window_minutes,
    post_assignment_free_minutes: cp.post_assignment_free_minutes,
    cancellation_fee_type: cp.cancellation_fee_type,
    cancellation_fee_amount: cp.cancellation_fee_amount,
    no_show_wait_minutes: cp.no_show_wait_minutes,
    no_show_fee_cents: cp.no_show_fee_cents,
    grace_period_minutes: cp.grace_period_minutes,
    waiting_fee_per_minute_cents: cp.waiting_fee_per_minute_cents,
    waiting_fee_cap_cents: cp.waiting_fee_cap_cents,
    driver_cancel_penalty_cents: cp.driver_cancel_penalty_cents,
    applies_to_service_types: cp.applies_to_service_types,
    created_at: cp.created_at,
    updated_at: cp.updated_at,
  };
}

// ---- API Functions ----

/**
 * Get dashboard statistics.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  return api.get<DashboardStats>('/admin/stats');
}

/**
 * Get revenue report for a period.
 */
export async function getRevenueReport(params?: {
  start_date?: string;
  end_date?: string;
  granularity?: 'day' | 'week' | 'month';
}): Promise<RevenueReport[]> {
  const searchParams = new URLSearchParams();
  if (params?.start_date) searchParams.set('start_date', params.start_date);
  if (params?.end_date) searchParams.set('end_date', params.end_date);
  if (params?.granularity) searchParams.set('granularity', params.granularity);

  const query = searchParams.toString();
  const endpoint = query ? `/admin/revenue?${query}` : '/admin/revenue';

  return api.get<RevenueReport[]>(endpoint);
}

// ---- Promo Codes ----

/**
 * Get all promo codes.
 */
export async function getPromoCodes(): Promise<PromoCode[]> {
  const promos = await api.get<PromoCodeResponse[]>('/admin/promo-codes');
  return promos.map(transformPromoCode);
}

/**
 * Get a single promo code by ID.
 */
export async function getPromoCodeById(promoId: string): Promise<PromoCode> {
  const promo = await api.get<PromoCodeResponse>(`/admin/promo-codes/${promoId}`);
  return transformPromoCode(promo);
}

/**
 * Create a new promo code.
 */
export async function createPromoCode(data: CreatePromoCodeRequest): Promise<PromoCode> {
  const promo = await api.post<PromoCodeResponse>('/admin/promo-codes', data);
  return transformPromoCode(promo);
}

/**
 * Update a promo code.
 */
export async function updatePromoCode(
  promoId: string,
  data: Partial<CreatePromoCodeRequest>
): Promise<PromoCode> {
  const promo = await api.patch<PromoCodeResponse>(`/admin/promo-codes/${promoId}`, data);
  return transformPromoCode(promo);
}

/**
 * Delete a promo code.
 */
export async function deletePromoCode(promoId: string): Promise<void> {
  await api.delete(`/admin/promo-codes/${promoId}`);
}

/**
 * Validate a promo code for a booking.
 */
export async function validatePromoCode(
  code: string,
  tripAmountCents: number,
  serviceType?: ServiceTypeCode
): Promise<{ valid: boolean; error?: string; discount_cents?: number }> {
  return api.post('/admin/promo-codes/validate', {
    code,
    trip_amount_cents: tripAmountCents,
    service_type: serviceType,
  });
}

// ---- Cancellation Policies ----

/**
 * Get all cancellation policies.
 */
export async function getCancellationPolicies(): Promise<CancellationPolicy[]> {
  const policies = await api.get<CancellationPolicyResponse[]>('/admin/policies');
  return policies.map(transformCancellationPolicy);
}

/**
 * Get a single cancellation policy by ID.
 */
export async function getCancellationPolicyById(policyId: string): Promise<CancellationPolicy> {
  const policy = await api.get<CancellationPolicyResponse>(`/admin/policies/${policyId}`);
  return transformCancellationPolicy(policy);
}

/**
 * Create a new cancellation policy.
 */
export async function createCancellationPolicy(
  data: CreateCancellationPolicyRequest
): Promise<CancellationPolicy> {
  const policy = await api.post<CancellationPolicyResponse>('/admin/policies', data);
  return transformCancellationPolicy(policy);
}

/**
 * Update a cancellation policy.
 */
export async function updateCancellationPolicy(
  policyId: string,
  data: Partial<CreateCancellationPolicyRequest>
): Promise<CancellationPolicy> {
  const policy = await api.patch<CancellationPolicyResponse>(`/admin/policies/${policyId}`, data);
  return transformCancellationPolicy(policy);
}

/**
 * Delete a cancellation policy.
 */
export async function deleteCancellationPolicy(policyId: string): Promise<void> {
  await api.delete(`/admin/policies/${policyId}`);
}

// ---- Audit Logs ----

/**
 * Get audit log entries.
 */
export async function getAuditLogs(params?: {
  action?: string;
  actor_id?: number;
  target_type?: string;
  start_date?: string;
  end_date?: string;
  skip?: number;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  const searchParams = new URLSearchParams();
  if (params?.action) searchParams.set('action', params.action);
  if (params?.actor_id) searchParams.set('actor_id', String(params.actor_id));
  if (params?.target_type) searchParams.set('target_type', params.target_type);
  if (params?.start_date) searchParams.set('start_date', params.start_date);
  if (params?.end_date) searchParams.set('end_date', params.end_date);
  if (params?.skip) searchParams.set('skip', String(params.skip));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  const endpoint = query ? `/admin/audit-logs?${query}` : '/admin/audit-logs';

  return api.get<AuditLogEntry[]>(endpoint);
}

// ---- System Configuration ----

/**
 * Get system configuration.
 */
export async function getSystemConfig(): Promise<Record<string, unknown>> {
  return api.get('/admin/config');
}

/**
 * Update system configuration.
 */
export async function updateSystemConfig(config: Record<string, unknown>): Promise<void> {
  await api.patch('/admin/config', config);
}

// ---- Demo Data Management ----

export interface DemoDataStatus {
  demo_data_loaded: boolean;
  demo_users_count: number;
  demo_bookings_count: number;
  can_load_demo_data: boolean;
  warning: string;
}

export interface LoadDemoDataResponse {
  success: boolean;
  message: string;
}

/**
 * Get demo data status.
 */
export async function getDemoDataStatus(): Promise<DemoDataStatus> {
  return api.get('/admin/demo-data/status');
}

/**
 * Load demo data into the database.
 * WARNING: This will add sample data to the database.
 */
export async function loadDemoData(): Promise<LoadDemoDataResponse> {
  return api.post('/admin/demo-data/load', { confirm_overwrite: true });
}

/**
 * Clear demo data from the database.
 * WARNING: This will permanently delete all demo users and their data.
 */
export async function clearDemoData(): Promise<LoadDemoDataResponse> {
  return api.delete('/admin/demo-data/clear?confirm=true');
}

/**
 * Wipe ALL data from the database except admin accounts.
 * WARNING: This is a destructive operation that will delete ALL users, 
 * bookings, vehicles, regions, and related data.
 */
export async function wipeAllDemoData(): Promise<LoadDemoDataResponse> {
  return api.delete('/admin/demo-data/wipe-all?confirm=true');
}

export interface FactoryResetResponse {
  success: boolean;
  message: string;
  deleted_counts: {
    users: number;
    bookings: number;
    payments: number;
    tickets: number;
    driver_profiles: number;
    conversations: number;
    promotions: number;
    audit_logs: number;
  };
  performed_by: string;
  requires_setup: boolean;
}

/**
 * DANGER: Complete factory reset - wipes ALL data including admin accounts.
 * After this operation, the platform will require initial setup.
 * The first user to register will become the new admin.
 * 
 * Requires explicit confirmation with admin email.
 * THIS IS IRREVERSIBLE.
 */
export async function factoryReset(adminEmail: string): Promise<FactoryResetResponse> {
  return api.delete(`/admin/factory-reset?confirm=FACTORY_RESET&confirm_email=${encodeURIComponent(adminEmail)}`);
}

// ---- Fleet Status ----

export interface FleetDriver {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  heading: number | null;
  speed: number | null;
  status: 'available' | 'busy' | 'offline' | 'on_break';
  vehicle_type: string | null;
  plate_number: string | null;
  active_booking_id: string | null;
  active_booking_status: string | null;
  last_update: string | null;
}

export interface FleetActiveTrip {
  booking_id: string;
  driver_id: string;
  client_name: string;
  status: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  pickup_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  dropoff_address: string;
}

export interface FleetStats {
  total_drivers: number;
  available: number;
  busy: number;
  on_break: number;
  offline: number;
  active_trips: number;
}

export interface FleetStatusResponse {
  drivers: FleetDriver[];
  active_trips: FleetActiveTrip[];
  stats: FleetStats;
}

/**
 * Get current fleet status including drivers and active trips.
 * Used for admin Fleet Live Map.
 */
export async function getFleetStatus(): Promise<FleetStatusResponse> {
  return api.get('/admin/fleet/status');
}

export const adminApi = {
  getDashboardStats,
  getRevenueReport,
  getPromoCodes,
  getPromoCodeById,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  validatePromoCode,
  getCancellationPolicies,
  getCancellationPolicyById,
  createCancellationPolicy,
  updateCancellationPolicy,
  deleteCancellationPolicy,
  getAuditLogs,
  getSystemConfig,
  updateSystemConfig,
  // Demo data management
  getDemoDataStatus,
  loadDemoData,
  clearDemoData,
  wipeAllDemoData,
  factoryReset,
  // Fleet management
  getFleetStatus,
};

export default adminApi;
