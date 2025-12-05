/**
 * Seryvo Platform - Trip Timeline View Component
 * Displays full booking history with all timeline events for Support agents
 */

import { useMemo } from 'react';
import {
  Clock,
  Car,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Navigation,
  Flag,
  DollarSign,
  Star,
  RefreshCw,
} from 'lucide-react';
import Badge from '../ui/Badge';
import type { Booking, BookingStatus, Role } from '../../types';

// =============================================================================
// Types
// =============================================================================

interface TripTimelineViewProps {
  /** The booking to display timeline for */
  booking: Booking;
  /** Whether to show expanded details */
  expanded?: boolean;
  /** Custom class name */
  className?: string;
}

interface TimelineEventConfig {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  label: string;
}

// =============================================================================
// Event Configurations
// =============================================================================

const EVENT_CONFIG: Record<BookingStatus, TimelineEventConfig> = {
  draft: {
    icon: <RefreshCw className="w-4 h-4" />,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    label: 'Booking Created (Draft)',
  },
  requested: {
    icon: <Clock className="w-4 h-4" />,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Booking Requested',
  },
  driver_assigned: {
    icon: <Car className="w-4 h-4" />,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    label: 'Driver Assigned',
  },
  driver_en_route_pickup: {
    icon: <Navigation className="w-4 h-4" />,
    color: 'text-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    label: 'Driver En Route to Pickup',
  },
  driver_arrived: {
    icon: <MapPin className="w-4 h-4" />,
    color: 'text-amber-500',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    label: 'Driver Arrived at Pickup',
  },
  in_progress: {
    icon: <Flag className="w-4 h-4" />,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    label: 'Trip In Progress',
  },
  completed: {
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'text-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    label: 'Trip Completed',
  },
  canceled_by_client: {
    icon: <XCircle className="w-4 h-4" />,
    color: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    label: 'Canceled by Client',
  },
  canceled_by_driver: {
    icon: <XCircle className="w-4 h-4" />,
    color: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    label: 'Canceled by Driver',
  },
  canceled_by_system: {
    icon: <XCircle className="w-4 h-4" />,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    label: 'Canceled by System',
  },
  no_show_client: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-orange-500',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    label: 'No Show - Client',
  },
  no_show_driver: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-orange-500',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    label: 'No Show - Driver',
  },
  disputed: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    label: 'Disputed',
  },
  refunded: {
    icon: <DollarSign className="w-4 h-4" />,
    color: 'text-teal-500',
    bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    label: 'Refunded',
  },
};

const ROLE_LABELS: Record<Role, string> = {
  client: 'Client',
  driver: 'Driver',
  support_agent: 'Support',
  admin: 'Admin',
};

// =============================================================================
// Component
// =============================================================================

export default function TripTimelineView({
  booking,
  expanded = true,
  className = '',
}: TripTimelineViewProps) {
  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate duration between events
  const getDuration = (start: string, end: string) => {
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) {
      return `${diffMins} min`;
    }
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  // Sort timeline events by occurred_at
  const sortedEvents = useMemo(() => {
    return [...booking.timeline].sort(
      (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
    );
  }, [booking.timeline]);

  // Get trip summary stats
  const stats = useMemo(() => {
    const firstEvent = sortedEvents[0];
    const lastEvent = sortedEvents[sortedEvents.length - 1];
    
    const pickupEvent = sortedEvents.find(e => e.status === 'driver_arrived');
    const startEvent = sortedEvents.find(e => e.status === 'in_progress');
    const endEvent = sortedEvents.find(e => e.status === 'completed');
    
    return {
      totalDuration: firstEvent && lastEvent ? getDuration(firstEvent.occurred_at, lastEvent.occurred_at) : 'N/A',
      waitTime: pickupEvent && startEvent ? getDuration(pickupEvent.occurred_at, startEvent.occurred_at) : null,
      tripDuration: startEvent && endEvent ? getDuration(startEvent.occurred_at, endEvent.occurred_at) : null,
      eventsCount: sortedEvents.length,
    };
  }, [sortedEvents]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Trip Timeline
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Booking #{booking.booking_id.slice(0, 8)}
          </p>
        </div>
        <Badge status={booking.status} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Duration</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{stats.totalDuration}</p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Wait Time</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{stats.waitTime ?? 'N/A'}</p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Trip Duration</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{stats.tripDuration ?? 'N/A'}</p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Events</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{stats.eventsCount}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-gray-200 dark:bg-slate-700" />

        {/* Events */}
        <div className="space-y-4">
          {sortedEvents.map((event, index) => {
            const config = EVENT_CONFIG[event.status];
            const isLast = index === sortedEvents.length - 1;
            const nextEvent = sortedEvents[index + 1];

            return (
              <div key={event.event_id} className="relative flex gap-4">
                {/* Icon */}
                <div
                  className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.bgColor} ${config.color}`}
                >
                  {config.icon}
                </div>

                {/* Content */}
                <div className="flex-1 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {config.label}
                      </p>
                      {event.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                          {event.description}
                        </p>
                      )}
                      {event.actor_role && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          By: {ROLE_LABELS[event.actor_role]}
                          {event.actor_id && ` (${event.actor_id.slice(0, 8)})`}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {formatTime(event.occurred_at)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(event.occurred_at)}
                      </p>
                    </div>
                  </div>

                  {/* Duration to next event */}
                  {nextEvent && !isLast && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {getDuration(event.occurred_at, nextEvent.occurred_at)} until next event
                    </div>
                  )}

                  {/* Metadata */}
                  {expanded && event.metadata && Object.keys(event.metadata).length > 0 && (
                    <div className="mt-2 p-2 bg-gray-50 dark:bg-slate-800 rounded text-xs">
                      <p className="font-medium text-gray-600 dark:text-gray-400 mb-1">Event Data:</p>
                      <pre className="text-gray-500 dark:text-gray-500 overflow-x-auto">
                        {JSON.stringify(event.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trip Details Summary */}
      <div className="border-t border-gray-200 dark:border-slate-700 pt-4 mt-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Trip Details
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Pickup</p>
            <p className="text-gray-900 dark:text-white">
              {booking.legs[0]?.pickup.address_line ?? 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Dropoff</p>
            <p className="text-gray-900 dark:text-white">
              {booking.legs[0]?.dropoff.address_line ?? 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Passengers</p>
            <p className="text-gray-900 dark:text-white">{booking.passenger_count ?? 1}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Service Type</p>
            <p className="text-gray-900 dark:text-white capitalize">{booking.service_type}</p>
          </div>
          {booking.price_breakdown && (
            <>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Total Fare</p>
                <p className="text-gray-900 dark:text-white font-medium">
                  ${(booking.price_breakdown.grand_total.amount / 100).toFixed(2)}
                </p>
              </div>
              {booking.price_breakdown.driver_earnings && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Driver Earnings</p>
                  <p className="text-gray-900 dark:text-white">
                    ${(booking.price_breakdown.driver_earnings.amount / 100).toFixed(2)}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Rating */}
        {booking.client_rating_value && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span className="font-medium text-amber-700 dark:text-amber-400">
                {booking.client_rating_value.toFixed(1)} / 5.0
              </span>
            </div>
            {booking.client_feedback_text && (
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                &ldquo;{booking.client_feedback_text}&rdquo;
              </p>
            )}
          </div>
        )}

        {/* Special Notes */}
        {booking.special_notes && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
              Special Notes
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {booking.special_notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
