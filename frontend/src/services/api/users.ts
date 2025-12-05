/**
 * Users API module.
 * Handles user management operations (admin functions).
 */

import api from '../api';
import type { Role } from '../../types';

// ---- Response Types ----

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

export interface UserListParams {
  role?: Role;
  search?: string;
  is_active?: boolean;
  skip?: number;
  limit?: number;
}

export interface UpdateUserRequest {
  full_name?: string;
  email?: string;
  is_active?: boolean;
  roles?: Role[];
  avatar_url?: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  roles: Role[];
  is_active?: boolean;
}

export interface UserStats {
  total_clients: number;
  total_drivers: number;
  active_drivers: number;
  pending_drivers: number;
  suspended_drivers: number;
  total_support_agents: number;
  total_admins: number;
}

// Frontend user type
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  roles: Role[];
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// ---- Transform Functions ----

function transformUser(u: UserResponse): User {
  return {
    id: String(u.id),
    email: u.email,
    full_name: u.full_name,
    role: u.roles[0] || 'client',
    roles: u.roles,
    is_active: u.is_active,
    avatar_url: u.avatar_url,
    created_at: u.created_at,
    updated_at: u.updated_at,
  };
}

// ---- API Functions ----

/**
 * Get a list of all users (admin only).
 */
export async function getUsers(params?: UserListParams): Promise<User[]> {
  const searchParams = new URLSearchParams();
  if (params?.role) searchParams.set('role', params.role);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.is_active !== undefined) searchParams.set('is_active', String(params.is_active));
  if (params?.skip) searchParams.set('skip', String(params.skip));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  const endpoint = query ? `/users?${query}` : '/users';

  const users = await api.get<UserResponse[]>(endpoint);
  return users.map(transformUser);
}

/**
 * Get a single user by ID.
 */
export async function getUserById(userId: string): Promise<User> {
  const user = await api.get<UserResponse>(`/users/${userId}`);
  return transformUser(user);
}

/**
 * Create a new user (admin only).
 */
export async function createUser(data: CreateUserRequest): Promise<User> {
  const user = await api.post<UserResponse>('/users', data);
  return transformUser(user);
}

/**
 * Update a user.
 */
export async function updateUser(userId: string, data: UpdateUserRequest): Promise<User> {
  const user = await api.patch<UserResponse>(`/users/${userId}`, data);
  return transformUser(user);
}

/**
 * Delete a user (admin only).
 */
export async function deleteUser(userId: string): Promise<void> {
  await api.delete(`/users/${userId}`);
}

/**
 * Activate a user.
 */
export async function activateUser(userId: string): Promise<User> {
  return updateUser(userId, { is_active: true });
}

/**
 * Deactivate a user.
 */
export async function deactivateUser(userId: string): Promise<User> {
  return updateUser(userId, { is_active: false });
}

/**
 * Update user roles.
 */
export async function updateUserRoles(userId: string, roles: Role[]): Promise<User> {
  return updateUser(userId, { roles });
}

/**
 * Get user statistics (admin only).
 */
export async function getUserStats(): Promise<UserStats> {
  return api.get<UserStats>('/users/stats');
}

/**
 * Update current user's profile.
 */
export async function updateMyProfile(data: { full_name?: string; avatar_url?: string }): Promise<User> {
  const user = await api.patch<UserResponse>('/users/me', data);
  return transformUser(user);
}

/**
 * Change current user's password.
 */
export async function changePassword(data: { current_password: string; new_password: string }): Promise<void> {
  await api.post('/users/me/password', data);
}

export const usersApi = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  activateUser,
  deactivateUser,
  updateUserRoles,
  getUserStats,
  updateMyProfile,
  changePassword,
};

export default usersApi;
