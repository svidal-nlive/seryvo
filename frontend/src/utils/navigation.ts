/**
 * Seryvo Platform - External Navigation Utilities
 * Provides deep links to Google Maps, Waze, and Apple Maps for navigation
 */

import type { Location } from '../types';

// =============================================================================
// Types
// =============================================================================

export type NavigationApp = 'google_maps' | 'waze' | 'apple_maps' | 'default';

export interface NavigationDestination {
  lat: number;
  lng: number;
  address?: string;
  label?: string;
}

export interface NavigationOptions {
  /** Origin location (current location if not specified) */
  origin?: NavigationDestination;
  /** Destination location */
  destination: NavigationDestination;
  /** Waypoints to stop at (optional) */
  waypoints?: NavigationDestination[];
  /** Travel mode */
  travelMode?: 'driving' | 'walking' | 'bicycling' | 'transit';
  /** Preferred navigation app */
  app?: NavigationApp;
  /** Whether to start navigation immediately */
  startNavigation?: boolean;
}

// =============================================================================
// Platform Detection
// =============================================================================

/**
 * Detect if the user is on iOS
 */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

/**
 * Detect if the user is on Android
 */
export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

/**
 * Detect if the user is on a mobile device
 */
export function isMobile(): boolean {
  return isIOS() || isAndroid();
}

// =============================================================================
// URL Builders
// =============================================================================

/**
 * Build Google Maps URL for navigation
 */
export function buildGoogleMapsUrl(options: NavigationOptions): string {
  const { origin, destination, waypoints, travelMode = 'driving', startNavigation } = options;
  
  const params = new URLSearchParams();
  
  // Use navigation mode if requested and on mobile
  if (startNavigation && isMobile()) {
    params.set('api', '1');
    params.set('destination', `${destination.lat},${destination.lng}`);
    if (origin) {
      params.set('origin', `${origin.lat},${origin.lng}`);
    }
    if (waypoints && waypoints.length > 0) {
      params.set('waypoints', waypoints.map(w => `${w.lat},${w.lng}`).join('|'));
    }
    params.set('travelmode', travelMode);
    params.set('dir_action', 'navigate');
    
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }
  
  // Standard directions URL
  params.set('api', '1');
  params.set('destination', `${destination.lat},${destination.lng}`);
  if (destination.address) {
    params.set('destination_place_id', destination.address);
  }
  if (origin) {
    params.set('origin', `${origin.lat},${origin.lng}`);
  }
  if (waypoints && waypoints.length > 0) {
    params.set('waypoints', waypoints.map(w => `${w.lat},${w.lng}`).join('|'));
  }
  params.set('travelmode', travelMode);
  
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Build Waze URL for navigation
 */
export function buildWazeUrl(options: NavigationOptions): string {
  const { destination, startNavigation } = options;
  
  const params = new URLSearchParams();
  params.set('ll', `${destination.lat},${destination.lng}`);
  
  if (startNavigation) {
    params.set('navigate', 'yes');
  }
  
  // Waze supports both web and app deep links
  if (isMobile()) {
    return `waze://?${params.toString()}`;
  }
  
  return `https://www.waze.com/ul?${params.toString()}`;
}

/**
 * Build Apple Maps URL for navigation (iOS only)
 */
export function buildAppleMapsUrl(options: NavigationOptions): string {
  const { origin, destination, travelMode = 'driving' } = options;
  
  const params = new URLSearchParams();
  params.set('daddr', `${destination.lat},${destination.lng}`);
  
  if (origin) {
    params.set('saddr', `${origin.lat},${origin.lng}`);
  }
  
  // Map travel mode to Apple Maps format
  const dirflg = {
    driving: 'd',
    walking: 'w',
    transit: 'r',
    bicycling: 'b',
  }[travelMode] || 'd';
  
  params.set('dirflg', dirflg);
  
  return `maps://?${params.toString()}`;
}

// =============================================================================
// Navigation Launcher
// =============================================================================

/**
 * Open navigation in the specified app
 */
export function openNavigation(options: NavigationOptions): void {
  const { app = 'default' } = options;
  
  let url: string;
  
  switch (app) {
    case 'google_maps':
      url = buildGoogleMapsUrl(options);
      break;
    case 'waze':
      url = buildWazeUrl(options);
      // For Waze on mobile, try the app first, then fallback to web
      if (isMobile()) {
        // Try to open the app
        const wazeAppUrl = buildWazeUrl(options);
        const webFallbackUrl = `https://www.waze.com/ul?ll=${options.destination.lat},${options.destination.lng}&navigate=yes`;
        
        // Use a timeout to detect if the app opened
        const start = Date.now();
        const timer = setTimeout(() => {
          if (Date.now() - start < 2000) {
            window.location.href = webFallbackUrl;
          }
        }, 500);
        
        window.location.href = wazeAppUrl;
        window.addEventListener('blur', () => clearTimeout(timer));
        return;
      }
      break;
    case 'apple_maps':
      if (isIOS()) {
        url = buildAppleMapsUrl(options);
      } else {
        // Fallback to Google Maps if not iOS
        url = buildGoogleMapsUrl(options);
      }
      break;
    case 'default':
    default:
      // Use the best option for the platform
      if (isIOS()) {
        url = buildAppleMapsUrl(options);
      } else {
        url = buildGoogleMapsUrl(options);
      }
      break;
  }
  
  window.open(url, '_blank');
}

/**
 * Open navigation to pickup location
 */
export function navigateToPickup(
  pickup: Location,
  app: NavigationApp = 'default'
): void {
  if (!pickup.lat || !pickup.lng) {
    console.error('Pickup location missing coordinates');
    return;
  }
  
  openNavigation({
    destination: {
      lat: pickup.lat,
      lng: pickup.lng,
      address: pickup.address_line,
      label: 'Pickup',
    },
    app,
    startNavigation: true,
  });
}

/**
 * Open navigation to dropoff location
 */
export function navigateToDropoff(
  dropoff: Location,
  app: NavigationApp = 'default'
): void {
  if (!dropoff.lat || !dropoff.lng) {
    console.error('Dropoff location missing coordinates');
    return;
  }
  
  openNavigation({
    destination: {
      lat: dropoff.lat,
      lng: dropoff.lng,
      address: dropoff.address_line,
      label: 'Dropoff',
    },
    app,
    startNavigation: true,
  });
}

/**
 * Open navigation with full trip route (pickup to dropoff with stops)
 */
export function navigateFullTrip(
  pickup: Location,
  dropoff: Location,
  stops: Location[] = [],
  app: NavigationApp = 'default'
): void {
  if (!pickup.lat || !pickup.lng || !dropoff.lat || !dropoff.lng) {
    console.error('Missing pickup or dropoff coordinates');
    return;
  }
  
  const waypoints = stops
    .filter((stop): stop is Location & { lat: number; lng: number } => 
      stop.lat !== undefined && stop.lng !== undefined
    )
    .map(stop => ({
      lat: stop.lat,
      lng: stop.lng,
      address: stop.address_line,
    }));
  
  openNavigation({
    origin: {
      lat: pickup.lat,
      lng: pickup.lng,
      address: pickup.address_line,
    },
    destination: {
      lat: dropoff.lat,
      lng: dropoff.lng,
      address: dropoff.address_line,
    },
    waypoints,
    app,
    startNavigation: true,
  });
}

// =============================================================================
// Navigation App Availability
// =============================================================================

/**
 * Get available navigation apps for the current platform
 */
export function getAvailableNavigationApps(): { id: NavigationApp; name: string; icon: string }[] {
  const apps: { id: NavigationApp; name: string; icon: string }[] = [
    { id: 'google_maps', name: 'Google Maps', icon: '🗺️' },
    { id: 'waze', name: 'Waze', icon: '🚗' },
  ];
  
  if (isIOS()) {
    apps.push({ id: 'apple_maps', name: 'Apple Maps', icon: '🍎' });
  }
  
  return apps;
}
