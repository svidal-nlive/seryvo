/**
 * Seryvo Platform - Admin Fleet Map Component
 * Displays all drivers on a map with real-time location updates
 * Shows driver availability status and active trips
 * Auto-centers on user's region
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RefreshCw, Users, Car, Navigation, MapPin, AlertCircle, Crosshair } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useUserLocation, getQuickLocation } from '../../hooks/useUserLocation';
import { type DriverLocationPayload } from '../../services/websocket';
import type { BookingStatus } from '../../types';

// =============================================================================
// Types
// =============================================================================

interface DriverLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  status: 'available' | 'busy' | 'offline' | 'on_break';
  vehicleType: string;
  plateNumber: string;
  activeBookingId?: string;
  activeBookingStatus?: BookingStatus;
  lastUpdate: string;
}

interface ActiveTrip {
  bookingId: string;
  driverId: string;
  clientName: string;
  status: BookingStatus;
  pickup: { lat: number; lng: number; address: string };
  dropoff: { lat: number; lng: number; address: string };
}

interface FleetMapProps {
  /** Map height */
  height?: string;
  /** Custom class name */
  className?: string;
  /** Initial center coordinates */
  center?: [number, number];
  /** Initial zoom level */
  zoom?: number;
}

// =============================================================================
// Custom Icons
// =============================================================================

const createDriverIcon = (status: DriverLocation['status'], heading?: number): L.DivIcon => {
  const colors = {
    available: '#22c55e',
    busy: '#3b82f6',
    offline: '#6b7280',
    on_break: '#f59e0b',
  };
  
  const color = colors[status];
  const rotation = heading ? `transform: rotate(${heading}deg);` : '';
  
  return L.divIcon({
    className: 'driver-marker',
    html: `
      <div style="
        ${rotation}
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
      ">
        <div style="
          background-color: ${color};
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        ">
          <span style="font-size: 16px;">🚗</span>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

const createLocationIcon = (type: 'pickup' | 'dropoff'): L.DivIcon => {
  const color = type === 'pickup' ? '#22c55e' : '#ef4444';
  const emoji = type === 'pickup' ? '📍' : '🏁';
  
  return L.divIcon({
    className: 'location-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        border: 2px solid white;
      ">
        ${emoji}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

// =============================================================================
// Map Controller
// =============================================================================

interface MapControllerProps {
  center: [number, number];
  zoom: number;
}

function MapController({ center, zoom }: MapControllerProps) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
}

// =============================================================================
// Stats Panel
// =============================================================================

interface StatsPanelProps {
  drivers: DriverLocation[];
  activeTrips: ActiveTrip[];
}

function StatsPanel({ drivers, activeTrips }: StatsPanelProps) {
  const stats = useMemo(() => {
    const available = drivers.filter(d => d.status === 'available').length;
    const busy = drivers.filter(d => d.status === 'busy').length;
    const onBreak = drivers.filter(d => d.status === 'on_break').length;
    const offline = drivers.filter(d => d.status === 'offline').length;
    
    return { available, busy, onBreak, offline, total: drivers.length };
  }, [drivers]);
  
  return (
    <div className="absolute top-4 left-4 z-[1000] bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 min-w-[200px]">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <Users size={18} />
        Fleet Overview
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-300">Available</span>
          <Badge status="completed" className="!text-xs">{stats.available}</Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-300">Busy</span>
          <Badge status="in_progress" className="!text-xs">{stats.busy}</Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-300">On Break</span>
          <Badge status="disputed" className="!text-xs">{stats.onBreak}</Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-300">Offline</span>
          <Badge status="canceled_by_client" className="!text-xs">{stats.offline}</Badge>
        </div>
        <hr className="border-gray-200 dark:border-gray-700 my-2" />
        <div className="flex justify-between items-center font-medium">
          <span className="text-gray-900 dark:text-white">Active Trips</span>
          <span className="text-blue-600 dark:text-blue-400">{activeTrips.length}</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Driver List Panel
// =============================================================================

interface DriverListProps {
  drivers: DriverLocation[];
  selectedDriverId: string | null;
  onSelectDriver: (id: string | null) => void;
}

function DriverListPanel({ drivers, selectedDriverId, onSelectDriver }: DriverListProps) {
  const [filter, setFilter] = useState<'all' | 'available' | 'busy' | 'on_break'>('all');
  
  const filteredDrivers = useMemo(() => {
    if (filter === 'all') return drivers;
    return drivers.filter(d => d.status === filter);
  }, [drivers, filter]);
  
  const statusColors = {
    available: 'bg-green-500',
    busy: 'bg-blue-500',
    offline: 'bg-gray-400',
    on_break: 'bg-amber-500',
  };
  
  return (
    <div className="absolute top-4 right-4 z-[1000] bg-white dark:bg-slate-800 rounded-lg shadow-lg w-72 max-h-[calc(100%-2rem)] overflow-hidden flex flex-col">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Car size={18} />
          Drivers ({filteredDrivers.length})
        </h3>
        <div className="flex gap-1 flex-wrap">
          {(['all', 'available', 'busy', 'on_break'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-xs rounded-full transition ${
                filter === f
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {f === 'all' ? 'All' : f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-y-auto flex-1 p-2 space-y-1">
        {filteredDrivers.map(driver => (
          <button
            key={driver.id}
            onClick={() => onSelectDriver(selectedDriverId === driver.id ? null : driver.id)}
            className={`w-full text-left p-2 rounded-lg transition ${
              selectedDriverId === driver.id
                ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${statusColors[driver.status]}`} />
              <span className="font-medium text-gray-900 dark:text-white text-sm truncate flex-1">
                {driver.name}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 ml-4 mt-0.5">
              {driver.vehicleType} • {driver.plateNumber}
            </div>
            {driver.activeBookingId && (
              <div className="text-xs text-blue-600 dark:text-blue-400 ml-4 mt-0.5 flex items-center gap-1">
                <Navigation size={10} />
                Trip in progress
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function FleetMap({
  height = '600px',
  className = '',
  center,
  zoom = 14,
}: FleetMapProps) {
  // Get user location for initial center
  const { location: userLocation, requestLocation } = useUserLocation({ autoDetect: true });
  
  // Use provided center, or user location, or cached/default
  const quickLoc = getQuickLocation();
  const effectiveCenter: [number, number] = center 
    || (userLocation ? [userLocation.lat, userLocation.lng] : [quickLoc.lat, quickLoc.lng]);
  
  // State for fleet data
  const [drivers, setDrivers] = useState<DriverLocation[]>([]);
  const [activeTrips, setActiveTrips] = useState<ActiveTrip[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [showTrips, setShowTrips] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>(effectiveCenter);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch fleet status from API
  const fetchFleetStatus = useCallback(async () => {
    try {
      const { getFleetStatus } = await import('../../services/api/admin');
      const data = await getFleetStatus();
      
      // Transform API data to component format
      const transformedDrivers: DriverLocation[] = data.drivers.map(d => ({
        id: d.id,
        name: d.name,
        lat: d.lat || effectiveCenter[0], // Use center if no location
        lng: d.lng || effectiveCenter[1],
        heading: d.heading || undefined,
        speed: d.speed || undefined,
        status: d.status as DriverLocation['status'],
        vehicleType: d.vehicle_type || 'Unknown Vehicle',
        plateNumber: d.plate_number || 'N/A',
        activeBookingId: d.active_booking_id || undefined,
        activeBookingStatus: d.active_booking_status as BookingStatus | undefined,
        lastUpdate: d.last_update || new Date().toISOString(),
      }));
      
      const transformedTrips: ActiveTrip[] = data.active_trips.map(t => ({
        bookingId: t.booking_id,
        driverId: t.driver_id,
        clientName: t.client_name,
        status: t.status as BookingStatus,
        pickup: {
          lat: t.pickup_lat || 0,
          lng: t.pickup_lng || 0,
          address: t.pickup_address,
        },
        dropoff: {
          lat: t.dropoff_lat || 0,
          lng: t.dropoff_lng || 0,
          address: t.dropoff_address,
        },
      }));
      
      setDrivers(transformedDrivers);
      setActiveTrips(transformedTrips);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch fleet status:', err);
      setError('Failed to load fleet data');
    } finally {
      setIsLoading(false);
    }
  }, [effectiveCenter]);
  
  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchFleetStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchFleetStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchFleetStatus]);
  
  // Update map center when user location is determined
  useEffect(() => {
    if (userLocation && !center) {
      setMapCenter([userLocation.lat, userLocation.lng]);
    }
  }, [userLocation, center]);
  
  // WebSocket for real-time updates
  const { isConnected } = useWebSocket({
    autoConnect: true,
    onDriverLocation: (payload: DriverLocationPayload) => {
      // Update driver location from WebSocket
      setDrivers(prev => prev.map(d => 
        d.id === payload.driver_id
          ? {
              ...d,
              lat: payload.lat,
              lng: payload.lng,
              heading: payload.heading,
              speed: payload.speed,
              lastUpdate: new Date().toISOString(),
            }
          : d
      ));
    },
    onBookingUpdate: () => {
      // Refresh fleet data when booking status changes
      fetchFleetStatus();
    },
  });
  
  // Simulate movement for demo purposes (only if drivers have locations)
  useEffect(() => {
    if (!isLive || drivers.length === 0) return;
    
    const interval = setInterval(() => {
      setDrivers(prev => prev.map(driver => {
        // Only simulate movement for drivers with valid locations and busy/available status
        if ((driver.status === 'busy' || driver.status === 'available') && driver.lat && driver.lng) {
          // Small random movement
          const latDelta = (Math.random() - 0.5) * 0.001;
          const lngDelta = (Math.random() - 0.5) * 0.001;
          const newHeading = driver.heading 
            ? (driver.heading + (Math.random() - 0.5) * 20) % 360
            : Math.random() * 360;
          
          return {
            ...driver,
            lat: driver.lat + latDelta,
            lng: driver.lng + lngDelta,
            heading: newHeading,
            speed: driver.status === 'busy' ? 20 + Math.random() * 30 : 0,
            lastUpdate: new Date().toISOString(),
          };
        }
        return driver;
      }));
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isLive, drivers.length]);
  
  const selectedDriver = useMemo(() => 
    drivers.find(d => d.id === selectedDriverId),
    [drivers, selectedDriverId]
  );
  
  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    fetchFleetStatus();
  }, [fetchFleetStatus]);
  
  // Handle center to my location
  const handleCenterOnMe = useCallback(() => {
    requestLocation();
  }, [requestLocation]);
  
  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`} style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController center={mapCenter} zoom={zoom} />
        
        {/* Driver markers */}
        {drivers.map(driver => (
          <Marker
            key={driver.id}
            position={[driver.lat, driver.lng]}
            icon={createDriverIcon(driver.status, driver.heading)}
            eventHandlers={{
              click: () => setSelectedDriverId(driver.id),
            }}
          >
            <Popup>
              <div className="min-w-[180px]">
                <div className="font-medium text-gray-900">{driver.name}</div>
                <div className="text-sm text-gray-600">{driver.vehicleType}</div>
                <div className="text-sm text-gray-500">{driver.plateNumber}</div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    driver.status === 'available' ? 'bg-green-100 text-green-700' :
                    driver.status === 'busy' ? 'bg-blue-100 text-blue-700' :
                    driver.status === 'on_break' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {driver.status.replace('_', ' ')}
                  </span>
                  {driver.speed !== undefined && driver.speed > 0 && (
                    <span className="text-xs text-gray-500">
                      {Math.round(driver.speed)} km/h
                    </span>
                  )}
                </div>
                {driver.activeBookingId && (
                  <div className="mt-2 text-xs text-blue-600">
                    📍 Active trip: {driver.activeBookingId}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
        
        {/* Active trip markers */}
        {showTrips && activeTrips.map(trip => (
          <>
            <Marker
              key={`${trip.bookingId}-pickup`}
              position={[trip.pickup.lat, trip.pickup.lng]}
              icon={createLocationIcon('pickup')}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-medium">📍 Pickup</div>
                  <div className="text-gray-600">{trip.pickup.address}</div>
                  <div className="text-gray-500 mt-1">Client: {trip.clientName}</div>
                </div>
              </Popup>
            </Marker>
            <Marker
              key={`${trip.bookingId}-dropoff`}
              position={[trip.dropoff.lat, trip.dropoff.lng]}
              icon={createLocationIcon('dropoff')}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-medium">🏁 Dropoff</div>
                  <div className="text-gray-600">{trip.dropoff.address}</div>
                </div>
              </Popup>
            </Marker>
          </>
        ))}
        
        {/* Selected driver highlight circle */}
        {selectedDriver && (
          <Circle
            center={[selectedDriver.lat, selectedDriver.lng]}
            radius={150}
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.1,
              weight: 2,
            }}
          />
        )}
      </MapContainer>
      
      {/* Stats Panel */}
      <StatsPanel drivers={drivers} activeTrips={activeTrips} />
      
      {/* Driver List */}
      <DriverListPanel
        drivers={drivers}
        selectedDriverId={selectedDriverId}
        onSelectDriver={setSelectedDriverId}
      />
      
      {/* Controls */}
      <div className="absolute bottom-4 left-4 z-[1000] flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          className="!bg-white dark:!bg-slate-800 shadow-lg"
        >
          <RefreshCw size={16} />
        </Button>
        <button
          onClick={() => setShowTrips(!showTrips)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg transition ${
            showTrips
              ? 'bg-blue-500 text-white'
              : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300'
          }`}
        >
          <MapPin size={16} className="inline mr-1" />
          Trips
        </button>
        <button
          onClick={() => setIsLive(!isLive)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg transition flex items-center gap-1.5 ${
            isLive
              ? 'bg-green-500 text-white'
              : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
          Live
        </button>
      </div>
      
      {/* Connection status */}
      {!isConnected && (
        <div className="absolute bottom-4 right-4 z-[1000] flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-2 rounded-lg text-sm shadow-lg">
          <AlertCircle size={16} />
          Reconnecting...
        </div>
      )}
    </div>
  );
}
