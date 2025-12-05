/**
 * Seryvo Platform - Mapbox Geocoding Service
 * Provides address autocomplete and reverse geocoding
 */

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const MAPBOX_GEOCODING_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

export interface GeocodingSuggestion {
  id: string;
  place_name: string;
  text: string;
  center: [number, number]; // [lng, lat]
  address?: string;
  context?: Array<{
    id: string;
    text: string;
  }>;
}

export interface GeocodingResult {
  suggestions: GeocodingSuggestion[];
  error?: string;
}

/**
 * Search for address suggestions (autocomplete)
 * @param query - The search query (partial address)
 * @param options - Optional configuration
 */
export async function searchAddress(
  query: string,
  options: {
    limit?: number;
    country?: string;
    proximity?: [number, number]; // [lng, lat] - bias results near this point
    types?: string[]; // 'address', 'place', 'poi', etc.
  } = {}
): Promise<GeocodingResult> {
  if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'YOUR_MAPBOX_TOKEN') {
    // Return mock data for development without API key
    return getMockSuggestions(query);
  }

  if (!query || query.length < 2) {
    return { suggestions: [] };
  }

  try {
    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      autocomplete: 'true',
      limit: String(options.limit || 5),
    });

    if (options.country) {
      params.append('country', options.country);
    }

    if (options.proximity) {
      params.append('proximity', options.proximity.join(','));
    }

    if (options.types?.length) {
      params.append('types', options.types.join(','));
    }

    const response = await fetch(
      `${MAPBOX_GEOCODING_URL}/${encodeURIComponent(query)}.json?${params}`
    );

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();

    const suggestions: GeocodingSuggestion[] = data.features.map((feature: Record<string, unknown>) => ({
      id: feature.id as string,
      place_name: feature.place_name as string,
      text: feature.text as string,
      center: feature.center as [number, number],
      address: feature.address as string | undefined,
      context: feature.context as Array<{ id: string; text: string }> | undefined,
    }));

    return { suggestions };
  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      suggestions: [],
      error: error instanceof Error ? error.message : 'Geocoding failed',
    };
  }
}

/**
 * Reverse geocode coordinates to an address
 * @param lng - Longitude
 * @param lat - Latitude
 */
export async function reverseGeocode(
  lng: number,
  lat: number
): Promise<GeocodingSuggestion | null> {
  if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'YOUR_MAPBOX_TOKEN') {
    // Return mock data for development
    return {
      id: 'mock-reverse',
      place_name: `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      text: 'Selected Location',
      center: [lng, lat],
    };
  }

  try {
    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      limit: '1',
    });

    const response = await fetch(
      `${MAPBOX_GEOCODING_URL}/${lng},${lat}.json?${params}`
    );

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      return {
        id: feature.id,
        place_name: feature.place_name,
        text: feature.text,
        center: feature.center,
        address: feature.address,
        context: feature.context,
      };
    }

    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Get mock suggestions for development without API key
 */
function getMockSuggestions(query: string): GeocodingResult {
  const mockAddresses = [
    {
      id: 'mock-1',
      place_name: '123 Main Street, New York, NY 10001, USA',
      text: '123 Main Street',
      center: [-73.9857, 40.7484] as [number, number],
    },
    {
      id: 'mock-2',
      place_name: '456 Broadway, New York, NY 10012, USA',
      text: '456 Broadway',
      center: [-73.9969, 40.7256] as [number, number],
    },
    {
      id: 'mock-3',
      place_name: '789 Fifth Avenue, New York, NY 10022, USA',
      text: '789 Fifth Avenue',
      center: [-73.9712, 40.7614] as [number, number],
    },
    {
      id: 'mock-4',
      place_name: 'Times Square, New York, NY 10036, USA',
      text: 'Times Square',
      center: [-73.9855, 40.758] as [number, number],
    },
    {
      id: 'mock-5',
      place_name: 'Central Park, New York, NY 10024, USA',
      text: 'Central Park',
      center: [-73.9654, 40.7829] as [number, number],
    },
  ];

  // Filter based on query
  const filtered = mockAddresses.filter(
    (addr) =>
      addr.place_name.toLowerCase().includes(query.toLowerCase()) ||
      addr.text.toLowerCase().includes(query.toLowerCase())
  );

  // If no matches, return all (simulating broad search)
  return {
    suggestions: filtered.length > 0 ? filtered : mockAddresses.slice(0, 3),
  };
}

/**
 * Debounce helper for search input
 */
export function debounce<TArgs extends unknown[]>(
  func: (...args: TArgs) => void,
  wait: number
): (...args: TArgs) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: TArgs) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}
