import { useState, useEffect } from 'react';
import {
  DollarSign,
  Car,
  Clock,
  MapPin,
  Percent,
  Save,
  RotateCcw,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

// ---- Types ----

export interface FareModelConfig {
  id: string;
  name: string;
  service_type: 'standard' | 'premium' | 'van' | 'cargo';
  base_fare_cents: number;
  per_km_rate_cents: number;
  per_minute_rate_cents: number;
  minimum_fare_cents: number;
  booking_fee_cents: number;
  platform_fee_percent: number;
  is_active: boolean;
}

export interface SurchargeConfig {
  id: string;
  name: string;
  type: 'fixed' | 'percent' | 'multiplier';
  value: number;
  applies_to: 'all' | 'standard' | 'premium' | 'van';
  conditions?: string;
  is_active: boolean;
}

interface PricingConfigProps {
  fareModels: FareModelConfig[];
  surcharges: SurchargeConfig[];
  onSaveFareModel: (model: FareModelConfig) => Promise<void>;
  onSaveSurcharge: (surcharge: SurchargeConfig) => Promise<void>;
  onDeleteSurcharge: (id: string) => Promise<void>;
  loading?: boolean;
}

// ---- Default Data ----

const DEFAULT_FARE_MODELS: FareModelConfig[] = [
  {
    id: 'fare-standard',
    name: 'Standard Fare',
    service_type: 'standard',
    base_fare_cents: 500,
    per_km_rate_cents: 150,
    per_minute_rate_cents: 25,
    minimum_fare_cents: 800,
    booking_fee_cents: 200,
    platform_fee_percent: 20,
    is_active: true,
  },
  {
    id: 'fare-premium',
    name: 'Premium Fare',
    service_type: 'premium',
    base_fare_cents: 1200,
    per_km_rate_cents: 250,
    per_minute_rate_cents: 40,
    minimum_fare_cents: 1500,
    booking_fee_cents: 300,
    platform_fee_percent: 20,
    is_active: true,
  },
  {
    id: 'fare-van',
    name: 'Van / XL Fare',
    service_type: 'van',
    base_fare_cents: 1500,
    per_km_rate_cents: 200,
    per_minute_rate_cents: 35,
    minimum_fare_cents: 2000,
    booking_fee_cents: 300,
    platform_fee_percent: 20,
    is_active: true,
  },
];

const DEFAULT_SURCHARGES: SurchargeConfig[] = [
  {
    id: 'surge-airport',
    name: 'Airport Pickup/Dropoff',
    type: 'fixed',
    value: 500,
    applies_to: 'all',
    conditions: 'Pickup or dropoff at airport locations',
    is_active: true,
  },
  {
    id: 'surge-night',
    name: 'Night Rate',
    type: 'multiplier',
    value: 1.25,
    applies_to: 'all',
    conditions: 'Trips between 10 PM - 6 AM',
    is_active: true,
  },
  {
    id: 'surge-holiday',
    name: 'Holiday Surcharge',
    type: 'percent',
    value: 15,
    applies_to: 'all',
    conditions: 'National holidays',
    is_active: false,
  },
];

// ---- Fare Model Editor ----

interface FareModelEditorProps {
  model: FareModelConfig;
  onSave: (model: FareModelConfig) => void;
  onCancel: () => void;
  saving: boolean;
}

function FareModelEditor({ model, onSave, onCancel, saving }: FareModelEditorProps) {
  const [editedModel, setEditedModel] = useState<FareModelConfig>(model);

  const handleChange = (field: keyof FareModelConfig, value: number | boolean) => {
    setEditedModel((prev) => ({ ...prev, [field]: value }));
  };

  const formatCents = (cents: number) => (cents / 100).toFixed(2);
  const parseCents = (dollars: string) => Math.round(parseFloat(dollars || '0') * 100);

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Base Fare */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Base Fare
          </label>
          <div className="relative">
            <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="number"
              step="0.01"
              min="0"
              value={formatCents(editedModel.base_fare_cents)}
              onChange={(e) => handleChange('base_fare_cents', parseCents(e.target.value))}
              className="w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white min-h-[44px] sm:min-h-0"
            />
          </div>
        </div>

        {/* Per KM Rate */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Per Kilometer
          </label>
          <div className="relative">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="number"
              step="0.01"
              min="0"
              value={formatCents(editedModel.per_km_rate_cents)}
              onChange={(e) => handleChange('per_km_rate_cents', parseCents(e.target.value))}
              className="w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white min-h-[44px] sm:min-h-0"
            />
          </div>
        </div>

        {/* Per Minute Rate */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Per Minute
          </label>
          <div className="relative">
            <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="number"
              step="0.01"
              min="0"
              value={formatCents(editedModel.per_minute_rate_cents)}
              onChange={(e) => handleChange('per_minute_rate_cents', parseCents(e.target.value))}
              className="w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white min-h-[44px] sm:min-h-0"
            />
          </div>
        </div>

        {/* Minimum Fare */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Minimum Fare
          </label>
          <div className="relative">
            <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="number"
              step="0.01"
              min="0"
              value={formatCents(editedModel.minimum_fare_cents)}
              onChange={(e) => handleChange('minimum_fare_cents', parseCents(e.target.value))}
              className="w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white min-h-[44px] sm:min-h-0"
            />
          </div>
        </div>

        {/* Booking Fee */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Booking Fee
          </label>
          <div className="relative">
            <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="number"
              step="0.01"
              min="0"
              value={formatCents(editedModel.booking_fee_cents)}
              onChange={(e) => handleChange('booking_fee_cents', parseCents(e.target.value))}
              className="w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white min-h-[44px] sm:min-h-0"
            />
          </div>
        </div>

        {/* Platform Fee */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Platform Fee %
          </label>
          <div className="relative">
            <Percent size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="number"
              step="0.5"
              min="0"
              max="100"
              value={editedModel.platform_fee_percent}
              onChange={(e) => handleChange('platform_fee_percent', parseFloat(e.target.value) || 0)}
              className="w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white min-h-[44px] sm:min-h-0"
            />
          </div>
        </div>
      </div>

      {/* Active Toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={editedModel.is_active}
          onChange={(e) => handleChange('is_active', e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700 dark:text-slate-300">
          Active (available for booking)
        </span>
      </label>

      {/* Example Calculation */}
      <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">Example: 10km, 20min trip</p>
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">Base</span>
            <span>${formatCents(editedModel.base_fare_cents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Distance (10km)</span>
            <span>${formatCents(editedModel.per_km_rate_cents * 10)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Time (20min)</span>
            <span>${formatCents(editedModel.per_minute_rate_cents * 20)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Booking Fee</span>
            <span>${formatCents(editedModel.booking_fee_cents)}</span>
          </div>
          <div className="flex justify-between font-bold pt-1 border-t border-gray-200 dark:border-slate-700">
            <span>Total</span>
            <span className="text-green-600">
              ${formatCents(
                editedModel.base_fare_cents +
                editedModel.per_km_rate_cents * 10 +
                editedModel.per_minute_rate_cents * 20 +
                editedModel.booking_fee_cents
              )}
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>Platform ({editedModel.platform_fee_percent}%)</span>
            <span>
              ${formatCents(
                Math.round(
                  (editedModel.base_fare_cents +
                    editedModel.per_km_rate_cents * 10 +
                    editedModel.per_minute_rate_cents * 20 +
                    editedModel.booking_fee_cents) *
                    (editedModel.platform_fee_percent / 100)
                )
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel} className="flex-1 min-h-[44px] sm:min-h-0">
          <X size={16} /> Cancel
        </Button>
        <Button onClick={() => onSave(editedModel)} disabled={saving} className="flex-1 min-h-[44px] sm:min-h-0">
          <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}

// ---- Main Component ----

export default function PricingConfig({
  fareModels = DEFAULT_FARE_MODELS,
  surcharges = DEFAULT_SURCHARGES,
  onSaveFareModel,
  onSaveSurcharge,
  onDeleteSurcharge,
  loading = false,
}: PricingConfigProps) {
  const [editingModel, setEditingModel] = useState<FareModelConfig | null>(null);
  const [editingSurcharge, setEditingSurcharge] = useState<SurchargeConfig | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSaveFareModel = async (model: FareModelConfig) => {
    setSaving(true);
    try {
      await onSaveFareModel(model);
      setEditingModel(null);
    } finally {
      setSaving(false);
    }
  };

  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const getServiceTypeIcon = (type: string) => {
    switch (type) {
      case 'premium':
        return <Car size={20} className="text-purple-500" />;
      case 'van':
        return <Car size={20} className="text-orange-500" />;
      default:
        return <Car size={20} className="text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-gray-300 dark:border-slate-600 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Fare Models */}
      <section>
        <h3 className="text-base sm:text-lg font-semibold dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
          <DollarSign size={18} className="sm:w-5 sm:h-5" /> Fare Models
        </h3>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {fareModels.map((model) => (
            <Card
              key={model.id}
              className={`relative ${!model.is_active ? 'opacity-60' : ''}`}
            >
              {!model.is_active && (
                <span className="absolute top-2 right-2 px-2 py-0.5 bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-400 text-xs rounded-full">
                  Inactive
                </span>
              )}
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="p-1.5 sm:p-2 rounded-lg bg-gray-100 dark:bg-slate-800">
                  {getServiceTypeIcon(model.service_type)}
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold dark:text-white text-sm sm:text-base truncate">{model.name}</h4>
                  <p className="text-xs text-gray-500 capitalize">{model.service_type}</p>
                </div>
              </div>

              <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Base Fare</span>
                  <span className="font-medium dark:text-white">{formatCents(model.base_fare_cents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Per km</span>
                  <span className="font-medium dark:text-white">{formatCents(model.per_km_rate_cents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Per min</span>
                  <span className="font-medium dark:text-white">{formatCents(model.per_minute_rate_cents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Min fare</span>
                  <span className="font-medium dark:text-white">{formatCents(model.minimum_fare_cents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Platform</span>
                  <span className="font-medium dark:text-white">{model.platform_fee_percent}%</span>
                </div>
              </div>

              <Button
                variant="secondary"
                className="w-full mt-3 sm:mt-4 min-h-[44px] sm:min-h-0"
                onClick={() => setEditingModel(model)}
              >
                <Edit2 size={16} /> Edit
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* Surcharges */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold dark:text-white flex items-center gap-2">
            <Percent size={18} className="sm:w-5 sm:h-5" /> Surcharges & Adjustments
          </h3>
          <Button variant="secondary" onClick={() => setEditingSurcharge({
            id: `surge-${Date.now()}`,
            name: '',
            type: 'fixed',
            value: 0,
            applies_to: 'all',
            is_active: true,
          })} className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
            <Plus size={16} /> Add Surcharge
          </Button>
        </div>

        <div className="space-y-3">
          {surcharges.map((surcharge) => (
            <Card
              key={surcharge.id}
              className={`flex items-center justify-between ${!surcharge.is_active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  surcharge.type === 'multiplier'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                    : surcharge.type === 'percent'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-600'
                }`}>
                  {surcharge.type === 'multiplier' ? '×' : surcharge.type === 'percent' ? '%' : '$'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium dark:text-white">{surcharge.name}</span>
                    {!surcharge.is_active && (
                      <span className="px-2 py-0.5 bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-400 text-xs rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {surcharge.type === 'fixed'
                      ? `+${formatCents(surcharge.value)}`
                      : surcharge.type === 'percent'
                      ? `+${surcharge.value}%`
                      : `×${surcharge.value}`}
                    {' • '}
                    Applies to: {surcharge.applies_to}
                  </p>
                  {surcharge.conditions && (
                    <p className="text-xs text-gray-400">{surcharge.conditions}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setEditingSurcharge(surcharge)}
                >
                  <Edit2 size={16} />
                </Button>
                <Button
                  variant="ghost"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => onDeleteSurcharge(surcharge.id)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </Card>
          ))}

          {surcharges.length === 0 && (
            <Card>
              <div className="text-center py-6 text-gray-500 dark:text-slate-400">
                No surcharges configured
              </div>
            </Card>
          )}
        </div>
      </section>

      {/* Edit Fare Model Modal */}
      <Modal
        isOpen={!!editingModel}
        onClose={() => setEditingModel(null)}
        title={`Edit ${editingModel?.name}`}
        size="lg"
      >
        {editingModel && (
          <FareModelEditor
            model={editingModel}
            onSave={handleSaveFareModel}
            onCancel={() => setEditingModel(null)}
            saving={saving}
          />
        )}
      </Modal>

      {/* Edit Surcharge Modal */}
      <Modal
        isOpen={!!editingSurcharge}
        onClose={() => setEditingSurcharge(null)}
        title={editingSurcharge?.name ? `Edit ${editingSurcharge.name}` : 'Add Surcharge'}
      >
        {editingSurcharge && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={editingSurcharge.name}
                onChange={(e) => setEditingSurcharge({ ...editingSurcharge, name: e.target.value })}
                placeholder="e.g., Airport Surcharge"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Type
                </label>
                <select
                  value={editingSurcharge.type}
                  onChange={(e) => setEditingSurcharge({ ...editingSurcharge, type: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                >
                  <option value="fixed">Fixed Amount ($)</option>
                  <option value="percent">Percentage (%)</option>
                  <option value="multiplier">Multiplier (×)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Value
                </label>
                <input
                  type="number"
                  step={editingSurcharge.type === 'fixed' ? '0.01' : '0.1'}
                  min="0"
                  value={editingSurcharge.type === 'fixed' ? editingSurcharge.value / 100 : editingSurcharge.value}
                  onChange={(e) => setEditingSurcharge({
                    ...editingSurcharge,
                    value: editingSurcharge.type === 'fixed'
                      ? Math.round(parseFloat(e.target.value || '0') * 100)
                      : parseFloat(e.target.value || '0'),
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Applies To
              </label>
              <select
                value={editingSurcharge.applies_to}
                onChange={(e) => setEditingSurcharge({ ...editingSurcharge, applies_to: e.target.value as any })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              >
                <option value="all">All Service Types</option>
                <option value="standard">Standard Only</option>
                <option value="premium">Premium Only</option>
                <option value="van">Van/XL Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Conditions (optional)
              </label>
              <input
                type="text"
                value={editingSurcharge.conditions || ''}
                onChange={(e) => setEditingSurcharge({ ...editingSurcharge, conditions: e.target.value })}
                placeholder="e.g., Trips between 10 PM - 6 AM"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editingSurcharge.is_active}
                onChange={(e) => setEditingSurcharge({ ...editingSurcharge, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-slate-300">
                Active
              </span>
            </label>

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setEditingSurcharge(null)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  await onSaveSurcharge(editingSurcharge);
                  setEditingSurcharge(null);
                }}
                className="flex-1"
              >
                <Save size={16} /> Save
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
