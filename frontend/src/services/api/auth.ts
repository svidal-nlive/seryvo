/**
 * Authentication API module.
 * Handles login, register, logout, and user session management.
 */

import api, { setTokens, clearTokens } from '../api';
import type { Role } from '../../types';

// ---- Request/Response Types ----

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role?: Role;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

export interface UserResponse {
  id: number;
  email: string;
  full_name: string;
  roles: Role[];
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// Map backend user response to frontend AuthUser type
export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  roles: Role[];
  avatar_url?: string;
  is_active: boolean;
}

// ---- Helper Functions ----

/**
 * Transform backend user response to frontend AuthUser format.
 */
function transformUser(user: UserResponse): AuthUser {
  return {
    id: String(user.id),
    email: user.email,
    full_name: user.full_name,
    // Primary role is the first role in the list
    role: user.roles[0] || 'client',
    roles: user.roles,
    avatar_url: user.avatar_url,
    is_active: user.is_active,
  };
}

// ---- API Functions ----

/**
 * Login with email and password.
 * Stores tokens and returns the authenticated user.
 */
export async function login(credentials: LoginRequest): Promise<AuthUser> {
  // Login endpoint expects form data in OAuth2 format
  const response = await api.post<TokenResponse>('/auth/login', credentials, {
    requireAuth: false,
  });

  // Store tokens
  setTokens(response.access_token, response.refresh_token);

  // Fetch the current user
  const user = await getCurrentUser();
  return user;
}

/**
 * Register a new user.
 * Automatically logs in the user after registration.
 */
export async function register(data: RegisterRequest): Promise<AuthUser> {
  await api.post<UserResponse>('/auth/register', data, {
    requireAuth: false,
  });

  // After registration, log in the user
  return login({ email: data.email, password: data.password });
}

/**
 * Get the currently authenticated user.
 */
export async function getCurrentUser(): Promise<AuthUser> {
  const user = await api.get<UserResponse>('/auth/me');
  return transformUser(user);
}

/**
 * Logout the current user.
 * Clears tokens from local storage.
 */
export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch {
    // Even if the API call fails, clear local tokens
  } finally {
    clearTokens();
  }
}

/**
 * Refresh the access token.
 */
export async function refreshToken(refresh_token: string): Promise<TokenResponse> {
  const response = await api.post<TokenResponse>(
    '/auth/refresh',
    { refresh_token },
    { requireAuth: false }
  );
  setTokens(response.access_token, response.refresh_token);
  return response;
}

/**
 * Check if the current session is valid.
 * Returns the user if valid, null otherwise.
 */
export async function validateSession(): Promise<AuthUser | null> {
  try {
    return await getCurrentUser();
  } catch {
    clearTokens();
    return null;
  }
}

// ---- Setup Status Types (First-User-Becomes-Admin) ----

export interface SetupStatusResponse {
  is_setup_complete: boolean;
  user_count: number;
  requires_admin_setup: boolean;
  message: string;
}

export interface FirstUserSetupRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

/**
 * Check if the platform has been set up (first user registered).
 * This is used to show the setup wizard on first visit.
 */
export async function getSetupStatus(): Promise<SetupStatusResponse> {
  return api.get<SetupStatusResponse>('/auth/setup-status', {
    requireAuth: false,
  });
}

/**
 * Create the first admin user during initial setup.
 * Only works if no users exist in the database.
 */
export async function firstUserSetup(data: FirstUserSetupRequest): Promise<AuthUser> {
  const response = await api.post<TokenResponse>('/auth/setup', data, {
    requireAuth: false,
  });

  // Store tokens
  setTokens(response.access_token, response.refresh_token);

  // Fetch the current user
  const user = await getCurrentUser();
  return user;
}

// ---- OTP Verification Types ----

export interface OTPSendRequest {
  identifier: string;
  identifier_type: 'email' | 'phone';
  purpose: 'registration' | 'login' | 'password_reset' | 'phone_verify';
}

export interface OTPSendResponse {
  success: boolean;
  message: string;
  expires_in_seconds: number;
  masked_identifier: string;
}

export interface OTPVerifyRequest {
  identifier: string;
  identifier_type: 'email' | 'phone';
  code: string;
  purpose: 'registration' | 'login' | 'password_reset' | 'phone_verify';
}

export interface OTPVerifyResponse {
  success: boolean;
  message: string;
  verification_token?: string;
}

export interface RegisterWithOTPRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role?: Role;
  verification_token: string;
}

export interface UserVerificationStatus {
  user_id: number;
  email_verified: boolean;
  email_verified_at?: string;
  phone_verified: boolean;
  phone_verified_at?: string;
}

// ---- OTP API Functions ----

/**
 * Send OTP verification code to email or phone.
 */
export async function sendOTP(request: OTPSendRequest): Promise<OTPSendResponse> {
  return api.post<OTPSendResponse>('/auth/otp/send', request, {
    requireAuth: false,
  });
}

/**
 * Verify OTP code.
 */
export async function verifyOTP(request: OTPVerifyRequest): Promise<OTPVerifyResponse> {
  return api.post<OTPVerifyResponse>('/auth/otp/verify', request, {
    requireAuth: false,
  });
}

/**
 * Register a new user with OTP verification.
 */
export async function registerWithOTP(data: RegisterWithOTPRequest): Promise<AuthUser> {
  const response = await api.post<TokenResponse>('/auth/register-with-otp', data, {
    requireAuth: false,
  });

  // Store tokens
  setTokens(response.access_token, response.refresh_token);

  // Fetch the current user
  const user = await getCurrentUser();
  return user;
}

/**
 * Get current user's verification status.
 */
export async function getVerificationStatus(): Promise<UserVerificationStatus> {
  return api.get<UserVerificationStatus>('/auth/verification-status');
}

/**
 * Verify phone number for authenticated user.
 */
export async function verifyPhoneNumber(
  phone: string,
  code: string
): Promise<UserVerificationStatus> {
  return api.post<UserVerificationStatus>('/auth/verify-phone', {
    identifier: phone,
    identifier_type: 'phone',
    code,
    purpose: 'phone_verify',
  });
}

// ---- Password Reset Types ----

export interface PasswordResetResponse {
  success: boolean;
  message: string;
  data?: {
    reset_token?: string;
  };
}

// ---- Password Reset API Functions ----

/**
 * Request a password reset OTP code.
 */
export async function requestPasswordReset(email: string): Promise<PasswordResetResponse> {
  return api.post<PasswordResetResponse>('/auth/password-reset', { email }, {
    requireAuth: false,
  });
}

/**
 * Verify password reset OTP code.
 */
export async function verifyPasswordResetCode(email: string, code: string): Promise<PasswordResetResponse> {
  return api.post<PasswordResetResponse>('/auth/password-reset/verify', { email, code }, {
    requireAuth: false,
  });
}

/**
 * Confirm password reset with new password.
 */
export async function confirmPasswordReset(token: string, newPassword: string): Promise<PasswordResetResponse> {
  return api.post<PasswordResetResponse>('/auth/password-reset/confirm', { 
    token, 
    new_password: newPassword 
  }, {
    requireAuth: false,
  });
}

export const authApi = {
  login,
  register,
  logout,
  getCurrentUser,
  refreshToken,
  validateSession,
  // Setup functions
  getSetupStatus,
  firstUserSetup,
  // OTP functions
  sendOTP,
  verifyOTP,
  registerWithOTP,
  getVerificationStatus,
  verifyPhoneNumber,
  // Password reset functions
  requestPasswordReset,
  verifyPasswordResetCode,
  confirmPasswordReset,
};

export default authApi;
