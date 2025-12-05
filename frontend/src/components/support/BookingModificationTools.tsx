/**
 * Seryvo Platform - Booking Modification Tools
 * Support tools for updating pickup/dropoff and reassigning drivers
 */

import { useState } from 'react';
import {
  MapPin,
  Car,
  User,
  AlertTriangle,
  CheckCircle,
  X,
  Search,
  Star,
  Navigation,
  RefreshCw,
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import type { Booking } from '../../types';

// =============================================================================
// Types
// =============================================================================

interface BookingModificationToolsProps {
  booking: Booking;
  onUpdate?: (booking: Booking) => void;
  onClose?: () => void;
}

interface LocationUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  locationType: 'pickup' | 'dropoff';
  onSave: (newAddress: string, newCoordinates?: { lat: number; lng: number }) => void;
}

interface ReassignDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  onReassign: (driverId: string, reason: string) => void;
}

// Local driver type for available drivers list
interface AvailableDriver {
  id: string;
  full_name: string;
  phone_number: string;
  rating_average: number;
  total_trips_completed: number;
  vehicle: {
    make: string;
    model: string;
    year: number;
    color: string;
    license_plate: string;
  };
}

// =============================================================================
// Mock Data
// =============================================================================

const MOCK_AVAILABLE_DRIVERS: AvailableDriver[] = [
  {
    id: 'driver-1',
    full_name: 'John Smith',
    phone_number: '+1-555-0101',
    rating_average: 4.9,
    total_trips_completed: 1247,
    vehicle: {
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      color: 'White',
      license_plate: 'ABC-1234',
    },
  },
  {
    id: 'driver-2',
    full_name: 'Sarah Johnson',
    phone_number: '+1-555-0102',
    rating_average: 4.8,
    total_trips_completed: 892,
    vehicle: {
      make: 'Honda',
      model: 'Accord',
      year: 2023,
      color: 'Black',
      license_plate: 'XYZ-5678',
    },
  },
  {
    id: 'driver-3',
    full_name: 'Mike Williams',
    phone_number: '+1-555-0103',
    rating_average: 4.7,
    total_trips_completed: 567,
    vehicle: {
      make: 'Hyundai',
      model: 'Sonata',
      year: 2021,
      color: 'Silver',
      license_plate: 'DEF-9012',
    },
  },
];

const REASSIGN_REASONS = [
  'Driver unavailable',
  'Driver requested reassignment',
  'Client preference',
  'Vehicle issue',
  'Route optimization',
  'Safety concern',
  'Other',
];

// =============================================================================
// Location Update Modal Component
// =============================================================================

function LocationUpdateModal({
  isOpen,
  onClose,
  booking,
  locationType,
  onSave,
}: LocationUpdateModalProps) {
  const pickupAddress = booking.legs[0]?.pickup?.address_line || '';
  const dropoffAddress = booking.legs[0]?.dropoff?.address_line || '';
  
  const [newAddress, setNewAddress] = useState(
    locationType === 'pickup' 
      ? pickupAddress 
      : dropoffAddress
  );
  const [notes, setNotes] = useState('');
  const [notifyClient, setNotifyClient] = useState(true);
  const [notifyDriver, setNotifyDriver] = useState(true);

  const handleSave = () => {
    onSave(newAddress);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Update ${locationType === 'pickup' ? 'Pickup' : 'Dropoff'} Location`}
      size="md"
    >
      <div className="space-y-4">
        {/* Current Location */}
        <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current {locationType}</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            {locationType === 'pickup' ? pickupAddress : dropoffAddress}
          </p>
        </div>

        {/* New Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            New Address *
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Enter new address..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Fare will be automatically recalculated based on new route
          </p>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Reason for Change
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Why is this location being changed?"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* Notifications */}
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={notifyClient}
              onChange={(e) => setNotifyClient(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Notify client of change</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={notifyDriver}
              onChange={(e) => setNotifyDriver(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Notify driver of change</span>
          </label>
        </div>

        {/* Warning */}
        {booking.status === 'in_progress' && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Trip in Progress
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-300">
                Changing location during an active trip will update the driver&apos;s navigation immediately.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSave}
            disabled={!newAddress.trim() || newAddress === (locationType === 'pickup' ? pickupAddress : dropoffAddress)}
            className="flex-1"
          >
            Update Location
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// =============================================================================
// Reassign Driver Modal Component
// =============================================================================

function ReassignDriverModal({
  isOpen,
  onClose,
  booking,
  onReassign,
}: ReassignDriverModalProps) {
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [notifyCurrentDriver, setNotifyCurrentDriver] = useState(true);
  const [notifyClient, setNotifyClient] = useState(true);
  // Start with empty array - data populates when demo data is loaded
  const [availableDrivers] = useState<AvailableDriver[]>([]);

  // Filter drivers
  const filteredDrivers = availableDrivers.filter(driver => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      driver.full_name?.toLowerCase().includes(query) ||
      driver.vehicle?.make?.toLowerCase().includes(query) ||
      driver.vehicle?.model?.toLowerCase().includes(query)
    );
  });

  const handleReassign = () => {
    if (!selectedDriver) return;
    const finalReason = reason === 'Other' ? customReason : reason;
    onReassign(selectedDriver, finalReason);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reassign Driver"
      size="lg"
    >
      <div className="space-y-4">
        {/* Current Driver */}
        {booking.driver_id && (
          <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Driver</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Car className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {booking.driver_id}
                </p>
                <p className="text-sm text-gray-500">Currently assigned</p>
              </div>
            </div>
          </div>
        )}

        {/* Search Drivers */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Select New Driver
          </label>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search drivers..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>

          {/* Driver List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filteredDrivers.map(driver => (
              <div
                key={driver.id}
                onClick={() => setSelectedDriver(driver.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedDriver === driver.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {driver.full_name}
                      </p>
                      <span className="flex items-center gap-0.5 text-sm text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-amber-500" />
                        {driver.rating_average?.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {driver.vehicle?.color} {driver.vehicle?.make} {driver.vehicle?.model}
                    </p>
                    <p className="text-xs text-gray-400">
                      {driver.total_trips_completed} trips • {driver.phone_number}
                    </p>
                  </div>
                  {selectedDriver === driver.id && (
                    <CheckCircle className="w-5 h-5 text-primary-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Reason for Reassignment *
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          >
            <option value="">Select a reason...</option>
            {REASSIGN_REASONS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {reason === 'Other' && (
          <div>
            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Enter custom reason..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>
        )}

        {/* Notifications */}
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={notifyCurrentDriver}
              onChange={(e) => setNotifyCurrentDriver(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Notify current driver</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={notifyClient}
              onChange={(e) => setNotifyClient(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Notify client</span>
          </label>
        </div>

        {/* Warning for in-progress trips */}
        {booking.status === 'in_progress' && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                Trip in Progress
              </p>
              <p className="text-xs text-red-600 dark:text-red-300">
                Reassigning during an active trip should only be done in emergency situations.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleReassign}
            disabled={!selectedDriver || !reason || (reason === 'Other' && !customReason.trim())}
            className="flex-1"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reassign Driver
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function BookingModificationTools({
  booking,
  onUpdate: _onUpdate,
  onClose,
}: BookingModificationToolsProps) {
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showDropoffModal, setShowDropoffModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [actionLog, setActionLog] = useState<{ action: string; timestamp: string }[]>([]);

  // Handle location update
  const handleLocationUpdate = (type: 'pickup' | 'dropoff', newAddress: string) => {
    const log = {
      action: `Updated ${type} location to: ${newAddress}`,
      timestamp: new Date().toISOString(),
    };
    setActionLog([log, ...actionLog]);
    
    // In production, call API to update booking
    // eslint-disable-next-line no-console
    console.log(`Updating ${type} to:`, newAddress);
  };

  // Handle driver reassignment
  const handleReassign = (driverId: string, reason: string) => {
    // Note: In production, driver info would come from backend
    const log = {
      action: `Reassigned to driver ${driverId} - Reason: ${reason}`,
      timestamp: new Date().toISOString(),
    };
    setActionLog([log, ...actionLog]);
    
    // In production, call API to reassign
    // eslint-disable-next-line no-console
    console.log('Reassigning to:', driverId, 'Reason:', reason);
  };

  // Check if modifications are allowed
  const canModifyLocations = ['requested', 'driver_assigned', 'driver_en_route', 'driver_arrived'].includes(booking.status);
  const canReassignDriver = ['driver_assigned', 'driver_en_route', 'driver_arrived'].includes(booking.status);

  return (
    <Card className="p-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Booking Modifications</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Booking #{booking.booking_id}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Current Booking Info */}
      <div className="p-4 bg-gray-50 dark:bg-slate-800/50 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <Navigation className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">Pickup</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {booking.legs[0]?.pickup?.address_line || 'Not set'}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <MapPin className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">Dropoff</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {booking.legs[0]?.dropoff?.address_line || 'Not set'}
            </p>
          </div>
        </div>
        {booking.driver_id && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Car className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">Driver</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {booking.driver_id}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Available Actions
        </h4>

        <Button
          variant="secondary"
          onClick={() => setShowPickupModal(true)}
          disabled={!canModifyLocations}
          className="w-full justify-start"
        >
          <MapPin className="w-4 h-4 mr-2 text-green-500" />
          Update Pickup Location
        </Button>

        <Button
          variant="secondary"
          onClick={() => setShowDropoffModal(true)}
          disabled={!canModifyLocations}
          className="w-full justify-start"
        >
          <MapPin className="w-4 h-4 mr-2 text-red-500" />
          Update Dropoff Location
        </Button>

        <Button
          variant="secondary"
          onClick={() => setShowReassignModal(true)}
          disabled={!canReassignDriver}
          className="w-full justify-start"
        >
          <RefreshCw className="w-4 h-4 mr-2 text-blue-500" />
          Reassign Driver
        </Button>

        {!canModifyLocations && !canReassignDriver && (
          <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-sm text-gray-500 dark:text-gray-400">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            Modifications are not available for bookings in &ldquo;{booking.status}&rdquo; status.
          </div>
        )}
      </div>

      {/* Action Log */}
      {actionLog.length > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Recent Changes
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {actionLog.map((log, index) => (
              <div key={index} className="text-sm">
                <p className="text-gray-900 dark:text-white">{log.action}</p>
                <p className="text-xs text-gray-500">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <LocationUpdateModal
        isOpen={showPickupModal}
        onClose={() => setShowPickupModal(false)}
        booking={booking}
        locationType="pickup"
        onSave={(address) => handleLocationUpdate('pickup', address)}
      />

      <LocationUpdateModal
        isOpen={showDropoffModal}
        onClose={() => setShowDropoffModal(false)}
        booking={booking}
        locationType="dropoff"
        onSave={(address) => handleLocationUpdate('dropoff', address)}
      />

      <ReassignDriverModal
        isOpen={showReassignModal}
        onClose={() => setShowReassignModal(false)}
        booking={booking}
        onReassign={handleReassign}
      />
    </Card>
  );
}
