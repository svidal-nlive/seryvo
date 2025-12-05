/**
 * Drivers API module.
 * Handles driver-specific operations like availability, documents, vehicles, and payouts.
 */

import api from '../api';
import type {
  Driver,
  DriverCoreStatus,
  DriverAvailabilityStatus,
  Vehicle,
  VehicleStatus,
  ServiceTypeCode,
} from '../../types';

// ---- Types ----

export interface DriverResponse {
  id: number;
  email: string;
  full_name: string;
  roles: string[];
  is_active: boolean;
  avatar_url?: string;
  core_status: DriverCoreStatus;
  availability_status: DriverAvailabilityStatus;
  rating_average?: number;
  rating_count?: number;
  vehicle_id?: number;
  created_at: string;
  updated_at: string;
}

export interface DriverDocument {
  id: number;
  driver_id: number;
  type: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'expired';
  file_name: string;
  file_url: string;
  uploaded_at: string;
  reviewed_at?: string;
  expiry_date?: string;
  rejection_reason?: string;
}

export interface DriverPayout {
  id: number;
  driver_id: number;
  amount: number;
  currency: string;
  period_start: string;
  period_end: string;
  trips_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payout_method: string;
  reference_number?: string;
  initiated_at: string;
  completed_at?: string;
}

export interface DriverPerformanceMetrics {
  acceptance_rate: number;
  cancellation_rate: number;
  completion_rate: number;
  total_trips: number;
  total_accepted: number;
  total_declined: number;
  total_cancelled: number;
  average_response_time_seconds: number;
  on_time_arrival_rate: number;
}

export interface VehicleResponse {
  id: number;
  driver_id: number;
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
  photo_urls: Record<string, string>;
  insurance_expiry?: string;
  registration_expiry?: string;
  inspection_expiry?: string;
  status: VehicleStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateVehicleRequest {
  make: string;
  model: string;
  year: number;
  color: string;
  license_plate: string;
  vin?: string;
  service_types: ServiceTypeCode[];
  capacity_passengers: number;
  capacity_luggage: number;
  accessibility_features?: string[];
  photo_urls?: Record<string, string>;
  insurance_expiry?: string;
  registration_expiry?: string;
  inspection_expiry?: string;
}

// ---- Transform Functions ----

function transformDriver(d: DriverResponse): Driver {
  return {
    id: String(d.id),
    email: d.email,
    full_name: d.full_name,
    role: 'driver',
    avatar_url: d.avatar_url,
    core_status: d.core_status,
    availability_status: d.availability_status,
    rating_average: d.rating_average,
    rating_count: d.rating_count,
    vehicle_id: d.vehicle_id ? String(d.vehicle_id) : undefined,
  };
}

function transformVehicle(v: VehicleResponse): Vehicle {
  return {
    id: String(v.id),
    driver_id: String(v.driver_id),
    make: v.make,
    model: v.model,
    year: v.year,
    color: v.color,
    license_plate: v.license_plate,
    vin: v.vin,
    service_types: v.service_types,
    capacity_passengers: v.capacity_passengers,
    capacity_luggage: v.capacity_luggage,
    accessibility_features: v.accessibility_features,
    photo_urls: v.photo_urls as Vehicle['photo_urls'],
    insurance_expiry: v.insurance_expiry,
    registration_expiry: v.registration_expiry,
    inspection_expiry: v.inspection_expiry,
    status: v.status,
    created_at: v.created_at,
    updated_at: v.updated_at,
  };
}

// ---- API Functions ----

/**
 * Get all drivers (admin/support).
 */
export async function getDrivers(params?: {
  status?: DriverCoreStatus;
  availability?: DriverAvailabilityStatus;
  skip?: number;
  limit?: number;
}): Promise<Driver[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.availability) searchParams.set('availability', params.availability);
  if (params?.skip) searchParams.set('skip', String(params.skip));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  const endpoint = query ? `/drivers?${query}` : '/drivers';

  const drivers = await api.get<DriverResponse[]>(endpoint);
  return drivers.map(transformDriver);
}

/**
 * Get a single driver by ID.
 */
export async function getDriverById(driverId: string): Promise<Driver> {
  const driver = await api.get<DriverResponse>(`/drivers/${driverId}`);
  return transformDriver(driver);
}

/**
 * Update driver availability status.
 */
export async function updateAvailability(status: DriverAvailabilityStatus): Promise<Driver> {
  const driver = await api.patch<DriverResponse>('/drivers/me/availability', { status });
  return transformDriver(driver);
}

/**
 * Update driver core status (admin only).
 */
export async function updateDriverStatus(
  driverId: string,
  status: DriverCoreStatus
): Promise<Driver> {
  const driver = await api.patch<DriverResponse>(`/drivers/${driverId}/status`, { status });
  return transformDriver(driver);
}

/**
 * Get available drivers.
 */
export async function getAvailableDrivers(): Promise<Driver[]> {
  const drivers = await api.get<DriverResponse[]>('/drivers/available');
  return drivers.map(transformDriver);
}

// ---- Documents ----

/**
 * Get driver's documents.
 */
export async function getMyDocuments(): Promise<DriverDocument[]> {
  return api.get<DriverDocument[]>('/drivers/documents');
}

/**
 * Get all documents pending review (admin/support).
 */
export async function getPendingDocuments(): Promise<DriverDocument[]> {
  return api.get<DriverDocument[]>('/drivers/admin/documents/pending');
}

/**
 * Upload a driver document.
 */
export async function uploadDocument(
  type: string,
  file: File
): Promise<DriverDocument> {
  const formData = new FormData();
  formData.append('doc_type', type);
  formData.append('file', file);

  // Use fetch directly for multipart/form-data
  const token = localStorage.getItem('seryvo_access_token');
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  const response = await fetch(`${baseUrl}/drivers/documents`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || 'Failed to upload document');
  }

  return response.json();
}

/**
 * Review a document (admin/support).
 */
export async function reviewDocument(
  documentId: string,
  status: 'approved' | 'rejected',
  rejectionReason?: string,
  expiryDate?: string
): Promise<DriverDocument> {
  return api.patch<DriverDocument>(`/drivers/admin/documents/${documentId}/review`, {
    status,
    rejection_reason: rejectionReason,
    expires_at: expiryDate,
  });
}

/**
 * Delete a document.
 */
export async function deleteDocument(documentId: string): Promise<void> {
  await api.delete(`/drivers/documents/${documentId}`);
}

// ---- Vehicles ----

/**
 * Get driver's vehicle.
 */
export async function getMyVehicle(): Promise<Vehicle | null> {
  try {
    const vehicle = await api.get<VehicleResponse>('/drivers/me/vehicle');
    return transformVehicle(vehicle);
  } catch {
    return null;
  }
}

/**
 * Create a vehicle.
 */
export async function createVehicle(data: CreateVehicleRequest): Promise<Vehicle> {
  const vehicle = await api.post<VehicleResponse>('/drivers/me/vehicle', data);
  return transformVehicle(vehicle);
}

/**
 * Update a vehicle.
 */
export async function updateVehicle(
  vehicleId: string,
  data: Partial<CreateVehicleRequest>
): Promise<Vehicle> {
  const vehicle = await api.patch<VehicleResponse>(`/drivers/vehicles/${vehicleId}`, data);
  return transformVehicle(vehicle);
}

/**
 * Get all vehicles (admin).
 */
export async function getAllVehicles(): Promise<Vehicle[]> {
  const vehicles = await api.get<VehicleResponse[]>('/drivers/vehicles');
  return vehicles.map(transformVehicle);
}

/**
 * Update vehicle status (admin).
 */
export async function updateVehicleStatus(
  vehicleId: string,
  status: VehicleStatus
): Promise<Vehicle> {
  const vehicle = await api.patch<VehicleResponse>(`/drivers/vehicles/${vehicleId}/status`, {
    status,
  });
  return transformVehicle(vehicle);
}

// ---- Performance & Payouts ----

/**
 * Get driver performance metrics.
 */
export async function getMyPerformance(): Promise<DriverPerformanceMetrics> {
  return api.get<DriverPerformanceMetrics>('/drivers/me/performance');
}

/**
 * Get driver's payout history.
 */
export async function getMyPayouts(): Promise<DriverPayout[]> {
  return api.get<DriverPayout[]>('/drivers/me/payouts');
}

/**
 * Get next payout info.
 */
export async function getNextPayoutInfo(): Promise<{
  next_payout_date: string;
  estimated_amount: number;
  pending_trips: number;
}> {
  return api.get('/drivers/me/payouts/next');
}

export const driversApi = {
  getDrivers,
  getDriverById,
  updateAvailability,
  updateDriverStatus,
  getAvailableDrivers,
  getMyDocuments,
  getPendingDocuments,
  uploadDocument,
  reviewDocument,
  deleteDocument,
  getMyVehicle,
  createVehicle,
  updateVehicle,
  getAllVehicles,
  updateVehicleStatus,
  getMyPerformance,
  getMyPayouts,
  getNextPayoutInfo,
};

export default driversApi;
