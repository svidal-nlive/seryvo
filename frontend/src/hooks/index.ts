/**
 * Seryvo Platform - Custom Hooks
 */

export {
  useWebSocket,
  useDriverLocationStream,
  useBookingUpdates,
  useChatRoom,
} from './useWebSocket';

export type {
  UseWebSocketOptions,
  UseWebSocketReturn,
} from './useWebSocket';

export {
  useDriverTracking,
} from './useDriverTracking';

export type {
  DriverTrackingState,
  UseDriverTrackingOptions,
  UseDriverTrackingReturn,
} from './useDriverTracking';

export {
  useUserLocation,
  getQuickLocation,
} from './useUserLocation';

export type {
  UserLocation,
  UseUserLocationOptions,
  UseUserLocationResult,
} from './useUserLocation';
