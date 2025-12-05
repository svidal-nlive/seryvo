import { useState, useEffect, useCallback } from 'react';
import {
  PlusCircle,
  Clock,
  Car,
  Briefcase,
  Truck,
  ArrowRight,
  ChevronLeft,
  Plus,
  Baby,
  Dog,
  Accessibility,
  Calendar,
  Users,
  Package,
  FileText,
  MessageSquare,
  History,
  Filter,
  Search,
  X,
  Tag,
  Check,
  Loader2,
  RotateCcw,
  Home,
  ShieldAlert,
  Phone,
  Share2,
  Copy,
  CheckCircle,
  AlertCircle,
  Bell,
  UserCircle2,
  Star,
  ShieldCheck,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import DateTimePicker from '../components/ui/DateTimePicker';
import { Tabs, TabPanel } from '../components/ui/Tabs';
import { MessagingView } from '../components/messaging';
import TripDetailsModal from '../components/TripDetailsModal';
import LocationInput from '../components/booking/LocationInput';
import MapPickerModal from '../components/booking/MapPickerModal';
import TripAlertsSettings from '../components/client/TripAlertsSettings';
import { SkeletonCardGrid } from '../components/ui/SkeletonLoader';
import EmptyState, { NoBookingsState } from '../components/ui/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { backend } from '../services/backend';
import { useWebSocket } from '../hooks/useWebSocket';
import { ChannelType, type BookingUpdatePayload } from '../services/websocket';
import type { Booking, ServiceTypeCode, SavedAddress } from '../types';

// ---- Vehicle Options ----

interface VehicleOption {
  id: ServiceTypeCode;
  name: string;
  description: string;
  icon: React.ReactNode;
  capacity: number;
  basePrice: number;
}

const VEHICLE_TYPES: VehicleOption[] = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'Affordable, compact rides',
    icon: <Car size={24} />,
    capacity: 4,
    basePrice: 5,
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'High-end sedans, top drivers',
    icon: <Briefcase size={24} />,
    capacity: 4,
    basePrice: 12,
  },
  {
    id: 'van',
    name: 'Van / XL',
    description: 'For groups and luggage',
    icon: <Truck size={24} />,
    capacity: 6,
    basePrice: 15,
  },
];

const ACCESSIBILITY_OPTIONS = [
  { id: 'child_seat', label: 'Child Seat', icon: <Baby size={16} /> },
  { id: 'pet_friendly', label: 'Pet Friendly', icon: <Dog size={16} /> },
  { id: 'wheelchair', label: 'Wheelchair Access', icon: <Accessibility size={16} /> },
];

const DRIVER_PREFERENCE_OPTIONS = [
  { id: 'female_driver', label: 'Female Driver', icon: <UserCircle2 size={16} />, description: 'Request a female driver' },
  { id: 'verified_only', label: 'Verified Driver', icon: <ShieldCheck size={16} />, description: 'Fully verified drivers only' },
  { id: 'high_rated', label: 'Top Rated (4.5+)', icon: <Star size={16} />, description: 'Drivers with 4.5+ rating' },
];

// ---- Booking Flow Steps ----

type BookingStep = 'idle' | 'location' | 'details' | 'vehicle' | 'review' | 'confirmed';
type DashboardTab = 'trips' | 'messages';

export default function ClientDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>('trips');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [selectedTrip, setSelectedTrip] = useState<Booking | null>(null);

  // Booking flow state
  const [step, setStep] = useState<BookingStep>('idle');
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [stops, setStops] = useState<string[]>([]);
  const [mapTarget, setMapTarget] = useState<'pickup' | 'dropoff' | number | null>(null);
  const [isAsap, setIsAsap] = useState(true);
  const [scheduledTime, setScheduledTime] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);
  const [luggageCount, setLuggageCount] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [driverPreferences, setDriverPreferences] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [vehicleType, setVehicleType] = useState<ServiceTypeCode>('standard');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discount_type: 'percentage' | 'fixed_amount';
    discount_value: number;
    description: string;
  } | null>(null);

  // Trip history filters
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
  const [historyDateFilter, setHistoryDateFilter] = useState<string>('all');
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);

  // Share trip state
  const [shareTrip, setShareTrip] = useState<Booking | null>(null);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);

  // Terms acceptance state
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Trip alerts settings modal
  const [showAlertsSettings, setShowAlertsSettings] = useState(false);

  // Lead-time validation
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Real-time notification toast state
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'warning' } | null>(null);

  // Handle real-time booking updates
  const handleBookingUpdate = useCallback((data: BookingUpdatePayload) => {
    setBookings((prev) => 
      prev.map((booking) => 
        booking.booking_id === data.booking_id
          ? { ...booking, status: (data.status as Booking['status']) || booking.status }
          : booking
      )
    );
    
    // Show notification for important updates
    if (data.status) {
      const statusMessages: Record<string, string> = {
        driver_assigned: '🚗 A driver has been assigned to your trip!',
        driver_en_route: '🚙 Your driver is on the way!',
        driver_arrived: '📍 Your driver has arrived!',
        in_progress: '🎯 Your trip is in progress',
        completed: '✅ Trip completed. Thank you for riding with Seryvo!',
        cancelled: '❌ Your trip has been cancelled',
      };
      
      const message = statusMessages[data.status];
      if (message) {
        setNotification({ message, type: data.status === 'cancelled' ? 'warning' : 'success' });
        setTimeout(() => setNotification(null), 5000);
      }
    }
  }, []);

  // WebSocket connection for real-time updates
  const { isConnected: wsConnected } = useWebSocket({
    autoConnect: true,
    channels: [ChannelType.BOOKING, ChannelType.NOTIFICATION],
    onBookingUpdate: handleBookingUpdate,
    onNotification: (data) => {
      setNotification({ message: data.message, type: 'info' });
      setTimeout(() => setNotification(null), 5000);
    },
  });

  // Lead-time constraints (per policies spec)
  const MIN_LEAD_TIME_MINUTES = 15;
  const MAX_LEAD_TIME_DAYS = 30;

  const validateScheduledTime = (time: string): string | null => {
    if (!time) return null;
    
    const scheduledDate = new Date(time);
    const now = new Date();
    const minTime = new Date(now.getTime() + MIN_LEAD_TIME_MINUTES * 60 * 1000);
    const maxTime = new Date(now.getTime() + MAX_LEAD_TIME_DAYS * 24 * 60 * 60 * 1000);
    
    if (scheduledDate < minTime) {
      return `Scheduled pickup must be at least ${MIN_LEAD_TIME_MINUTES} minutes from now`;
    }
    if (scheduledDate > maxTime) {
      return `Scheduled pickup cannot be more than ${MAX_LEAD_TIME_DAYS} days in advance`;
    }
    return null;
  };

  useEffect(() => {
    if (user) {
      loadBookings();
      loadUnreadCount();
      loadSavedAddresses();
    }
  }, [user]);

  const loadBookings = async () => {
    if (!user) return;
    setLoading(true);
    const data = await backend.getBookings(user.id);
    setBookings(data);
    setLoading(false);
  };

  const loadUnreadCount = async () => {
    if (!user) return;
    const chats = await backend.getChats(user.id);
    const totalUnread = chats.reduce((sum, chat) => sum + (chat.unread_count || 0), 0);
    setUnreadMessages(totalUnread);
  };

  const loadSavedAddresses = async () => {
    if (!user) return;
    const addresses = await backend.getSavedAddresses(user.id);
    setSavedAddresses(addresses);
  };

  const handleSelectSavedAddress = (address: SavedAddress, target: 'pickup' | 'dropoff') => {
    if (target === 'pickup') {
      setPickup(address.location.address_line);
    } else {
      setDropoff(address.location.address_line);
    }
  };

  const resetBookingForm = () => {
    setStep('idle');
    setPickup('');
    setDropoff('');
    setStops([]);
    setIsAsap(true);
    setScheduledTime('');
    setPassengerCount(1);
    setLuggageCount(0);
    setSelectedOptions([]);
    setDriverPreferences([]);
    setNotes('');
    setVehicleType('standard');
    setConfirmedBooking(null);
    setPromoCode('');
    setPromoError(null);
    setAppliedPromo(null);
    setTermsAccepted(false);
    setScheduleError(null);
  };

  const handleMapSelect = (address: string) => {
    if (mapTarget === 'pickup') setPickup(address);
    else if (mapTarget === 'dropoff') setDropoff(address);
    else if (typeof mapTarget === 'number') {
      const newStops = [...stops];
      newStops[mapTarget] = address;
      setStops(newStops);
    }
    setMapTarget(null);
  };

  const addStop = () => {
    setStops([...stops, '']);
  };

  const removeStop = (index: number) => {
    setStops(stops.filter((_, i) => i !== index));
  };

  const updateStop = (index: number, value: string) => {
    const newStops = [...stops];
    newStops[index] = value;
    setStops(newStops);
  };

  const toggleOption = (optionId: string) => {
    setSelectedOptions((prev) =>
      prev.includes(optionId) ? prev.filter((o) => o !== optionId) : [...prev, optionId]
    );
  };

  const toggleDriverPreference = (prefId: string) => {
    setDriverPreferences((prev) =>
      prev.includes(prefId) ? prev.filter((p) => p !== prefId) : [...prev, prefId]
    );
  };

  const calculateEstimate = () => {
    const vehicle = VEHICLE_TYPES.find((v) => v.id === vehicleType)!;
    const baseFare = vehicle.basePrice * 100;
    const distanceFare = (15 + stops.length * 5) * 100; // Mock distance
    const optionsFare = selectedOptions.length * 200;
    const subtotal = baseFare + distanceFare + optionsFare;
    
    // Calculate promo discount
    let promoDiscount = 0;
    if (appliedPromo) {
      if (appliedPromo.discount_type === 'percentage') {
        promoDiscount = Math.round(subtotal * (appliedPromo.discount_value / 100));
      } else {
        promoDiscount = appliedPromo.discount_value; // Already in cents
      }
    }
    
    const afterDiscount = subtotal - promoDiscount;
    const tax = Math.round(afterDiscount * 0.1);
    
    return {
      base: baseFare,
      distance: distanceFare,
      options: optionsFare,
      subtotal,
      promoDiscount,
      tax,
      total: afterDiscount + tax,
    };
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim() || !user) return;
    
    setPromoLoading(true);
    setPromoError(null);
    
    // Calculate current estimate for validation
    const currentEstimate = calculateEstimate();
    
    try {
      const validation = await backend.validatePromoCode(
        promoCode.trim().toUpperCase(),
        user.id,
        currentEstimate.subtotal,
        vehicleType
      );
      
      if (validation.valid && validation.promo) {
        setAppliedPromo({
          code: validation.promo.code,
          discount_type: validation.promo.discount_type,
          discount_value: validation.promo.discount_value,
          description: validation.promo.description,
        });
        setPromoCode('');
      } else {
        setPromoError(validation.error || 'Invalid promo code');
      }
    } catch (_error) {
      setPromoError('Failed to validate promo code');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError(null);
  };

  const handleRebook = (booking: Booking) => {
    // Pre-fill the booking form with data from the past booking
    const firstLeg = booking.legs[0];
    const lastLeg = booking.legs[booking.legs.length - 1];
    
    // Set pickup and dropoff
    setPickup(firstLeg?.pickup.address_line || '');
    setDropoff(lastLeg?.dropoff.address_line || '');
    
    // Set intermediate stops if any (legs in the middle)
    const intermediateStops = booking.legs.slice(0, -1).map(leg => leg.dropoff.address_line);
    // Only set stops if there are more than 2 legs (pickup -> stop1 -> ... -> dropoff)
    if (booking.legs.length > 1) {
      setStops(intermediateStops.slice(0, -1)); // Remove the last one as it's the dropoff
    } else {
      setStops([]);
    }
    
    // Set vehicle type
    setVehicleType(booking.service_type);
    
    // Set passenger and luggage count
    setPassengerCount(booking.passenger_count || 1);
    setLuggageCount(booking.luggage_count || 0);
    
    // Set accessibility options
    setSelectedOptions(booking.accessibility_requirements || []);
    
    // Set notes
    setNotes(booking.special_notes || '');
    
    // Default to ASAP for rebooking
    setIsAsap(true);
    setScheduledTime('');
    
    // Clear any promo from previous booking
    setPromoCode('');
    setPromoError(null);
    setAppliedPromo(null);
    
    // Start the booking flow at location step
    setStep('location');
  };

  const handleSubmitBooking = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      const booking = await backend.createBooking({
        client_id: user.id,
        pickup,
        dropoff,
        stops: stops.filter((s) => s.trim() !== ''),
        is_asap: isAsap,
        requested_pickup_at: isAsap ? undefined : new Date(scheduledTime).toISOString(),
        passenger_count: passengerCount,
        luggage_count: luggageCount,
        service_type: vehicleType,
        accessibility_requirements: selectedOptions.filter((o) =>
          ['wheelchair', 'child_seat'].includes(o)
        ),
        special_notes: notes || undefined,
        options: selectedOptions,
        driver_preferences: driverPreferences.length > 0 ? {
          female_driver_only: driverPreferences.includes('female_driver'),
          verified_driver_only: driverPreferences.includes('verified_only'),
          high_rated_only: driverPreferences.includes('high_rated'),
        } : undefined,
      });

      setConfirmedBooking(booking);
      setStep('confirmed');
      loadBookings();
    } catch (error) {
      console.error('Failed to create booking:', error);
      alert('Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    await backend.updateBookingStatus(bookingId, 'canceled_by_client', user?.id, 'client');
    loadBookings();
  };

  const generateShareLink = (booking: Booking) => {
    // Generate a shareable tracking link (in production, this would be a real URL)
    const baseUrl = window.location.origin;
    return `${baseUrl}/track/${booking.booking_id}`;
  };

  const handleCopyShareLink = async () => {
    if (!shareTrip) return;
    const link = generateShareLink(shareTrip);
    try {
      await navigator.clipboard.writeText(link);
      setShareLinkCopied(true);
      setTimeout(() => setShareLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleNativeShare = async () => {
    if (!shareTrip) return;
    const link = generateShareLink(shareTrip);
    const pickup = shareTrip.legs[0]?.pickup.address_line || 'Unknown';
    const dropoff = shareTrip.legs[shareTrip.legs.length - 1]?.dropoff.address_line || 'Unknown';
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Track My Trip - Seryvo',
          text: `I'm on my way from ${pickup} to ${dropoff}. Track my trip live:`,
          url: link,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    }
  };

  const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const activeBookings = bookings.filter(
    (b) => !['completed', 'canceled_by_client', 'canceled_by_driver', 'canceled_by_system'].includes(b.status)
  );
  const pastBookings = bookings.filter((b) =>
    ['completed', 'canceled_by_client', 'canceled_by_driver', 'canceled_by_system'].includes(b.status)
  );

  // ---- Render Booking Flow Steps ----

  const renderLocationStep = () => (
    <div className="space-y-4">
      {/* Saved Addresses Quick Select */}
      {savedAddresses.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2">
          {savedAddresses.map((addr) => (
            <div key={addr.id} className="flex gap-1">
              <button
                onClick={() => handleSelectSavedAddress(addr, 'pickup')}
                className="px-3 py-1.5 text-xs rounded-l-full border border-gray-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 transition-colors flex items-center gap-1"
                title={`Set as pickup: ${addr.location.address_line}`}
              >
                <Home size={12} className="text-gray-400" />
                {addr.custom_name || addr.label}
                <span className="text-gray-400">→ P</span>
              </button>
              <button
                onClick={() => handleSelectSavedAddress(addr, 'dropoff')}
                className="px-3 py-1.5 text-xs rounded-r-full border-l-0 border border-gray-200 dark:border-slate-700 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 transition-colors"
                title={`Set as dropoff: ${addr.location.address_line}`}
              >
                <span className="text-gray-400">→ D</span>
              </button>
            </div>
          ))}
        </div>
      )}

      <LocationInput
        label="Pickup"
        value={pickup}
        onChange={setPickup}
        onOpenMap={() => setMapTarget('pickup')}
        placeholder="Enter pickup address"
      />

      {stops.map((stop, idx) => (
        <LocationInput
          key={idx}
          label={`Stop ${idx + 1}`}
          value={stop}
          onChange={(val) => updateStop(idx, val)}
          onOpenMap={() => setMapTarget(idx)}
          placeholder="Enter stop address"
          onRemove={() => removeStop(idx)}
        />
      ))}

      <button
        onClick={addStop}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        <Plus size={16} /> Add Stop
      </button>

      <LocationInput
        label="Dropoff"
        value={dropoff}
        onChange={setDropoff}
        onOpenMap={() => setMapTarget('dropoff')}
        placeholder="Enter destination"
      />

      <div className="flex gap-3 pt-4">
        <Button variant="secondary" onClick={resetBookingForm} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={() => setStep('details')}
          disabled={!pickup.trim() || !dropoff.trim()}
          className="flex-1"
        >
          Continue <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-6">
      {/* Time Selection */}
      <div>
        <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">
          When
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => { setIsAsap(true); setScheduleError(null); }}
            className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all ${
              isAsap
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
            }`}
          >
            Now (ASAP)
          </button>
          <button
            onClick={() => setIsAsap(false)}
            className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all flex items-center justify-center gap-2 ${
              !isAsap
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
            }`}
          >
            <Calendar size={16} /> Schedule
          </button>
        </div>
        {!isAsap && (
          <>
            <DateTimePicker
              value={scheduledTime}
              onChange={(value) => {
                setScheduledTime(value);
                setScheduleError(validateScheduledTime(value));
              }}
              minDate={new Date(Date.now() + MIN_LEAD_TIME_MINUTES * 60 * 1000)}
              maxDate={new Date(Date.now() + MAX_LEAD_TIME_DAYS * 24 * 60 * 60 * 1000)}
              placeholder="Select pickup date and time"
              error={scheduleError || undefined}
              className="mt-3"
            />
            {scheduleError && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle size={14} /> {scheduleError}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              Scheduled pickups must be at least {MIN_LEAD_TIME_MINUTES} minutes in advance, up to {MAX_LEAD_TIME_DAYS} days ahead
            </p>
          </>
        )}
      </div>

      {/* Passengers & Luggage */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Users size={14} /> Passengers
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPassengerCount(Math.max(1, passengerCount - 1))}
              className="w-10 h-10 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              -
            </button>
            <span className="text-xl font-bold w-8 text-center">{passengerCount}</span>
            <button
              onClick={() => setPassengerCount(Math.min(6, passengerCount + 1))}
              className="w-10 h-10 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              +
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Package size={14} /> Luggage
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLuggageCount(Math.max(0, luggageCount - 1))}
              className="w-10 h-10 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              -
            </button>
            <span className="text-xl font-bold w-8 text-center">{luggageCount}</span>
            <button
              onClick={() => setLuggageCount(Math.min(5, luggageCount + 1))}
              className="w-10 h-10 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Options */}
      <div>
        <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">
          Options
        </label>
        <div className="flex flex-wrap gap-2">
          {ACCESSIBILITY_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => toggleOption(opt.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
                selectedOptions.includes(opt.id)
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
              }`}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Driver Preferences */}
      <div>
        <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">
          Driver Preferences
        </label>
        <div className="flex flex-wrap gap-2">
          {DRIVER_PREFERENCE_OPTIONS.map((pref) => (
            <button
              key={pref.id}
              onClick={() => toggleDriverPreference(pref.id)}
              title={pref.description}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
                driverPreferences.includes(pref.id)
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                  : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
              }`}
            >
              {pref.icon} {pref.label}
            </button>
          ))}
        </div>
        {driverPreferences.length > 0 && (
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
            Note: Driver preferences may increase wait time as we match you with the right driver.
          </p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
          <FileText size={14} /> Special Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any special instructions for the driver..."
          className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 resize-none"
          rows={2}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button variant="secondary" onClick={() => setStep('location')} className="flex-1">
          <ChevronLeft size={16} /> Back
        </Button>
        <Button 
          onClick={() => setStep('vehicle')} 
          className="flex-1"
          disabled={!isAsap && (!!scheduleError || !scheduledTime)}
        >
          Continue <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );

  const renderVehicleStep = () => (
    <div className="space-y-4">
      <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">
        Choose Vehicle Type
      </label>

      <div className="space-y-3">
        {VEHICLE_TYPES.map((vehicle) => (
          <button
            key={vehicle.id}
            onClick={() => setVehicleType(vehicle.id)}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
              vehicleType === vehicle.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
            }`}
          >
            <div
              className={`p-3 rounded-lg ${
                vehicleType === vehicle.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
              }`}
            >
              {vehicle.icon}
            </div>
            <div className="flex-1">
              <p className="font-semibold dark:text-white">{vehicle.name}</p>
              <p className="text-sm text-gray-500 dark:text-slate-400">{vehicle.description}</p>
              <p className="text-xs text-gray-400 mt-1">Up to {vehicle.capacity} passengers</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg dark:text-white">${vehicle.basePrice}</p>
              <p className="text-xs text-gray-400">base</p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3 pt-4">
        <Button variant="secondary" onClick={() => setStep('details')} className="flex-1">
          <ChevronLeft size={16} /> Back
        </Button>
        <Button onClick={() => setStep('review')} className="flex-1">
          Review Booking <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );

  const renderReviewStep = () => {
    const estimate = calculateEstimate();
    const vehicle = VEHICLE_TYPES.find((v) => v.id === vehicleType)!;

    return (
      <div className="space-y-6">
        <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 mt-1.5 rounded-full bg-green-500" />
            <div>
              <p className="text-xs text-gray-400 uppercase">Pickup</p>
              <p className="font-medium dark:text-white">{pickup}</p>
            </div>
          </div>
          {stops.map((stop, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="w-3 h-3 mt-1.5 rounded-full bg-amber-500" />
              <div>
                <p className="text-xs text-gray-400 uppercase">Stop {idx + 1}</p>
                <p className="font-medium dark:text-white">{stop}</p>
              </div>
            </div>
          ))}
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 mt-1.5 rounded-full bg-red-500" />
            <div>
              <p className="text-xs text-gray-400 uppercase">Dropoff</p>
              <p className="font-medium dark:text-white">{dropoff}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">When</p>
            <p className="font-medium dark:text-white">
              {isAsap ? 'Now (ASAP)' : new Date(scheduledTime).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Vehicle</p>
            <p className="font-medium dark:text-white">{vehicle.name}</p>
          </div>
          <div>
            <p className="text-gray-400">Passengers</p>
            <p className="font-medium dark:text-white">{passengerCount}</p>
          </div>
          <div>
            <p className="text-gray-400">Luggage</p>
            <p className="font-medium dark:text-white">{luggageCount}</p>
          </div>
        </div>

        {selectedOptions.length > 0 && (
          <div>
            <p className="text-gray-400 text-sm mb-1">Options</p>
            <div className="flex flex-wrap gap-2">
              {selectedOptions.map((opt) => (
                <span
                  key={opt}
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium"
                >
                  {ACCESSIBILITY_OPTIONS.find((o) => o.id === opt)?.label ?? opt}
                </span>
              ))}
            </div>
          </div>
        )}

        {driverPreferences.length > 0 && (
          <div>
            <p className="text-gray-400 text-sm mb-1">Driver Preferences</p>
            <div className="flex flex-wrap gap-2">
              {driverPreferences.map((pref) => (
                <span
                  key={pref}
                  className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-medium"
                >
                  {DRIVER_PREFERENCE_OPTIONS.find((p) => p.id === pref)?.label ?? pref}
                </span>
              ))}
            </div>
          </div>
        )}

        {notes && (
          <div>
            <p className="text-gray-400 text-sm mb-1">Notes</p>
            <p className="text-sm dark:text-white">{notes}</p>
          </div>
        )}

        {/* Promo Code Section */}
        <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
          <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Tag size={14} /> Promo Code
          </label>
          
          {appliedPromo ? (
            <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Check size={16} className="text-green-600" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-300">{appliedPromo.code}</p>
                  <p className="text-xs text-green-600 dark:text-green-400">{appliedPromo.description}</p>
                </div>
              </div>
              <button
                onClick={handleRemovePromo}
                className="text-green-600 hover:text-green-700 p-1"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase());
                  setPromoError(null);
                }}
                placeholder="Enter promo code"
                className={`flex-1 px-4 py-2 rounded-lg border bg-gray-50 dark:bg-slate-900 ${
                  promoError 
                    ? 'border-red-300 dark:border-red-700' 
                    : 'border-gray-200 dark:border-slate-700'
                }`}
              />
              <Button
                onClick={handleApplyPromo}
                disabled={promoLoading || !promoCode.trim()}
                variant="secondary"
              >
                {promoLoading ? <Loader2 size={16} className="animate-spin" /> : 'Apply'}
              </Button>
            </div>
          )}
          
          {promoError && (
            <p className="text-sm text-red-500 mt-1">{promoError}</p>
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-slate-700 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Base fare</span>
            <span>{formatMoney(estimate.base)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Distance</span>
            <span>{formatMoney(estimate.distance)}</span>
          </div>
          {estimate.options > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Options</span>
              <span>{formatMoney(estimate.options)}</span>
            </div>
          )}
          {estimate.promoDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span className="flex items-center gap-1">
                <Tag size={12} /> Promo ({appliedPromo?.code})
              </span>
              <span>-{formatMoney(estimate.promoDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Tax</span>
            <span>{formatMoney(estimate.tax)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200 dark:border-slate-700">
            <span>Total</span>
            <span className="text-green-600">{formatMoney(estimate.total)}</span>
          </div>
          {estimate.promoDiscount > 0 && (
            <p className="text-xs text-green-600 text-right">
              You save {formatMoney(estimate.promoDiscount)}!
            </p>
          )}
        </div>

        {/* Terms Acceptance */}
        <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              I agree to the{' '}
              <button
                type="button"
                className="text-blue-600 hover:underline font-medium"
                onClick={(e) => {
                  e.preventDefault();
                  window.open('/terms', '_blank');
                }}
              >
                Terms of Service
              </button>{' '}
              and{' '}
              <button
                type="button"
                className="text-blue-600 hover:underline font-medium"
                onClick={(e) => {
                  e.preventDefault();
                  window.open('/cancellation-policy', '_blank');
                }}
              >
                Cancellation Policy
              </button>
            </span>
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="secondary" onClick={() => setStep('vehicle')} className="flex-1">
            <ChevronLeft size={16} /> Back
          </Button>
          <Button
            onClick={handleSubmitBooking}
            disabled={submitting || !termsAccepted}
            className="flex-1"
            variant="success"
          >
            {submitting ? 'Confirming...' : 'Confirm Booking'}
          </Button>
        </div>
      </div>
    );
  };

  const renderConfirmedStep = () => (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <Car size={32} className="text-green-600" />
      </div>
      <h3 className="text-xl font-bold mb-2 dark:text-white">Booking Confirmed!</h3>
      <p className="text-gray-500 dark:text-slate-400 mb-6">
        Your ride request has been submitted. A driver will accept shortly.
      </p>
      {confirmedBooking && (
        <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 mb-6 text-left">
          <p className="text-sm text-gray-500">Booking ID</p>
          <p className="font-mono font-bold dark:text-white">{confirmedBooking.booking_id}</p>
        </div>
      )}
      <Button onClick={resetBookingForm} className="w-full">
        Done
      </Button>
    </div>
  );

  const tabs = [
    { id: 'trips', label: 'Trips', icon: <Car size={18} /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare size={18} />, badge: unreadMessages || undefined },
  ];

  const renderTripsTab = () => (
    <>
      {/* Quick Actions */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setStep('location')}>
            <PlusCircle size={18} /> New Booking
          </Button>
          <Button variant="secondary" onClick={() => { setStep('location'); setIsAsap(false); }}>
            <Clock size={18} /> Schedule a Ride
          </Button>
        </div>
      </section>

      {/* Active & Upcoming Bookings */}
      <section className="mt-6" aria-labelledby="active-bookings-heading">
        <h2 id="active-bookings-heading" className="text-xl font-semibold mb-4">Active & Upcoming</h2>
        {loading ? (
          <SkeletonCardGrid count={2} variant="default" className="md:grid-cols-2" />
        ) : activeBookings.length === 0 ? (
          <NoBookingsState onCreateBooking={() => setStep('location')} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeBookings.map((b) => (
              <Card key={b.booking_id} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                    <Car size={16} />
                    <span className="capitalize">{b.service_type}</span>
                  </div>
                  <Badge status={b.status} />
                </div>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="font-medium">From:</span> {b.legs[0]?.pickup.address_line}
                  </p>
                  <p>
                    <span className="font-medium">To:</span>{' '}
                    {b.legs[b.legs.length - 1]?.dropoff.address_line}
                  </p>
                  {b.requested_pickup_at && (
                    <p className="text-gray-400">
                      Scheduled: {new Date(b.requested_pickup_at).toLocaleString()}
                    </p>
                  )}
                </div>
                {b.price_breakdown && (
                  <p className="font-bold text-green-600">
                    {formatMoney(b.price_breakdown.grand_total.amount)}
                  </p>
                )}

                {/* Emergency Contact - shown during active trips */}
                {['driver_en_route_pickup', 'driver_arrived', 'in_progress'].includes(b.status) && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                        <ShieldAlert size={18} />
                        <span className="text-sm font-medium">Emergency?</span>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href="tel:911"
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
                        >
                          <Phone size={14} /> 911
                        </a>
                        <a
                          href="tel:+18005551234"
                          className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors"
                        >
                          <Phone size={14} /> Support
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-auto">
                  <Button 
                    variant="secondary" 
                    className="flex-1 text-xs"
                    onClick={() => setSelectedTrip(b)}
                  >
                    Details
                  </Button>
                  {['driver_en_route_pickup', 'driver_arrived', 'in_progress'].includes(b.status) && (
                    <Button
                      variant="secondary"
                      className="text-xs"
                      onClick={() => setShareTrip(b)}
                    >
                      <Share2 size={14} /> Share
                    </Button>
                  )}
                  {b.status === 'requested' && (
                    <Button
                      variant="danger"
                      className="text-xs"
                      onClick={() => handleCancelBooking(b.booking_id)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Past Bookings with Filters */}
      {pastBookings.length > 0 && (
        <section className="mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <History size={20} /> Past Trips
            </h2>
            
            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search trips..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="pl-9 pr-8 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 w-36 sm:w-48"
                />
                {historySearchQuery && (
                  <button
                    onClick={() => setHistorySearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              
              {/* Status Filter */}
              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="canceled_by_client">Canceled by me</option>
                <option value="canceled_by_driver">Canceled by driver</option>
              </select>
              
              {/* Date Filter */}
              <select
                value={historyDateFilter}
                onChange={(e) => setHistoryDateFilter(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
          
          {/* Filtered Results */}
          {(() => {
            // Apply filters
            let filteredPast = pastBookings;
            
            // Status filter
            if (historyStatusFilter !== 'all') {
              filteredPast = filteredPast.filter(b => b.status === historyStatusFilter);
            }
            
            // Date filter
            if (historyDateFilter !== 'all') {
              const now = new Date();
              const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const startOfWeek = new Date(startOfDay);
              startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
              const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
              const startOfYear = new Date(now.getFullYear(), 0, 1);
              
              filteredPast = filteredPast.filter(b => {
                const bookingDate = new Date(b.created_at);
                switch (historyDateFilter) {
                  case 'today':
                    return bookingDate >= startOfDay;
                  case 'week':
                    return bookingDate >= startOfWeek;
                  case 'month':
                    return bookingDate >= startOfMonth;
                  case 'year':
                    return bookingDate >= startOfYear;
                  default:
                    return true;
                }
              });
            }
            
            // Search filter
            if (historySearchQuery.trim()) {
              const query = historySearchQuery.toLowerCase();
              filteredPast = filteredPast.filter(b =>
                b.legs[0]?.pickup.address_line.toLowerCase().includes(query) ||
                b.legs[b.legs.length - 1]?.dropoff.address_line.toLowerCase().includes(query) ||
                b.booking_id.toLowerCase().includes(query)
              );
            }
            
            if (filteredPast.length === 0) {
              return (
                <Card>
                  <div className="text-center py-6">
                    <Filter size={24} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500 dark:text-slate-400">No trips match your filters</p>
                    <button
                      onClick={() => {
                        setHistoryStatusFilter('all');
                        setHistoryDateFilter('all');
                        setHistorySearchQuery('');
                      }}
                      className="text-blue-600 hover:underline text-sm mt-2"
                    >
                      Clear filters
                    </button>
                  </div>
                </Card>
              );
            }
            
            return (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredPast.slice(0, 12).map((b) => (
                  <Card 
                    key={b.booking_id} 
                    className="flex flex-col gap-2 hover:ring-2 hover:ring-blue-500 transition-all"
                  >
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => setSelectedTrip(b)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {new Date(b.created_at).toLocaleDateString()}
                        </span>
                        <Badge status={b.status} />
                      </div>
                      <p className="text-sm truncate dark:text-white mt-2">
                        {b.legs[0]?.pickup.address_line} → {b.legs[b.legs.length - 1]?.dropoff.address_line}
                      </p>
                      {b.price_breakdown && (
                        <p className="text-sm font-medium mt-1">
                          {formatMoney(b.price_breakdown.grand_total.amount)}
                        </p>
                      )}
                      {b.client_rating_value && (
                        <div className="flex items-center gap-1 text-yellow-500 text-sm mt-1">
                          {'★'.repeat(b.client_rating_value)}
                          {'☆'.repeat(5 - b.client_rating_value)}
                        </div>
                      )}
                    </div>
                    {b.status === 'completed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRebook(b);
                        }}
                        className="flex items-center justify-center gap-2 w-full py-2 px-3 mt-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-sm font-medium transition-colors"
                      >
                        <RotateCcw size={14} />
                        Rebook Trip
                      </button>
                    )}
                  </Card>
                ))}
              </div>
            );
          })()}
          
          {/* Show total count */}
          <p className="text-xs text-gray-400 mt-3 text-center">
            Showing {Math.min(12, pastBookings.length)} of {pastBookings.length} past trips
          </p>
        </section>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      {/* Real-time notification toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg transition-all transform animate-slide-in ${
          notification.type === 'success' ? 'bg-green-500 text-white' :
          notification.type === 'warning' ? 'bg-yellow-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{notification.message}</span>
            <button 
              onClick={() => setNotification(null)}
              className="ml-auto p-1 hover:bg-white/20 rounded"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* WebSocket connection indicator */}
      {!wsConnected && (
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400 rounded-lg">
          <AlertCircle size={16} />
          <span>Connecting to real-time updates...</span>
        </div>
      )}

      {/* Quick Settings Bar */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAlertsSettings(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Bell size={18} />
          <span>Trip Alerts</span>
        </button>
      </div>

      <Tabs 
        tabs={tabs} 
        activeTab={activeTab} 
        onTabChange={(id) => setActiveTab(id as DashboardTab)}
      >
        <TabPanel id="trips">
          {renderTripsTab()}
        </TabPanel>
        <TabPanel id="messages">
          {user && <MessagingView userId={user.id} userName={user.full_name} />}
        </TabPanel>
      </Tabs>

      {/* Booking Flow Modal */}
      <Modal
        isOpen={step !== 'idle'}
        onClose={resetBookingForm}
        title={
          step === 'location'
            ? 'Where are you going?'
            : step === 'details'
            ? 'Trip Details'
            : step === 'vehicle'
            ? 'Choose Vehicle'
            : step === 'review'
            ? 'Review Booking'
            : step === 'confirmed'
            ? 'Success'
            : undefined
        }
        size="lg"
      >
        {step === 'location' && renderLocationStep()}
        {step === 'details' && renderDetailsStep()}
        {step === 'vehicle' && renderVehicleStep()}
        {step === 'review' && renderReviewStep()}
        {step === 'confirmed' && renderConfirmedStep()}
      </Modal>

      {/* Map Picker Modal */}
      <MapPickerModal
        isOpen={mapTarget !== null}
        onClose={() => setMapTarget(null)}
        onSelect={handleMapSelect}
      />

      {/* Trip Details Modal */}
      <TripDetailsModal
        booking={selectedTrip}
        isOpen={!!selectedTrip}
        onClose={() => setSelectedTrip(null)}
        userRole="client"
      />

      {/* Share Trip Modal */}
      <Modal
        isOpen={!!shareTrip}
        onClose={() => {
          setShareTrip(null);
          setShareLinkCopied(false);
        }}
        title="Share Trip"
      >
        {shareTrip && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Share your live trip tracking link with friends or family so they can follow your journey.
            </p>

            {/* Trip Summary */}
            <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <p className="text-sm font-medium">
                {shareTrip.legs[0]?.pickup.address_line}
              </p>
              <p className="text-xs text-gray-400 my-1">↓</p>
              <p className="text-sm font-medium">
                {shareTrip.legs[shareTrip.legs.length - 1]?.dropoff.address_line}
              </p>
            </div>

            {/* Share Link */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={generateShareLink(shareTrip)}
                className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600"
              />
              <Button
                variant={shareLinkCopied ? 'success' : 'secondary'}
                onClick={handleCopyShareLink}
              >
                {shareLinkCopied ? <CheckCircle size={18} /> : <Copy size={18} />}
                {shareLinkCopied ? 'Copied!' : 'Copy'}
              </Button>
            </div>

            {/* Native Share (Mobile) */}
            {'share' in navigator && (
              <Button className="w-full" onClick={handleNativeShare}>
                <Share2 size={18} /> Share via...
              </Button>
            )}

            {/* Quick Share Options */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200 dark:border-slate-700">
              <a
                href={`sms:?body=${encodeURIComponent(`Track my trip: ${generateShareLink(shareTrip)}`)}`}
                className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <MessageSquare size={20} className="text-green-500" />
                <span className="text-xs">SMS</span>
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent('Track My Trip')}&body=${encodeURIComponent(`Follow my trip live: ${generateShareLink(shareTrip)}`)}`}
                className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <FileText size={20} className="text-blue-500" />
                <span className="text-xs">Email</span>
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Track my trip: ${generateShareLink(shareTrip)}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Phone size={20} className="text-green-600" />
                <span className="text-xs">WhatsApp</span>
              </a>
            </div>
          </div>
        )}
      </Modal>

      {/* Trip Alerts Settings */}
      <TripAlertsSettings
        isOpen={showAlertsSettings}
        onClose={() => setShowAlertsSettings(false)}
      />
    </div>
  );
}
