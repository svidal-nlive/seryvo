import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Briefcase, 
  MapPin, 
  Plus, 
  Edit2, 
  Trash2, 
  Star,
  X,
  Check,
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import LoadingSpinner from '../ui/LoadingSpinner';
import { backend } from '../../services/backend';
import { useAuth } from '../../contexts/AuthContext';
import type { SavedAddress, SavedAddressLabel, Location } from '../../types';

const labelConfig: Record<SavedAddressLabel, { label: string; icon: React.ReactNode; color: string }> = {
  home: { label: 'Home', icon: <Home size={20} />, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
  work: { label: 'Work', icon: <Briefcase size={20} />, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
  other: { label: 'Other', icon: <MapPin size={20} />, color: 'text-gray-600 bg-gray-100 dark:bg-gray-700' },
};

interface AddressFormData {
  label: SavedAddressLabel;
  custom_name: string;
  address_line: string;
  is_default: boolean;
}

const initialFormData: AddressFormData = {
  label: 'home',
  custom_name: '',
  address_line: '',
  is_default: false,
};

export default function SavedAddressesManager() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [formData, setFormData] = useState<AddressFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadAddresses();
    }
  }, [user?.id]);

  const loadAddresses = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await backend.getSavedAddresses(user.id);
      setAddresses(data);
    } catch (error) {
      console.error('Failed to load saved addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (address?: SavedAddress) => {
    if (address) {
      setEditingAddress(address);
      setFormData({
        label: address.label,
        custom_name: address.custom_name || '',
        address_line: address.location.address_line,
        is_default: address.is_default || false,
      });
    } else {
      setEditingAddress(null);
      setFormData(initialFormData);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAddress(null);
    setFormData(initialFormData);
  };

  const handleSave = async () => {
    if (!user?.id || !formData.address_line.trim()) return;

    setSaving(true);
    try {
      const location: Location = {
        address_line: formData.address_line.trim(),
      };

      if (editingAddress) {
        await backend.updateSavedAddress(editingAddress.id, {
          label: formData.label,
          custom_name: formData.custom_name.trim() || undefined,
          location,
          is_default: formData.is_default,
        });
      } else {
        await backend.createSavedAddress(user.id, {
          label: formData.label,
          custom_name: formData.custom_name.trim() || undefined,
          location,
          is_default: formData.is_default,
        });
      }

      await loadAddresses();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save address:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (addressId: string) => {
    try {
      await backend.deleteSavedAddress(addressId);
      await loadAddresses();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete address:', error);
    }
  };

  const handleSetDefault = async (address: SavedAddress) => {
    try {
      await backend.updateSavedAddress(address.id, { is_default: true });
      await loadAddresses();
    } catch (error) {
      console.error('Failed to set default address:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Saved Addresses</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage your frequently used addresses for quick booking
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus size={16} /> Add Address
        </Button>
      </div>

      {/* Addresses List */}
      {addresses.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <MapPin size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No saved addresses yet
            </h3>
            <p className="text-gray-500 dark:text-slate-400 mb-4">
              Add your home, work, or other frequently used addresses for faster booking.
            </p>
            <Button onClick={() => handleOpenModal()}>
              <Plus size={16} /> Add Your First Address
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => {
            const config = labelConfig[address.label];
            return (
              <Card key={address.id} className="relative">
                {address.is_default && (
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <Star size={12} className="fill-current" /> Default
                    </span>
                  </div>
                )}
                
                <div className="flex gap-4">
                  <div className={`p-3 rounded-lg ${config.color}`}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {address.custom_name || config.label}
                      </h3>
                      {address.custom_name && (
                        <span className="text-xs text-gray-500 dark:text-slate-400">
                          ({config.label})
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {address.location.address_line}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                  {!address.is_default && (
                    <button
                      onClick={() => handleSetDefault(address)}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Star size={14} /> Set as default
                    </button>
                  )}
                  {address.is_default && <div />}
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenModal(address)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    
                    {deleteConfirm === address.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(address.id)}
                          className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600"
                          title="Confirm delete"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(address.id)}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingAddress ? 'Edit Address' : 'Add New Address'}
      >
        <div className="space-y-4">
          {/* Label Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Address Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(labelConfig) as SavedAddressLabel[]).map((labelKey) => {
                const config = labelConfig[labelKey];
                const isSelected = formData.label === labelKey;
                return (
                  <button
                    key={labelKey}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, label: labelKey }))}
                    className={`
                      flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      {config.icon}
                    </div>
                    <span className={`text-sm font-medium ${isSelected ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'}`}>
                      {config.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Custom Name (Optional)
            </label>
            <input
              type="text"
              value={formData.custom_name}
              onChange={(e) => setFormData(prev => ({ ...prev, custom_name: e.target.value }))}
              placeholder={`e.g., "Mom's House" or "Downtown Office"`}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Address *
            </label>
            <input
              type="text"
              value={formData.address_line}
              onChange={(e) => setFormData(prev => ({ ...prev, address_line: e.target.value }))}
              placeholder="Enter the full address"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>

          {/* Default Checkbox */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_default}
              onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Set as default address
            </span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <Button
              variant="secondary"
              onClick={handleCloseModal}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.address_line.trim() || saving}
              className="flex-1"
            >
              {saving ? 'Saving...' : (editingAddress ? 'Update Address' : 'Add Address')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
