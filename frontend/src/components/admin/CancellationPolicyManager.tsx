import { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  DollarSign,
  Clock,
  Percent,
  Check,
  AlertTriangle,
  Car,
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { backend } from '../../services/backend';
import type { CancellationPolicy, CancellationFeeType } from '../../types';

const SERVICE_TYPE_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'comfort', label: 'Comfort' },
  { value: 'premium', label: 'Premium' },
  { value: 'xl', label: 'XL' },
  { value: 'airport', label: 'Airport' },
];

export default function CancellationPolicyManager() {
  const [policies, setPolicies] = useState<CancellationPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<CancellationPolicy | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    free_cancel_window_minutes: 5,
    post_assignment_free_minutes: 2,
    cancellation_fee_type: 'flat' as CancellationFeeType,
    cancellation_fee_amount: 500,
    no_show_wait_minutes: 5,
    no_show_fee_cents: 1000,
    grace_period_minutes: 3,
    waiting_fee_per_minute_cents: 50,
    waiting_fee_cap_cents: 1500,
    driver_cancel_penalty_cents: 250,
    applies_to_service_types: [] as string[],
  });

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    setLoading(true);
    const data = await backend.getCancellationPolicies();
    setPolicies(data);
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      is_active: true,
      free_cancel_window_minutes: 5,
      post_assignment_free_minutes: 2,
      cancellation_fee_type: 'flat',
      cancellation_fee_amount: 500,
      no_show_wait_minutes: 5,
      no_show_fee_cents: 1000,
      grace_period_minutes: 3,
      waiting_fee_per_minute_cents: 50,
      waiting_fee_cap_cents: 1500,
      driver_cancel_penalty_cents: 250,
      applies_to_service_types: [],
    });
    setEditingPolicy(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (policy: CancellationPolicy) => {
    setEditingPolicy(policy);
    setFormData({
      name: policy.name,
      description: policy.description || '',
      is_active: policy.is_active,
      free_cancel_window_minutes: policy.free_cancel_window_minutes,
      post_assignment_free_minutes: policy.post_assignment_free_minutes,
      cancellation_fee_type: policy.cancellation_fee_type,
      cancellation_fee_amount: policy.cancellation_fee_amount,
      no_show_wait_minutes: policy.no_show_wait_minutes,
      no_show_fee_cents: policy.no_show_fee_cents,
      grace_period_minutes: policy.grace_period_minutes,
      waiting_fee_per_minute_cents: policy.waiting_fee_per_minute_cents,
      waiting_fee_cap_cents: policy.waiting_fee_cap_cents,
      driver_cancel_penalty_cents: policy.driver_cancel_penalty_cents,
      applies_to_service_types: [...policy.applies_to_service_types],
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    if (editingPolicy) {
      await backend.updateCancellationPolicy(editingPolicy.id, formData);
    } else {
      await backend.createCancellationPolicy(formData);
    }

    setShowModal(false);
    resetForm();
    loadPolicies();
  };

  const handleDelete = async (policyId: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;
    await backend.deleteCancellationPolicy(policyId);
    loadPolicies();
  };

  const toggleServiceType = (serviceType: string) => {
    setFormData((prev) => ({
      ...prev,
      applies_to_service_types: prev.applies_to_service_types.includes(serviceType)
        ? prev.applies_to_service_types.filter((t) => t !== serviceType)
        : [...prev.applies_to_service_types, serviceType],
    }));
  };

  const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (loading) {
    return (
      <Card>
        <p className="text-gray-500 dark:text-slate-400">Loading policies...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">Cancellation Policies</h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">
            Configure fees and rules for cancellations and no-shows
          </p>
        </div>
        <Button onClick={openCreateModal} className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
          <Plus size={18} /> Add Policy
        </Button>
      </div>

      {/* Policies Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {policies.map((policy) => (
          <Card key={policy.id} className="space-y-3 sm:space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-base sm:text-lg truncate">{policy.name}</h3>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                      policy.is_active
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {policy.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {policy.description && (
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {policy.description}
                  </p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => openEditModal(policy)}
                  className="p-2 text-gray-400 hover:text-blue-500 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center touch-manipulation"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(policy.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center touch-manipulation"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Service Types */}
            <div className="flex flex-wrap gap-1">
              {policy.applies_to_service_types.length === 0 ? (
                <span className="text-xs text-gray-400 italic">Applies to all service types</span>
              ) : (
                policy.applies_to_service_types.map((type) => (
                  <span
                    key={type}
                    className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    {type}
                  </span>
                ))
              )}
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-gray-200 dark:border-slate-700">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Clock size={14} className="text-gray-400 flex-shrink-0" />
                <div className="text-xs sm:text-sm min-w-0">
                  <span className="text-gray-500 dark:text-slate-400">Free: </span>
                  <span className="font-medium">{policy.free_cancel_window_minutes}m</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                {policy.cancellation_fee_type === 'flat' ? (
                  <DollarSign size={14} className="text-gray-400 flex-shrink-0" />
                ) : (
                  <Percent size={14} className="text-gray-400 flex-shrink-0" />
                )}
                <div className="text-xs sm:text-sm min-w-0">
                  <span className="text-gray-500 dark:text-slate-400">Cancel: </span>
                  <span className="font-medium">
                    {policy.cancellation_fee_type === 'flat'
                      ? formatMoney(policy.cancellation_fee_amount)
                      : `${policy.cancellation_fee_amount}%`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <AlertTriangle size={14} className="text-gray-400 flex-shrink-0" />
                <div className="text-xs sm:text-sm min-w-0">
                  <span className="text-gray-500 dark:text-slate-400">No-show: </span>
                  <span className="font-medium">{formatMoney(policy.no_show_fee_cents)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Clock size={14} className="text-gray-400 flex-shrink-0" />
                <div className="text-xs sm:text-sm min-w-0">
                  <span className="text-gray-500 dark:text-slate-400">Grace: </span>
                  <span className="font-medium">{policy.grace_period_minutes}m</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {policies.length === 0 && (
        <Card className="text-center py-8">
          <p className="text-gray-500 dark:text-slate-400">
            No cancellation policies configured yet.
          </p>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingPolicy ? 'Edit Cancellation Policy' : 'Create Cancellation Policy'}
      >
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Policy Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                placeholder="e.g., Standard Policy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                rows={2}
                placeholder="Optional description"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
                }
                className="w-4 h-4"
              />
              <label htmlFor="is_active" className="text-sm font-medium">
                Active
              </label>
            </div>
          </div>

          {/* Service Types */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Applies to Service Types (leave empty for all)
            </label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleServiceType(opt.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    formData.applies_to_service_types.includes(opt.value)
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'border-gray-300 dark:border-slate-600 hover:border-blue-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cancellation Settings */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="font-medium text-sm text-gray-700 dark:text-slate-300">
              Cancellation Settings
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Free Cancel Window (min)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.free_cancel_window_minutes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      free_cancel_window_minutes: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 min-h-[44px] sm:min-h-0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Post-Assignment Free (min)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.post_assignment_free_minutes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      post_assignment_free_minutes: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 min-h-[44px] sm:min-h-0"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fee Type</label>
                <select
                  value={formData.cancellation_fee_type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      cancellation_fee_type: e.target.value as CancellationFeeType,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 min-h-[44px] sm:min-h-0"
                >
                  <option value="flat">Flat Fee ($)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {formData.cancellation_fee_type === 'flat' ? 'Fee Amount (¢)' : 'Percentage'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.cancellation_fee_amount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      cancellation_fee_amount: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 min-h-[44px] sm:min-h-0"
                />
              </div>
            </div>
          </div>

          {/* No-Show Settings */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="font-medium text-sm text-gray-700 dark:text-slate-300">
              No-Show Settings
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Wait Time (min)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.no_show_wait_minutes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      no_show_wait_minutes: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 min-h-[44px] sm:min-h-0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">No-Show Fee (¢)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.no_show_fee_cents}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      no_show_fee_cents: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 min-h-[44px] sm:min-h-0"
                />
              </div>
            </div>
          </div>

          {/* Waiting Fee Settings */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="font-medium text-sm text-gray-700 dark:text-slate-300">
              Waiting Fee Settings
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Grace Period (min)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.grace_period_minutes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      grace_period_minutes: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 min-h-[44px] sm:min-h-0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Per Minute (¢)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.waiting_fee_per_minute_cents}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      waiting_fee_per_minute_cents: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 min-h-[44px] sm:min-h-0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Cap (¢)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.waiting_fee_cap_cents}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      waiting_fee_cap_cents: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 min-h-[44px] sm:min-h-0"
                />
              </div>
            </div>
          </div>

          {/* Driver Penalty */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Driver Cancellation Penalty (¢)
            </label>
            <input
              type="number"
              min="0"
              value={formData.driver_cancel_penalty_cents}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  driver_cancel_penalty_cents: parseInt(e.target.value) || 0,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 min-h-[44px] sm:min-h-0"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <Button variant="ghost" onClick={() => setShowModal(false)} className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.name.trim()} className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
              {editingPolicy ? 'Update Policy' : 'Create Policy'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
