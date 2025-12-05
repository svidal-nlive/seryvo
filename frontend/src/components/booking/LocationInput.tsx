/**
 * Seryvo Platform - Location Input Component with Autocomplete
 * Address input with Mapbox geocoding suggestions
 * Auto-biases search results to user's current location
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapPin, Crosshair, Map, Trash2, Loader2 } from 'lucide-react';
import { searchAddress, debounce, type GeocodingSuggestion } from '../../services/geocoding';
import { getQuickLocation } from '../../hooks/useUserLocation';

interface LocationInputProps {
  label?: string;
  value: string;
  onChange: (val: string, coordinates?: { lat: number; lng: number }) => void;
  onOpenMap: () => void;
  placeholder?: string;
  icon?: React.ReactNode;
  onRemove?: () => void;
  /** Bias results near this location [lng, lat] - defaults to user's location */
  proximity?: [number, number];
  /** Restrict to country code (e.g., 'us', 'gb') */
  country?: string;
  /** Disable auto-proximity detection */
  disableAutoProximity?: boolean;
}

export default function LocationInput({
  label,
  value,
  onChange,
  onOpenMap,
  placeholder,
  icon,
  onRemove,
  proximity,
  country,
  disableAutoProximity = false,
}: LocationInputProps) {
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodingSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get effective proximity - use provided, or fall back to user's location
  const effectiveProximity = useMemo(() => {
    if (proximity) return proximity;
    if (disableAutoProximity) return undefined;
    const quickLoc = getQuickLocation();
    return [quickLoc.lng, quickLoc.lat] as [number, number];
  }, [proximity, disableAutoProximity]);

  // Debounced search function
  const debouncedSearchRef = useRef<((query: string) => void) | null>(null);
  
  useEffect(() => {
    debouncedSearchRef.current = debounce(async (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      const result = await searchAddress(query, {
        limit: 5,
        proximity: effectiveProximity,
        country,
        types: ['address', 'poi', 'place'],
      });
      
      setSuggestions(result.suggestions);
      setIsSearching(false);
      setSelectedIndex(-1);
    }, 300);
  }, [effectiveProximity, country]);
  
  const debouncedSearch = useCallback((query: string) => {
    debouncedSearchRef.current?.(query);
  }, []);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(true);
    debouncedSearch(newValue);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: GeocodingSuggestion) => {
    onChange(suggestion.place_name, {
      lat: suggestion.center[1],
      lng: suggestion.center[0],
    });
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

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
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle current location
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setLoadingLoc(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Try to reverse geocode the coordinates
        const { reverseGeocode } = await import('../../services/geocoding');
        const result = await reverseGeocode(longitude, latitude);
        
        if (result) {
          onChange(result.place_name, { lat: latitude, lng: longitude });
        } else {
          onChange(`Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`, {
            lat: latitude,
            lng: longitude,
          });
        }
        setLoadingLoc(false);
      },
      (error) => {
        console.error(error);
        alert('Unable to retrieve your location');
        setLoadingLoc(false);
      }
    );
  };

  return (
    <div className="space-y-1" ref={containerRef}>
      {label && (
        <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        <div className="relative flex items-center group">
          <div className="absolute left-3 text-gray-400 group-focus-within:text-blue-500 transition-colors">
            {icon || <MapPin size={18} />}
          </div>
          <input
            ref={inputRef}
            type="text"
            className="w-full pl-10 pr-24 py-3 rounded-lg border bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all truncate font-medium"
            placeholder={placeholder || 'Enter address'}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => value.length >= 2 && setShowSuggestions(true)}
            autoComplete="off"
          />
          <div className="absolute right-1.5 flex items-center gap-1">
            {isSearching && (
              <div className="p-2">
                <Loader2 size={18} className="animate-spin text-gray-400" />
              </div>
            )}
            <button
              type="button"
              onClick={handleCurrentLocation}
              disabled={loadingLoc}
              className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-md transition-colors"
              title="Use Current Location"
            >
              {loadingLoc ? (
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <Crosshair size={18} />
              )}
            </button>
            <button
              type="button"
              onClick={onOpenMap}
              className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-md transition-colors"
              title="Pick on Map"
            >
              <Map size={18} />
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                title="Remove Stop"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                className={`w-full px-4 py-3 text-left flex items-start gap-3 transition-colors ${
                  index === selectedIndex
                    ? 'bg-blue-50 dark:bg-blue-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                <MapPin 
                  size={16} 
                  className={`mt-0.5 flex-shrink-0 ${
                    index === selectedIndex 
                      ? 'text-blue-500' 
                      : 'text-gray-400'
                  }`} 
                />
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {suggestion.text}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {suggestion.place_name}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No results message */}
        {showSuggestions && !isSearching && value.length >= 2 && suggestions.length === 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg p-4 text-center text-gray-500 dark:text-gray-400">
            No addresses found. Try a different search.
          </div>
        )}
      </div>
    </div>
  );
}
