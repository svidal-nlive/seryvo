import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Car,
  Shield,
  Headphones,
  Users,
  Save,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { Role, DriverCoreStatus, Client, Driver, SupportAgent, Admin } from '../../types';

type AnyUser = Client | Driver | SupportAgent | Admin;

interface UserFormData {
  full_name: string;
  email: string;
  phone?: string;
  role: Role;
  password?: string;
  // Driver-specific
  core_status?: DriverCoreStatus;
  vehicle_make?: string;
  vehicle_model?: string;
  license_plate?: string;
}

interface UserCRUDModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: UserFormData) => Promise<void>;
  user?: AnyUser | null;
  mode: 'create' | 'edit';
}

const roleOptions: { value: Role; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'client', label: 'Client', icon: <Users size={20} />, description: 'Can book rides' },
  { value: 'driver', label: 'Driver', icon: <Car size={20} />, description: 'Can accept and complete trips' },
  { value: 'support_agent', label: 'Support Agent', icon: <Headphones size={20} />, description: 'Can handle tickets' },
  { value: 'admin', label: 'Admin', icon: <Shield size={20} />, description: 'Full platform access' },
];

const driverStatusOptions: { value: DriverCoreStatus; label: string }[] = [
  { value: 'pending_verification', label: 'Pending Verification' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'banned', label: 'Banned' },
];

export default function UserCRUDModal({ isOpen, onClose, onSave, user, mode }: UserCRUDModalProps) {
  const [formData, setFormData] = useState<UserFormData>({
    full_name: '',
    email: '',
    phone: '',
    role: 'client',
    password: '',
    core_status: 'pending_verification',
    vehicle_make: '',
    vehicle_model: '',
    license_plate: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user && mode === 'edit') {
      const driver = user.role === 'driver' ? (user as Driver) : null;
      setFormData({
        full_name: user.full_name,
        email: user.email,
        phone: '',
        role: user.role,
        password: '',
        core_status: driver?.core_status || 'pending_verification',
        vehicle_make: '',
        vehicle_model: '',
        license_plate: '',
      });
    } else {
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        role: 'client',
        password: '',
        core_status: 'pending_verification',
        vehicle_make: '',
        vehicle_model: '',
        license_plate: '',
      });
    }
    setErrors({});
  }, [user, mode, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (mode === 'create' && !formData.password) {
      newErrors.password = 'Password is required for new users';
    } else if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.role === 'driver') {
      if (!formData.vehicle_make?.trim()) {
        newErrors.vehicle_make = 'Vehicle make is required for drivers';
      }
      if (!formData.vehicle_model?.trim()) {
        newErrors.vehicle_model = 'Vehicle model is required for drivers';
      }
      if (!formData.license_plate?.trim()) {
        newErrors.license_plate = 'License plate is required for drivers';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving user:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof UserFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Create New User' : 'Edit User'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Role Selection (only for create) */}
        {mode === 'create' && (
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              User Role *
            </label>
            <div className="grid gap-2 grid-cols-2">
              {roleOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleChange('role', option.value)}
                  className={`
                    flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border-2 text-left transition-colors touch-manipulation min-h-[60px] sm:min-h-0
                    ${formData.role === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                >
                  <div
                    className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                      formData.role === option.value
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {option.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white truncate">{option.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Basic Info */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name *
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] sm:min-h-0 ${
                  errors.full_name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                }`}
                placeholder="John Doe"
              />
            </div>
            {errors.full_name && (
              <p className="mt-1 text-xs sm:text-sm text-red-500">{errors.full_name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email *
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] sm:min-h-0 ${
                  errors.email ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                }`}
                placeholder="john@example.com"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs sm:text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone
            </label>
            <div className="relative">
              <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] sm:min-h-0"
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {mode === 'create' ? 'Password *' : 'New Password (leave blank to keep current)'}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password || ''}
              onChange={(e) => handleChange('password', e.target.value)}
              className={`w-full px-4 py-2 pr-10 rounded-lg border bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] sm:min-h-0 ${
                errors.password ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
              }`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 touch-manipulation"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs sm:text-sm text-red-500">{errors.password}</p>
          )}
        </div>

        {/* Driver-specific fields */}
        {formData.role === 'driver' && (
          <>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
                Driver Information
              </h3>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Initial Status
                </label>
                <select
                  value={formData.core_status}
                  onChange={(e) => handleChange('core_status', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 min-h-[44px] sm:min-h-0"
                >
                  {driverStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vehicle Make *
                </label>
                <input
                  type="text"
                  value={formData.vehicle_make || ''}
                  onChange={(e) => handleChange('vehicle_make', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-800 min-h-[44px] sm:min-h-0 ${
                    errors.vehicle_make ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                  }`}
                  placeholder="Toyota"
                />
                {errors.vehicle_make && (
                  <p className="mt-1 text-xs sm:text-sm text-red-500">{errors.vehicle_make}</p>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vehicle Model *
                </label>
                <input
                  type="text"
                  value={formData.vehicle_model || ''}
                  onChange={(e) => handleChange('vehicle_model', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-800 min-h-[44px] sm:min-h-0 ${
                    errors.vehicle_model ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                  }`}
                  placeholder="Camry"
                />
                {errors.vehicle_model && (
                  <p className="mt-1 text-xs sm:text-sm text-red-500">{errors.vehicle_model}</p>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  License Plate *
                </label>
                <input
                  type="text"
                  value={formData.license_plate || ''}
                  onChange={(e) => handleChange('license_plate', e.target.value.toUpperCase())}
                  className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-800 min-h-[44px] sm:min-h-0 ${
                    errors.license_plate ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                  }`}
                  placeholder="ABC-1234"
                />
                {errors.license_plate && (
                  <p className="mt-1 text-xs sm:text-sm text-red-500">{errors.license_plate}</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1 min-h-[44px] sm:min-h-0">
            <X size={18} /> Cancel
          </Button>
          <Button type="submit" disabled={saving} className="flex-1 min-h-[44px] sm:min-h-0">
            <Save size={18} /> {saving ? 'Saving...' : mode === 'create' ? 'Create User' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
