/**
 * Seryvo Platform - Test Types
 * 
 * Type definitions for end-to-end testing, including user credentials,
 * test data structures, and shared interfaces.
 */

export type UserRole = 'admin' | 'client' | 'driver' | 'support_agent';

export interface TestUser {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  id?: string;
}

export interface TestCredentials {
  admin: TestUser;
  client: TestUser;
  driver: TestUser;
  supportAgent: TestUser;
}

export interface BookingDetails {
  pickupAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffAddress: string;
  dropoffLat?: number;
  dropoffLng?: number;
  passengerCount: number;
  isAsap: boolean;
  serviceType: 'standard' | 'premium' | 'xl' | 'wheelchair_accessible';
  specialNotes?: string;
}

export interface TripStatus {
  status: 'requested' | 'driver_assigned' | 'driver_en_route_pickup' | 'driver_arrived' | 'in_progress' | 'completed' | 'canceled_by_client' | 'canceled_by_driver';
  timestamp: Date;
}

export interface SupportTicketDetails {
  category: 'trip_issue' | 'account_issue' | 'payment_dispute' | 'safety_incident' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string;
  description: string;
}

export interface ViewportConfig {
  name: string;
  width: number;
  height: number;
  isMobile: boolean;
  hasTouch: boolean;
}

// Test viewports for responsive testing
export const TEST_VIEWPORTS: ViewportConfig[] = [
  { name: 'desktop', width: 1920, height: 1080, isMobile: false, hasTouch: false },
  { name: 'laptop', width: 1366, height: 768, isMobile: false, hasTouch: false },
  { name: 'tablet-landscape', width: 1024, height: 768, isMobile: false, hasTouch: true },
  { name: 'tablet-portrait', width: 768, height: 1024, isMobile: false, hasTouch: true },
  { name: 'mobile-large', width: 414, height: 896, isMobile: true, hasTouch: true },
  { name: 'mobile-small', width: 375, height: 667, isMobile: true, hasTouch: true },
];

/**
 * Demo user credentials from backend seed_demo_data.py
 * All demo users use the password: demo123
 * NOTE: Demo data must be loaded via admin settings for these to work
 */
export const DEMO_PASSWORD = 'demo123';

/**
 * Test user for fresh database scenarios
 * This user can be registered if demo data is not loaded
 */
export const TEST_ADMIN: TestUser = {
  email: 'testadmin@seryvo-test.local',
  password: 'TestAdmin123!',
  fullName: 'Test Administrator',
  role: 'admin',
};

export const DEMO_USERS: Record<string, TestUser> = {
  // Admin
  admin: {
    email: 'admin@demo.com',
    password: DEMO_PASSWORD,
    fullName: 'David Admin',
    role: 'admin',
  },
  
  // Clients
  alice: {
    email: 'alice@demo.com',
    password: DEMO_PASSWORD,
    fullName: 'Alice Johnson',
    role: 'client',
  },
  bob: {
    email: 'bob@demo.com',
    password: DEMO_PASSWORD,
    fullName: 'Bob Williams',
    role: 'client',
  },
  carol: {
    email: 'carol@demo.com',
    password: DEMO_PASSWORD,
    fullName: 'Carol Davis',
    role: 'client',
  },
  
  // Drivers
  mike: {
    email: 'mike@demo.com',
    password: DEMO_PASSWORD,
    fullName: 'Mike Chen',
    role: 'driver',
  },
  sarah: {
    email: 'sarah@demo.com',
    password: DEMO_PASSWORD,
    fullName: 'Sarah Miller',
    role: 'driver',
  },
  james: {
    email: 'james@demo.com',
    password: DEMO_PASSWORD,
    fullName: 'James Wilson',
    role: 'driver',
  },
  emma: {
    email: 'emma@demo.com',
    password: DEMO_PASSWORD,
    fullName: 'Emma Brown',
    role: 'driver',
  },
  
  // Support
  support1: {
    email: 'support1@demo.com',
    password: DEMO_PASSWORD,
    fullName: 'Lisa Support',
    role: 'support_agent',
  },
  support2: {
    email: 'support2@demo.com',
    password: DEMO_PASSWORD,
    fullName: 'Tom Support',
    role: 'support_agent',
  },
};

/**
 * Get the primary demo user for each role (for tests)
 */
export function getDemoUser(role: UserRole): TestUser {
  switch (role) {
    case 'admin':
      return DEMO_USERS.admin;
    case 'client':
      return DEMO_USERS.alice;
    case 'driver':
      return DEMO_USERS.mike;
    case 'support_agent':
      return DEMO_USERS.support1;
    default:
      throw new Error(`Unknown role: ${role}`);
  }
}

// Test data generators (for creating new users if needed)
export function generateTestEmail(role: UserRole): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `test.${role}.${timestamp}.${randomSuffix}@seryvo-test.com`;
}

export function generateTestPassword(): string {
  return `TestP@ss${Date.now().toString().slice(-4)}!`;
}

export function generateTestUser(role: UserRole): TestUser {
  const roleNames: Record<UserRole, string> = {
    admin: 'Test Admin',
    client: 'Test Client',
    driver: 'Test Driver',
    support_agent: 'Test Support Agent',
  };

  return {
    email: generateTestEmail(role),
    password: generateTestPassword(),
    fullName: roleNames[role],
    role,
  };
}

export function generateTestBooking(): BookingDetails {
  return {
    pickupAddress: '123 Test Pickup Street, Test City, TC 12345',
    pickupLat: 40.7128,
    pickupLng: -74.0060,
    dropoffAddress: '456 Test Dropoff Avenue, Test City, TC 67890',
    dropoffLat: 40.7580,
    dropoffLng: -73.9855,
    passengerCount: 2,
    isAsap: true,
    serviceType: 'standard',
    specialNotes: 'E2E test booking - please handle with care',
  };
}

export function generateSupportTicket(fromRole: 'client' | 'driver'): SupportTicketDetails {
  const prefix = fromRole === 'client' ? 'Client' : 'Driver';
  return {
    category: 'trip_issue',
    priority: 'medium',
    subject: `${prefix} needs assistance with current trip`,
    description: `This is an automated E2E test support request from a ${fromRole}. Please respond to test the support workflow.`,
  };
}
