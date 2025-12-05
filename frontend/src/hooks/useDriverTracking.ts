/**
 * Seryvo Platform - useDriverTracking Hook
 * Hook for tracking driver location in real-time for a specific booking
 */

import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { ChannelType, type DriverLocationPayload } from '../services/websocket';

export interface DriverTrackingState {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  lastUpdate: Date;
}

export interface UseDriverTrackingOptions {
  bookingId: string;
  enabled?: boolean;
  onLocationUpdate?: (location: DriverTrackingState) => void;
}

export interface UseDriverTrackingReturn {
  driverLocation: DriverTrackingState | null;
  isConnected: boolean;
  isTracking: boolean;
  error: string | null;
}

export function useDriverTracking(options: UseDriverTrackingOptions): UseDriverTrackingReturn {
  const { bookingId, enabled = true, onLocationUpdate } = options;
  const [driverLocation, setDriverLocation] = useState<DriverTrackingState | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle incoming driver location updates
  const handleDriverLocation = useCallback(
    (data: DriverLocationPayload) => {
      const newLocation: DriverTrackingState = {
        lat: data.lat,
        lng: data.lng,
        heading: data.heading,
        speed: data.speed,
        lastUpdate: new Date(),
      };

      setDriverLocation(newLocation);
      setIsTracking(true);
      setError(null);
      onLocationUpdate?.(newLocation);
    },
    [onLocationUpdate]
  );

  // WebSocket connection
  const { isConnected, joinRoom, leaveRoom } = useWebSocket({
    autoConnect: enabled,
    channels: [ChannelType.DRIVER_LOCATION],
    onDriverLocation: handleDriverLocation,
    onDisconnect: () => {
      setIsTracking(false);
    },
  });

  // Join booking room when enabled
  useEffect(() => {
    if (enabled && isConnected && bookingId) {
      const roomId = `booking:${bookingId}`;
      joinRoom(roomId);
      setError(null);

      return () => {
        leaveRoom(roomId);
        setIsTracking(false);
      };
    }
  }, [enabled, isConnected, bookingId, joinRoom, leaveRoom]);

  // Check for stale location data (no update in 30 seconds)
  useEffect(() => {
    if (!isTracking || !driverLocation) return;

    const checkStale = setInterval(() => {
      const now = new Date();
      const elapsed = now.getTime() - driverLocation.lastUpdate.getTime();

      if (elapsed > 30000) {
        setError('Driver location may be outdated');
      }
    }, 10000);

    return () => clearInterval(checkStale);
  }, [isTracking, driverLocation]);

  return {
    driverLocation,
    isConnected,
    isTracking,
    error,
  };
}

export default useDriverTracking;
