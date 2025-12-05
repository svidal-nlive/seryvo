import React, { useState, useEffect, useCallback } from 'react';
import { Download } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import LoadingSpinner from '../ui/LoadingSpinner';
import { backend } from '../../services/backend';
import { exportPromoCodestToCSV } from '../../utils/csvExport';
import type { PromoCode, PromoDiscountType, PromoStatus, ServiceTypeCode } from '../../types';

interface PromoFormData {
  code: string;
  description: string;
  discount_type: PromoDiscountType;
  discount_value: number;
  min_trip_amount_cents?: number;
  max_discount_cents?: number;
  usage_limit?: number;
  per_user_limit?: number;
  valid_from: string;
  valid_until: string;
  status: PromoStatus;
  applicable_service_types: ServiceTypeCode[];
  first_trip_only: boolean;
}

const EMPTY_FORM: PromoFormData = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 10,
  min_trip_amount_cents: undefined,
  max_discount_cents: undefined,
  usage_limit: undefined,
  per_user_limit: undefined,
  valid_from: new Date().toISOString().slice(0, 16),
  valid_until: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
  status: 'active',
  applicable_service_types: [],
  first_trip_only: false,
};

export const PromoCodeManager: React.FC = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [formData, setFormData] = useState<PromoFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<PromoStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadPromoCodes = useCallback(async () => {
    setLoading(true);
    const codes = await backend.getPromoCodes();
    setPromoCodes(codes);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPromoCodes();
  }, [loadPromoCodes]);

  const handleCreate = () => {
    setEditingPromo(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  const handleEdit = (promo: PromoCode) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      description: promo.description,
      discount_type: promo.discount_type,
      discount_value: promo.discount_type === 'fixed_amount' 
        ? promo.discount_value / 100 
        : promo.discount_value,
      min_trip_amount_cents: promo.min_trip_amount_cents ? promo.min_trip_amount_cents / 100 : undefined,
      max_discount_cents: promo.max_discount_cents ? promo.max_discount_cents / 100 : undefined,
      usage_limit: promo.usage_limit,
      per_user_limit: promo.per_user_limit,
      valid_from: new Date(promo.valid_from).toISOString().slice(0, 16),
      valid_until: new Date(promo.valid_until).toISOString().slice(0, 16),
      status: promo.status,
      applicable_service_types: promo.applicable_service_types || [],
      first_trip_only: promo.first_trip_only || false,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;
    await backend.deletePromoCode(id);
    loadPromoCodes();
  };

  const handleSubmit = async () => {
    setSaving(true);
    
    const data = {
      code: formData.code.toUpperCase(),
      description: formData.description,
      discount_type: formData.discount_type,
      discount_value: formData.discount_type === 'fixed_amount' 
        ? Math.round(formData.discount_value * 100) 
        : formData.discount_value,
      min_trip_amount_cents: formData.min_trip_amount_cents 
        ? Math.round(formData.min_trip_amount_cents * 100) 
        : undefined,
      max_discount_cents: formData.max_discount_cents 
        ? Math.round(formData.max_discount_cents * 100) 
        : undefined,
      usage_limit: formData.usage_limit,
      per_user_limit: formData.per_user_limit,
      valid_from: new Date(formData.valid_from).toISOString(),
      valid_until: new Date(formData.valid_until).toISOString(),
      status: formData.status,
      applicable_service_types: formData.applicable_service_types.length > 0 
        ? formData.applicable_service_types 
        : undefined,
      first_trip_only: formData.first_trip_only,
      created_by: 'a-001', // Current admin
    };

    if (editingPromo) {
      await backend.updatePromoCode(editingPromo.id, data);
    } else {
      await backend.createPromoCode(data as any);
    }

    setSaving(false);
    setShowModal(false);
    loadPromoCodes();
  };

  const filteredCodes = promoCodes.filter(promo => {
    if (filterStatus !== 'all' && promo.status !== filterStatus) return false;
    if (searchQuery && !promo.code.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !promo.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getStatusBadge = (status: PromoStatus) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'inactive':
        return <Badge variant="neutral">Inactive</Badge>;
      case 'expired':
        return <Badge variant="danger">Expired</Badge>;
    }
  };

  const formatDiscount = (promo: PromoCode) => {
    if (promo.discount_type === 'percentage') {
      let text = `${promo.discount_value}% off`;
      if (promo.max_discount_cents) {
        text += ` (max $${(promo.max_discount_cents / 100).toFixed(2)})`;
      }
      return text;
    }
    return `$${(promo.discount_value / 100).toFixed(2)} off`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">Promo Codes</h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Manage promotional codes and discounts
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="secondary" onClick={() => exportPromoCodestToCSV(promoCodes)} disabled={promoCodes.length === 0} className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
            <Download size={18} /> Export
          </Button>
          <Button onClick={handleCreate} className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
            <span className="mr-2">➕</span> Create Code
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
        <input
          type="text"
          placeholder="Search codes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-auto sm:flex-1 sm:max-w-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                   focus:ring-2 focus:ring-blue-500 min-h-[44px] sm:min-h-0"
        />
        <div className="flex flex-wrap gap-2">
          {(['all', 'active', 'inactive', 'expired'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 sm:px-4 py-2 rounded-lg capitalize transition-colors text-xs sm:text-sm min-h-[40px] sm:min-h-0 touch-manipulation ${
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <div className="text-center">
            <p className="text-xl sm:text-2xl font-bold text-blue-600">{promoCodes.filter(p => p.status === 'active').length}</p>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Active Codes</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-xl sm:text-2xl font-bold text-green-600">
              {promoCodes.reduce((sum, p) => sum + p.usage_count, 0)}
            </p>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Uses</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-xl sm:text-2xl font-bold text-orange-600">{promoCodes.filter(p => p.status === 'inactive').length}</p>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Inactive</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-xl sm:text-2xl font-bold text-gray-600">{promoCodes.filter(p => p.status === 'expired').length}</p>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Expired</p>
          </div>
        </Card>
      </div>

      {/* Promo Codes - Mobile Cards */}
      <div className="block sm:hidden space-y-3">
        {filteredCodes.map((promo) => (
          <Card key={promo.id}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className="font-mono font-semibold text-blue-600 text-sm">{promo.code}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{promo.description}</p>
              </div>
              <div className="flex-shrink-0">
                {getStatusBadge(promo.status)}
              </div>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-green-600 font-medium">{formatDiscount(promo)}</span>
              <span className="text-xs text-gray-500">
                {promo.usage_count}{promo.usage_limit ? ` / ${promo.usage_limit}` : ''} uses
              </span>
            </div>
            <div className="text-xs text-gray-500 mb-3">
              {new Date(promo.valid_from).toLocaleDateString()} - {new Date(promo.valid_until).toLocaleDateString()}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => handleEdit(promo)} className="flex-1 min-h-[40px]">
                Edit
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(promo.id)} className="flex-1 min-h-[40px]">
                Delete
              </Button>
            </div>
          </Card>
        ))}
        {filteredCodes.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No promo codes found
          </div>
        )}
      </div>

      {/* Promo Codes Table - Desktop */}
      <Card noPadding className="hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Discount
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Valid Period
                </th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCodes.map((promo) => (
                <tr key={promo.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="font-mono font-semibold text-blue-600">{promo.code}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{promo.description}</p>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span className="text-green-600 font-medium">{formatDiscount(promo)}</span>
                    {promo.min_trip_amount_cents && (
                      <p className="text-xs text-gray-500">
                        Min: ${(promo.min_trip_amount_cents / 100).toFixed(2)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(promo.status)}
                    {promo.first_trip_only && (
                      <span className="ml-2 text-xs text-purple-600">First ride only</span>
                    )}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span className="font-medium">{promo.usage_count}</span>
                    {promo.usage_limit && (
                      <span className="text-gray-500"> / {promo.usage_limit}</span>
                    )}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    <p>{new Date(promo.valid_from).toLocaleDateString()}</p>
                    <p>to {new Date(promo.valid_until).toLocaleDateString()}</p>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => handleEdit(promo)}>
                        Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(promo.id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCodes.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No promo codes found
            </div>
          )}
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingPromo ? 'Edit Promo Code' : 'Create Promo Code'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Code *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         font-mono uppercase"
                placeholder="SUMMER20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as PromoStatus })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description *
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="20% off your first ride"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Discount Type
              </label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as PromoDiscountType })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed_amount">Fixed Amount ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Discount Value {formData.discount_type === 'percentage' ? '(%)' : '($)'}
              </label>
              <input
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                min="0"
                max={formData.discount_type === 'percentage' ? 100 : undefined}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Trip Amount ($)
              </label>
              <input
                type="number"
                value={formData.min_trip_amount_cents || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  min_trip_amount_cents: e.target.value ? parseFloat(e.target.value) : undefined 
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Optional"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Discount ($)
              </label>
              <input
                type="number"
                value={formData.max_discount_cents || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  max_discount_cents: e.target.value ? parseFloat(e.target.value) : undefined 
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Optional"
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Usage Limit
              </label>
              <input
                type="number"
                value={formData.usage_limit || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  usage_limit: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Unlimited"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Per User Limit
              </label>
              <input
                type="number"
                value={formData.per_user_limit || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  per_user_limit: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Unlimited"
                min="1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Valid From *
              </label>
              <input
                type="datetime-local"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Valid Until *
              </label>
              <input
                type="datetime-local"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.first_trip_only}
                onChange={(e) => setFormData({ ...formData, first_trip_only: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">First trip only</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Service Types (leave empty for all)
            </label>
            <div className="flex flex-wrap gap-2">
              {(['standard', 'premium', 'van'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    const current = formData.applicable_service_types;
                    if (current.includes(type)) {
                      setFormData({
                        ...formData,
                        applicable_service_types: current.filter(t => t !== type)
                      });
                    } else {
                      setFormData({
                        ...formData,
                        applicable_service_types: [...current, type]
                      });
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-sm capitalize transition-colors ${
                    formData.applicable_service_types.includes(type)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={saving || !formData.code || !formData.description}
            >
              {saving ? 'Saving...' : editingPromo ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
