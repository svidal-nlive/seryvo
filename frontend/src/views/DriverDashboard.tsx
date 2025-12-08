import { useState, useEffect, useCallback } from 'react';
import {
  Power,
  Coffee,
  Navigation,
  MapPin,
  Clock,
  Users,
  Package,
  Check,
  X,
  Phone,
  MessageCircle,
  Play,
  Flag,
  ChevronRight,
  DollarSign,
  Star,
  Car,
  MessageSquare,
  TrendingUp,
  FileText,
  ShieldAlert,
  Wallet,
  Calendar,
  ArrowDownCircle,
  CheckCircle,
  AlertCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import StarRating from '../components/ui/StarRating';
import { Tabs, TabPanel } from '../components/ui/Tabs';
import { MessagingView } from '../components/messaging';
import InTripChatModal from '../components/messaging/InTripChatModal';
import CreateTicketModal from '../components/support/CreateTicketModal';
import PerformanceStats, { type PerformanceMetrics } from '../components/driver/PerformanceStats';
import NavigationButton from '../components/driver/NavigationButton';
import { SkeletonCardGrid, SkeletonCard } from '../components/ui/SkeletonLoader';
import EmptyState from '../components/ui/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { backend } from '../services/backend';
import { useWebSocket, useDriverLocationStream } from '../hooks/useWebSocket';
import { ChannelType, type BookingUpdatePayload } from '../services/websocket';
import type { Booking, DriverAvailabilityStatus, BookingStatus, DriverPayout } from '../types';

const statusLabels: Record<DriverAvailabilityStatus, string> = {
  offline: 'Offline',
  available: 'Available',
  on_trip: 'On Trip',
  on_break: 'On Break',
};

const statusColors: Record<DriverAvailabilityStatus, string> = {
  offline: 'bg-gray-500',
  available: 'bg-green-500',
  on_trip: 'bg-blue-500',
  on_break: 'bg-amber-500',
};

// Mock: available offers for this driver
interface DriverOffer {
  booking: Booking;
  expires_at: string;
  distance_km: number;
  estimated_duration_min: number;
}

type DashboardTab = 'jobs' | 'messages';

export default function DriverDashboard() {
  const { user } = useAuth();
  const [availability, setAvailability] = useState<DriverAvailabilityStatus>(
    (user as any)?.availability_status ?? 'offline'
  );
  const [activeTrip, setActiveTrip] = useState<Booking | null>(null);
  const [offers, setOffers] = useState<DriverOffer[]>([]);
  const [recentTrips, setRecentTrips] = useState<Booking[]>([]);
  const [earnings, setEarnings] = useState({ today: 0, week: 0 });
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>('jobs');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showPerformanceDetails, setShowPerformanceDetails] = useState(false);

  // Payout state
  const [payoutHistory, setPayoutHistory] = useState<DriverPayout[]>([]);
  const [nextPayoutInfo, setNextPayoutInfo] = useState<{
    nextPayoutDate: string;
    estimatedAmount: number;
    pendingTrips: number;
  } | null>(null);
  const [showPayoutHistory, setShowPayoutHistory] = useState(false);

  // Rating modal
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [tripToRate, setTripToRate] = useState<Booking | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

  // Offer countdown timers (booking_id -> seconds remaining)
  const [offerTimers, setOfferTimers] = useState<Record<string, number>>({});

  // Real-time notification state
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'warning' } | null>(null);

  // Chat modal for in-trip messaging
  const [showChatModal, setShowChatModal] = useState(false);

  // Support ticket modal for reporting issues
  const [showReportModal, setShowReportModal] = useState(false);

  // Flag to trigger data reload from WebSocket events
  const [shouldReload, setShouldReload] = useState(0);

  // Handle real-time booking updates (new offers, trip status changes)
  const handleBookingUpdate = useCallback((data: BookingUpdatePayload) => {
    // If it's a new booking request, add it to offers
    if (data.status === 'requested' && availability === 'available' && !activeTrip) {
      setShouldReload(prev => prev + 1);
      setNotification({ message: '🚗 New ride request available!', type: 'info' });
      setTimeout(() => setNotification(null), 5000);
    }
    
    // If the driver was assigned to a booking
    if (data.status === 'driver_assigned' && activeTrip?.booking_id === data.booking_id) {
      setShouldReload(prev => prev + 1);
    }
    
    // If the current trip status changed
    if (activeTrip?.booking_id === data.booking_id && data.status) {
      setShouldReload(prev => prev + 1);
    }
  }, [availability, activeTrip]);

  // WebSocket connection for real-time updates
  const { isConnected: wsConnected, joinRoom, leaveRoom } = useWebSocket({
    autoConnect: true,
    channels: [ChannelType.BOOKING, ChannelType.NOTIFICATION],
    onBookingUpdate: handleBookingUpdate,
    onNotification: (data) => {
      setNotification({ message: data.message, type: 'info' });
      setTimeout(() => setNotification(null), 5000);
    },
  });

  // Stream driver location when on an active trip
  const { error: locationError } = useDriverLocationStream({
    bookingId: activeTrip?.booking_id,
    interval: 5000, // Send location every 5 seconds
    enabled: !!activeTrip && ['driver_en_route_pickup', 'driver_arrived', 'in_progress'].includes(activeTrip.status),
  });

  // Join booking room when on active trip
  useEffect(() => {
    if (activeTrip && wsConnected) {
      const roomId = `booking:${activeTrip.booking_id}`;
      joinRoom(roomId);
      return () => {
        leaveRoom(roomId);
      };
    }
  }, [activeTrip, wsConnected, joinRoom, leaveRoom]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get all bookings for this driver
    const allBookings = await backend.getBookings(undefined, user.id);

    // Find active trip (driver_assigned, driver_en_route_pickup, driver_arrived, in_progress)
    const tripStatuses: BookingStatus[] = [
      'driver_assigned',
      'driver_en_route_pickup',
      'driver_arrived',
      'in_progress',
    ];
    const active = allBookings.find((b) => tripStatuses.includes(b.status));
    setActiveTrip(active ?? null);

    if (active) {
      setAvailability('on_trip');
    }

    // Get completed trips
    const completed = allBookings.filter((b) => b.status === 'completed');
    setRecentTrips(completed.slice(0, 5));

    // Calculate mock earnings
    const todayEarnings = completed
      .filter((b) => {
        const tripDate = new Date(b.created_at).toDateString();
        return tripDate === new Date().toDateString();
      })
      .reduce((sum, b) => sum + (b.price_breakdown?.driver_earnings?.amount ?? 0), 0);

    const weekEarnings = completed.reduce(
      (sum, b) => sum + (b.price_breakdown?.driver_earnings?.amount ?? 0),
      0
    );

    setEarnings({ today: todayEarnings, week: weekEarnings });

    // Load payout history and next payout info
    const [payouts, nextPayout] = await Promise.all([
      backend.getDriverPayouts(user.id),
      backend.getNextPayoutInfo(user.id),
    ]);
    setPayoutHistory(payouts);
    setNextPayoutInfo(nextPayout);

    // Load performance metrics
    const metrics = await backend.getDriverPerformanceMetrics(user.id);
    setPerformanceMetrics(metrics);

    // Simulate pending offers for available drivers
    if (availability === 'available' && !active) {
      // Find requested bookings not yet assigned
      const pendingBookings = allBookings.filter((b) => b.status === 'requested');
      const mockOffers: DriverOffer[] = pendingBookings.slice(0, 3).map((b) => ({
        booking: b,
        expires_at: new Date(Date.now() + 30000).toISOString(),
        distance_km: Math.round(Math.random() * 10 + 2),
        estimated_duration_min: Math.round(Math.random() * 30 + 10),
      }));
      setOffers(mockOffers);
    } else {
      setOffers([]);
    }

    setLoading(false);
  }, [user, availability]);

  useEffect(() => {
    loadData();
    loadUnreadCount();
  }, [loadData]);

  // Reload data when WebSocket triggers an update
  useEffect(() => {
    if (shouldReload > 0) {
      loadData();
    }
  }, [shouldReload, loadData]);

  // Offer countdown timer effect
  useEffect(() => {
    if (offers.length === 0) {
      setOfferTimers({});
      return;
    }

    // Initialize timers for new offers
    const now = Date.now();
    const initialTimers: Record<string, number> = {};
    offers.forEach((offer) => {
      const expiresAt = new Date(offer.expires_at).getTime();
      const secondsRemaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      initialTimers[offer.booking.booking_id] = secondsRemaining;
    });
    setOfferTimers(initialTimers);

    // Update countdown every second
    const interval = setInterval(() => {
      setOfferTimers((prev) => {
        const updated = { ...prev };
        let hasExpired = false;
        const expiredIds: string[] = [];

        Object.keys(updated).forEach((id) => {
          if (updated[id] > 0) {
            updated[id] -= 1;
          }
          if (updated[id] === 0) {
            hasExpired = true;
            expiredIds.push(id);
          }
        });

        // Auto-decline expired offers
        if (hasExpired) {
          setOffers((currentOffers) =>
            currentOffers.filter((o) => !expiredIds.includes(o.booking.booking_id))
          );
        }

        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [offers.length, offers.map((o) => o.booking.booking_id).join(',')]);

  const formatCountdown = (seconds: number): string => {
    if (seconds <= 0) return 'Expired';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const loadUnreadCount = async () => {
    if (!user) return;
    const chats = await backend.getChats(user.id);
    const totalUnread = chats.reduce((sum, chat) => sum + (chat.unread_count || 0), 0);
    setUnreadMessages(totalUnread);
  };

  const toggleOnline = async () => {
    if (!user) return;
    const newStatus: DriverAvailabilityStatus =
      availability === 'offline' ? 'available' : 'offline';
    await backend.updateDriverAvailability(user.id, newStatus);
    setAvailability(newStatus);
  };

  const goOnBreak = async () => {
    if (!user) return;
    await backend.updateDriverAvailability(user.id, 'on_break');
    setAvailability('on_break');
  };

  const acceptOffer = async (offer: DriverOffer) => {
    if (!user) return;
    await backend.updateBookingStatus(
      offer.booking.booking_id,
      'driver_assigned',
      user.id,
      'driver'
    );
    setOffers([]);
    setAvailability('on_trip');
    loadData();
  };

  const declineOffer = (offer: DriverOffer) => {
    setOffers((prev) => prev.filter((o) => o.booking.booking_id !== offer.booking.booking_id));
  };

  const advanceTripStatus = async () => {
    if (!activeTrip || !user) return;

    const statusProgression: Record<BookingStatus, BookingStatus | null> = {
      driver_assigned: 'driver_en_route_pickup',
      driver_en_route_pickup: 'driver_arrived',
      driver_arrived: 'in_progress',
      in_progress: 'completed',
      draft: null,
      requested: null,
      completed: null,
      canceled_by_client: null,
      canceled_by_driver: null,
      canceled_by_system: null,
      no_show_client: null,
      no_show_driver: null,
      disputed: null,
      refunded: null,
    };

    const nextStatus = statusProgression[activeTrip.status];
    if (!nextStatus) return;

    if (nextStatus === 'completed') {
      // Show rating modal before completing
      setTripToRate(activeTrip);
      setShowRatingModal(true);
      return;
    }

    await backend.updateBookingStatus(activeTrip.booking_id, nextStatus, user.id, 'driver');
    loadData();
  };

  const completeAndRate = async () => {
    if (!tripToRate || !user) return;
    await backend.updateBookingStatus(tripToRate.booking_id, 'completed', user.id, 'driver');
    await backend.rateBooking(tripToRate.booking_id, {
      from_role: 'driver',
      rating: ratingValue,
      comment: ratingComment || undefined,
    });
    setShowRatingModal(false);
    setTripToRate(null);
    setRatingValue(5);
    setRatingComment('');
    setActiveTrip(null);
    setAvailability('available');
    loadData();
  };

  const getTripActionLabel = (): string => {
    if (!activeTrip) return '';
    const labels: Partial<Record<BookingStatus, string>> = {
      driver_assigned: 'Start Navigation',
      driver_en_route_pickup: 'Arrived at Pickup',
      driver_arrived: 'Start Trip',
      in_progress: 'Complete Trip',
    };
    return labels[activeTrip.status] ?? 'Next';
  };

  const getTripActionIcon = () => {
    if (!activeTrip) return null;
    const icons: Partial<Record<BookingStatus, React.ReactNode>> = {
      driver_assigned: <Navigation size={18} />,
      driver_en_route_pickup: <MapPin size={18} />,
      driver_arrived: <Play size={18} />,
      in_progress: <Flag size={18} />,
    };
    return icons[activeTrip.status];
  };

  const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const tabs = [
    { id: 'jobs', label: 'Jobs', icon: <Car size={18} /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare size={18} />, badge: unreadMessages || undefined },
  ];

  const renderJobsTab = () => (
    <>
      {/* Availability Card */}
      <Card className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full ${statusColors[availability]} animate-pulse`} />
          <div>
            <h2 className="text-lg font-semibold">Availability</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Current status: <span className="font-medium">{statusLabels[availability]}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!activeTrip && (
            <>
              <Button
                variant={availability === 'available' ? 'success' : 'secondary'}
                onClick={toggleOnline}
              >
                <Power size={18} /> {availability === 'offline' ? 'Go Online' : 'Go Offline'}
              </Button>
              {availability === 'available' && (
                <Button variant="ghost" onClick={goOnBreak}>
                  <Coffee size={18} /> Break
                </Button>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Active Trip */}
      {activeTrip && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Navigation size={20} className="text-blue-500" /> Active Trip
          </h2>
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge status={activeTrip.status} />
              <span className="text-sm text-gray-400 font-mono">{activeTrip.booking_id}</span>
            </div>

            {/* Route */}
            <div className="space-y-3">
              {activeTrip.legs.map((leg, idx) => (
                <div key={leg.leg_id}>
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 mt-1.5 rounded-full bg-green-500" />
                    <div>
                      <p className="text-xs text-gray-400 uppercase">
                        {idx === 0 ? 'Pickup' : `Stop ${idx}`}
                      </p>
                      <p className="font-medium dark:text-white">{leg.pickup.address_line}</p>
                    </div>
                  </div>
                  {idx === activeTrip.legs.length - 1 && (
                    <div className="flex items-start gap-3 mt-3">
                      <div className="w-3 h-3 mt-1.5 rounded-full bg-red-500" />
                      <div>
                        <p className="text-xs text-gray-400 uppercase">Dropoff</p>
                        <p className="font-medium dark:text-white">{leg.dropoff.address_line}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Trip Details */}
            <div className="grid grid-cols-3 gap-4 text-center border-t border-gray-200 dark:border-slate-700 pt-4">
              <div>
                <Users size={16} className="mx-auto text-gray-400 mb-1" />
                <p className="text-sm font-medium">{activeTrip.passenger_count ?? 1}</p>
                <p className="text-xs text-gray-400">Passengers</p>
              </div>
              <div>
                <Package size={16} className="mx-auto text-gray-400 mb-1" />
                <p className="text-sm font-medium">{activeTrip.luggage_count ?? 0}</p>
                <p className="text-xs text-gray-400">Luggage</p>
              </div>
              <div>
                <DollarSign size={16} className="mx-auto text-gray-400 mb-1" />
                <p className="text-sm font-medium text-green-600">
                  {formatMoney(activeTrip.price_breakdown?.driver_earnings?.amount ?? 0)}
                </p>
                <p className="text-xs text-gray-400">Earnings</p>
              </div>
            </div>

            {/* Trip Notes */}
            {activeTrip.special_notes && (
              <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                  <FileText size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase mb-1">
                      Client Notes
                    </p>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      {activeTrip.special_notes}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Emergency Contact */}
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

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="secondary" className="flex-1 min-w-[80px]">
                <Phone size={16} /> Call
              </Button>
              <Button 
                variant="secondary" 
                className="flex-1 min-w-[80px]"
                onClick={() => setShowChatModal(true)}
              >
                <MessageCircle size={16} /> Chat
              </Button>
              <Button
                variant="ghost"
                className="text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                onClick={() => setShowReportModal(true)}
              >
                <AlertTriangle size={16} /> Report Issue
              </Button>
            </div>
            <div className="flex gap-2 pt-2">
              {activeTrip.legs[0] && (
                <NavigationButton
                  destination={
                    activeTrip.status === 'driver_assigned' || activeTrip.status === 'driver_en_route_pickup'
                      ? activeTrip.legs[0].pickup
                      : activeTrip.legs[0].dropoff
                  }
                  type={
                    activeTrip.status === 'driver_assigned' || activeTrip.status === 'driver_en_route_pickup'
                      ? 'pickup'
                      : 'dropoff'
                  }
                  variant="secondary"
                  className="flex-1"
                />
              )}
              <Button onClick={advanceTripStatus} className="flex-[2]">
                {getTripActionIcon()} {getTripActionLabel()}
              </Button>
            </div>
          </Card>
        </section>
      )}

      {/* New Offers */}
      {!activeTrip && (
        <section aria-labelledby="offers-heading">
          <h2 id="offers-heading" className="text-xl font-semibold mb-4">New Offers</h2>
          {loading ? (
            <SkeletonCardGrid count={2} variant="detailed" className="md:grid-cols-2" />
          ) : offers.length === 0 ? (
            <EmptyState
              type="noDrivers"
              title={availability === 'available' ? 'No offers yet' : 'You\'re offline'}
              description={
                availability === 'available'
                  ? 'Waiting for new booking offers...'
                  : 'Go online to receive booking offers.'
              }
              size="sm"
            />
          ) : (
            <div className="space-y-4">
              {offers.map((offer) => (
                <Card key={offer.booking.booking_id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge status={offer.booking.service_type as any} />
                      <span className="text-sm text-gray-400">{offer.distance_km} km away</span>
                    </div>
                    <span 
                      className={`text-xs font-medium flex items-center gap-1 ${
                        (offerTimers[offer.booking.booking_id] ?? 30) <= 10 
                          ? 'text-red-600 animate-pulse' 
                          : 'text-amber-600'
                      }`}
                    >
                      <Clock size={12} /> 
                      {formatCountdown(offerTimers[offer.booking.booking_id] ?? 30)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 mt-1.5 rounded-full bg-green-500" />
                      <p className="text-sm dark:text-white">
                        {offer.booking.legs[0]?.pickup.address_line}
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 mt-1.5 rounded-full bg-red-500" />
                      <p className="text-sm dark:text-white">
                        {offer.booking.legs[offer.booking.legs.length - 1]?.dropoff.address_line}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">
                      ~{offer.estimated_duration_min} min • {offer.booking.passenger_count ?? 1}{' '}
                      passengers
                    </span>
                    <span className="font-bold text-green-600 text-lg">
                      {formatMoney(offer.booking.price_breakdown?.driver_earnings?.amount ?? 0)}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="danger"
                      className="flex-1"
                      onClick={() => declineOffer(offer)}
                    >
                      <X size={16} /> Decline
                    </Button>
                    <Button
                      variant="success"
                      className="flex-[2]"
                      onClick={() => acceptOffer(offer)}
                    >
                      <Check size={16} /> Accept
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Earnings & Performance */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Earnings & Performance</h2>
          {performanceMetrics && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPerformanceDetails(!showPerformanceDetails)}
              className="flex items-center gap-1"
            >
              <TrendingUp size={16} />
              {showPerformanceDetails ? 'Hide Details' : 'View Details'}
            </Button>
          )}
        </div>
        
        {/* Earnings Cards */}
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5 mb-4">
          <Card>
            <p className="text-sm text-gray-500 dark:text-slate-400">Today</p>
            <p className="text-2xl font-bold text-green-600">{formatMoney(earnings.today)}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500 dark:text-slate-400">This Week</p>
            <p className="text-2xl font-bold text-green-600">{formatMoney(earnings.week)}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500 dark:text-slate-400">Rating</p>
            <div className="flex items-center gap-2">
              <Star size={20} className="text-yellow-500 fill-yellow-500" />
              <p className="text-2xl font-bold">
                {(user as any)?.rating_average?.toFixed(1) ?? '5.0'}
              </p>
            </div>
          </Card>
          {performanceMetrics && (
            <>
              <Card>
                <p className="text-sm text-gray-500 dark:text-slate-400">Accept Rate</p>
                <p className={`text-2xl font-bold ${performanceMetrics.acceptance_rate >= 85 ? 'text-green-600' : performanceMetrics.acceptance_rate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                  {performanceMetrics.acceptance_rate.toFixed(0)}%
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500 dark:text-slate-400">Total Trips</p>
                <p className="text-2xl font-bold text-blue-600">{performanceMetrics.total_trips}</p>
              </Card>
            </>
          )}
        </div>

        {/* Expanded Performance Details */}
        {showPerformanceDetails && performanceMetrics && (
          <PerformanceStats metrics={performanceMetrics} />
        )}

        {/* Next Payout Countdown */}
        {nextPayoutInfo && (
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-full">
                  <Wallet size={24} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Next Payout</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatMoney(nextPayoutInfo.estimatedAmount)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {nextPayoutInfo.pendingTrips} trips • {new Date(nextPayoutInfo.nextPayoutDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowPayoutHistory(true)}
                className="flex items-center gap-1"
              >
                <Calendar size={16} /> History
              </Button>
            </div>
          </Card>
        )}
      </section>

      {/* Recent Trips */}
      {recentTrips.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Recent Trips</h2>
          <div className="space-y-2">
            {recentTrips.map((trip) => (
              <Card
                key={trip.booking_id}
                className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate dark:text-white">
                    {trip.legs[0]?.pickup.address_line} →{' '}
                    {trip.legs[trip.legs.length - 1]?.dropoff.address_line}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(trip.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-green-600">
                    {formatMoney(trip.price_breakdown?.driver_earnings?.amount ?? 0)}
                  </span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </Card>
            ))}
          </div>
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
          <span>Connecting to dispatch...</span>
        </div>
      )}

      {/* Location streaming indicator */}
      {activeTrip && !locationError && ['driver_en_route_pickup', 'in_progress'].includes(activeTrip.status) && (
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-lg">
          <Navigation size={16} className="animate-pulse" />
          <span>Sharing location with passenger</span>
        </div>
      )}

      {locationError && (
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
          <AlertCircle size={16} />
          <span>Location unavailable - check GPS settings</span>
        </div>
      )}

      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as DashboardTab)}
      >
        <TabPanel id="jobs">
          {renderJobsTab()}
        </TabPanel>
        <TabPanel id="messages">
          {user && <MessagingView userId={user.id} userName={user.full_name} />}
        </TabPanel>
      </Tabs>

      {/* Rating Modal */}
      <Modal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        title="Rate Your Passenger"
        size="sm"
      >
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-gray-500 dark:text-slate-400 mb-4">
              How was your experience with this passenger?
            </p>
            <StarRating value={ratingValue} onChange={setRatingValue} size="lg" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">
              Comment (optional)
            </label>
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Share your experience..."
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowRatingModal(false)}
              className="flex-1"
            >
              Skip
            </Button>
            <Button variant="success" onClick={completeAndRate} className="flex-1">
              Complete Trip
            </Button>
          </div>
        </div>
      </Modal>

      {/* Payout History Modal */}
      <Modal
        isOpen={showPayoutHistory}
        onClose={() => setShowPayoutHistory(false)}
        title="Payout History"
        size="lg"
      >
        <div className="space-y-4">
          {payoutHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Wallet size={48} className="mx-auto mb-3 opacity-50" />
              <p>No payout history yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payoutHistory.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      payout.status === 'completed' ? 'bg-green-100 dark:bg-green-900/40' :
                      payout.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/40' :
                      payout.status === 'processing' ? 'bg-blue-100 dark:bg-blue-900/40' :
                      'bg-red-100 dark:bg-red-900/40'
                    }`}>
                      {payout.status === 'completed' ? (
                        <CheckCircle size={20} className="text-green-600" />
                      ) : payout.status === 'pending' ? (
                        <Clock size={20} className="text-amber-600" />
                      ) : payout.status === 'processing' ? (
                        <Loader2 size={20} className="text-blue-600 animate-spin" />
                      ) : (
                        <AlertCircle size={20} className="text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium dark:text-white">
                        {new Date(payout.period_start).toLocaleDateString()} - {new Date(payout.period_end).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {payout.trips_count} trips • {payout.payout_method}
                      </p>
                      {payout.reference_number && (
                        <p className="text-xs text-gray-400">Ref: {payout.reference_number}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      {formatMoney(payout.amount.amount)}
                    </p>
                    <Badge
                      variant={
                        payout.status === 'completed' ? 'success' :
                        payout.status === 'pending' ? 'warning' :
                        payout.status === 'processing' ? 'info' : 'danger'
                      }
                    >
                      {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Total Paid (Last 30 days)</span>
              <span className="font-bold text-green-600">
                {formatMoney(
                  payoutHistory
                    .filter((p) => p.status === 'completed')
                    .reduce((sum, p) => sum + p.amount.amount, 0)
                )}
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* In-Trip Chat Modal */}
      {activeTrip && (
        <InTripChatModal
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
          booking={activeTrip}
          otherPartyName="Client"
        />
      )}

      {/* Report Issue Modal */}
      {activeTrip && (
        <CreateTicketModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          booking={activeTrip}
          defaultCategory="trip_issue"
          defaultSubject={`Issue during trip #${activeTrip.booking_id}`}
        />
      )}
    </div>
  );
}
