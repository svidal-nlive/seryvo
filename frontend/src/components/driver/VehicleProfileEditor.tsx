import React, { useState, useEffect } from 'react';
import { Car, Save, Edit2, AlertCircle, CheckCircle, Camera, X } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import { backend } from '../../services/backend';
import { useAuth } from '../../contexts/AuthContext';
import type { Vehicle, ServiceTypeCode } from '../../types';

const SERVICE_TYPE_OPTIONS: { id: ServiceTypeCode; label: string; description: string }[] = [
  { id: 'standard', label: 'Standard', description: 'Regular sedan rides' },
  { id: 'premium', label: 'Premium', description: 'Luxury vehicles' },
  { id: 'van', label: 'Van / XL', description: 'Larger vehicles for groups' },
];

const ACCESSIBILITY_OPTIONS = [
  { id: 'wheelchair', label: 'Wheelchair Accessible' },
  { id: 'child_seat', label: 'Child Seat Available' },
  { id: 'pet_friendly', label: 'Pet Friendly' },
];

interface VehicleFormData {
  make: string;
  model: string;
  year: number;
  color: string;
  license_plate: string;
  vin: string;
  service_types: ServiceTypeCode[];
  capacity_passengers: number;
  capacity_luggage: number;
  accessibility_features: string[];
  insurance_expiry: string;
  registration_expiry: string;
  inspection_expiry: string;
}

export const VehicleProfileEditor: React.FC = () => {
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<VehicleFormData>({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    license_plate: '',
    vin: '',
    service_types: ['standard'],
    capacity_passengers: 4,
    capacity_luggage: 2,
    accessibility_features: [],
    insurance_expiry: '',
    registration_expiry: '',
    inspection_expiry: '',
  });

  useEffect(() => {
    loadVehicle();
  }, [user]);

  const loadVehicle = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await backend.getVehicleByDriverId(user.id);
      setVehicle(data);
      if (data) {
        setFormData({
          make: data.make,
          model: data.model,
          year: data.year,
          color: data.color,
          license_plate: data.license_plate,
          vin: data.vin || '',
          service_types: data.service_types,
          capacity_passengers: data.capacity_passengers,
          capacity_luggage: data.capacity_luggage,
          accessibility_features: data.accessibility_features,
          insurance_expiry: data.insurance_expiry?.split('T')[0] || '',
          registration_expiry: data.registration_expiry?.split('T')[0] || '',
          inspection_expiry: data.inspection_expiry?.split('T')[0] || '',
        });
      }
    } catch (err) {
      setError('Failed to load vehicle data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof VehicleFormData, value: string | number | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleServiceType = (serviceType: ServiceTypeCode) => {
    setFormData((prev) => ({
      ...prev,
      service_types: prev.service_types.includes(serviceType)
        ? prev.service_types.filter((t) => t !== serviceType)
        : [...prev.service_types, serviceType],
    }));
  };

  const toggleAccessibility = (feature: string) => {
    setFormData((prev) => ({
      ...prev,
      accessibility_features: prev.accessibility_features.includes(feature)
        ? prev.accessibility_features.filter((f) => f !== feature)
        : [...prev.accessibility_features, feature],
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      // Validate required fields
      if (!formData.make || !formData.model || !formData.license_plate || !formData.color) {
        throw new Error('Please fill in all required fields');
      }

      if (formData.service_types.length === 0) {
        throw new Error('Please select at least one service type');
      }

      const vehicleData = {
        make: formData.make,
        model: formData.model,
        year: formData.year,
        color: formData.color,
        license_plate: formData.license_plate,
        vin: formData.vin || undefined,
        service_types: formData.service_types,
        capacity_passengers: formData.capacity_passengers,
        capacity_luggage: formData.capacity_luggage,
        accessibility_features: formData.accessibility_features,
        photo_urls: vehicle?.photo_urls || {},
        insurance_expiry: formData.insurance_expiry ? new Date(formData.insurance_expiry).toISOString() : undefined,
        registration_expiry: formData.registration_expiry ? new Date(formData.registration_expiry).toISOString() : undefined,
        inspection_expiry: formData.inspection_expiry ? new Date(formData.inspection_expiry).toISOString() : undefined,
      };

      if (vehicle) {
        // Update existing vehicle
        const updated = await backend.updateVehicle(vehicle.id, vehicleData);
        if (updated) {
          setVehicle(updated);
          setSuccess('Vehicle updated successfully');
        }
      } else {
        // Create new vehicle
        const created = await backend.createVehicle(user.id, vehicleData);
        setVehicle(created);
        setSuccess('Vehicle registered successfully! Pending admin approval.');
      }

      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vehicle');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: Vehicle['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'pending_approval':
        return <Badge variant="warning">Pending Approval</Badge>;
      case 'inactive':
        return <Badge variant="neutral">Inactive</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  // No vehicle registered yet
  if (!vehicle && !isEditing) {
    return (
      <Card className="text-center py-12">
        <Car size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2 dark:text-white">No Vehicle Registered</h3>
        <p className="text-gray-500 dark:text-slate-400 mb-6">
          Register your vehicle to start accepting rides
        </p>
        <Button onClick={() => setIsEditing(true)}>
          <Car size={18} /> Register Vehicle
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Vehicle Profile</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage your vehicle information
          </p>
        </div>
        {vehicle && !isEditing && (
          <Button variant="secondary" onClick={() => setIsEditing(true)}>
            <Edit2 size={16} /> Edit
          </Button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg">
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      {/* Vehicle Card - View Mode */}
      {vehicle && !isEditing && (
        <Card>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <Car size={32} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold dark:text-white">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h3>
                <p className="text-gray-500 dark:text-slate-400">{vehicle.color}</p>
              </div>
            </div>
            {getStatusBadge(vehicle.status)}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-xs text-gray-400 uppercase">License Plate</p>
              <p className="font-mono font-semibold dark:text-white">{vehicle.license_plate}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">Passengers</p>
              <p className="font-semibold dark:text-white">{vehicle.capacity_passengers}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">Luggage</p>
              <p className="font-semibold dark:text-white">{vehicle.capacity_luggage}</p>
            </div>
            {vehicle.vin && (
              <div>
                <p className="text-xs text-gray-400 uppercase">VIN</p>
                <p className="font-mono text-sm dark:text-white">{vehicle.vin}</p>
              </div>
            )}
          </div>

          {/* Service Types */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 uppercase mb-2">Service Types</p>
            <div className="flex flex-wrap gap-2">
              {vehicle.service_types.map((type) => (
                <span
                  key={type}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium capitalize"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>

          {/* Accessibility Features */}
          {vehicle.accessibility_features.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 uppercase mb-2">Accessibility</p>
              <div className="flex flex-wrap gap-2">
                {vehicle.accessibility_features.map((feature) => (
                  <span
                    key={feature}
                    className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium"
                  >
                    {ACCESSIBILITY_OPTIONS.find((o) => o.id === feature)?.label || feature}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Expiry Dates */}
          <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
            <p className="text-xs text-gray-400 uppercase mb-3">Document Expiry</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-slate-400">Insurance</p>
                <p className={`font-medium ${vehicle.insurance_expiry && new Date(vehicle.insurance_expiry) < new Date() ? 'text-red-600' : 'dark:text-white'}`}>
                  {vehicle.insurance_expiry ? new Date(vehicle.insurance_expiry).toLocaleDateString() : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-slate-400">Registration</p>
                <p className={`font-medium ${vehicle.registration_expiry && new Date(vehicle.registration_expiry) < new Date() ? 'text-red-600' : 'dark:text-white'}`}>
                  {vehicle.registration_expiry ? new Date(vehicle.registration_expiry).toLocaleDateString() : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-slate-400">Inspection</p>
                <p className={`font-medium ${vehicle.inspection_expiry && new Date(vehicle.inspection_expiry) < new Date() ? 'text-red-600' : 'dark:text-white'}`}>
                  {vehicle.inspection_expiry ? new Date(vehicle.inspection_expiry).toLocaleDateString() : 'Not set'}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Edit Form */}
      {isEditing && (
        <Card>
          <h3 className="text-lg font-semibold mb-6 dark:text-white">
            {vehicle ? 'Edit Vehicle' : 'Register New Vehicle'}
          </h3>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Make <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.make}
                  onChange={(e) => handleInputChange('make', e.target.value)}
                  placeholder="e.g., Toyota"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Model <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                  placeholder="e.g., Camry"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Year <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => handleInputChange('year', parseInt(e.target.value))}
                  min={2000}
                  max={new Date().getFullYear() + 1}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Color <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  placeholder="e.g., Silver"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  License Plate <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.license_plate}
                  onChange={(e) => handleInputChange('license_plate', e.target.value.toUpperCase())}
                  placeholder="e.g., ABC-1234"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  VIN (Optional)
                </label>
                <input
                  type="text"
                  value={formData.vin}
                  onChange={(e) => handleInputChange('vin', e.target.value.toUpperCase())}
                  placeholder="Vehicle Identification Number"
                  maxLength={17}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
            </div>

            {/* Capacity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Passenger Capacity
                </label>
                <input
                  type="number"
                  value={formData.capacity_passengers}
                  onChange={(e) => handleInputChange('capacity_passengers', parseInt(e.target.value))}
                  min={1}
                  max={15}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Luggage Capacity
                </label>
                <input
                  type="number"
                  value={formData.capacity_luggage}
                  onChange={(e) => handleInputChange('capacity_luggage', parseInt(e.target.value))}
                  min={0}
                  max={10}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            {/* Service Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Service Types <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {SERVICE_TYPE_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      formData.service_types.includes(option.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.service_types.includes(option.id)}
                      onChange={() => toggleServiceType(option.id)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <p className="font-medium dark:text-white">{option.label}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Accessibility Features */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Accessibility Features
              </label>
              <div className="flex flex-wrap gap-2">
                {ACCESSIBILITY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleAccessibility(option.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      formData.accessibility_features.includes(option.id)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Document Expiry Dates */}
            <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Document Expiry Dates
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Insurance Expiry</label>
                  <input
                    type="date"
                    value={formData.insurance_expiry}
                    onChange={(e) => handleInputChange('insurance_expiry', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Registration Expiry</label>
                  <input
                    type="date"
                    value={formData.registration_expiry}
                    onChange={(e) => handleInputChange('registration_expiry', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Inspection Expiry</label>
                  <input
                    type="date"
                    value={formData.inspection_expiry}
                    onChange={(e) => handleInputChange('inspection_expiry', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditing(false);
                  setError(null);
                  // Reset form if canceling new vehicle
                  if (!vehicle) {
                    setFormData({
                      make: '',
                      model: '',
                      year: new Date().getFullYear(),
                      color: '',
                      license_plate: '',
                      vin: '',
                      service_types: ['standard'],
                      capacity_passengers: 4,
                      capacity_luggage: 2,
                      accessibility_features: [],
                      insurance_expiry: '',
                      registration_expiry: '',
                      inspection_expiry: '',
                    });
                  }
                }}
                className="flex-1"
              >
                <X size={16} /> Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? 'Saving...' : <><Save size={16} /> Save Vehicle</>}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
