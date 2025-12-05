import React, { useState, lazy, Suspense } from 'react';
import {
  MapPin,
  Calendar,
  Clock,
  User,
  Car,
  DollarSign,
  Star,
  Phone,
  MessageCircle,
  CheckCircle,
  Circle,
  ChevronRight,
  Navigation,
  Flag,
  AlertCircle,
  Receipt,
  Download,
  Printer,
  FileText,
  Map,
} from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { generateReceiptPDF, generateInvoicePDF } from '../utils/pdfGenerator';
import { useDriverTracking } from '../hooks/useDriverTracking';
import type { Booking, BookingTimelineEvent, BookingStatus } from '../types';

// Lazy load the map component to reduce initial bundle size
const LiveDriverMap = lazy(() => import('./map/LiveDriverMap'));

interface TripDetailsModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onChat?: () => void;
  onCall?: () => void;
  userRole?: 'client' | 'driver' | 'support_agent' | 'admin';
}

const statusSteps: { status: BookingStatus; label: string; icon: React.ReactNode }[] = [
  { status: 'requested', label: 'Requested', icon: <Circle size={16} /> },
  { status: 'driver_assigned', label: 'Driver Assigned', icon: <User size={16} /> },
  { status: 'driver_en_route_pickup', label: 'En Route', icon: <Navigation size={16} /> },
  { status: 'driver_arrived', label: 'Arrived', icon: <MapPin size={16} /> },
  { status: 'in_progress', label: 'In Progress', icon: <Car size={16} /> },
  { status: 'completed', label: 'Completed', icon: <CheckCircle size={16} /> },
];

const getStatusIndex = (status: BookingStatus): number => {
  const idx = statusSteps.findIndex((s) => s.status === status);
  return idx === -1 ? 0 : idx;
};

// Check if a booking status is "active" (driver is en route or in progress)
const isTrackableStatus = (status: BookingStatus): boolean => {
  return ['driver_en_route_pickup', 'driver_arrived', 'in_progress'].includes(status);
};

export default function TripDetailsModal({
  booking,
  isOpen,
  onClose,
  onChat,
  onCall,
  userRole = 'client',
}: TripDetailsModalProps) {
  const [showReceipt, setShowReceipt] = useState(false);
  const [showMap, setShowMap] = useState(true);

  // Track driver location for active trips (client view)
  const { driverLocation, isTracking } = useDriverTracking({
    bookingId: booking?.booking_id || '',
    enabled: !!booking && isTrackableStatus(booking.status) && userRole === 'client' && showMap,
  });

  if (!booking) return null;

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string): string => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMoney = (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const currentStatusIndex = getStatusIndex(booking.status);
  const isCompleted = booking.status === 'completed';
  const isCancelled = ['canceled_by_client', 'canceled_by_driver', 'canceled_by_system'].includes(booking.status);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Trip Details" size="lg">
      <div className="space-y-6 -mx-6 px-6 max-h-[70vh] overflow-y-auto">
        {/* Header with Status */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Booking ID</p>
            <p className="font-mono font-medium text-gray-900 dark:text-white">
              {booking.booking_id}
            </p>
          </div>
          <Badge status={booking.status} />
        </div>

        {/* Status Progress (for active trips) */}
        {!isCompleted && !isCancelled && (
          <div className="relative">
            <div className="flex items-center justify-between">
              {statusSteps.slice(0, 6).map((step, idx) => {
                const isActive = idx <= currentStatusIndex;
                const isCurrent = idx === currentStatusIndex;

                return (
                  <div key={step.status} className="flex flex-col items-center flex-1">
                    <div
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center transition-colors
                        ${isCurrent 
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900' 
                          : isActive 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                        }
                      `}
                    >
                      {step.icon}
                    </div>
                    <p
                      className={`text-xs mt-2 text-center ${
                        isActive ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
            {/* Progress Line */}
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 dark:bg-gray-700 -z-10">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${(currentStatusIndex / 5) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Live Map for Active Trips */}
        {!isCompleted && !isCancelled && isTrackableStatus(booking.status) && userRole === 'client' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                <Map size={16} />
                Live Tracking
                {isTracking && (
                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-normal normal-case">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Live
                  </span>
                )}
              </h3>
              <button
                onClick={() => setShowMap(!showMap)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showMap ? 'Hide map' : 'Show map'}
              </button>
            </div>
            {showMap && (
              <Suspense fallback={
                <div className="h-64 bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                  <div className="text-gray-500 dark:text-slate-400">Loading map...</div>
                </div>
              }>
                <LiveDriverMap
                  pickup={booking.legs[0]?.pickup || { address_line: 'Pickup' }}
                  dropoff={booking.legs[booking.legs.length - 1]?.dropoff || { address_line: 'Dropoff' }}
                  stops={booking.legs.slice(1).map(leg => leg.pickup)}
                  driverLocation={driverLocation ? {
                    lat: driverLocation.lat,
                    lng: driverLocation.lng,
                    heading: driverLocation.heading,
                    speed: driverLocation.speed,
                    lastUpdate: driverLocation.lastUpdate.toISOString(),
                  } : undefined}
                  height="300px"
                />
              </Suspense>
            )}
          </div>
        )}

        {/* Cancelled Notice */}
        {isCancelled && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertCircle className="text-red-500" size={24} />
            <div>
              <p className="font-medium text-red-800 dark:text-red-300">Trip Cancelled</p>
              <p className="text-sm text-red-600 dark:text-red-400">
                {booking.status === 'canceled_by_client' && 'Cancelled by the client'}
                {booking.status === 'canceled_by_driver' && 'Cancelled by the driver'}
                {booking.status === 'canceled_by_system' && 'Cancelled by the system'}
              </p>
            </div>
          </div>
        )}

        {/* Route */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Route
          </h3>
          <div className="space-y-3">
            {booking.legs.map((leg, idx) => (
              <div key={leg.leg_id}>
                {/* Pickup */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <div className="w-0.5 h-12 bg-gray-300 dark:bg-gray-600" />
                  </div>
                  <div className="flex-1 pb-6">
                    <p className="text-xs text-gray-400 uppercase">
                      {idx === 0 ? 'Pickup' : `Stop ${idx}`}
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {leg.pickup.address_line}
                    </p>
                  </div>
                </div>

                {/* Dropoff (only for last leg) */}
                {idx === booking.legs.length - 1 && (
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 uppercase">Dropoff</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {leg.dropoff.address_line}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Trip Details Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Date & Time */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Calendar size={20} className="text-blue-500 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Date & Time</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatDate(booking.created_at)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {booking.requested_pickup_at 
                  ? `Scheduled: ${formatTime(booking.requested_pickup_at)}`
                  : 'ASAP Request'
                }
              </p>
            </div>
          </div>

          {/* Service Type */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Car size={20} className="text-blue-500 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Service</p>
              <p className="font-medium text-gray-900 dark:text-white capitalize">
                {booking.service_type}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {booking.passenger_count || 1} passenger{(booking.passenger_count || 1) > 1 ? 's' : ''}
                {booking.luggage_count ? `, ${booking.luggage_count} luggage` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Price Breakdown */}
        {booking.price_breakdown && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Fare Details
            </h3>
            <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Base Fare</span>
                <span className="text-gray-900 dark:text-white">
                  {formatMoney(booking.price_breakdown.base_fare.amount)}
                </span>
              </div>
              {booking.price_breakdown.distance_fare && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Distance</span>
                  <span className="text-gray-900 dark:text-white">
                    {formatMoney(booking.price_breakdown.distance_fare.amount)}
                  </span>
                </div>
              )}
              {booking.price_breakdown.extras_total && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Extras</span>
                  <span className="text-gray-900 dark:text-white">
                    {formatMoney(booking.price_breakdown.extras_total.amount)}
                  </span>
                </div>
              )}
              {booking.price_breakdown.tax_total && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Tax</span>
                  <span className="text-gray-900 dark:text-white">
                    {formatMoney(booking.price_breakdown.tax_total.amount)}
                  </span>
                </div>
              )}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <div className="flex justify-between font-semibold">
                  <span className="text-gray-900 dark:text-white">Total</span>
                  <span className="text-green-600">
                    {formatMoney(booking.price_breakdown.grand_total.amount)}
                  </span>
                </div>
              </div>
              {/* Driver earnings (visible to drivers and admin) */}
              {(userRole === 'driver' || userRole === 'admin') && booking.price_breakdown.driver_earnings && (
                <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Driver Earnings</span>
                  <span className="text-green-600 font-medium">
                    {formatMoney(booking.price_breakdown.driver_earnings.amount)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rating (for completed trips) */}
        {isCompleted && booking.client_rating_value && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Rating
            </h3>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Star size={20} className="text-yellow-500 fill-yellow-500" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Your Rating</p>
                <div className="flex items-center gap-1">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {booking.client_rating_value}
                  </span>
                  <span className="text-yellow-500">
                    {'★'.repeat(booking.client_rating_value)}
                    {'☆'.repeat(5 - booking.client_rating_value)}
                  </span>
                </div>
                {booking.client_feedback_text && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    "{booking.client_feedback_text}"
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Special Notes */}
        {booking.special_notes && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Special Notes
            </h3>
            <p className="text-gray-700 dark:text-gray-300 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              {booking.special_notes}
            </p>
          </div>
        )}

        {/* Timeline */}
        {booking.timeline && booking.timeline.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Timeline
            </h3>
            <div className="space-y-3">
              {booking.timeline.map((event, idx) => (
                <div key={event.event_id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                    {idx < booking.timeline!.length - 1 && (
                      <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700" />
                    )}
                  </div>
                  <div className="flex-1 pb-3">
                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                      {event.status.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatTime(event.occurred_at)} • {formatDate(event.occurred_at)}
                    </p>
                    {event.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 -mx-6 px-6">
        <Button variant="secondary" onClick={onClose} className="flex-1">
          Close
        </Button>
        {isCompleted && booking.price_breakdown && (
          <Button variant="secondary" onClick={() => setShowReceipt(true)} className="flex-1">
            <Receipt size={18} /> Receipt
          </Button>
        )}
        {onChat && !isCompleted && !isCancelled && (
          <Button variant="secondary" onClick={onChat} className="flex-1">
            <MessageCircle size={18} /> Chat
          </Button>
        )}
        {onCall && !isCompleted && !isCancelled && (
          <Button onClick={onCall} className="flex-1">
            <Phone size={18} /> Call
          </Button>
        )}
      </div>

      {/* Receipt Modal */}
      <Modal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        title="Trip Receipt"
        size="md"
      >
        {booking.price_breakdown && (
          <div className="space-y-6">
            {/* Receipt Header */}
            <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-4">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle size={24} className="text-green-600" />
              </div>
              <h3 className="text-lg font-semibold dark:text-white">Trip Completed</h3>
              <p className="text-sm text-gray-500">
                {booking.completed_at && formatDate(booking.completed_at)}
              </p>
              <p className="text-xs font-mono text-gray-400 mt-1">
                #{booking.booking_id}
              </p>
            </div>

            {/* Route Summary */}
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 mt-1.5 rounded-full bg-green-500" />
                <div>
                  <p className="text-xs text-gray-400">Pickup</p>
                  <p className="text-sm font-medium dark:text-white">
                    {booking.legs[0]?.pickup.address_line}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 mt-1.5 rounded-full bg-red-500" />
                <div>
                  <p className="text-xs text-gray-400">Dropoff</p>
                  <p className="text-sm font-medium dark:text-white">
                    {booking.legs[booking.legs.length - 1]?.dropoff.address_line}
                  </p>
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Base Fare</span>
                <span className="dark:text-white">{formatMoney(booking.price_breakdown.base_fare.amount)}</span>
              </div>
              {booking.price_breakdown.distance_fare && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Distance</span>
                  <span className="dark:text-white">{formatMoney(booking.price_breakdown.distance_fare.amount)}</span>
                </div>
              )}
              {booking.price_breakdown.time_fare && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Time</span>
                  <span className="dark:text-white">{formatMoney(booking.price_breakdown.time_fare.amount)}</span>
                </div>
              )}
              {booking.price_breakdown.extras_total && booking.price_breakdown.extras_total.amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Extras</span>
                  <span className="dark:text-white">{formatMoney(booking.price_breakdown.extras_total.amount)}</span>
                </div>
              )}
              {booking.price_breakdown.discount_total && booking.price_breakdown.discount_total.amount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatMoney(booking.price_breakdown.discount_total.amount)}</span>
                </div>
              )}
              {booking.price_breakdown.tax_total && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax</span>
                  <span className="dark:text-white">{formatMoney(booking.price_breakdown.tax_total.amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="dark:text-white">Total</span>
                <span className="text-green-600">{formatMoney(booking.price_breakdown.grand_total.amount)}</span>
              </div>
            </div>

            {/* Service Info */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">Service Type</span>
                <span className="dark:text-white capitalize">{booking.service_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Method</span>
                <span className="dark:text-white">Card ending ****4242</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => generateReceiptPDF(booking)}
              >
                <Download size={16} /> Receipt
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => generateInvoicePDF(booking)}
              >
                <FileText size={16} /> Invoice
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => window.print()}
              >
                <Printer size={16} /> Print
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Modal>
  );
}
