/**
 * Seryvo Platform - WebSocket Service
 * Handles real-time bidirectional communication with the backend
 */

// =============================================================================
// Types
// =============================================================================

export enum ChannelType {
  BOOKING = 'booking',
  DRIVER_LOCATION = 'driver_location',
  CHAT = 'chat',
  NOTIFICATION = 'notification',
  ADMIN = 'admin',
}

export enum MessageType {
  // Connection management
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  PING = 'ping',
  PONG = 'pong',
  ERROR = 'error',

  // Booking events
  BOOKING_CREATED = 'booking_created',
  BOOKING_UPDATED = 'booking_updated',
  BOOKING_STATUS_CHANGED = 'booking_status_changed',
  BOOKING_CANCELLED = 'booking_cancelled',

  // Driver events
  DRIVER_LOCATION_UPDATE = 'driver_location_update',
  DRIVER_STATUS_CHANGED = 'driver_status_changed',
  DRIVER_ASSIGNED = 'driver_assigned',
  DRIVER_ARRIVED = 'driver_arrived',

  // Chat events
  CHAT_MESSAGE = 'chat_message',
  CHAT_TYPING = 'chat_typing',
  CHAT_READ = 'chat_read',

  // Notification events
  NOTIFICATION_NEW = 'notification_new',
  NOTIFICATION_READ = 'notification_read',

  // Admin events
  ADMIN_STATS_UPDATE = 'admin_stats_update',
  NEW_SUPPORT_TICKET = 'new_support_ticket',
}

export interface WebSocketMessage<T = Record<string, unknown>> {
  type: string;
  channel: string;
  payload: T;
  timestamp: string;
  message_id: string;
}

export interface DriverLocationPayload {
  driver_id: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
}

export interface ChatMessagePayload {
  sender_id: string;
  sender_role: string;
  message: string;
  room_id: string;
}

export interface BookingUpdatePayload {
  booking_id: string;
  status?: string;
  driver?: {
    id: string;
    name: string;
    phone: string;
    vehicle: string;
    rating: number;
  };
}

export interface NotificationPayload {
  title: string;
  message: string;
  notification_type: 'info' | 'success' | 'warning' | 'error';
}

export type MessageHandler<T = unknown> = (message: WebSocketMessage<T>) => void;

// =============================================================================
// WebSocket Service Class
// =============================================================================

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private pingTimeout = 30000; // 30 seconds
  private isIntentionalClose = false;
  
  // Connection state management to prevent concurrent connection attempts
  private connectionPromise: Promise<void> | null = null;
  private isReconnecting = false;

  // Event handlers
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private connectionHandlers: Set<() => void> = new Set();
  private disconnectionHandlers: Set<(reason?: string) => void> = new Set();
  private errorHandlers: Set<(error: Event) => void> = new Set();

  constructor() {
    // Build WebSocket URL from environment
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
    const baseUrl = apiUrl.replace(/^https?/, wsProtocol);
    this.url = `${baseUrl}/ws/connect`;
  }

  // =============================================================================
  // Connection Management
  // =============================================================================

  connect(token: string): Promise<void> {
    // If already connected, resolve immediately
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }
    
    // If connection is in progress (either CONNECTING state or we have a pending promise), wait for it
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Close any existing closed/closing connection
    if (this.ws && (this.ws.readyState === WebSocket.CLOSING || this.ws.readyState === WebSocket.CLOSED)) {
      this.ws = null;
    }
    
    // If somehow we still have a CONNECTING socket but no promise, wait for it
    if (this.ws?.readyState === WebSocket.CONNECTING) {
      // Create a promise that resolves when connection opens or rejects on error
      this.connectionPromise = new Promise((resolve, reject) => {
        const existingOnOpen = this.ws!.onopen;
        const existingOnError = this.ws!.onerror;
        
        this.ws!.onopen = (event) => {
          if (existingOnOpen) (existingOnOpen as (e: Event) => void).call(this.ws, event);
          resolve();
        };
        this.ws!.onerror = (event) => {
          if (existingOnError) (existingOnError as (e: Event) => void).call(this.ws, event);
          reject(event);
        };
      });
      return this.connectionPromise;
    }

    this.token = token;
    this.isIntentionalClose = false;
    
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const urlWithToken = `${this.url}?token=${encodeURIComponent(token)}`;
        this.ws = new WebSocket(urlWithToken);

        this.ws.onopen = () => {
          // eslint-disable-next-line no-console
          console.info('[WebSocket] Connected');
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.startPingInterval();
          this.connectionHandlers.forEach(handler => handler());
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            this.handleMessage(message);
          } catch (error) {
            console.error('[WebSocket] Failed to parse message:', error);
          }
        };

        this.ws.onclose = (event) => {
          // eslint-disable-next-line no-console
          console.info('[WebSocket] Disconnected:', event.code, event.reason);
          this.stopPingInterval();
          this.connectionPromise = null; // Clear connection promise on close

          if (!this.isIntentionalClose) {
            this.disconnectionHandlers.forEach(handler => handler(event.reason));
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          this.connectionPromise = null; // Clear connection promise on error
          this.errorHandlers.forEach(handler => handler(error));
          reject(error);
        };
      } catch (error) {
        this.connectionPromise = null;
        reject(error);
      }
    });
    
    return this.connectionPromise;
  }

  disconnect(): void {
    this.isIntentionalClose = true;
    this.stopPingInterval();
    this.connectionPromise = null;

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.disconnectionHandlers.forEach(handler => handler('Client disconnect'));
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // =============================================================================
  // Reconnection Logic
  // =============================================================================

  private attemptReconnect(): void {
    if (this.isIntentionalClose || !this.token || this.isReconnecting) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      this.isReconnecting = false;
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    // eslint-disable-next-line no-console
    console.info(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.isReconnecting = false;
      if (!this.isIntentionalClose && this.token) {
        this.connect(this.token).catch(() => {
          // Will trigger another reconnect attempt via onclose
        });
      }
    }, delay);
  }

  // =============================================================================
  // Ping/Pong Keep-Alive
  // =============================================================================

  private startPingInterval(): void {
    this.stopPingInterval();

    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: MessageType.PING, payload: {} });
      }
    }, this.pingTimeout);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // =============================================================================
  // Message Handling
  // =============================================================================

  private handleMessage(message: WebSocketMessage): void {
    // Handle system messages
    if (message.type === MessageType.PONG) {
      // Pong received, connection is alive
      return;
    }

    if (message.type === MessageType.ERROR) {
      console.error('[WebSocket] Server error:', message.payload);
    }

    // Notify handlers for this message type
    const typeHandlers = this.messageHandlers.get(message.type);
    if (typeHandlers) {
      typeHandlers.forEach(handler => handler(message));
    }

    // Notify handlers for this channel
    const channelHandlers = this.messageHandlers.get(`channel:${message.channel}`);
    if (channelHandlers) {
      channelHandlers.forEach(handler => handler(message));
    }

    // Notify global handlers
    const globalHandlers = this.messageHandlers.get('*');
    if (globalHandlers) {
      globalHandlers.forEach(handler => handler(message));
    }
  }

  // =============================================================================
  // Send Messages
  // =============================================================================

  send<T extends Record<string, unknown>>(data: { type: string; channel?: string; payload: T }): void {
    if (!this.isConnected()) {
      console.warn('[WebSocket] Cannot send message, not connected');
      return;
    }

    const message = {
      type: data.type,
      channel: data.channel || ChannelType.NOTIFICATION,
      payload: data.payload,
      timestamp: new Date().toISOString(),
      message_id: crypto.randomUUID(),
    };

    if (this.ws) {
      this.ws.send(JSON.stringify(message));
    }
  }

  // =============================================================================
  // Channel Subscriptions
  // =============================================================================

  subscribe(channel: ChannelType, roomId?: string): void {
    this.send({
      type: 'subscribe',
      channel: channel,
      payload: roomId ? { room_id: roomId } : {},
    });
  }

  unsubscribe(channel: ChannelType, roomId?: string): void {
    this.send({
      type: 'unsubscribe',
      channel: channel,
      payload: roomId ? { room_id: roomId } : {},
    });
  }

  joinRoom(roomId: string): void {
    this.send({
      type: 'subscribe',
      payload: { room_id: roomId },
    });
  }

  leaveRoom(roomId: string): void {
    this.send({
      type: 'unsubscribe',
      payload: { room_id: roomId },
    });
  }

  // =============================================================================
  // Driver Location
  // =============================================================================

  sendDriverLocation(
    lat: number,
    lng: number,
    heading?: number,
    speed?: number,
    bookingRoomId?: string
  ): void {
    this.send({
      type: MessageType.DRIVER_LOCATION_UPDATE,
      channel: ChannelType.DRIVER_LOCATION,
      payload: {
        lat,
        lng,
        heading,
        speed,
        room_id: bookingRoomId,
      },
    });
  }

  // =============================================================================
  // Chat Messages
  // =============================================================================

  sendChatMessage(roomId: string, message: string): void {
    this.send({
      type: MessageType.CHAT_MESSAGE,
      channel: ChannelType.CHAT,
      payload: {
        room_id: roomId,
        message,
      },
    });
  }

  sendTypingIndicator(roomId: string, isTyping: boolean): void {
    this.send({
      type: MessageType.CHAT_TYPING,
      channel: ChannelType.CHAT,
      payload: {
        room_id: roomId,
        is_typing: isTyping,
      },
    });
  }

  // =============================================================================
  // Event Listeners
  // =============================================================================

  onMessage<T = unknown>(type: string | '*', handler: MessageHandler<T>): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.add(handler as MessageHandler);
    }

    // Return unsubscribe function
    return () => {
      this.messageHandlers.get(type)?.delete(handler as MessageHandler);
    };
  }

  onChannel<T = unknown>(channel: ChannelType, handler: MessageHandler<T>): () => void {
    return this.onMessage(`channel:${channel}`, handler);
  }

  onConnect(handler: () => void): () => void {
    this.connectionHandlers.add(handler);
    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  onDisconnect(handler: (reason?: string) => void): () => void {
    this.disconnectionHandlers.add(handler);
    return () => {
      this.disconnectionHandlers.delete(handler);
    };
  }

  onError(handler: (error: Event) => void): () => void {
    this.errorHandlers.add(handler);
    return () => {
      this.errorHandlers.delete(handler);
    };
  }

  // =============================================================================
  // Cleanup
  // =============================================================================

  removeAllListeners(): void {
    this.messageHandlers.clear();
    this.connectionHandlers.clear();
    this.disconnectionHandlers.clear();
    this.errorHandlers.clear();
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const wsService = new WebSocketService();

export default wsService;
