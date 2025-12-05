/**
 * Seryvo Platform - Map Picker Modal with Mapbox Integration
 * Interactive map for selecting pickup/dropoff locations
 * Auto-centers on user's current location
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, MapPin, Plus, Minus, Crosshair, Loader2, Navigation } from 'lucide-react';
import { searchAddress, reverseGeocode, debounce, type GeocodingSuggestion } from '../../services/geocoding';
import { useUserLocation, getQuickLocation } from '../../hooks/useUserLocation';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

interface MapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (address: string, coordinates?: { lat: number; lng: number }) => void;
  initialCenter?: { lat: number; lng: number };
  /** Auto-detect user location on open */
  autoLocate?: boolean;
}

// Get initial center from cache or default
const getInitialCenter = () => {
  const quickLoc = getQuickLocation();
  return { lat: quickLoc.lat, lng: quickLoc.lng };
};

const DEFAULT_ZOOM = 13;
const LOCATED_ZOOM = 15;

export default function MapPickerModal({ 
  isOpen, 
  onClose, 
  onSelect,
  initialCenter,
  autoLocate = true,
}: MapPickerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const hasAutoLocated = useRef(false);
  
  // Use the user location hook for auto-detection
  const { location: userLocation, isLoading: isLocating, requestLocation } = useUserLocation({
    autoDetect: false, // We'll trigger manually when modal opens
  });
  
  // Determine effective initial center
  const effectiveInitialCenter = initialCenter || (userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : getInitialCenter());
  
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodingSuggestion[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    address: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [locationSource, setLocationSource] = useState<'gps' | 'ip' | 'cached' | 'default' | null>(null);

  // Debounced search - bias results to user's location
  const debouncedSearchRef = useRef<((query: string) => void) | null>(null);
  
  useEffect(() => {
    debouncedSearchRef.current = debounce(async (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      
      // Bias search results to user's current location
      const proximity = userLocation 
        ? [userLocation.lng, userLocation.lat] as [number, number]
        : undefined;
      
      const result = await searchAddress(query, {
        limit: 5,
        types: ['address', 'poi', 'place'],
        proximity,
      });
      
      setSuggestions(result.suggestions);
      setIsSearching(false);
      setSelectedIndex(-1);
    }, 300);
  }, [userLocation]);

  const handleSearch = useCallback((query: string) => {
    debouncedSearchRef.current?.(query);
  }, []);

  // Auto-locate user when modal opens
  useEffect(() => {
    if (isOpen && autoLocate && !hasAutoLocated.current) {
      hasAutoLocated.current = true;
      requestLocation().then((loc) => {
        if (loc) {
          setLocationSource(loc.source);
          // If map is already loaded, fly to user location
          if (mapRef.current && loc.source === 'gps') {
            mapRef.current.flyTo({
              center: [loc.lng, loc.lat],
              zoom: LOCATED_ZOOM,
            });
          }
        }
      });
    }
    // Reset auto-locate flag when modal closes
    if (!isOpen) {
      hasAutoLocated.current = false;
    }
  }, [isOpen, autoLocate, requestLocation]);

  // Update map when userLocation changes (after auto-locate)
  useEffect(() => {
    if (userLocation && mapRef.current && mapLoaded && locationSource === 'gps') {
      mapRef.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: LOCATED_ZOOM,
      });
    }
  }, [userLocation, mapLoaded, locationSource]);

  // Initialize Mapbox map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;
    if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'YOUR_MAPBOX_TOKEN') {
      setMapLoaded(true); // Show fallback
      return;
    }

    // Dynamic import of mapbox-gl
    const initMap = async () => {
      const container = mapContainerRef.current;
      if (!container) return;
      
      const mapboxgl = await import('mapbox-gl');
      await import('mapbox-gl/dist/mapbox-gl.css');
      
      mapboxgl.default.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.default.Map({
        container,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [effectiveInitialCenter.lng, effectiveInitialCenter.lat],
        zoom: DEFAULT_ZOOM,
      });

      // Add navigation controls
      map.addControl(new mapboxgl.default.NavigationControl(), 'bottom-right');

      // Create marker
      const marker = new mapboxgl.default.Marker({
        color: '#3B82F6',
        draggable: true,
      });

      // Handle map click
      map.on('click', async (e) => {
        const { lng, lat } = e.lngLat;
        marker.setLngLat([lng, lat]).addTo(map);
        
        setIsLoadingAddress(true);
        const result = await reverseGeocode(lng, lat);
        setIsLoadingAddress(false);
        
        if (result) {
          setSelectedLocation({
            address: result.place_name,
            lat,
            lng,
          });
        } else {
          setSelectedLocation({
            address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            lat,
            lng,
          });
        }
      });

      // Handle marker drag
      marker.on('dragend', async () => {
        const lngLat = marker.getLngLat();
        
        setIsLoadingAddress(true);
        const result = await reverseGeocode(lngLat.lng, lngLat.lat);
        setIsLoadingAddress(false);
        
        if (result) {
          setSelectedLocation({
            address: result.place_name,
            lat: lngLat.lat,
            lng: lngLat.lng,
          });
        } else {
          setSelectedLocation({
            address: `${lngLat.lat.toFixed(6)}, ${lngLat.lng.toFixed(6)}`,
            lat: lngLat.lat,
            lng: lngLat.lng,
          });
        }
      });

      map.on('load', () => {
        setMapLoaded(true);
      });

      mapRef.current = map;
      markerRef.current = marker;
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isOpen, initialCenter]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSuggestions([]);
      setShowResults(false);
      setSelectedLocation(null);
      setMapLoaded(false);
    }
  }, [isOpen]);

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: GeocodingSuggestion) => {
    const [lng, lat] = suggestion.center;
    
    setSelectedLocation({
      address: suggestion.place_name,
      lat,
      lng,
    });
    
    setSuggestions([]);
    setShowResults(false);
    setSearchQuery(suggestion.text);

    // Move map and marker
    if (mapRef.current && markerRef.current) {
      mapRef.current.flyTo({
        center: [lng, lat],
        zoom: 16,
      });
      markerRef.current.setLngLat([lng, lat]).addTo(mapRef.current);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Confirm selection
  const handleConfirm = () => {
    if (selectedLocation) {
      onSelect(selectedLocation.address, {
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
      });
      onClose();
    }
  };

  // Get current location
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLoadingAddress(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Move map
        if (mapRef.current && markerRef.current) {
          mapRef.current.flyTo({
            center: [longitude, latitude],
            zoom: 16,
          });
          markerRef.current.setLngLat([longitude, latitude]).addTo(mapRef.current);
        }

        // Reverse geocode
        const result = await reverseGeocode(longitude, latitude);
        setIsLoadingAddress(false);
        
        if (result) {
          setSelectedLocation({
            address: result.place_name,
            lat: latitude,
            lng: longitude,
          });
        } else {
          setSelectedLocation({
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            lat: latitude,
            lng: longitude,
          });
        }
      },
      (error) => {
        console.error(error);
        alert('Unable to retrieve your location');
        setIsLoadingAddress(false);
      }
    );
  };

  // Zoom controls
  const handleZoom = (delta: number) => {
    if (mapRef.current) {
      mapRef.current.zoomTo(mapRef.current.getZoom() + delta);
    }
  };

  if (!isOpen) return null;

  const hasMapbox = MAPBOX_TOKEN && MAPBOX_TOKEN !== 'YOUR_MAPBOX_TOKEN';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px] relative">
        {/* Search Bar */}
        <div className="absolute top-4 left-4 right-16 z-20 flex flex-col gap-2">
          <div className="relative shadow-lg rounded-lg flex">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-3 rounded-l-lg border-0 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 shadow-sm"
                placeholder="Search for a location..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowResults(true);
                  handleSearch(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
              />
            </div>
            <button
              onClick={handleCurrentLocation}
              disabled={isLoadingAddress}
              className="px-4 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border-l border-gray-200 dark:border-slate-700 rounded-r-lg transition-colors"
              title="Use Current Location"
            >
              {isLoadingAddress ? (
                <Loader2 size={20} className="animate-spin text-gray-400" />
              ) : (
                <Crosshair size={20} className="text-gray-500" />
              )}
            </button>
          </div>
          
          {/* Search Results */}
          {showResults && (searchQuery.length >= 2 || isSearching) && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl overflow-hidden border border-gray-100 dark:border-slate-700 max-h-60 overflow-y-auto">
              {isSearching ? (
                <div className="px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 size={16} className="animate-spin" />
                  Searching...
                </div>
              ) : suggestions.length > 0 ? (
                suggestions.map((suggestion, i) => (
                  <button
                    key={suggestion.id}
                    className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 dark:border-slate-700 last:border-0 flex items-start gap-2 transition-colors ${
                      i === selectedIndex
                        ? 'bg-blue-50 dark:bg-blue-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                    onClick={() => handleSelectSuggestion(suggestion)}
                  >
                    <MapPin size={14} className={`mt-0.5 flex-shrink-0 ${
                      i === selectedIndex ? 'text-blue-500' : 'text-gray-400'
                    }`} />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {suggestion.text}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {suggestion.place_name}
                      </p>
                    </div>
                  </button>
                ))
              ) : searchQuery.length >= 2 ? (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  No results found
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-3 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg shadow-lg dark:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Map Area */}
        <div 
          ref={mapContainerRef}
          className="flex-1 bg-slate-100 dark:bg-slate-800 relative"
        >
          {/* Fallback if no Mapbox token */}
          {!hasMapbox && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-200 dark:bg-slate-800">
              <MapPin size={48} className="text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
                Add your Mapbox token to <code className="bg-gray-300 dark:bg-slate-700 px-1 rounded">.env.local</code> to enable the interactive map.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Use the search bar above to find locations.
              </p>
            </div>
          )}
          
          {/* Loading indicator */}
          {hasMapbox && !mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-200 dark:bg-slate-800 z-10">
              <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
          )}
        </div>

        {/* Selected Location Bar */}
        {selectedLocation && (
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-blue-500 flex-shrink-0" />
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {isLoadingAddress ? 'Loading address...' : selectedLocation.address}
                  </p>
                </div>
                <p className="text-xs text-gray-500 ml-6">
                  {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </p>
              </div>
              <button
                onClick={handleConfirm}
                disabled={isLoadingAddress}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
              >
                Confirm Location
              </button>
            </div>
          </div>
        )}

        {/* Zoom Controls (only when no selected location bar) */}
        {!selectedLocation && hasMapbox && (
          <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
            <button
              onClick={() => handleZoom(1)}
              className="p-3 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-white rounded-lg shadow-lg border border-gray-100 dark:border-slate-700 transition-colors"
              title="Zoom In"
            >
              <Plus size={24} />
            </button>
            <button
              onClick={() => handleZoom(-1)}
              className="p-3 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-white rounded-lg shadow-lg border border-gray-100 dark:border-slate-700 transition-colors"
              title="Zoom Out"
            >
              <Minus size={24} />
            </button>
          </div>
        )}

        {/* Instructions overlay */}
        {!selectedLocation && hasMapbox && mapLoaded && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <span className="bg-white/90 dark:bg-slate-900/90 backdrop-blur px-4 py-2 rounded-full text-sm font-medium shadow-lg dark:text-white border border-gray-200 dark:border-slate-700">
              Click on the map to select a location
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
