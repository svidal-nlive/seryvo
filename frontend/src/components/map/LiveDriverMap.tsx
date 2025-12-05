/**
 * Seryvo Platform - LiveDriverMap Component
 * Displays real-time driver location tracking using Leaflet
 * Auto-centers on user's region when no trip data available
 */

import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Location } from '../../types';
import { getQuickLocation } from '../../hooks/useUserLocation';

// =============================================================================
// Types
// =============================================================================

interface DriverLocation {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  lastUpdate?: string;
}

interface LiveDriverMapProps {
  /** Pickup location */
  pickup: Location;
  /** Dropoff location */
  dropoff: Location;
  /** Optional intermediate stops */
  stops?: Location[];
  /** Current driver location (updated in real-time) */
  driverLocation?: DriverLocation | null;
  /** Driver info for popup */
  driverInfo?: {
    name: string;
    vehicle: string;
    plateNumber?: string;
  };
  /** Whether to show route line */
  showRoute?: boolean;
  /** Map height */
  height?: string;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// Custom Icons
// =============================================================================

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons
const createIcon = (color: string, emoji: string): L.DivIcon => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        border: 2px solid white;
      ">
        ${emoji}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

const createCarIcon = (heading?: number): L.DivIcon => {
  const rotation = heading ? `transform: rotate(${heading}deg);` : '';
  return L.divIcon({
    className: 'car-marker',
    html: `
      <div style="
        ${rotation}
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
      ">
        🚗
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

const pickupIcon = createIcon('#22c55e', '📍');
const dropoffIcon = createIcon('#ef4444', '🏁');
const stopIcon = createIcon('#f59e0b', '⚡');

// =============================================================================
// Map Controller Component
// =============================================================================

interface MapControllerProps {
  bounds: L.LatLngBoundsExpression | null;
  driverLocation?: DriverLocation | null;
  followDriver?: boolean;
}

function MapController({ bounds, driverLocation, followDriver }: MapControllerProps) {
  const map = useMap();
  const initialBoundsSet = useRef(false);

  // Fit map to bounds on initial load
  useEffect(() => {
    if (bounds && !initialBoundsSet.current) {
      map.fitBounds(bounds, { padding: [50, 50] });
      initialBoundsSet.current = true;
    }
  }, [map, bounds]);

  // Follow driver if enabled
  useEffect(() => {
    if (followDriver && driverLocation) {
      map.panTo([driverLocation.lat, driverLocation.lng]);
    }
  }, [map, driverLocation, followDriver]);

  return null;
}

// =============================================================================
// Main Component
// =============================================================================

export default function LiveDriverMap({
  pickup,
  dropoff,
  stops = [],
  driverLocation,
  driverInfo,
  showRoute = true,
  height = '400px',
  className = '',
}: LiveDriverMapProps) {
  // Calculate map bounds
  const bounds = useMemo(() => {
    const points: [number, number][] = [];
    
    if (pickup.lat && pickup.lng) {
      points.push([pickup.lat, pickup.lng]);
    }
    if (dropoff.lat && dropoff.lng) {
      points.push([dropoff.lat, dropoff.lng]);
    }
    stops.forEach((stop) => {
      if (stop.lat && stop.lng) {
        points.push([stop.lat, stop.lng]);
      }
    });
    if (driverLocation) {
      points.push([driverLocation.lat, driverLocation.lng]);
    }

    if (points.length < 2) {
      // Default to a central location if not enough points
      return null;
    }

    return L.latLngBounds(points);
  }, [pickup, dropoff, stops, driverLocation]);

  // Calculate route line points
  const routePoints = useMemo(() => {
    const points: [number, number][] = [];
    
    if (pickup.lat && pickup.lng) {
      points.push([pickup.lat, pickup.lng]);
    }
    stops.forEach((stop) => {
      if (stop.lat && stop.lng) {
        points.push([stop.lat, stop.lng]);
      }
    });
    if (dropoff.lat && dropoff.lng) {
      points.push([dropoff.lat, dropoff.lng]);
    }

    return points;
  }, [pickup, dropoff, stops]);

  // Driver marker icon with heading
  const carIcon = useMemo(() => {
    return createCarIcon(driverLocation?.heading);
  }, [driverLocation?.heading]);

  // Default center if no bounds - use user's location or cached location
  const defaultCenter: [number, number] = useMemo(() => {
    if (pickup.lat && pickup.lng) {
      return [pickup.lat, pickup.lng];
    }
    // Fall back to user's cached/detected location instead of hardcoded NYC
    const quickLoc = getQuickLocation();
    return [quickLoc.lat, quickLoc.lng];
  }, [pickup]);

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`} style={{ height }}>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        {/* Map tiles - using OpenStreetMap (free) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Map controller for bounds and driver following */}
        <MapController
          bounds={bounds}
          driverLocation={driverLocation}
          followDriver={false}
        />

        {/* Route line */}
        {showRoute && routePoints.length >= 2 && (
          <Polyline
            positions={routePoints}
            color="#3b82f6"
            weight={4}
            opacity={0.7}
            dashArray="10, 10"
          />
        )}

        {/* Pickup marker */}
        {pickup.lat && pickup.lng && (
          <Marker
            position={[pickup.lat, pickup.lng]}
            icon={pickupIcon}
          >
            <Popup>
              <div className="font-medium">📍 Pickup</div>
              <div className="text-sm text-gray-600">{pickup.address_line}</div>
            </Popup>
          </Marker>
        )}

        {/* Stop markers */}
        {stops.map((stop, index) => (
          stop.lat && stop.lng && (
            <Marker
              key={`stop-${index}`}
              position={[stop.lat, stop.lng]}
              icon={stopIcon}
            >
              <Popup>
                <div className="font-medium">⚡ Stop {index + 1}</div>
                <div className="text-sm text-gray-600">{stop.address_line}</div>
              </Popup>
            </Marker>
          )
        ))}

        {/* Dropoff marker */}
        {dropoff.lat && dropoff.lng && (
          <Marker
            position={[dropoff.lat, dropoff.lng]}
            icon={dropoffIcon}
          >
            <Popup>
              <div className="font-medium">🏁 Dropoff</div>
              <div className="text-sm text-gray-600">{dropoff.address_line}</div>
            </Popup>
          </Marker>
        )}

        {/* Driver marker */}
        {driverLocation && (
          <Marker
            position={[driverLocation.lat, driverLocation.lng]}
            icon={carIcon}
          >
            <Popup>
              <div className="font-medium">🚗 {driverInfo?.name || 'Your Driver'}</div>
              {driverInfo?.vehicle && (
                <div className="text-sm text-gray-600">{driverInfo.vehicle}</div>
              )}
              {driverInfo?.plateNumber && (
                <div className="text-sm text-gray-500">{driverInfo.plateNumber}</div>
              )}
              {driverLocation.speed && (
                <div className="text-sm text-gray-500">
                  {Math.round(driverLocation.speed * 3.6)} km/h
                </div>
              )}
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Driver location status overlay */}
      {driverLocation && (
        <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-3 z-[1000]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-lg">
                🚗
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {driverInfo?.name || 'Driver en route'}
                </div>
                <div className="text-sm text-gray-500 dark:text-slate-400">
                  {driverInfo?.vehicle || 'Vehicle'}
                  {driverLocation.speed && ` • ${Math.round(driverLocation.speed * 3.6)} km/h`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-green-600 dark:text-green-400">Live</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
