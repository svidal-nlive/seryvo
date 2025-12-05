/**
 * API module index.
 * Re-exports all API modules for convenient imports.
 */

// Base API client
export { default as api, ApiError, getAccessToken, setTokens, clearTokens, isAuthenticated } from '../api';

// Auth API
export { authApi, type LoginRequest, type RegisterRequest, type TokenResponse, type AuthUser } from './auth';

// Bookings API
export {
  bookingsApi,
  type CreateBookingRequest,
  type UpdateBookingStatusRequest,
  type RateBookingRequest,
  type BookingListParams,
} from './bookings';

// Users API
export {
  usersApi,
  type UserResponse,
  type UserListParams,
  type UpdateUserRequest,
  type CreateUserRequest,
  type UserStats,
  type User,
} from './users';

// Drivers API
export {
  driversApi,
  type DriverResponse,
  type DriverDocument,
  type DriverPayout,
  type DriverPerformanceMetrics,
  type VehicleResponse,
  type CreateVehicleRequest,
} from './drivers';

// Support API
export {
  supportApi,
  type TicketStatus,
  type TicketPriority,
  type TicketCategory,
  type TicketResponse,
  type CreateTicketRequest,
  type TicketListParams,
  type TicketStats,
} from './support';

// Admin API
export {
  adminApi,
  type DashboardStats,
  type RevenueReport,
  type PromoCodeResponse,
  type CreatePromoCodeRequest,
  type CancellationPolicyResponse,
  type CreateCancellationPolicyRequest,
  type AuditLogEntry,
} from './admin';
