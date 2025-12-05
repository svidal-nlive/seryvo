/**
 * Backend Service - Unified API layer
 * 
 * This module provides a unified interface to the backend, supporting
 * both mock (in-memory) and real (FastAPI) backends. The active backend
 * is determined by the VITE_USE_REAL_API environment variable.
 */

import { mockBackend } from './mockBackend';
import api, { setTokens, clearTokens, getAccessToken } from './api';
import type {
  Booking,
  BookingStatus,
  Client,
  Driver,
  SupportAgent,
  Admin,
  ChatSession,
  Message,
  SupportTicket,
  PaymentMethod,
  PaymentMethodType,
  CardBrand,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  DriverDocument,
  PromoCode,
  Vehicle,
  VehicleStatus,
  SavedAddress,
  CancellationPolicy,
  DriverPayout,
  Role,
  DriverCoreStatus,
  DriverAvailabilityStatus,
} from '../types';

// Check if we should use real API
const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true';

console.log(`[BackendService] Using ${USE_REAL_API ? 'REAL' : 'MOCK'} backend`);

// Type for any user
type AnyUser = Client | Driver | SupportAgent | Admin;

// Helper to transform API user response
function transformUserFromApi(data: any): AnyUser {
  const role = data.roles?.[0] || 'client';
  const base = {
    id: String(data.id),
    email: data.email,
    full_name: data.full_name,
    role,
    avatar_url: data.avatar_url,
  };

  if (role === 'driver') {
    return {
      ...base,
      core_status: data.driver_profile?.status || 'pending',
      availability_status: data.driver_profile?.availability_status || 'offline',
      rating_average: data.driver_profile?.rating_average || 0,
      rating_count: data.driver_profile?.total_ratings || 0,
    } as Driver;
  }

  if (role === 'admin') {
    return base as Admin;
  }

  if (role === 'support_agent' || role === 'support') {
    return { ...base, role: 'support_agent' } as SupportAgent;
  }

  return {
    ...base,
    default_currency: 'USD',
  } as Client;
}

// Transform booking from API response - aligned with unified backend schema
function transformBookingFromApi(data: any): Booking {
  // Build legs from stops array using aligned field names (sequence, address, lat, lng)
  const buildLegs = () => {
    const stops = data.stops || [];
    if (stops.length > 1) {
      const pickupStop = stops.find((s: any) => s.stop_type === 'pickup') || stops[0];
      const dropoffStop = stops.find((s: any) => s.stop_type === 'dropoff') || stops[stops.length - 1];
      return [{
        leg_id: `leg-${data.id}-0`,
        booking_id: String(data.id),
        sequence_index: 0,
        pickup: {
          address_line: pickupStop?.address || data.pickup_address || 'Unknown',
          lat: pickupStop?.lat,
          lng: pickupStop?.lng,
        },
        dropoff: {
          address_line: dropoffStop?.address || data.dropoff_address || 'Unknown',
          lat: dropoffStop?.lat,
          lng: dropoffStop?.lng,
        },
      }];
    }
    // Fallback to direct address fields from booking
    return [{
      leg_id: `leg-${data.id}-0`,
      booking_id: String(data.id),
      sequence_index: 0,
      pickup: { 
        address_line: data.pickup_address || 'Unknown',
        lat: data.pickup_lat,
        lng: data.pickup_lng,
      },
      dropoff: { 
        address_line: data.dropoff_address || 'Unknown',
        lat: data.dropoff_lat,
        lng: data.dropoff_lng,
      },
    }];
  };

  return {
    booking_id: String(data.id),
    client_id: String(data.client_id),
    driver_id: data.driver_id ? String(data.driver_id) : undefined,
    status: data.status as BookingStatus,
    created_at: data.created_at,
    // Use aligned field name: requested_pickup_at (not scheduled_start_at)
    requested_pickup_at: data.requested_pickup_at,
    confirmed_at: data.confirmed_at,
    completed_at: data.completed_at,
    is_asap: data.is_asap ?? true,
    legs: buildLegs(),
    passenger_count: data.passenger_count || 1,
    // Use aligned field name: luggage_count (not luggage_details)
    luggage_count: data.luggage_count || 0,
    service_type: data.service_type?.code || 'standard',
    // Use aligned field name: special_notes (not special_requirements)
    special_notes: data.special_notes,
    price_breakdown: data.final_fare ? {
      base_fare: { amount: (data.base_fare || 0) * 100, currency: 'USD' },
      distance_fare: { amount: (data.distance_fare || 0) * 100, currency: 'USD' },
      time_fare: { amount: (data.time_fare || 0) * 100, currency: 'USD' },
      extras_total: { amount: (data.extras_total || 0) * 100, currency: 'USD' },
      tax_total: { amount: (data.tax_total || 0) * 100, currency: 'USD' },
      discount_total: { amount: (data.discount_total || 0) * 100, currency: 'USD' },
      grand_total: { amount: (data.final_fare || 0) * 100, currency: 'USD' },
      driver_earnings: { amount: (data.driver_earnings || 0) * 100, currency: 'USD' },
      platform_fee: { amount: (data.platform_fee || 0) * 100, currency: 'USD' },
    } : undefined,
    timeline: [],
    client_rating_value: data.client_rating,
    client_feedback_text: data.client_feedback,
  };
}


/**
 * Real API Backend Service
 * Calls the FastAPI backend endpoints
 */
class RealBackendService {
  // ==========================================
  // Auth & Users
  // ==========================================

  async login(email: string, password: string): Promise<{ user: AnyUser; token: string }> {
    const response = await api.post<{ access_token: string; refresh_token: string }>('/auth/login', {
      email,
      password,
    }, { requireAuth: false });

    setTokens(response.access_token, response.refresh_token);

    const user = await this.getCurrentUser();
    return { user, token: response.access_token };
  }

  async logout(): Promise<void> {
    clearTokens();
  }

  async getCurrentUser(): Promise<AnyUser> {
    const data = await api.get<any>('/users/me');
    return transformUserFromApi(data);
  }

  async register(data: { email: string; password: string; full_name: string; phone?: string; role?: Role }): Promise<{ user: AnyUser; token: string }> {
    await api.post('/auth/register', data, { requireAuth: false });
    return this.login(data.email, data.password);
  }

  // ==========================================
  // Bookings
  // ==========================================

  async getBookings(clientId?: string, driverId?: string): Promise<Booking[]> {
    const params = new URLSearchParams();
    if (clientId) params.set('client_id', clientId);
    if (driverId) params.set('driver_id', driverId);
    
    const data = await api.get<{ items: any[] }>(`/bookings?${params}`);
    return (data.items || []).map(transformBookingFromApi);
  }

  async getBookingsForDriver(driverId: string): Promise<Booking[]> {
    return this.getBookings(undefined, driverId);
  }

  async getAllBookings(): Promise<Booking[]> {
    const data = await api.get<{ items: any[] }>('/bookings');
    return (data.items || []).map(transformBookingFromApi);
  }

  async getBookingById(bookingId: string): Promise<Booking | undefined> {
    try {
      const data = await api.get<any>(`/bookings/${bookingId}`);
      return transformBookingFromApi(data);
    } catch {
      return undefined;
    }
  }

  async createBooking(data: {
    client_id?: string;
    pickup: string | { address: string; lat?: number; lng?: number };
    dropoff: string | { address: string; lat?: number; lng?: number };
    stops?: Array<string | { address: string; lat?: number; lng?: number }>;
    is_asap?: boolean;
    requested_pickup_at?: string;
    service_type?: string;
    passenger_count?: number;
    luggage_count?: number;
    scheduled_at?: string;
    special_notes?: string;
    accessibility_requirements?: string[];
    options?: string[];
    driver_preferences?: {
      female_driver_only?: boolean;
      verified_driver_only?: boolean;
      high_rated_only?: boolean;
    };
  }): Promise<Booking> {
    const pickupAddr = typeof data.pickup === 'string' ? data.pickup : data.pickup.address;
    const pickupLat = typeof data.pickup === 'string' ? 0 : (data.pickup.lat || 0);
    const pickupLng = typeof data.pickup === 'string' ? 0 : (data.pickup.lng || 0);
    
    const dropoffAddr = typeof data.dropoff === 'string' ? data.dropoff : data.dropoff.address;
    const dropoffLat = typeof data.dropoff === 'string' ? 0 : (data.dropoff.lat || 0);
    const dropoffLng = typeof data.dropoff === 'string' ? 0 : (data.dropoff.lng || 0);

    const stops = [
      { sequence: 0, address: pickupAddr, lat: pickupLat, lng: pickupLng, stop_type: 'pickup' },
      ...(data.stops || []).map((s, i) => ({
        sequence: i + 1,
        address: typeof s === 'string' ? s : s.address,
        lat: typeof s === 'string' ? 0 : (s.lat || 0),
        lng: typeof s === 'string' ? 0 : (s.lng || 0),
        stop_type: 'waypoint',
      })),
      { sequence: (data.stops?.length || 0) + 1, address: dropoffAddr, lat: dropoffLat, lng: dropoffLng, stop_type: 'dropoff' },
    ];

    const response = await api.post<any>('/bookings', {
      stops,
      passenger_count: data.passenger_count || 1,
      // Use aligned field names: luggage_count (integer), special_notes
      luggage_count: data.luggage_count || 0,
      special_notes: data.special_notes,
      // Use aligned field name: requested_pickup_at
      requested_pickup_at: data.scheduled_at || data.requested_pickup_at,
    });

    return transformBookingFromApi(response);
  }

  async updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
    actorId?: string,
    actorRole?: Role
  ): Promise<Booking> {
    const response = await api.patch<any>(`/bookings/${bookingId}/status`, { status });
    return transformBookingFromApi(response);
  }

  async rateBooking(
    bookingId: string,
    ratingOrData: number | { from_role: 'client' | 'driver'; rating: number; comment?: string; tags?: string[] },
    feedback?: string,
    tags?: string[]
  ): Promise<Booking> {
    // Support both old signature (rating, feedback, tags) and new object signature
    const rating = typeof ratingOrData === 'number' ? ratingOrData : ratingOrData.rating;
    const comment = typeof ratingOrData === 'number' ? feedback : ratingOrData.comment;
    
    const response = await api.post<any>(`/bookings/${bookingId}/rate`, {
      rating,
      feedback: comment,
    });
    return transformBookingFromApi(response);
  }

  // ==========================================
  // Drivers
  // ==========================================

  async updateDriverAvailability(
    driverId: string,
    status: DriverAvailabilityStatus
  ): Promise<Driver> {
    const response = await api.patch<any>('/drivers/status', { availability_status: status });
    return {
      id: driverId,
      email: '',
      full_name: '',
      role: 'driver',
      core_status: response.status,
      availability_status: response.availability_status,
      rating_average: response.rating_average,
      rating_count: response.total_ratings,
    };
  }

  async getAvailableDrivers(): Promise<Driver[]> {
    // This would need an admin endpoint
    return mockBackend.getAvailableDrivers();
  }

  async getDriverDocuments(driverId: string): Promise<DriverDocument[]> {
    try {
      const data = await api.get<any[]>('/drivers/documents');
      return data.map(d => ({
        id: String(d.id),
        driver_id: String(d.driver_id),
        type: d.doc_type,
        status: d.status,
        file_name: d.file_url?.split('/').pop() || 'document',
        file_url: d.file_url,
        uploaded_at: d.created_at,
        reviewed_at: d.reviewed_at,
        expiry_date: d.expires_at,
        rejection_reason: d.rejection_reason,
      }));
    } catch {
      return [];
    }
  }

  async getAllDriverDocuments(): Promise<DriverDocument[]> {
    try {
      const data = await api.get<any[]>('/admin/documents');
      return data.map(d => ({
        id: String(d.id),
        driver_id: String(d.driver_id),
        type: d.doc_type,
        status: d.status,
        file_name: d.file_url?.split('/').pop() || 'document',
        file_url: d.file_url,
        uploaded_at: d.created_at,
        reviewed_at: d.reviewed_at,
        expiry_date: d.expires_at,
        rejection_reason: d.rejection_reason,
      }));
    } catch {
      return mockBackend.getAllDriverDocuments();
    }
  }

  // ==========================================
  // Chat & Messaging
  // ==========================================

  async getChats(userId: string): Promise<ChatSession[]> {
    // Real-time chat would use WebSocket, fallback to mock
    return mockBackend.getChats(userId);
  }

  async getMessages(chatId: string): Promise<Message[]> {
    return mockBackend.getMessages(chatId);
  }

  async sendMessage(chatId: string, senderId: string, senderName: string, body: string): Promise<Message> {
    return mockBackend.sendMessage(chatId, senderId, senderName, body);
  }

  // ==========================================
  // Support Tickets
  // ==========================================

  async getTickets(filters?: {
    status?: TicketStatus;
    priority?: TicketPriority;
    category?: TicketCategory;
    assignee_id?: string;
  }): Promise<SupportTicket[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.priority) params.set('priority', filters.priority);
      if (filters?.category) params.set('category', filters.category);
      if (filters?.assignee_id) params.set('assigned_to', filters.assignee_id);

      const data = await api.get<{ items: any[] }>(`/support/tickets?${params}`);
      return (data.items || []).map(t => ({
        ticket_id: String(t.id),
        booking_id: t.booking_id ? String(t.booking_id) : undefined,
        client_id: String(t.user_id),
        created_at: t.created_at,
        updated_at: t.updated_at,
        status: t.status as TicketStatus,
        priority: t.priority as TicketPriority,
        category: t.category as TicketCategory,
        subject: t.subject,
        public_description: t.description,
        assignee_id: t.assigned_to ? String(t.assigned_to) : undefined,
      }));
    } catch {
      return mockBackend.getTickets(filters);
    }
  }

  async getTicketById(ticketId: string): Promise<SupportTicket | undefined> {
    try {
      const t = await api.get<any>(`/support/tickets/${ticketId}`);
      return {
        ticket_id: String(t.id),
        booking_id: t.booking_id ? String(t.booking_id) : undefined,
        client_id: String(t.user_id),
        created_at: t.created_at,
        updated_at: t.updated_at,
        status: t.status,
        priority: t.priority,
        category: t.category,
        subject: t.subject,
        public_description: t.description,
        assignee_id: t.assigned_to ? String(t.assigned_to) : undefined,
      };
    } catch {
      return mockBackend.getTicketById(ticketId);
    }
  }

  async updateTicketStatus(ticketId: string, status: TicketStatus): Promise<SupportTicket> {
    try {
      const t = await api.patch<any>(`/support/tickets/${ticketId}`, { status });
      return {
        ticket_id: String(t.id),
        booking_id: t.booking_id ? String(t.booking_id) : undefined,
        client_id: String(t.user_id),
        created_at: t.created_at,
        updated_at: t.updated_at,
        status: t.status as TicketStatus,
        priority: t.priority as TicketPriority,
        category: t.category as TicketCategory,
        subject: t.subject,
        public_description: t.description,
        assignee_id: t.assigned_to ? String(t.assigned_to) : undefined,
      };
    } catch {
      return mockBackend.updateTicketStatus(ticketId, status);
    }
  }

  async createTicket(data: {
    category: TicketCategory;
    subject: string;
    description: string;
    priority?: TicketPriority;
    booking_id?: string;
  }): Promise<SupportTicket> {
    try {
      const t = await api.post<any>('/support/tickets', {
        category: data.category,
        subject: data.subject,
        description: data.description,
        priority: data.priority || 'medium',
        booking_id: data.booking_id ? parseInt(data.booking_id) : undefined,
      });
      return {
        ticket_id: String(t.id),
        booking_id: t.booking_id ? String(t.booking_id) : undefined,
        client_id: String(t.user_id),
        created_at: t.created_at,
        updated_at: t.updated_at,
        status: t.status as TicketStatus,
        priority: t.priority as TicketPriority,
        category: t.category as TicketCategory,
        subject: t.subject,
        public_description: t.description,
      };
    } catch {
      return mockBackend.createTicket({
        ...data,
        priority: data.priority || 'medium',
      });
    }
  }

  // ==========================================
  // Payment Methods
  // ==========================================

  async getPaymentMethods(clientId: string): Promise<PaymentMethod[]> {
    try {
      const data = await api.get<any[]>('/payments/methods');
      return data.map(m => ({
        id: String(m.id),
        client_id: String(m.user_id),
        type: m.method_type as PaymentMethodType,
        brand: (m.brand || 'other') as CardBrand,
        last4: m.last_four,
        expiry_month: m.exp_month,
        expiry_year: m.exp_year,
        is_default: m.is_default,
        holder_name: m.holder_name || '',
        created_at: m.created_at,
      }));
    } catch {
      return mockBackend.getPaymentMethods(clientId);
    }
  }

  async addPaymentMethod(clientId: string, data: {
    type: PaymentMethodType;
    brand?: CardBrand;
    last4: string;
    expiry_month: number;
    expiry_year: number;
    holder_name: string;
    is_default?: boolean;
  }): Promise<PaymentMethod> {
    try {
      const m = await api.post<any>('/payments/methods', {
        method_type: data.type,
        brand: data.brand,
        last_four: data.last4,
        exp_month: data.expiry_month,
        exp_year: data.expiry_year,
        holder_name: data.holder_name,
        is_default: data.is_default,
      });
      return {
        id: String(m.id),
        client_id: String(m.user_id),
        type: m.method_type as PaymentMethodType,
        brand: (m.brand || 'other') as CardBrand,
        last4: m.last_four,
        expiry_month: m.exp_month,
        expiry_year: m.exp_year,
        is_default: m.is_default,
        holder_name: data.holder_name,
        created_at: m.created_at,
      };
    } catch {
      return mockBackend.addPaymentMethod(clientId, {
        ...data,
        brand: data.brand || 'other',
      });
    }
  }

  async removePaymentMethod(methodId: string): Promise<void> {
    try {
      await api.delete(`/payments/methods/${methodId}`);
    } catch {
      await mockBackend.removePaymentMethod(methodId);
    }
  }

  async setDefaultPaymentMethod(methodId: string): Promise<PaymentMethod> {
    try {
      const m = await api.patch<any>(`/payments/methods/${methodId}/default`);
      return {
        id: String(m.id),
        client_id: String(m.user_id),
        type: m.method_type as PaymentMethodType,
        brand: (m.brand || 'other') as CardBrand,
        last4: m.last_four,
        expiry_month: m.exp_month,
        expiry_year: m.exp_year,
        is_default: m.is_default,
        holder_name: m.holder_name || '',
        created_at: m.created_at,
      };
    } catch {
      return mockBackend.setDefaultPaymentMethod(methodId);
    }
  }

  // ==========================================
  // Admin Stats
  // ==========================================

  async getAdminStats(): Promise<{
    totalBookings: number;
    activeBookings: number;
    completedBookings: number;
    totalDrivers: number;
    availableDrivers: number;
    openTickets: number;
    totalRevenue: number;
  }> {
    try {
      const data = await api.get<any>('/admin/dashboard');
      return {
        totalBookings: data.total_bookings || 0,
        activeBookings: data.active_bookings || data.pending_bookings || 0,
        completedBookings: data.completed_bookings || 0,
        totalDrivers: data.total_drivers || data.active_drivers || 0,
        availableDrivers: data.available_drivers || 0,
        openTickets: data.open_tickets || 0,
        totalRevenue: data.total_revenue || 0,
      };
    } catch {
      return mockBackend.getAdminStats();
    }
  }

  // ==========================================
  // User Management
  // ==========================================

  async getAllUsers(filters?: {
    role?: string;
    status?: string;
    search?: string;
  }): Promise<AnyUser[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.role) params.set('role', filters.role);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.search) params.set('search', filters.search);
      params.set('limit', '100');
      
      const data = await api.get<{ items: any[]; total: number }>(`/users?${params}`);
      return (data.items || []).map((user: any) => transformUserFromApi(user));
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  async getUserById(userId: string): Promise<AnyUser | undefined> {
    try {
      const data = await api.get<any>(`/users/${userId}`);
      return transformUserFromApi(data);
    } catch {
      return undefined;
    }
  }

  async getUserStats(): Promise<{
    totalClients: number;
    totalDrivers: number;
    activeDrivers: number;
    pendingDrivers: number;
    suspendedDrivers: number;
    totalSupportAgents: number;
    totalAdmins: number;
  }> {
    try {
      const data = await api.get<any>('/users/stats');
      return {
        totalClients: data.total_clients || 0,
        totalDrivers: data.total_drivers || 0,
        activeDrivers: data.active_drivers || 0,
        pendingDrivers: data.pending_drivers || 0,
        suspendedDrivers: data.suspended_drivers || 0,
        totalSupportAgents: data.total_support || 0,
        totalAdmins: data.total_admins || 0,
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return {
        totalClients: 0,
        totalDrivers: 0,
        activeDrivers: 0,
        pendingDrivers: 0,
        suspendedDrivers: 0,
        totalSupportAgents: 0,
        totalAdmins: 0,
      };
    }
  }

  async updateDriverStatus(userId: string, status: string): Promise<AnyUser> {
    const data = await api.patch<any>(`/users/${userId}`, { status });
    return transformUserFromApi(data);
  }

  // ==========================================
  // Admin User Provisioning
  // ==========================================

  async adminCreateUser(data: {
    email: string;
    full_name: string;
    role: string;
    phone?: string;
    password?: string;
    send_invite?: boolean;
  }): Promise<{ success: boolean; message: string; user_id?: number; temporary_password?: string; invite_link?: string }> {
    return api.post('/admin/users/create', data);
  }

  async adminUpdateUserRole(userId: string, newRole: string): Promise<{ success: boolean; message: string }> {
    return api.put(`/admin/users/${userId}/role`, { new_role: newRole });
  }

  async adminInviteUser(data: {
    email: string;
    full_name: string;
    role: string;
    message?: string;
  }): Promise<{ success: boolean; message: string; user_id?: number; temporary_password?: string; invite_link?: string }> {
    return api.post('/admin/users/invite', data);
  }

  async adminDeleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    return api.delete(`/admin/users/${userId}`);
  }

  async adminResetUserPassword(userId: string): Promise<{ success: boolean; message: string; temporary_password?: string }> {
    return api.put(`/admin/users/${userId}/reset-password`, {});
  }

  // ==========================================
  // Fallback to Mock for unimplemented endpoints
  // ==========================================

  // These methods delegate to mockBackend for now
  addTicketNote = mockBackend.addTicketNote.bind(mockBackend);
  uploadDriverDocument = mockBackend.uploadDriverDocument.bind(mockBackend);
  deleteDriverDocument = mockBackend.deleteDriverDocument.bind(mockBackend);
  reviewDriverDocument = mockBackend.reviewDriverDocument.bind(mockBackend);
  updateDocumentStatus = mockBackend.updateDocumentStatus.bind(mockBackend);
  getDriverPerformanceMetrics = mockBackend.getDriverPerformanceMetrics.bind(mockBackend);
  getPromoCodes = mockBackend.getPromoCodes.bind(mockBackend);
  createPromoCode = mockBackend.createPromoCode.bind(mockBackend);
  updatePromoCode = mockBackend.updatePromoCode.bind(mockBackend);
  deletePromoCode = mockBackend.deletePromoCode.bind(mockBackend);
  validatePromoCode = mockBackend.validatePromoCode.bind(mockBackend);
  applyPromoCode = mockBackend.applyPromoCode.bind(mockBackend);
  getVehicleByDriverId = mockBackend.getVehicleByDriverId.bind(mockBackend);
  getVehicleById = mockBackend.getVehicleById.bind(mockBackend);
  getAllVehicles = mockBackend.getAllVehicles.bind(mockBackend);
  createVehicle = mockBackend.createVehicle.bind(mockBackend);
  updateVehicle = mockBackend.updateVehicle.bind(mockBackend);
  updateVehicleStatus = mockBackend.updateVehicleStatus.bind(mockBackend);
  getSavedAddresses = mockBackend.getSavedAddresses.bind(mockBackend);
  createSavedAddress = mockBackend.createSavedAddress.bind(mockBackend);
  updateSavedAddress = mockBackend.updateSavedAddress.bind(mockBackend);
  deleteSavedAddress = mockBackend.deleteSavedAddress.bind(mockBackend);
  getCancellationPolicies = mockBackend.getCancellationPolicies.bind(mockBackend);
  getCancellationPolicyById = mockBackend.getCancellationPolicyById.bind(mockBackend);
  createCancellationPolicy = mockBackend.createCancellationPolicy.bind(mockBackend);
  updateCancellationPolicy = mockBackend.updateCancellationPolicy.bind(mockBackend);
  deleteCancellationPolicy = mockBackend.deleteCancellationPolicy.bind(mockBackend);
  getPolicyForServiceType = mockBackend.getPolicyForServiceType.bind(mockBackend);
  getDriverPayouts = mockBackend.getDriverPayouts.bind(mockBackend);
  getNextPayoutInfo = mockBackend.getNextPayoutInfo.bind(mockBackend);
}

// Create the real backend instance
const realBackend = new RealBackendService();

// Export the appropriate backend based on configuration
export const backend = USE_REAL_API ? realBackend : mockBackend;

// Also export individual backends for testing/debugging
export { mockBackend, realBackend };

// Default export
export default backend;
