/**
 * Seryvo Platform - useWebSocket Hook
 * React hook for WebSocket connection management and real-time updates
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  wsService,
  MessageType,
  ChannelType,
  DriverLocationPayload,
  ChatMessagePayload,
  BookingUpdatePayload,
  NotificationPayload,
} from '../services/websocket';

// =============================================================================
// Types
// =============================================================================

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  channels?: ChannelType[];
  rooms?: string[];
  onBookingUpdate?: (data: BookingUpdatePayload) => void;
  onDriverLocation?: (data: DriverLocationPayload) => void;
  onChatMessage?: (data: ChatMessagePayload) => void;
  onNotification?: (data: NotificationPayload) => void;
  onConnect?: () => void;
  onDisconnect?: (reason?: string) => void;
  onError?: (error: Event) => void;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribe: (channel: ChannelType, roomId?: string) => void;
  unsubscribe: (channel: ChannelType, roomId?: string) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  sendDriverLocation: (lat: number, lng: number, heading?: number, speed?: number, bookingRoomId?: string) => void;
  sendChatMessage: (roomId: string, message: string) => void;
  sendTypingIndicator: (roomId: string, isTyping: boolean) => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    autoConnect = true,
    channels = [],
    rooms = [],
    onBookingUpdate,
    onDriverLocation,
    onChatMessage,
    onNotification,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const { user } = useAuth();
  // Initialize with current WebSocket state
  const [isConnected, setIsConnected] = useState(() => wsService.isConnected());
  const cleanupRef = useRef<(() => void)[]>([]);

  // Token storage key (must match api.ts)
  const ACCESS_TOKEN_KEY = 'seryvo_access_token';

  // Get token from localStorage
  const getToken = useCallback((): string | null => {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }, []);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    const token = getToken();
    if (!token) {
      console.warn('[useWebSocket] No token available');
      return;
    }

    try {
      await wsService.connect(token);
    } catch (error) {
      console.error('[useWebSocket] Connection failed:', error);
    }
  }, [getToken]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    wsService.disconnect();
  }, []);

  // Subscribe to channel
  const subscribe = useCallback((channel: ChannelType, roomId?: string) => {
    wsService.subscribe(channel, roomId);
  }, []);

  // Unsubscribe from channel
  const unsubscribe = useCallback((channel: ChannelType, roomId?: string) => {
    wsService.unsubscribe(channel, roomId);
  }, []);

  // Join room
  const joinRoom = useCallback((roomId: string) => {
    wsService.joinRoom(roomId);
  }, []);

  // Leave room
  const leaveRoom = useCallback((roomId: string) => {
    wsService.leaveRoom(roomId);
  }, []);

  // Send driver location
  const sendDriverLocation = useCallback(
    (lat: number, lng: number, heading?: number, speed?: number, bookingRoomId?: string) => {
      wsService.sendDriverLocation(lat, lng, heading, speed, bookingRoomId);
    },
    []
  );

  // Send chat message
  const sendChatMessage = useCallback((roomId: string, message: string) => {
    wsService.sendChatMessage(roomId, message);
  }, []);

  // Send typing indicator
  const sendTypingIndicator = useCallback((roomId: string, isTyping: boolean) => {
    wsService.sendTypingIndicator(roomId, isTyping);
  }, []);

  // Setup event listeners
  useEffect(() => {
    // Sync initial state in case connection happened before hook mounted
    setIsConnected(wsService.isConnected());
    
    // Connection state handlers
    const unsubConnect = wsService.onConnect(() => {
      setIsConnected(true);
      onConnect?.();
    });
    cleanupRef.current.push(unsubConnect);

    const unsubDisconnect = wsService.onDisconnect((reason) => {
      setIsConnected(false);
      onDisconnect?.(reason);
    });
    cleanupRef.current.push(unsubDisconnect);

    const unsubError = wsService.onError((error) => {
      onError?.(error);
    });
    cleanupRef.current.push(unsubError);

    // Message type handlers
    if (onBookingUpdate) {
      const unsubBookingCreated = wsService.onMessage<BookingUpdatePayload>(
        MessageType.BOOKING_CREATED,
        (msg) => onBookingUpdate(msg.payload)
      );
      const unsubBookingUpdated = wsService.onMessage<BookingUpdatePayload>(
        MessageType.BOOKING_UPDATED,
        (msg) => onBookingUpdate(msg.payload)
      );
      const unsubBookingStatus = wsService.onMessage<BookingUpdatePayload>(
        MessageType.BOOKING_STATUS_CHANGED,
        (msg) => onBookingUpdate(msg.payload)
      );
      const unsubBookingCancelled = wsService.onMessage<BookingUpdatePayload>(
        MessageType.BOOKING_CANCELLED,
        (msg) => onBookingUpdate(msg.payload)
      );
      const unsubDriverAssigned = wsService.onMessage<BookingUpdatePayload>(
        MessageType.DRIVER_ASSIGNED,
        (msg) => onBookingUpdate(msg.payload)
      );
      const unsubDriverArrived = wsService.onMessage<BookingUpdatePayload>(
        MessageType.DRIVER_ARRIVED,
        (msg) => onBookingUpdate(msg.payload)
      );
      cleanupRef.current.push(
        unsubBookingCreated,
        unsubBookingUpdated,
        unsubBookingStatus,
        unsubBookingCancelled,
        unsubDriverAssigned,
        unsubDriverArrived
      );
    }

    if (onDriverLocation) {
      const unsubLocation = wsService.onMessage<DriverLocationPayload>(
        MessageType.DRIVER_LOCATION_UPDATE,
        (msg) => onDriverLocation(msg.payload)
      );
      cleanupRef.current.push(unsubLocation);
    }

    if (onChatMessage) {
      const unsubChat = wsService.onMessage<ChatMessagePayload>(
        MessageType.CHAT_MESSAGE,
        (msg) => onChatMessage(msg.payload)
      );
      cleanupRef.current.push(unsubChat);
    }

    if (onNotification) {
      const unsubNotification = wsService.onMessage<NotificationPayload>(
        MessageType.NOTIFICATION_NEW,
        (msg) => onNotification(msg.payload)
      );
      cleanupRef.current.push(unsubNotification);
    }

    // Cleanup on unmount
    return () => {
      cleanupRef.current.forEach((cleanup) => cleanup());
      cleanupRef.current = [];
    };
  }, [onBookingUpdate, onDriverLocation, onChatMessage, onNotification, onConnect, onDisconnect, onError]);

  // Auto-connect when authenticated
  useEffect(() => {
    if (autoConnect && user) {
      connect();

      // Subscribe to specified channels after connection
      const subscribeToChannels = () => {
        channels.forEach((channel) => subscribe(channel));
        rooms.forEach((room) => joinRoom(room));
      };

      // Add one-time connection handler for subscriptions
      const unsubConnect = wsService.onConnect(subscribeToChannels);

      // If already connected, subscribe immediately
      if (wsService.isConnected()) {
        subscribeToChannels();
      }

      return () => {
        unsubConnect();
      };
    }
  }, [autoConnect, user, connect, channels, rooms, subscribe, joinRoom]);

  // Disconnect when user logs out
  useEffect(() => {
    if (!user) {
      disconnect();
    }
  }, [user, disconnect]);

  return {
    isConnected,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    joinRoom,
    leaveRoom,
    sendDriverLocation,
    sendChatMessage,
    sendTypingIndicator,
  };
}

// =============================================================================
// Specialized Hooks
// =============================================================================

/**
 * Hook for driver location tracking
 * Automatically streams driver location when active
 */
export function useDriverLocationStream(options: {
  bookingId?: string;
  interval?: number;
  enabled?: boolean;
}) {
  const { bookingId, interval = 5000, enabled = true } = options;
  const { sendDriverLocation, isConnected } = useWebSocket({ autoConnect: true });
  const [lastLocation, setLastLocation] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || !isConnected) {
      return;
    }

    // Watch position
    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setLastLocation(position);
          setError(null);
        },
        (err) => {
          setError(err);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000,
        }
      );

      // Send location updates at interval
      intervalRef.current = setInterval(() => {
        if (lastLocation) {
          const roomId = bookingId ? `booking:${bookingId}` : undefined;
          sendDriverLocation(
            lastLocation.coords.latitude,
            lastLocation.coords.longitude,
            lastLocation.coords.heading ?? undefined,
            lastLocation.coords.speed ?? undefined,
            roomId
          );
        }
      }, interval);
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, isConnected, bookingId, interval, sendDriverLocation, lastLocation]);

  return { lastLocation, error };
}

/**
 * Hook for booking status updates
 */
export function useBookingUpdates(
  bookingId: string | undefined,
  onUpdate?: (data: BookingUpdatePayload) => void
) {
  const { joinRoom, leaveRoom, isConnected } = useWebSocket({
    autoConnect: true,
    onBookingUpdate: onUpdate,
  });

  useEffect(() => {
    if (bookingId && isConnected) {
      const roomId = `booking:${bookingId}`;
      joinRoom(roomId);

      return () => {
        leaveRoom(roomId);
      };
    }
  }, [bookingId, isConnected, joinRoom, leaveRoom]);

  return { isConnected };
}

/**
 * Hook for chat room
 */
export function useChatRoom(
  roomId: string | undefined,
  onMessage?: (data: ChatMessagePayload) => void
) {
  const [isTyping, setIsTyping] = useState<Map<string, boolean>>(new Map());
  const { joinRoom, leaveRoom, sendChatMessage, sendTypingIndicator, isConnected } = useWebSocket({
    autoConnect: true,
    onChatMessage: onMessage,
  });

  // Handle typing indicators
  useEffect(() => {
    if (!roomId) return;

    const unsubTyping = wsService.onMessage<{ sender_id: string; is_typing: boolean; room_id: string }>(
      MessageType.CHAT_TYPING,
      (msg) => {
        if (msg.payload.room_id === roomId) {
          setIsTyping((prev) => {
            const next = new Map(prev);
            if (msg.payload.is_typing) {
              next.set(msg.payload.sender_id, true);
            } else {
              next.delete(msg.payload.sender_id);
            }
            return next;
          });
        }
      }
    );

    return () => {
      unsubTyping();
    };
  }, [roomId]);

  // Join/leave room
  useEffect(() => {
    if (roomId && isConnected) {
      joinRoom(roomId);

      return () => {
        leaveRoom(roomId);
      };
    }
  }, [roomId, isConnected, joinRoom, leaveRoom]);

  const sendMessage = useCallback(
    (message: string) => {
      if (roomId) {
        sendChatMessage(roomId, message);
      }
    },
    [roomId, sendChatMessage]
  );

  const setTyping = useCallback(
    (typing: boolean) => {
      if (roomId) {
        sendTypingIndicator(roomId, typing);
      }
    },
    [roomId, sendTypingIndicator]
  );

  return {
    isConnected,
    sendMessage,
    setTyping,
    typingUsers: Array.from(isTyping.keys()),
  };
}

export default useWebSocket;
