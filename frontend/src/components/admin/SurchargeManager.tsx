import React, { useState } from 'react';
import {
  Plane,
  Navigation,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  MapPin,
  Check,
  X,
  Percent,
  Clock,
  Calendar,
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import type { Surcharge, SurchargeType, ServiceTypeCode } from '../../types';

// Mock surcharge data
const MOCK_SURCHARGES: Surcharge[] = [
  {
    id: 'surcharge-001',
    name: 'JFK Airport Pickup',
    type: 'airport',
    description: 'Pickup surcharge for JFK International Airport',
    amount_cents: 1500,
    is_percentage: false,
    applies_to_pickup: true,
    applies_to_dropoff: false,
    location_keywords: ['JFK', 'John F Kennedy', 'Queens NY 11430'],
    is_active: true,
    service_types: ['standard', 'premium', 'van'],
    created_at: '2024-12-01T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z',
  },
  {
    id: 'surcharge-002',
    name: 'JFK Airport Dropoff',
    type: 'airport',
    description: 'Dropoff surcharge for JFK International Airport',
    amount_cents: 1000,
    is_percentage: false,
    applies_to_pickup: false,
    applies_to_dropoff: true,
    location_keywords: ['JFK', 'John F Kennedy', 'Queens NY 11430'],
    is_active: true,
    service_types: ['standard', 'premium', 'van'],
    created_at: '2024-12-01T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z',
  },
  {
    id: 'surcharge-003',
    name: 'LaGuardia Airport',
    type: 'airport',
    description: 'Pickup/Dropoff fee for LaGuardia Airport',
    amount_cents: 1200,
    is_percentage: false,
    applies_to_pickup: true,
    applies_to_dropoff: true,
    location_keywords: ['LGA', 'LaGuardia', 'Queens NY 11371'],
    is_active: true,
    service_types: ['standard', 'premium', 'van'],
    created_at: '2024-12-01T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z',
  },
  {
    id: 'surcharge-004',
    name: 'Lincoln Tunnel Toll',
    type: 'toll',
    description: 'Toll for Lincoln Tunnel crossing',
    amount_cents: 1700,
    is_percentage: false,
    applies_to_pickup: true,
    applies_to_dropoff: true,
    location_keywords: ['Lincoln Tunnel', 'Weehawken NJ'],
    is_active: true,
    service_types: ['standard', 'premium', 'van', 'cargo'],
    created_at: '2024-12-01T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z',
  },
  {
    id: 'surcharge-005',
    name: 'George Washington Bridge',
    type: 'toll',
    description: 'Toll for GW Bridge crossing',
    amount_cents: 1600,
    is_percentage: false,
    applies_to_pickup: true,
    applies_to_dropoff: true,
    location_keywords: ['George Washington Bridge', 'GW Bridge', 'Fort Lee NJ'],
    is_active: true,
    service_types: ['standard', 'premium', 'van', 'cargo'],
    created_at: '2024-12-01T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z',
  },
  {
    id: 'surcharge-006',
    name: 'Holiday Surcharge',
    type: 'holiday',
    description: 'Holiday period surcharge (Dec 23 - Jan 2)',
    amount_cents: 1000,
    is_percentage: true,
    applies_to_pickup: true,
    applies_to_dropoff: true,
    is_active: false,
    service_types: ['standard', 'premium', 'van'],
    created_at: '2024-12-01T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z',
  },
];

const typeLabels: Record<SurchargeType, string> = {
  airport: 'Airport',
  toll: 'Toll',
  peak_hours: 'Peak Hours',
  holiday: 'Holiday',
  custom: 'Custom',
};

const typeIcons: Record<SurchargeType, React.ReactNode> = {
  airport: <Plane size={16} />,
  toll: <Navigation size={16} />,
  peak_hours: <Clock size={16} />,
  holiday: <Calendar size={16} />,
  custom: <DollarSign size={16} />,
};

const typeColors: Record<SurchargeType, string> = {
  airport: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  toll: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  peak_hours: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
  holiday: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300',
  custom: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

interface SurchargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (surcharge: Partial<Surcharge>) => void;
  surcharge?: Surcharge | null;
}

function SurchargeModal({ isOpen, onClose, onSave, surcharge }: SurchargeModalProps) {
  const [formData, setFormData] = useState<Partial<Surcharge>>(
    surcharge || {
      name: '',
      type: 'airport',
      description: '',
      amount_cents: 0,
      is_percentage: false,
      applies_to_pickup: true,
      applies_to_dropoff: false,
      location_keywords: [],
      is_active: true,
      service_types: ['standard', 'premium', 'van'],
    }
  );
  const [keywordInput, setKeywordInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const addKeyword = () => {
    if (keywordInput.trim()) {
      setFormData((prev: Partial<Surcharge>) => ({
        ...prev,
        location_keywords: [...(prev.location_keywords || []), keywordInput.trim()],
      }));
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData((prev: Partial<Surcharge>) => ({
      ...prev,
      location_keywords: prev.location_keywords?.filter((k: string) => k !== keyword),
    }));
  };

  const toggleServiceType = (type: ServiceTypeCode) => {
    setFormData((prev: Partial<Surcharge>) => ({
      ...prev,
      service_types: prev.service_types?.includes(type)
        ? prev.service_types.filter((t: ServiceTypeCode) => t !== type)
        : [...(prev.service_types || []), type],
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={surcharge ? 'Edit Surcharge' : 'Add Surcharge'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name *
          </label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => setFormData((prev: Partial<Surcharge>) => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            required
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Type *
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData((prev: Partial<Surcharge>) => ({ ...prev, type: e.target.value as SurchargeType }))}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          >
            {Object.entries(typeLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData((prev: Partial<Surcharge>) => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            rows={2}
          />
        </div>

        {/* Amount */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                {formData.is_percentage ? '%' : '$'}
              </span>
              <input
                type="number"
                value={formData.is_percentage ? (formData.amount_cents || 0) / 100 : (formData.amount_cents || 0) / 100}
                onChange={(e) =>
                  setFormData((prev: Partial<Surcharge>) => ({
                    ...prev,
                    amount_cents: Math.round(parseFloat(e.target.value) * 100),
                  }))
                }
                step="0.01"
                min="0"
                className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                required
              />
            </div>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_percentage}
                onChange={(e) =>
                  setFormData((prev: Partial<Surcharge>) => ({ ...prev, is_percentage: e.target.checked }))
                }
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Percentage-based</span>
            </label>
          </div>
        </div>

        {/* Applies To */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Applies To
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.applies_to_pickup}
                onChange={(e) =>
                  setFormData((prev: Partial<Surcharge>) => ({ ...prev, applies_to_pickup: e.target.checked }))
                }
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Pickup</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.applies_to_dropoff}
                onChange={(e) =>
                  setFormData((prev: Partial<Surcharge>) => ({ ...prev, applies_to_dropoff: e.target.checked }))
                }
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Dropoff</span>
            </label>
          </div>
        </div>

        {/* Location Keywords */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Location Keywords
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="Add keyword..."
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
            />
            <Button type="button" variant="secondary" onClick={addKeyword}>
              <Plus size={18} />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.location_keywords?.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
              >
                {keyword}
                <button
                  type="button"
                  onClick={() => removeKeyword(keyword)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Service Types */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Service Types
          </label>
          <div className="flex flex-wrap gap-2">
            {(['standard', 'premium', 'van', 'cargo'] as ServiceTypeCode[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleServiceType(type)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  formData.service_types?.includes(type)
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Active</p>
            <p className="text-sm text-gray-500">Enable this surcharge for new bookings</p>
          </div>
          <button
            type="button"
            onClick={() => setFormData((prev: Partial<Surcharge>) => ({ ...prev, is_active: !prev.is_active }))}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              formData.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                formData.is_active ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" className="flex-1">
            {surcharge ? 'Save Changes' : 'Add Surcharge'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function SurchargeManager() {
  // Start with empty array - data populates when demo data is loaded
  const [surcharges, setSurcharges] = useState<Surcharge[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSurcharge, setEditingSurcharge] = useState<Surcharge | null>(null);
  const [typeFilter, setTypeFilter] = useState<SurchargeType | ''>('');

  const filteredSurcharges = surcharges.filter(
    (s) => !typeFilter || s.type === typeFilter
  );

  const handleSave = (data: Partial<Surcharge>) => {
    if (editingSurcharge) {
      setSurcharges((prev) =>
        prev.map((s) =>
          s.id === editingSurcharge.id
            ? { ...s, ...data, updated_at: new Date().toISOString() }
            : s
        )
      );
    } else {
      const newSurcharge: Surcharge = {
        id: `surcharge-${Date.now()}`,
        name: data.name || 'New Surcharge',
        type: data.type || 'custom',
        description: data.description,
        amount_cents: data.amount_cents || 0,
        is_percentage: data.is_percentage || false,
        applies_to_pickup: data.applies_to_pickup || false,
        applies_to_dropoff: data.applies_to_dropoff || false,
        location_keywords: data.location_keywords,
        is_active: data.is_active ?? true,
        service_types: data.service_types || ['standard'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setSurcharges((prev) => [...prev, newSurcharge]);
    }
    setEditingSurcharge(null);
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this surcharge?')) {
      setSurcharges((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleToggleActive = (id: string) => {
    setSurcharges((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, is_active: !s.is_active, updated_at: new Date().toISOString() } : s
      )
    );
  };

  const formatAmount = (surcharge: Surcharge): string => {
    if (surcharge.is_percentage) {
      return `${(surcharge.amount_cents / 100).toFixed(0)}%`;
    }
    return `$${(surcharge.amount_cents / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
            Airport & Toll Surcharges
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Configure location-based fees and surcharges
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingSurcharge(null);
            setShowModal(true);
          }}
          className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
        >
          <Plus size={18} /> Add Surcharge
        </Button>
      </div>

      {/* Type Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTypeFilter('')}
          className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-[40px] sm:min-h-0 touch-manipulation ${
            !typeFilter
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          All
        </button>
        {Object.entries(typeLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTypeFilter(key as SurchargeType)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-[40px] sm:min-h-0 touch-manipulation ${
              typeFilter === key
                ? typeColors[key as SurchargeType]
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {typeIcons[key as SurchargeType]}
            <span className="hidden xs:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Surcharges Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSurcharges.map((surcharge) => (
          <Card key={surcharge.id} className="relative">
            {/* Active Badge */}
            <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
              <button
                onClick={() => handleToggleActive(surcharge.id)}
                className={`relative w-10 h-5 rounded-full transition-colors touch-manipulation ${
                  surcharge.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    surcharge.is_active ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Header */}
            <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div
                className={`p-1.5 sm:p-2 rounded-lg ${typeColors[surcharge.type]}`}
              >
                {typeIcons[surcharge.type]}
              </div>
              <div className="flex-1 min-w-0 pr-10 sm:pr-12">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">
                  {surcharge.name}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[surcharge.type]}`}
                >
                  {typeLabels[surcharge.type]}
                </span>
              </div>
            </div>

            {/* Amount */}
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {formatAmount(surcharge)}
              </span>
              {surcharge.is_percentage && (
                <Percent size={16} className="text-gray-400 sm:w-[18px] sm:h-[18px]" />
              )}
            </div>

            {/* Description */}
            {surcharge.description && (
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2 sm:mb-3 line-clamp-2">
                {surcharge.description}
              </p>
            )}

            {/* Applies To */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
              {surcharge.applies_to_pickup && (
                <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded text-xs">
                  <MapPin size={12} /> Pickup
                </span>
              )}
              {surcharge.applies_to_dropoff && (
                <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded text-xs">
                  <MapPin size={12} /> Dropoff
                </span>
              )}
            </div>

            {/* Keywords */}
            {surcharge.location_keywords && surcharge.location_keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2 sm:mb-3">
                {surcharge.location_keywords.slice(0, 2).map((keyword) => (
                  <span
                    key={keyword}
                    className="px-1.5 sm:px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400 truncate max-w-[100px]"
                  >
                    {keyword}
                  </span>
                ))}
                {surcharge.location_keywords.length > 2 && (
                  <span className="px-1.5 sm:px-2 py-0.5 text-xs text-gray-500">
                    +{surcharge.location_keywords.length - 2} more
                  </span>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 min-h-[40px] sm:min-h-0"
                onClick={() => {
                  setEditingSurcharge(surcharge);
                  setShowModal(true);
                }}
              >
                <Edit2 size={14} /> Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(surcharge.id)}
                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 min-h-[40px] sm:min-h-0 min-w-[40px]"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredSurcharges.length === 0 && (
        <Card className="text-center py-12">
          <DollarSign size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Surcharges Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {typeFilter
              ? `No ${typeLabels[typeFilter].toLowerCase()} surcharges configured`
              : 'Add your first surcharge to get started'}
          </p>
          <Button
            onClick={() => {
              setEditingSurcharge(null);
              setShowModal(true);
            }}
          >
            <Plus size={18} /> Add Surcharge
          </Button>
        </Card>
      )}

      {/* Edit Modal */}
      <SurchargeModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingSurcharge(null);
        }}
        onSave={handleSave}
        surcharge={editingSurcharge}
      />
    </div>
  );
}
