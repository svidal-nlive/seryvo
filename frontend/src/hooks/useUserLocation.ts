/**
 * Seryvo Platform - User Location Hook
 * Provides the user's current location with caching and fallback
 * Used to center maps and bias geocoding searches
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: number;
  source: 'gps' | 'ip' | 'cached' | 'default';
  city?: string;
  country?: string;
}

export interface UseUserLocationOptions {
  /** Enable automatic location detection on mount */
  autoDetect?: boolean;
  /** Use high accuracy GPS (slower, more battery) */
  highAccuracy?: boolean;
  /** Max age of cached position in ms (default: 5 minutes) */
  maxAge?: number;
  /** Timeout for geolocation request in ms (default: 10 seconds) */
  timeout?: number;
  /** Fallback location if geolocation fails */
  fallback?: { lat: number; lng: number };
}

export interface UseUserLocationResult {
  /** Current location (null if not yet determined) */
  location: UserLocation | null;
  /** Whether location is being determined */
  isLoading: boolean;
  /** Error message if location detection failed */
  error: string | null;
  /** Whether geolocation is supported */
  isSupported: boolean;
  /** Manually request location */
  requestLocation: () => Promise<UserLocation | null>;
  /** Clear cached location */
  clearCache: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const CACHE_KEY = 'seryvo_user_location';
const DEFAULT_MAX_AGE = 5 * 60 * 1000; // 5 minutes
const DEFAULT_TIMEOUT = 10000; // 10 seconds

// Regional defaults based on common markets
// Can be expanded based on IP geolocation or user settings
const REGIONAL_DEFAULTS: Record<string, { lat: number; lng: number; city: string; country: string }> = {
  // US - New York
  default: { lat: 40.7128, lng: -74.0060, city: 'New York', country: 'US' },
  // More can be added based on IP or browser locale
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get cached location from localStorage
 */
function getCachedLocation(maxAge: number): UserLocation | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const parsed: UserLocation & { timestamp: number } = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    
    if (age > maxAge) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return { ...parsed, source: 'cached' };
  } catch {
    return null;
  }
}

/**
 * Cache location to localStorage
 */
function cacheLocation(location: UserLocation): void {
  try {
    const toCache = { ...location, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(toCache));
  } catch {
    // localStorage might be unavailable
  }
}

/**
 * Try to get location from IP-based geolocation service
 * Uses free ipapi.co service as fallback
 */
async function getLocationFromIP(): Promise<UserLocation | null> {
  try {
    // Using ipapi.co free tier (1000 req/day)
    const response = await fetch('https://ipapi.co/json/', { 
      signal: AbortSignal.timeout(5000) 
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.latitude && data.longitude) {
      return {
        lat: data.latitude,
        lng: data.longitude,
        city: data.city,
        country: data.country_code,
        source: 'ip',
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Get default location based on browser locale or hardcoded default
 */
function getDefaultLocation(): UserLocation {
  // Could be expanded to detect region from browser locale
  const region = 'default';
  const fallback = REGIONAL_DEFAULTS[region] || REGIONAL_DEFAULTS.default;
  
  return {
    lat: fallback.lat,
    lng: fallback.lng,
    city: fallback.city,
    country: fallback.country,
    source: 'default',
  };
}

// =============================================================================
// Hook
// =============================================================================

export function useUserLocation(options: UseUserLocationOptions = {}): UseUserLocationResult {
  const {
    autoDetect = true,
    highAccuracy = false,
    maxAge = DEFAULT_MAX_AGE,
    timeout = DEFAULT_TIMEOUT,
    fallback,
  } = options;
  
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  const requestedRef = useRef(false);
  
  /**
   * Request current location
   */
  const requestLocation = useCallback(async (): Promise<UserLocation | null> => {
    setIsLoading(true);
    setError(null);
    
    // 1. Try browser geolocation first
    if (isSupported) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: highAccuracy,
            maximumAge: maxAge,
            timeout,
          });
        });
        
        const gpsLocation: UserLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          source: 'gps',
        };
        
        cacheLocation(gpsLocation);
        setLocation(gpsLocation);
        setIsLoading(false);
        return gpsLocation;
      } catch (geoError) {
        // Geolocation failed, continue to fallbacks
        console.warn('Geolocation failed:', geoError);
      }
    }
    
    // 2. Try IP-based geolocation
    const ipLocation = await getLocationFromIP();
    if (ipLocation) {
      cacheLocation(ipLocation);
      setLocation(ipLocation);
      setIsLoading(false);
      return ipLocation;
    }
    
    // 3. Use provided fallback or default
    const finalLocation: UserLocation = fallback 
      ? { ...fallback, source: 'default' as const }
      : getDefaultLocation();
    
    setLocation(finalLocation);
    setIsLoading(false);
    setError('Could not determine your location. Using default.');
    return finalLocation;
  }, [isSupported, highAccuracy, maxAge, timeout, fallback]);
  
  /**
   * Clear cached location
   */
  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    setLocation(null);
  }, []);
  
  // Auto-detect on mount
  useEffect(() => {
    if (!autoDetect || requestedRef.current) return;
    requestedRef.current = true;
    
    // First check cache
    const cached = getCachedLocation(maxAge);
    if (cached) {
      setLocation(cached);
      // Still request fresh location in background
      requestLocation();
      return;
    }
    
    // Request fresh location
    requestLocation();
  }, [autoDetect, maxAge, requestLocation]);
  
  return {
    location,
    isLoading,
    error,
    isSupported,
    requestLocation,
    clearCache,
  };
}

// =============================================================================
// Utility Exports
// =============================================================================

/**
 * Get a quick location synchronously (from cache or default)
 * Useful for initial map center before async location is available
 */
export function getQuickLocation(maxAge = DEFAULT_MAX_AGE): UserLocation {
  const cached = getCachedLocation(maxAge);
  if (cached) return cached;
  return getDefaultLocation();
}

export default useUserLocation;
