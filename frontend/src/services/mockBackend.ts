/**
 * Mock Backend Service
 * Provides in-memory data operations for development and demo purposes.
 * All operations simulate network delay and use canonical types.
 */

import type {
  Booking,
  BookingStatus,
  BookingTimelineEvent,
  RideLeg,
  Client,
  Driver,
  SupportAgent,
  Admin,
  ChatSession,
  Message,
  SupportTicket,
  PaymentMethod,
  DriverDocument,
  DocumentType,
  DocumentStatus,
  PromoCode,
  PromoDiscountType,
  PromoStatus,
  AppliedPromo,
  Role,
  DriverAvailabilityStatus,
  DriverCoreStatus,
  DriverPreferences,
  UUID,
  IsoDateTime,
  ServiceTypeCode,
  Vehicle,
  VehicleStatus,
  SavedAddress,
  SavedAddressLabel,
  CancellationPolicy,
  CancellationFeeType,
  DriverPayout,
  PayoutStatus,
} from '../types';

// ---- Helpers ----

function uuid(): UUID {
  return crypto.randomUUID();
}

function now(): IsoDateTime {
  return new Date().toISOString();
}

async function delay(ms = 200): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- Seed Data ----

const SEED_CLIENTS: Client[] = [
  {
    id: 'c-001',
    email: 'alice@seryvo.com',
    full_name: 'Alice Client',
    role: 'client',
    avatar_url: 'https://picsum.photos/id/1011/200/200',
    default_currency: 'USD',
  },
];

const SEED_DRIVERS: Driver[] = [
  {
    id: 'd-001',
    email: 'bob@seryvo.com',
    full_name: 'Bob Driver',
    role: 'driver',
    avatar_url: 'https://picsum.photos/id/1012/200/200',
    core_status: 'active',
    availability_status: 'offline',
    rating_average: 4.9,
    rating_count: 234,
  },
  {
    id: 'd-002',
    email: 'carol@seryvo.com',
    full_name: 'Carol Driver',
    role: 'driver',
    avatar_url: 'https://picsum.photos/id/1027/200/200',
    core_status: 'active',
    availability_status: 'available',
    rating_average: 4.7,
    rating_count: 89,
  },
];

const SEED_SUPPORT: SupportAgent[] = [
  {
    id: 's-001',
    email: 'sarah@seryvo.com',
    full_name: 'Sarah Support',
    role: 'support_agent',
    avatar_url: 'https://picsum.photos/id/1025/200/200',
  },
];

const SEED_ADMINS: Admin[] = [
  {
    id: 'a-001',
    email: 'admin@seryvo.com',
    full_name: 'David Admin',
    role: 'admin',
    avatar_url: 'https://picsum.photos/id/1005/200/200',
  },
];

function createTimeline(createdAt: IsoDateTime, status: BookingStatus): BookingTimelineEvent[] {
  const events: BookingTimelineEvent[] = [
    {
      event_id: uuid(),
      booking_id: '',
      status: 'requested',
      occurred_at: createdAt,
      description: 'Booking request created',
    },
  ];

  if (status === 'driver_assigned' || status === 'completed') {
    events.push({
      event_id: uuid(),
      booking_id: '',
      status: 'driver_assigned',
      occurred_at: new Date(new Date(createdAt).getTime() + 60000).toISOString(),
      description: 'Driver accepted the booking',
    });
  }

  if (status === 'completed') {
    events.push(
      {
        event_id: uuid(),
        booking_id: '',
        status: 'driver_en_route_pickup',
        occurred_at: new Date(new Date(createdAt).getTime() + 120000).toISOString(),
        description: 'Driver en route to pickup',
      },
      {
        event_id: uuid(),
        booking_id: '',
        status: 'driver_arrived',
        occurred_at: new Date(new Date(createdAt).getTime() + 600000).toISOString(),
        description: 'Driver arrived at pickup',
      },
      {
        event_id: uuid(),
        booking_id: '',
        status: 'in_progress',
        occurred_at: new Date(new Date(createdAt).getTime() + 660000).toISOString(),
        description: 'Trip started',
      },
      {
        event_id: uuid(),
        booking_id: '',
        status: 'completed',
        occurred_at: new Date(new Date(createdAt).getTime() + 1800000).toISOString(),
        description: 'Trip completed successfully',
      }
    );
  }

  return events;
}

const SEED_BOOKINGS: Booking[] = [
  {
    booking_id: 'b-001',
    client_id: 'c-001',
    status: 'requested',
    created_at: now(),
    is_asap: true,
    legs: [
      {
        leg_id: 'l-001',
        booking_id: 'b-001',
        sequence_index: 0,
        pickup: { address_line: '123 Main St, Tech City' },
        dropoff: { address_line: 'International Airport T1' },
        estimated_distance_km: 24,
        estimated_duration_sec: 1800,
      },
    ],
    passenger_count: 1,
    luggage_count: 2,
    service_type: 'standard',
    price_breakdown: {
      base_fare: { amount: 1000, currency: 'USD' },
      distance_fare: { amount: 3000, currency: 'USD' },
      tax_total: { amount: 550, currency: 'USD' },
      grand_total: { amount: 4550, currency: 'USD' },
      driver_earnings: { amount: 3640, currency: 'USD' },
      platform_fee: { amount: 910, currency: 'USD' },
    },
    timeline: createTimeline(now(), 'requested'),
  },
  {
    booking_id: 'b-002',
    client_id: 'c-001',
    driver_id: 'd-001',
    status: 'driver_assigned',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    requested_pickup_at: new Date(Date.now() + 7200000).toISOString(),
    is_asap: false,
    legs: [
      {
        leg_id: 'l-002',
        booking_id: 'b-002',
        sequence_index: 0,
        pickup: { address_line: 'Grand Hotel, City Center' },
        dropoff: { address_line: 'Convention Center, West Wing' },
        estimated_distance_km: 8,
        estimated_duration_sec: 900,
      },
    ],
    passenger_count: 2,
    service_type: 'premium',
    price_breakdown: {
      base_fare: { amount: 1200, currency: 'USD' },
      distance_fare: { amount: 800, currency: 'USD' },
      tax_total: { amount: 200, currency: 'USD' },
      grand_total: { amount: 2200, currency: 'USD' },
      driver_earnings: { amount: 1760, currency: 'USD' },
      platform_fee: { amount: 440, currency: 'USD' },
    },
    timeline: createTimeline(new Date(Date.now() - 3600000).toISOString(), 'driver_assigned'),
  },
  {
    booking_id: 'b-003',
    client_id: 'c-001',
    driver_id: 'd-001',
    status: 'completed',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    completed_at: new Date(Date.now() - 82800000).toISOString(),
    is_asap: true,
    legs: [
      {
        leg_id: 'l-003',
        booking_id: 'b-003',
        sequence_index: 0,
        pickup: { address_line: 'Tech Park Block B' },
        dropoff: { address_line: 'Downtown Metro Station' },
        estimated_distance_km: 11,
        estimated_duration_sec: 1200,
      },
    ],
    passenger_count: 1,
    service_type: 'standard',
    price_breakdown: {
      base_fare: { amount: 500, currency: 'USD' },
      distance_fare: { amount: 1100, currency: 'USD' },
      tax_total: { amount: 200, currency: 'USD' },
      grand_total: { amount: 1800, currency: 'USD' },
      driver_earnings: { amount: 1440, currency: 'USD' },
      platform_fee: { amount: 360, currency: 'USD' },
    },
    timeline: createTimeline(new Date(Date.now() - 86400000).toISOString(), 'completed'),
    client_rating_value: 5,
    client_feedback_text: 'Great ride, very polite driver!',
    client_feedback_tags: ['Polite', 'Safe Driver'],
  },
];

const SEED_CHATS: ChatSession[] = [
  {
    chat_id: 'ch-001',
    type: 'booking',
    booking_id: 'b-002',
    participant_ids: ['c-001', 'd-001'],
    participant_display_names: { 'c-001': 'Alice Client', 'd-001': 'Bob Driver' },
    last_message: {
      message_id: 'm-001',
      chat_id: 'ch-001',
      sender_id: 'd-001',
      sender_display_name: 'Bob Driver',
      body: 'I am on my way!',
      sent_at: new Date(Date.now() - 300000).toISOString(),
      read_by: ['d-001'],
    },
  },
];

const SEED_MESSAGES: Message[] = [
  {
    message_id: 'm-001',
    chat_id: 'ch-001',
    sender_id: 'd-001',
    sender_display_name: 'Bob Driver',
    body: 'I am on my way!',
    sent_at: new Date(Date.now() - 300000).toISOString(),
    read_by: ['d-001'],
  },
];

const SEED_TICKETS: SupportTicket[] = [
  {
    ticket_id: 't-001',
    booking_id: 'b-001',
    client_id: 'c-001',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    updated_at: new Date(Date.now() - 600000).toISOString(),
    status: 'open',
    priority: 'high',
    category: 'trip_issue',
    subject: 'Driver took a longer route',
    public_description: 'The driver went through downtown instead of taking the highway. Trip took 20 minutes longer than estimated.',
  },
  {
    ticket_id: 't-002',
    client_id: 'c-001',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    status: 'in_progress',
    priority: 'medium',
    category: 'payment_dispute',
    subject: 'Overcharged for ride',
    public_description: 'I was charged $45 but the estimate was $35. Please refund the difference.',
    assignee_id: 's-001',
    internal_notes: ['Reviewing pricing logs', 'Customer has history of valid complaints'],
  },
  {
    ticket_id: 't-003',
    driver_id: 'd-001',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 43200000).toISOString(),
    status: 'waiting_on_driver',
    priority: 'low',
    category: 'account_issue',
    subject: 'Update vehicle registration',
    public_description: 'I need to update my vehicle registration documents.',
    assignee_id: 's-001',
  },
  {
    ticket_id: 't-004',
    booking_id: 'b-003',
    client_id: 'c-001',
    driver_id: 'd-001',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 172800000).toISOString(),
    status: 'resolved',
    priority: 'urgent',
    category: 'safety_incident',
    subject: 'Uncomfortable situation during ride',
    public_description: 'There was an incident during my ride that made me feel unsafe.',
    assignee_id: 's-001',
    internal_notes: ['Escalated to safety team', 'Driver issued warning', 'Client compensated with $20 credit'],
  },
];

const SEED_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'pm-001',
    client_id: 'c-001',
    type: 'card',
    brand: 'visa',
    last4: '4242',
    expiry_month: 12,
    expiry_year: 2026,
    is_default: true,
    holder_name: 'Alice Client',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'pm-002',
    client_id: 'c-001',
    type: 'card',
    brand: 'mastercard',
    last4: '8888',
    expiry_month: 6,
    expiry_year: 2025,
    is_default: false,
    holder_name: 'Alice Client',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
];

const SEED_DRIVER_DOCUMENTS: DriverDocument[] = [
  {
    id: 'doc-001',
    driver_id: 'd-001',
    type: 'drivers_license',
    status: 'approved',
    file_name: 'drivers_license_bob.pdf',
    file_url: 'https://example.com/docs/license.pdf',
    uploaded_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    reviewed_at: new Date(Date.now() - 88 * 86400000).toISOString(),
    expiry_date: new Date(Date.now() + 365 * 86400000).toISOString(),
  },
  {
    id: 'doc-002',
    driver_id: 'd-001',
    type: 'vehicle_registration',
    status: 'approved',
    file_name: 'vehicle_reg_bob.pdf',
    file_url: 'https://example.com/docs/registration.pdf',
    uploaded_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    reviewed_at: new Date(Date.now() - 88 * 86400000).toISOString(),
    expiry_date: new Date(Date.now() + 180 * 86400000).toISOString(),
  },
  {
    id: 'doc-003',
    driver_id: 'd-001',
    type: 'insurance',
    status: 'pending_review',
    file_name: 'insurance_bob.pdf',
    file_url: 'https://example.com/docs/insurance.pdf',
    uploaded_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'doc-004',
    driver_id: 'd-001',
    type: 'profile_photo',
    status: 'approved',
    file_name: 'profile_bob.jpg',
    file_url: 'https://picsum.photos/id/1012/400/400',
    uploaded_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    reviewed_at: new Date(Date.now() - 88 * 86400000).toISOString(),
  },
  {
    id: 'doc-005',
    driver_id: 'd-002',
    type: 'drivers_license',
    status: 'rejected',
    file_name: 'license_carol.jpg',
    file_url: 'https://example.com/docs/license_carol.jpg',
    uploaded_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    reviewed_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    rejection_reason: 'Image is blurry. Please upload a clearer photo.',
  },
];

const SEED_PROMO_CODES: PromoCode[] = [
  {
    id: 'promo-001',
    code: 'WELCOME20',
    description: '20% off your first ride',
    discount_type: 'percentage',
    discount_value: 20,
    max_discount_cents: 1500, // $15 max
    usage_limit: 1000,
    usage_count: 234,
    per_user_limit: 1,
    valid_from: new Date(Date.now() - 30 * 86400000).toISOString(),
    valid_until: new Date(Date.now() + 60 * 86400000).toISOString(),
    status: 'active',
    first_trip_only: true,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    created_by: 'a-001',
  },
  {
    id: 'promo-002',
    code: 'SUMMER10',
    description: '$10 off any ride over $30',
    discount_type: 'fixed_amount',
    discount_value: 1000, // $10 in cents
    min_trip_amount_cents: 3000,
    usage_limit: 500,
    usage_count: 89,
    valid_from: new Date(Date.now() - 15 * 86400000).toISOString(),
    valid_until: new Date(Date.now() + 45 * 86400000).toISOString(),
    status: 'active',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    created_by: 'a-001',
  },
  {
    id: 'promo-003',
    code: 'VIP50',
    description: '50% off premium rides',
    discount_type: 'percentage',
    discount_value: 50,
    max_discount_cents: 5000, // $50 max
    usage_limit: 100,
    usage_count: 100,
    valid_from: new Date(Date.now() - 60 * 86400000).toISOString(),
    valid_until: new Date(Date.now() - 30 * 86400000).toISOString(),
    status: 'expired',
    applicable_service_types: ['premium'],
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    created_by: 'a-001',
  },
  {
    id: 'promo-004',
    code: 'SAVE5',
    description: '$5 off any ride',
    discount_type: 'fixed_amount',
    discount_value: 500,
    usage_count: 0,
    valid_from: new Date(Date.now() + 7 * 86400000).toISOString(),
    valid_until: new Date(Date.now() + 37 * 86400000).toISOString(),
    status: 'inactive',
    created_at: now(),
    created_by: 'a-001',
  },
];

const SEED_VEHICLES: Vehicle[] = [
  {
    id: 'veh-001',
    driver_id: 'd-001',
    make: 'Toyota',
    model: 'Camry',
    year: 2022,
    color: 'Silver',
    license_plate: 'ABC-1234',
    vin: '1HGCM82633A123456',
    service_types: ['standard', 'premium'],
    capacity_passengers: 4,
    capacity_luggage: 3,
    accessibility_features: [],
    photo_urls: {
      front: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400',
      interior: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400',
    },
    insurance_expiry: new Date(Date.now() + 180 * 86400000).toISOString(),
    registration_expiry: new Date(Date.now() + 365 * 86400000).toISOString(),
    inspection_expiry: new Date(Date.now() + 90 * 86400000).toISOString(),
    status: 'active',
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'veh-002',
    driver_id: 'd-002',
    make: 'Honda',
    model: 'Odyssey',
    year: 2021,
    color: 'Black',
    license_plate: 'XYZ-5678',
    service_types: ['van'],
    capacity_passengers: 7,
    capacity_luggage: 5,
    accessibility_features: ['wheelchair'],
    photo_urls: {
      front: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400',
    },
    insurance_expiry: new Date(Date.now() + 120 * 86400000).toISOString(),
    registration_expiry: new Date(Date.now() + 200 * 86400000).toISOString(),
    status: 'active',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
];

const SEED_SAVED_ADDRESSES: SavedAddress[] = [
  {
    id: 'sa-001',
    user_id: 'c-001',
    label: 'home',
    location: {
      address_line: '123 Main Street, San Francisco, CA 94102',
      lat: 37.7849,
      lng: -122.4094,
    },
    is_default: true,
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
  {
    id: 'sa-002',
    user_id: 'c-001',
    label: 'work',
    location: {
      address_line: '500 Market Street, Suite 200, San Francisco, CA 94105',
      lat: 37.7897,
      lng: -122.4005,
    },
    is_default: false,
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
];

const SEED_CANCELLATION_POLICIES: CancellationPolicy[] = [
  {
    id: 'cp-001',
    name: 'Standard Policy',
    description: 'Default cancellation policy for all standard rides',
    is_active: true,
    free_cancel_window_minutes: 5,
    post_assignment_free_minutes: 2,
    cancellation_fee_type: 'flat',
    cancellation_fee_amount: 500, // $5.00
    no_show_wait_minutes: 5,
    no_show_fee_cents: 1000, // $10.00
    grace_period_minutes: 3,
    waiting_fee_per_minute_cents: 50, // $0.50/min
    waiting_fee_cap_cents: 1500, // $15.00 max
    driver_cancel_penalty_cents: 250, // $2.50 penalty
    applies_to_service_types: ['standard', 'comfort'],
    created_at: new Date(Date.now() - 180 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'cp-002',
    name: 'Premium Policy',
    description: 'Stricter policy for premium and XL vehicles',
    is_active: true,
    free_cancel_window_minutes: 3,
    post_assignment_free_minutes: 1,
    cancellation_fee_type: 'percentage',
    cancellation_fee_amount: 25, // 25% of fare
    no_show_wait_minutes: 3,
    no_show_fee_cents: 2000, // $20.00
    grace_period_minutes: 2,
    waiting_fee_per_minute_cents: 100, // $1.00/min
    waiting_fee_cap_cents: 3000, // $30.00 max
    driver_cancel_penalty_cents: 500, // $5.00 penalty
    applies_to_service_types: ['premium', 'xl'],
    created_at: new Date(Date.now() - 150 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'cp-003',
    name: 'Airport Policy',
    description: 'Special policy for airport pickups with extended waiting',
    is_active: true,
    free_cancel_window_minutes: 10,
    post_assignment_free_minutes: 5,
    cancellation_fee_type: 'flat',
    cancellation_fee_amount: 1000, // $10.00
    no_show_wait_minutes: 15,
    no_show_fee_cents: 2500, // $25.00
    grace_period_minutes: 15, // Extended grace for flight delays
    waiting_fee_per_minute_cents: 75, // $0.75/min
    waiting_fee_cap_cents: 2000, // $20.00 max
    driver_cancel_penalty_cents: 1000, // $10.00 penalty
    applies_to_service_types: ['airport'],
    created_at: new Date(Date.now() - 120 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
];

// ---- Driver Payouts ----
const SEED_DRIVER_PAYOUTS: DriverPayout[] = [
  {
    id: 'payout-001',
    driver_id: 'driver-01',
    amount: { amount: 487_50, currency: 'USD' },
    period_start: new Date(Date.now() - 14 * 86400000).toISOString(),
    period_end: new Date(Date.now() - 7 * 86400000).toISOString(),
    trips_count: 23,
    status: 'completed',
    payout_method: 'Direct Deposit',
    reference_number: 'PAY-2024-001523',
    initiated_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    completed_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'payout-002',
    driver_id: 'driver-01',
    amount: { amount: 612_00, currency: 'USD' },
    period_start: new Date(Date.now() - 21 * 86400000).toISOString(),
    period_end: new Date(Date.now() - 14 * 86400000).toISOString(),
    trips_count: 31,
    status: 'completed',
    payout_method: 'Direct Deposit',
    reference_number: 'PAY-2024-001487',
    initiated_at: new Date(Date.now() - 13 * 86400000).toISOString(),
    completed_at: new Date(Date.now() - 12 * 86400000).toISOString(),
  },
  {
    id: 'payout-003',
    driver_id: 'driver-01',
    amount: { amount: 398_25, currency: 'USD' },
    period_start: new Date(Date.now() - 28 * 86400000).toISOString(),
    period_end: new Date(Date.now() - 21 * 86400000).toISOString(),
    trips_count: 18,
    status: 'completed',
    payout_method: 'Direct Deposit',
    reference_number: 'PAY-2024-001412',
    initiated_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    completed_at: new Date(Date.now() - 19 * 86400000).toISOString(),
  },
  {
    id: 'payout-004',
    driver_id: 'driver-01',
    amount: { amount: 723_50, currency: 'USD' },
    period_start: new Date(Date.now() - 35 * 86400000).toISOString(),
    period_end: new Date(Date.now() - 28 * 86400000).toISOString(),
    trips_count: 35,
    status: 'completed',
    payout_method: 'Direct Deposit',
    reference_number: 'PAY-2024-001356',
    initiated_at: new Date(Date.now() - 27 * 86400000).toISOString(),
    completed_at: new Date(Date.now() - 26 * 86400000).toISOString(),
  },
  {
    id: 'payout-005',
    driver_id: 'driver-01',
    amount: { amount: 545_00, currency: 'USD' },
    period_start: new Date(Date.now() - 7 * 86400000).toISOString(),
    period_end: new Date().toISOString(),
    trips_count: 27,
    status: 'pending',
    payout_method: 'Direct Deposit',
    initiated_at: new Date().toISOString(),
  },
];

// ---- Service Class ----

// Combined user type for admin management
type AnyUser = Client | Driver | SupportAgent | Admin;

class MockBackendService {
  // Start with empty arrays - data only loads via loadDemoData()
  private bookings: Booking[] = [];
  private drivers: Driver[] = [];
  private clients: Client[] = [];
  private supportAgents: SupportAgent[] = [];
  private admins: Admin[] = [];
  private chats: ChatSession[] = [];
  private messages: Message[] = [];
  private tickets: SupportTicket[] = [];
  private paymentMethods: PaymentMethod[] = [];
  private driverDocuments: DriverDocument[] = [];
  private promoCodes: PromoCode[] = [];
  private vehicles: Vehicle[] = [];
  private savedAddresses: SavedAddress[] = [];
  private cancellationPolicies: CancellationPolicy[] = [];
  private driverPayouts: DriverPayout[] = [];
  private userPromoUsage: Map<string, Set<string>> = new Map(); // userId -> Set of promoIds used
  private _demoDataLoaded = false;

  // ---- Demo Data Management ----

  get demoDataLoaded(): boolean {
    return this._demoDataLoaded;
  }

  async loadDemoData(): Promise<{ success: boolean; message: string; usersCount: number; bookingsCount: number }> {
    await delay(500);
    if (this._demoDataLoaded) {
      return { success: false, message: 'Demo data is already loaded', usersCount: 0, bookingsCount: 0 };
    }

    // Load all seed data
    this.bookings = [...SEED_BOOKINGS];
    this.drivers = [...SEED_DRIVERS];
    this.clients = [...SEED_CLIENTS];
    this.supportAgents = [...SEED_SUPPORT];
    this.admins = [...SEED_ADMINS];
    this.chats = [...SEED_CHATS];
    this.messages = [...SEED_MESSAGES];
    this.tickets = [...SEED_TICKETS];
    this.paymentMethods = [...SEED_PAYMENT_METHODS];
    this.driverDocuments = [...SEED_DRIVER_DOCUMENTS];
    this.promoCodes = [...SEED_PROMO_CODES];
    this.vehicles = [...SEED_VEHICLES];
    this.savedAddresses = [...SEED_SAVED_ADDRESSES];
    this.cancellationPolicies = [...SEED_CANCELLATION_POLICIES];
    this.driverPayouts = [...SEED_DRIVER_PAYOUTS];
    this._demoDataLoaded = true;

    const usersCount = this.clients.length + this.drivers.length + this.supportAgents.length + this.admins.length;
    return { 
      success: true, 
      message: 'Demo data loaded successfully', 
      usersCount,
      bookingsCount: this.bookings.length
    };
  }

  async clearDemoData(): Promise<{ success: boolean; message: string }> {
    await delay(300);
    // Clear all arrays
    this.bookings = [];
    this.drivers = [];
    this.clients = [];
    this.supportAgents = [];
    this.admins = [];
    this.chats = [];
    this.messages = [];
    this.tickets = [];
    this.paymentMethods = [];
    this.driverDocuments = [];
    this.promoCodes = [];
    this.vehicles = [];
    this.savedAddresses = [];
    this.cancellationPolicies = [];
    this.driverPayouts = [];
    this.userPromoUsage.clear();
    this._demoDataLoaded = false;

    return { success: true, message: 'Demo data cleared successfully' };
  }

  getDemoDataStatus(): { 
    demo_data_loaded: boolean; 
    demo_users_count: number; 
    demo_bookings_count: number;
    can_load_demo_data: boolean;
    warning: string;
  } {
    const usersCount = this.clients.length + this.drivers.length + this.supportAgents.length + this.admins.length;
    return {
      demo_data_loaded: this._demoDataLoaded,
      demo_users_count: usersCount,
      demo_bookings_count: this.bookings.length,
      can_load_demo_data: !this._demoDataLoaded,
      warning: this._demoDataLoaded ? 'Demo data is currently loaded. Clear before reloading.' : ''
    };
  }

  // ---- Bookings ----

  async getBookings(clientId?: string, driverId?: string): Promise<Booking[]> {
    await delay();
    let filtered = this.bookings;
    
    if (clientId) {
      filtered = filtered.filter((b) => b.client_id === clientId);
    }
    if (driverId) {
      // Driver sees their assigned bookings OR pending ones they could accept
      filtered = filtered.filter(
        (b) => b.driver_id === driverId || (b.status === 'requested' && !b.driver_id)
      );
    }
    
    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getBookingsForDriver(driverId: string): Promise<Booking[]> {
    await delay();
    // Driver sees their assigned bookings OR pending ones they could accept
    return this.bookings.filter(
      (b) => b.driver_id === driverId || (b.status === 'requested' && !b.driver_id)
    );
  }

  async getAllBookings(): Promise<Booking[]> {
    await delay();
    return [...this.bookings];
  }

  async getBookingById(bookingId: string): Promise<Booking | undefined> {
    await delay();
    return this.bookings.find((b) => b.booking_id === bookingId);
  }

  async createBooking(data: {
    client_id: string;
    pickup: string;
    dropoff: string;
    stops?: string[];
    is_asap: boolean;
    requested_pickup_at?: IsoDateTime;
    passenger_count?: number;
    luggage_count?: number;
    service_type: ServiceTypeCode;
    accessibility_requirements?: string[];
    special_notes?: string;
    options?: string[];
    driver_preferences?: DriverPreferences;
  }): Promise<Booking> {
    await delay(400);

    const bookingId = `b-${Date.now()}`;
    const createdAt = now();

    const legs: RideLeg[] = [
      {
        leg_id: `l-${Date.now()}-0`,
        booking_id: bookingId,
        sequence_index: 0,
        pickup: { address_line: data.pickup },
        dropoff: { address_line: data.stops?.[0] ?? data.dropoff },
        estimated_distance_km: Math.floor(Math.random() * 20) + 5,
        estimated_duration_sec: Math.floor(Math.random() * 1800) + 600,
      },
    ];

    // Add additional legs for multi-stop
    if (data.stops && data.stops.length > 0) {
      for (let i = 0; i < data.stops.length; i++) {
        const isLast = i === data.stops.length - 1;
        legs.push({
          leg_id: `l-${Date.now()}-${i + 1}`,
          booking_id: bookingId,
          sequence_index: i + 1,
          pickup: { address_line: data.stops[i] },
          dropoff: { address_line: isLast ? data.dropoff : data.stops[i + 1] },
          estimated_distance_km: Math.floor(Math.random() * 15) + 3,
          estimated_duration_sec: Math.floor(Math.random() * 1200) + 300,
        });
      }
    }

    // Calculate mock price
    const totalDistance = legs.reduce((sum, l) => sum + (l.estimated_distance_km ?? 0), 0);
    const baseFare = data.service_type === 'premium' ? 1200 : data.service_type === 'van' ? 1500 : 500;
    const distanceFare = totalDistance * 100; // $1 per km
    const taxTotal = Math.round((baseFare + distanceFare) * 0.1);
    const grandTotal = baseFare + distanceFare + taxTotal;
    const platformFee = Math.round(grandTotal * 0.2); // 20% platform fee
    const driverEarnings = grandTotal - platformFee;

    const booking: Booking = {
      booking_id: bookingId,
      client_id: data.client_id,
      status: 'requested',
      created_at: createdAt,
      requested_pickup_at: data.is_asap ? undefined : data.requested_pickup_at,
      is_asap: data.is_asap,
      legs,
      passenger_count: data.passenger_count ?? 1,
      luggage_count: data.luggage_count ?? 0,
      accessibility_requirements: data.accessibility_requirements,
      special_notes: data.special_notes,
      service_type: data.service_type,
      options: data.options,
      driver_preferences: data.driver_preferences,
      price_breakdown: {
        base_fare: { amount: baseFare, currency: 'USD' },
        distance_fare: { amount: distanceFare, currency: 'USD' },
        tax_total: { amount: taxTotal, currency: 'USD' },
        grand_total: { amount: grandTotal, currency: 'USD' },
        driver_earnings: { amount: driverEarnings, currency: 'USD' },
        platform_fee: { amount: platformFee, currency: 'USD' },
      },
      timeline: [
        {
          event_id: uuid(),
          booking_id: bookingId,
          status: 'requested',
          occurred_at: createdAt,
          description: 'Booking request created',
        },
      ],
    };

    this.bookings.unshift(booking);
    return booking;
  }

  async updateBookingStatus(
    bookingId: string,
    newStatus: BookingStatus,
    actorId?: string,
    actorRole?: Role
  ): Promise<Booking> {
    await delay();

    const idx = this.bookings.findIndex((b) => b.booking_id === bookingId);
    if (idx === -1) throw new Error('Booking not found');

    const booking = this.bookings[idx];
    const occurredAt = now();

    // Auto-assign driver if accepting
    if (newStatus === 'driver_assigned' && actorRole === 'driver' && actorId) {
      booking.driver_id = actorId;
    }

    // Set completed_at
    if (newStatus === 'completed') {
      booking.completed_at = occurredAt;
    }

    booking.status = newStatus;
    booking.timeline.push({
      event_id: uuid(),
      booking_id: bookingId,
      status: newStatus,
      occurred_at: occurredAt,
      actor_id: actorId,
      actor_role: actorRole,
      description: `Status changed to ${newStatus}`,
    });

    this.bookings[idx] = booking;
    return booking;
  }

  async rateBooking(
    bookingId: string,
    ratingData: {
      from_role: 'client' | 'driver';
      rating: number;
      comment?: string;
      tags?: string[];
    }
  ): Promise<Booking> {
    await delay();

    const idx = this.bookings.findIndex((b) => b.booking_id === bookingId);
    if (idx === -1) throw new Error('Booking not found');

    // For now, we store client rating regardless of from_role
    // In a real app, we'd store both client and driver ratings
    this.bookings[idx].client_rating_value = ratingData.rating;
    this.bookings[idx].client_feedback_text = ratingData.comment;
    this.bookings[idx].client_feedback_tags = ratingData.tags;

    return this.bookings[idx];
  }

  // ---- Drivers ----

  async updateDriverAvailability(
    driverId: string,
    status: DriverAvailabilityStatus
  ): Promise<Driver> {
    await delay();

    const idx = this.drivers.findIndex((d) => d.id === driverId);
    if (idx === -1) throw new Error('Driver not found');

    this.drivers[idx].availability_status = status;
    return this.drivers[idx];
  }

  async getAvailableDrivers(): Promise<Driver[]> {
    await delay();
    return this.drivers.filter((d) => d.availability_status === 'available');
  }

  // ---- Messaging ----

  async getChats(userId: string): Promise<ChatSession[]> {
    await delay(100);
    return this.chats.filter((c) => c.participant_ids.includes(userId));
  }

  async getMessages(chatId: string): Promise<Message[]> {
    await delay(100);
    return this.messages
      .filter((m) => m.chat_id === chatId)
      .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());
  }

  async sendMessage(chatId: string, senderId: string, senderName: string, body: string): Promise<Message> {
    await delay(200);

    const message: Message = {
      message_id: `m-${Date.now()}`,
      chat_id: chatId,
      sender_id: senderId,
      sender_display_name: senderName,
      body,
      sent_at: now(),
      read_by: [senderId],
    };

    this.messages.push(message);

    // Update last message in chat
    const chatIdx = this.chats.findIndex((c) => c.chat_id === chatId);
    if (chatIdx !== -1) {
      this.chats[chatIdx].last_message = message;
    }

    return message;
  }

  /**
   * Create or get an existing chat session for a booking.
   * This is used for in-trip messaging between client and driver.
   */
  async createOrGetBookingChat(
    bookingId: string,
    participants: Array<{ id: string; name: string }>
  ): Promise<ChatSession> {
    await delay(100);

    // Check if a chat already exists for this booking
    const existingChat = this.chats.find(
      (c) => c.type === 'booking' && c.booking_id === bookingId
    );

    if (existingChat) {
      return existingChat;
    }

    // Create a new chat session
    const displayNames: Record<string, string> = {};
    participants.forEach((p) => {
      displayNames[p.id] = p.name;
    });

    const newChat: ChatSession = {
      chat_id: `chat-booking-${bookingId}`,
      type: 'booking',
      booking_id: bookingId,
      participant_ids: participants.map((p) => p.id),
      participant_display_names: displayNames,
      unread_count: 0,
    };

    this.chats.push(newChat);
    return newChat;
  }

  // ---- Support Tickets ----

  async getTickets(filters?: {
    status?: SupportTicket['status'];
    priority?: SupportTicket['priority'];
    assigneeId?: string;
  }): Promise<SupportTicket[]> {
    await delay();
    let filtered = this.tickets;

    if (filters?.status) {
      filtered = filtered.filter((t) => t.status === filters.status);
    }
    if (filters?.priority) {
      filtered = filtered.filter((t) => t.priority === filters.priority);
    }
    if (filters?.assigneeId) {
      filtered = filtered.filter((t) => t.assignee_id === filters.assigneeId);
    }

    return filtered.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }

  async getTicketById(ticketId: string): Promise<SupportTicket | undefined> {
    await delay();
    return this.tickets.find((t) => t.ticket_id === ticketId);
  }

  async updateTicketStatus(
    ticketId: string,
    newStatus: SupportTicket['status'],
    assigneeId?: string
  ): Promise<SupportTicket> {
    await delay();

    const idx = this.tickets.findIndex((t) => t.ticket_id === ticketId);
    if (idx === -1) throw new Error('Ticket not found');

    this.tickets[idx].status = newStatus;
    this.tickets[idx].updated_at = now();
    if (assigneeId) {
      this.tickets[idx].assignee_id = assigneeId;
    }

    return this.tickets[idx];
  }

  async addTicketNote(ticketId: string, note: string): Promise<SupportTicket> {
    await delay();

    const idx = this.tickets.findIndex((t) => t.ticket_id === ticketId);
    if (idx === -1) throw new Error('Ticket not found');

    if (!this.tickets[idx].internal_notes) {
      this.tickets[idx].internal_notes = [];
    }
    this.tickets[idx].internal_notes!.push(note);
    this.tickets[idx].updated_at = now();

    return this.tickets[idx];
  }

  async createTicket(data: {
    client_id?: string;
    driver_id?: string;
    booking_id?: string;
    category: SupportTicket['category'];
    priority: SupportTicket['priority'];
    subject: string;
    description: string;
  }): Promise<SupportTicket> {
    await delay(300);

    const ticket: SupportTicket = {
      ticket_id: `t-${Date.now()}`,
      client_id: data.client_id,
      driver_id: data.driver_id,
      booking_id: data.booking_id,
      created_at: now(),
      updated_at: now(),
      status: 'open',
      priority: data.priority,
      category: data.category,
      subject: data.subject,
      public_description: data.description,
    };

    this.tickets.unshift(ticket);
    return ticket;
  }

  async sendTicketMessage(ticketId: string, message: string): Promise<void> {
    await delay(200);
    const ticket = this.tickets.find((t) => t.ticket_id === ticketId);
    if (!ticket) throw new Error('Ticket not found');
    
    // Add message to the ticket's messages array (mock implementation)
    if (!ticket.messages) {
      ticket.messages = [];
    }
    ticket.messages.push({
      id: `msg-${Date.now()}`,
      sender_id: 'current-user',
      sender_name: 'You',
      message,
      is_internal: false,
      created_at: now(),
    });
    ticket.updated_at = now();
  }

  // ---- Payment Methods ----

  async getPaymentMethods(clientId: string): Promise<PaymentMethod[]> {
    await delay();
    return this.paymentMethods
      .filter((pm) => pm.client_id === clientId)
      .sort((a, b) => {
        // Default card first, then by creation date
        if (a.is_default) return -1;
        if (b.is_default) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }

  async addPaymentMethod(
    clientId: string,
    data: {
      type: PaymentMethod['type'];
      brand: PaymentMethod['brand'];
      last4: string;
      expiry_month: number;
      expiry_year: number;
      holder_name: string;
      is_default?: boolean;
    }
  ): Promise<PaymentMethod> {
    await delay(300);

    // If this is the first card or explicitly set as default, update others
    const existingMethods = this.paymentMethods.filter((pm) => pm.client_id === clientId);
    const isDefault = data.is_default || existingMethods.length === 0;

    if (isDefault) {
      // Unset default on other cards
      this.paymentMethods = this.paymentMethods.map((pm) =>
        pm.client_id === clientId ? { ...pm, is_default: false } : pm
      );
    }

    const paymentMethod: PaymentMethod = {
      id: `pm-${Date.now()}`,
      client_id: clientId,
      type: data.type,
      brand: data.brand,
      last4: data.last4,
      expiry_month: data.expiry_month,
      expiry_year: data.expiry_year,
      is_default: isDefault,
      holder_name: data.holder_name,
      created_at: now(),
    };

    this.paymentMethods.push(paymentMethod);
    return paymentMethod;
  }

  async removePaymentMethod(methodId: string): Promise<void> {
    await delay(200);
    const method = this.paymentMethods.find((pm) => pm.id === methodId);
    if (!method) throw new Error('Payment method not found');

    this.paymentMethods = this.paymentMethods.filter((pm) => pm.id !== methodId);

    // If we removed the default, set another as default
    if (method.is_default) {
      const remaining = this.paymentMethods.filter((pm) => pm.client_id === method.client_id);
      if (remaining.length > 0) {
        remaining[0].is_default = true;
      }
    }
  }

  async setDefaultPaymentMethod(methodId: string): Promise<PaymentMethod> {
    await delay(200);
    const method = this.paymentMethods.find((pm) => pm.id === methodId);
    if (!method) throw new Error('Payment method not found');

    // Unset default on all other cards for this client
    this.paymentMethods = this.paymentMethods.map((pm) =>
      pm.client_id === method.client_id
        ? { ...pm, is_default: pm.id === methodId }
        : pm
    );

    return this.paymentMethods.find((pm) => pm.id === methodId)!;
  }

  // ---- Driver Documents ----

  async getDriverDocuments(driverId: string): Promise<DriverDocument[]> {
    await delay();
    return this.driverDocuments.filter((doc) => doc.driver_id === driverId);
  }

  async getAllDriverDocuments(): Promise<DriverDocument[]> {
    await delay();
    return [...this.driverDocuments].sort((a, b) => {
      // Sort pending_review first, then by upload date
      if (a.status === 'pending_review' && b.status !== 'pending_review') return -1;
      if (a.status !== 'pending_review' && b.status === 'pending_review') return 1;
      // Handle optional uploaded_at
      const dateA = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0;
      const dateB = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0;
      return dateB - dateA;
    });
  }

  async uploadDriverDocument(
    driverId: string,
    type: DocumentType,
    file: { name: string; url: string }
  ): Promise<DriverDocument> {
    await delay(500); // Simulate upload time

    // Check if a document of this type already exists
    const existingIdx = this.driverDocuments.findIndex(
      (doc) => doc.driver_id === driverId && doc.type === type
    );

    const document: DriverDocument = {
      id: `doc-${Date.now()}`,
      driver_id: driverId,
      type,
      status: 'pending_review',
      file_name: file.name,
      file_url: file.url,
      uploaded_at: now(),
    };

    if (existingIdx !== -1) {
      // Replace existing document
      this.driverDocuments[existingIdx] = document;
    } else {
      this.driverDocuments.push(document);
    }

    return document;
  }

  async deleteDriverDocument(documentId: string): Promise<void> {
    await delay(200);
    this.driverDocuments = this.driverDocuments.filter((doc) => doc.id !== documentId);
  }

  async reviewDriverDocument(
    documentId: string,
    status: 'approved' | 'rejected',
    rejectionReason?: string,
    expiryDate?: string
  ): Promise<DriverDocument> {
    await delay(200);

    const idx = this.driverDocuments.findIndex((doc) => doc.id === documentId);
    if (idx === -1) throw new Error('Document not found');

    this.driverDocuments[idx].status = status;
    this.driverDocuments[idx].reviewed_at = now();
    
    if (status === 'rejected' && rejectionReason) {
      this.driverDocuments[idx].rejection_reason = rejectionReason;
    }
    
    if (status === 'approved' && expiryDate) {
      this.driverDocuments[idx].expiry_date = expiryDate;
    }

    return this.driverDocuments[idx];
  }

  async updateDocumentStatus(
    documentId: string,
    status: DocumentStatus,
    _reviewedBy: string,
    rejectionReason?: string
  ): Promise<DriverDocument> {
    await delay();
    
    const idx = this.driverDocuments.findIndex((doc) => doc.id === documentId);
    if (idx === -1) throw new Error('Document not found');
    
    this.driverDocuments[idx].status = status;
    this.driverDocuments[idx].reviewed_at = now();
    
    if (status === 'rejected' && rejectionReason) {
      this.driverDocuments[idx].rejection_reason = rejectionReason;
    }
    
    return this.driverDocuments[idx];
  }

  // ---- Driver Performance Metrics ----

  async getDriverPerformanceMetrics(driverId: string): Promise<{
    acceptance_rate: number;
    cancellation_rate: number;
    completion_rate: number;
    total_trips: number;
    total_accepted: number;
    total_declined: number;
    total_cancelled: number;
    average_response_time_seconds: number;
    on_time_arrival_rate: number;
  }> {
    await delay();

    // Get all bookings for this driver
    const driverBookings = this.bookings.filter((b) => b.driver_id === driverId);
    
    // Calculate metrics from booking history
    const completedTrips = driverBookings.filter((b) => b.status === 'completed').length;
    const cancelledTrips = driverBookings.filter((b) => 
      b.status === 'canceled_by_driver'
    ).length;
    
    // Simulate accepted/declined based on completed trips ratio
    // In a real system, this would be tracked separately
    const totalOffers = Math.round(completedTrips * 1.15); // ~15% decline rate
    const totalAccepted = completedTrips + cancelledTrips;
    const totalDeclined = Math.max(0, totalOffers - totalAccepted);
    
    const totalTrips = completedTrips + cancelledTrips;
    
    // Calculate rates
    const acceptanceRate = totalOffers > 0 
      ? (totalAccepted / totalOffers) * 100 
      : 100;
    
    const cancellationRate = totalTrips > 0 
      ? (cancelledTrips / totalTrips) * 100 
      : 0;
    
    const completionRate = totalTrips > 0 
      ? (completedTrips / totalTrips) * 100 
      : 100;

    // Simulated metrics - in production these would be tracked
    const avgResponseTime = 12 + Math.random() * 20; // 12-32 seconds
    const onTimeRate = 85 + Math.random() * 13; // 85-98%

    return {
      acceptance_rate: Math.min(100, acceptanceRate),
      cancellation_rate: Math.max(0, cancellationRate),
      completion_rate: Math.min(100, completionRate),
      total_trips: completedTrips,
      total_accepted: totalAccepted,
      total_declined: totalDeclined,
      total_cancelled: cancelledTrips,
      average_response_time_seconds: avgResponseTime,
      on_time_arrival_rate: onTimeRate,
    };
  }

  // ---- Promo Codes ----

  async getPromoCodes(): Promise<PromoCode[]> {
    await delay();
    // Auto-expire codes that are past their valid_until date
    const nowDate = new Date();
    this.promoCodes = this.promoCodes.map(promo => {
      if (promo.status === 'active' && new Date(promo.valid_until) < nowDate) {
        return { ...promo, status: 'expired' as PromoStatus };
      }
      return promo;
    });
    return [...this.promoCodes].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async createPromoCode(data: Omit<PromoCode, 'id' | 'usage_count' | 'created_at'>): Promise<PromoCode> {
    await delay();
    const promo: PromoCode = {
      ...data,
      id: `promo-${uuid().slice(0, 8)}`,
      usage_count: 0,
      created_at: now(),
    };
    this.promoCodes.push(promo);
    return promo;
  }

  async updatePromoCode(id: string, updates: Partial<PromoCode>): Promise<PromoCode | null> {
    await delay();
    const idx = this.promoCodes.findIndex(p => p.id === id);
    if (idx === -1) return null;
    
    this.promoCodes[idx] = { ...this.promoCodes[idx], ...updates };
    return this.promoCodes[idx];
  }

  async deletePromoCode(id: string): Promise<boolean> {
    await delay();
    const idx = this.promoCodes.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.promoCodes.splice(idx, 1);
    return true;
  }

  async validatePromoCode(
    code: string, 
    userId: string, 
    tripAmountCents: number,
    serviceType?: ServiceTypeCode
  ): Promise<{ valid: boolean; error?: string; promo?: PromoCode; discountCents?: number }> {
    await delay();
    
    const promo = this.promoCodes.find(p => p.code.toUpperCase() === code.toUpperCase());
    
    if (!promo) {
      return { valid: false, error: 'Invalid promo code' };
    }
    
    if (promo.status !== 'active') {
      return { valid: false, error: 'This promo code is no longer active' };
    }
    
    const nowDate = new Date();
    if (new Date(promo.valid_from) > nowDate) {
      return { valid: false, error: 'This promo code is not yet active' };
    }
    
    if (new Date(promo.valid_until) < nowDate) {
      return { valid: false, error: 'This promo code has expired' };
    }
    
    if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
      return { valid: false, error: 'This promo code has reached its usage limit' };
    }
    
    if (promo.per_user_limit) {
      const userUsage = this.userPromoUsage.get(userId);
      if (userUsage && userUsage.has(promo.id)) {
        return { valid: false, error: 'You have already used this promo code' };
      }
    }
    
    if (promo.min_trip_amount_cents && tripAmountCents < promo.min_trip_amount_cents) {
      const minAmount = (promo.min_trip_amount_cents / 100).toFixed(2);
      return { valid: false, error: `Minimum trip amount is $${minAmount}` };
    }
    
    if (promo.applicable_service_types && serviceType && 
        !promo.applicable_service_types.includes(serviceType)) {
      return { valid: false, error: 'This promo code is not valid for this service type' };
    }
    
    if (promo.first_trip_only) {
      const userBookings = this.bookings.filter(b => b.client_id === userId && b.status === 'completed');
      if (userBookings.length > 0) {
        return { valid: false, error: 'This promo code is only valid for first-time users' };
      }
    }
    
    // Calculate discount
    let discountCents: number;
    if (promo.discount_type === 'percentage') {
      discountCents = Math.round((tripAmountCents * promo.discount_value) / 100);
      if (promo.max_discount_cents) {
        discountCents = Math.min(discountCents, promo.max_discount_cents);
      }
    } else {
      discountCents = promo.discount_value;
    }
    
    // Don't discount more than the trip amount
    discountCents = Math.min(discountCents, tripAmountCents);
    
    return { valid: true, promo, discountCents };
  }

  async applyPromoCode(promoId: string, userId: string): Promise<void> {
    await delay();
    const promo = this.promoCodes.find(p => p.id === promoId);
    if (promo) {
      promo.usage_count++;
      
      // Track user usage
      if (!this.userPromoUsage.has(userId)) {
        this.userPromoUsage.set(userId, new Set());
      }
      this.userPromoUsage.get(userId)!.add(promoId);
    }
  }

  // ---- Vehicles ----

  async getVehicleByDriverId(driverId: string): Promise<Vehicle | null> {
    await delay();
    return this.vehicles.find(v => v.driver_id === driverId) || null;
  }

  async getVehicleById(vehicleId: string): Promise<Vehicle | null> {
    await delay();
    return this.vehicles.find(v => v.id === vehicleId) || null;
  }

  async getAllVehicles(): Promise<Vehicle[]> {
    await delay();
    return [...this.vehicles];
  }

  async createVehicle(driverId: string, data: Omit<Vehicle, 'id' | 'driver_id' | 'status' | 'created_at' | 'updated_at'>): Promise<Vehicle> {
    await delay();
    
    const vehicle: Vehicle = {
      id: uuid(),
      driver_id: driverId,
      ...data,
      status: 'pending_approval',
      created_at: now(),
      updated_at: now(),
    };
    
    this.vehicles.push(vehicle);
    
    // Update driver's vehicle_id
    const driver = this.drivers.find(d => d.id === driverId);
    if (driver) {
      driver.vehicle_id = vehicle.id;
    }
    
    return vehicle;
  }

  async updateVehicle(vehicleId: string, data: Partial<Omit<Vehicle, 'id' | 'driver_id' | 'created_at'>>): Promise<Vehicle | null> {
    await delay();
    
    const idx = this.vehicles.findIndex(v => v.id === vehicleId);
    if (idx === -1) return null;
    
    this.vehicles[idx] = {
      ...this.vehicles[idx],
      ...data,
      updated_at: now(),
    };
    
    return this.vehicles[idx];
  }

  async updateVehicleStatus(vehicleId: string, status: VehicleStatus): Promise<Vehicle | null> {
    await delay();
    
    const vehicle = this.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return null;
    
    vehicle.status = status;
    vehicle.updated_at = now();
    
    return vehicle;
  }

  // ---- Saved Addresses ----

  async getSavedAddresses(userId: string): Promise<SavedAddress[]> {
    await delay();
    return this.savedAddresses.filter(addr => addr.user_id === userId);
  }

  async createSavedAddress(
    userId: string,
    data: {
      label: SavedAddressLabel;
      custom_name?: string;
      location: { address_line: string; lat?: number; lng?: number; place_id?: string };
      is_default?: boolean;
    }
  ): Promise<SavedAddress> {
    await delay();

    // If this is marked as default, unset other defaults
    if (data.is_default) {
      this.savedAddresses
        .filter(addr => addr.user_id === userId)
        .forEach(addr => { addr.is_default = false; });
    }

    const address: SavedAddress = {
      id: `sa-${uuid()}`,
      user_id: userId,
      label: data.label,
      custom_name: data.custom_name,
      location: data.location,
      is_default: data.is_default ?? false,
      created_at: now(),
      updated_at: now(),
    };

    this.savedAddresses.push(address);
    return address;
  }

  async updateSavedAddress(
    addressId: string,
    data: Partial<{
      label: SavedAddressLabel;
      custom_name?: string;
      location: { address_line: string; lat?: number; lng?: number; place_id?: string };
      is_default?: boolean;
    }>
  ): Promise<SavedAddress | null> {
    await delay();

    const idx = this.savedAddresses.findIndex(addr => addr.id === addressId);
    if (idx === -1) return null;

    const address = this.savedAddresses[idx];

    // If setting as default, unset others
    if (data.is_default) {
      this.savedAddresses
        .filter(addr => addr.user_id === address.user_id && addr.id !== addressId)
        .forEach(addr => { addr.is_default = false; });
    }

    if (data.label !== undefined) address.label = data.label;
    if (data.custom_name !== undefined) address.custom_name = data.custom_name;
    if (data.location !== undefined) address.location = data.location;
    if (data.is_default !== undefined) address.is_default = data.is_default;
    address.updated_at = now();

    return address;
  }

  async deleteSavedAddress(addressId: string): Promise<boolean> {
    await delay();

    const idx = this.savedAddresses.findIndex(addr => addr.id === addressId);
    if (idx === -1) return false;

    this.savedAddresses.splice(idx, 1);
    return true;
  }

  // ---- Admin Stats ----

  async getAdminStats(): Promise<{
    totalBookings: number;
    activeBookings: number;
    completedBookings: number;
    totalDrivers: number;
    availableDrivers: number;
    openTickets: number;
    totalRevenue: number;
  }> {
    await delay();

    const activeStatuses: BookingStatus[] = [
      'requested',
      'driver_assigned',
      'driver_en_route_pickup',
      'driver_arrived',
      'in_progress',
    ];

    return {
      totalBookings: this.bookings.length,
      activeBookings: this.bookings.filter((b) => activeStatuses.includes(b.status)).length,
      completedBookings: this.bookings.filter((b) => b.status === 'completed').length,
      totalDrivers: this.drivers.length,
      availableDrivers: this.drivers.filter((d) => d.availability_status === 'available').length,
      openTickets: this.tickets.filter((t) => ['open', 'in_progress'].includes(t.status)).length,
      totalRevenue: this.bookings
        .filter((b) => b.status === 'completed')
        .reduce((sum, b) => sum + (b.price_breakdown?.platform_fee?.amount ?? 0), 0),
    };
  }

  // ---- User Management (Admin) ----

  async getAllUsers(filters?: {
    role?: Role;
    search?: string;
    status?: DriverCoreStatus;
  }): Promise<AnyUser[]> {
    await delay();

    let allUsers: AnyUser[] = [
      ...this.clients,
      ...this.drivers,
      ...this.supportAgents,
      ...this.admins,
    ];

    if (filters?.role) {
      allUsers = allUsers.filter((u) => u.role === filters.role);
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      allUsers = allUsers.filter(
        (u) =>
          u.full_name.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower) ||
          u.id.toLowerCase().includes(searchLower)
      );
    }

    if (filters?.status) {
      // Only applies to drivers
      allUsers = allUsers.filter((u) => {
        if (u.role !== 'driver') return false;
        return (u as Driver).core_status === filters.status;
      });
    }

    return allUsers.sort((a, b) => a.full_name.localeCompare(b.full_name));
  }

  async getUserById(userId: string): Promise<AnyUser | undefined> {
    await delay();
    return [
      ...this.clients,
      ...this.drivers,
      ...this.supportAgents,
      ...this.admins,
    ].find((u) => u.id === userId);
  }

  async updateDriverStatus(driverId: string, status: DriverCoreStatus): Promise<Driver | undefined> {
    await delay(200);
    const idx = this.drivers.findIndex((d) => d.id === driverId);
    if (idx !== -1) {
      this.drivers[idx] = { ...this.drivers[idx], core_status: status };
      return this.drivers[idx];
    }
    return undefined;
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
    await delay();
    return {
      totalClients: this.clients.length,
      totalDrivers: this.drivers.length,
      activeDrivers: this.drivers.filter((d) => d.core_status === 'active').length,
      pendingDrivers: this.drivers.filter((d) => d.core_status === 'pending_verification').length,
      suspendedDrivers: this.drivers.filter((d) => d.core_status === 'suspended').length,
      totalSupportAgents: this.supportAgents.length,
      totalAdmins: this.admins.length,
    };
  }

  // ---- Admin User Provisioning ----

  async adminCreateUser(data: {
    email: string;
    full_name: string;
    role: string;
    phone?: string;
    password?: string;
    send_invite?: boolean;
  }): Promise<{ success: boolean; message: string; user_id?: number; temporary_password?: string; invite_link?: string }> {
    await delay(300);
    const tempPassword = data.password || 'TempPass123!';
    const userId = Date.now();
    
    // Create user based on role
    if (data.role === 'client') {
      const newClient: Client = {
        id: `client-${userId}`,
        email: data.email,
        full_name: data.full_name,
        avatar_url: '',
        role: 'client',
        default_currency: 'USD',
      };
      this.clients.push(newClient);
    } else if (data.role === 'driver') {
      const newDriver: Driver = {
        id: `driver-${userId}`,
        email: data.email,
        full_name: data.full_name,
        avatar_url: '',
        role: 'driver',
        core_status: 'pending_verification',
        availability_status: 'offline',
        rating_average: undefined,
        rating_count: 0,
      };
      this.drivers.push(newDriver);
    } else if (data.role === 'support_agent') {
      const newAgent: SupportAgent = {
        id: `support-${userId}`,
        email: data.email,
        full_name: data.full_name,
        avatar_url: '',
        role: 'support_agent',
      };
      this.supportAgents.push(newAgent);
    } else if (data.role === 'admin') {
      const newAdmin: Admin = {
        id: `admin-${userId}`,
        email: data.email,
        full_name: data.full_name,
        avatar_url: '',
        role: 'admin',
      };
      this.admins.push(newAdmin);
    }
    
    return {
      success: true,
      message: `User created successfully with role '${data.role}'`,
      user_id: userId,
      temporary_password: tempPassword,
      invite_link: data.send_invite ? `https://example.com/invite/${userId}` : undefined,
    };
  }

  async adminUpdateUserRole(userId: string, newRole: string): Promise<{ success: boolean; message: string }> {
    await delay(200);
    // Mock implementation - in real app this would update the user's role
    return {
      success: true,
      message: `User role updated to '${newRole}'`,
    };
  }

  async adminInviteUser(data: {
    email: string;
    full_name: string;
    role: string;
    message?: string;
  }): Promise<{ success: boolean; message: string; user_id?: number; temporary_password?: string; invite_link?: string }> {
    await delay(300);
    const userId = Date.now();
    return {
      success: true,
      message: `Invitation sent to ${data.email}`,
      user_id: userId,
      temporary_password: 'TempInvite123!',
      invite_link: `https://example.com/invite/${userId}`,
    };
  }

  // ---- Cancellation Policies ----

  async getCancellationPolicies(): Promise<CancellationPolicy[]> {
    await delay();
    return [...this.cancellationPolicies].sort((a, b) => a.name.localeCompare(b.name));
  }

  async getCancellationPolicyById(policyId: string): Promise<CancellationPolicy | undefined> {
    await delay();
    return this.cancellationPolicies.find((p) => p.id === policyId);
  }

  async createCancellationPolicy(
    data: Omit<CancellationPolicy, 'id' | 'created_at' | 'updated_at'>
  ): Promise<CancellationPolicy> {
    await delay(300);
    const policy: CancellationPolicy = {
      ...data,
      id: `cp-${Date.now()}`,
      created_at: now(),
      updated_at: now(),
    };
    this.cancellationPolicies.push(policy);
    return policy;
  }

  async updateCancellationPolicy(
    policyId: string,
    updates: Partial<Omit<CancellationPolicy, 'id' | 'created_at'>>
  ): Promise<CancellationPolicy | undefined> {
    await delay(200);
    const idx = this.cancellationPolicies.findIndex((p) => p.id === policyId);
    if (idx === -1) return undefined;
    this.cancellationPolicies[idx] = {
      ...this.cancellationPolicies[idx],
      ...updates,
      updated_at: now(),
    };
    return this.cancellationPolicies[idx];
  }

  async deleteCancellationPolicy(policyId: string): Promise<boolean> {
    await delay(200);
    const idx = this.cancellationPolicies.findIndex((p) => p.id === policyId);
    if (idx === -1) return false;
    this.cancellationPolicies.splice(idx, 1);
    return true;
  }

  async getPolicyForServiceType(serviceType: string): Promise<CancellationPolicy | undefined> {
    await delay();
    // Find active policy that applies to this service type
    const policy = this.cancellationPolicies.find(
      (p) =>
        p.is_active &&
        (p.applies_to_service_types.length === 0 ||
          p.applies_to_service_types.includes(serviceType))
    );
    return policy;
  }

  // ---- Driver Payouts ----

  async getDriverPayouts(driverId: string): Promise<DriverPayout[]> {
    await delay();
    return this.driverPayouts
      .filter((p) => p.driver_id === driverId)
      .sort((a, b) => new Date(b.initiated_at).getTime() - new Date(a.initiated_at).getTime());
  }

  async getNextPayoutInfo(driverId: string): Promise<{
    nextPayoutDate: string;
    estimatedAmount: number;
    pendingTrips: number;
  }> {
    await delay();
    // Calculate next payout date (every Friday)
    const today = new Date();
    const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + daysUntilFriday);
    nextFriday.setHours(12, 0, 0, 0);

    // Get pending payout
    const pending = this.driverPayouts.find(
      (p) => p.driver_id === driverId && p.status === 'pending'
    );

    return {
      nextPayoutDate: nextFriday.toISOString(),
      estimatedAmount: pending?.amount.amount ?? 0,
      pendingTrips: pending?.trips_count ?? 0,
    };
  }
}

export const mockBackend = new MockBackendService();
