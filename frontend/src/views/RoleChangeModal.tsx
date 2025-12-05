import { useState } from 'react';
import { 
  AlertCircle, 
  Loader2,
  User,
  Car,
  Headphones,
  Shield,
  ArrowRight,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { backend } from '../services/backend';
import type { Role } from '../types';

interface RoleChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  userName: string;
  currentRole: Role;
}

const roleOptions: { value: Role; label: string; icon: React.ReactNode; color: string }[] = [
  { 
    value: 'client', 
    label: 'Client', 
    icon: <User size={20} />,
    color: 'text-gray-500 bg-gray-100 dark:bg-gray-700'
  },
  { 
    value: 'driver', 
    label: 'Driver', 
    icon: <Car size={20} />,
    color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/50'
  },
  { 
    value: 'support_agent', 
    label: 'Support Agent', 
    icon: <Headphones size={20} />,
    color: 'text-teal-500 bg-teal-100 dark:bg-teal-900/50'
  },
  { 
    value: 'admin', 
    label: 'Administrator', 
    icon: <Shield size={20} />,
    color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/50'
  },
];

export default function RoleChangeModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  userId, 
  userName, 
  currentRole 
}: RoleChangeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newRole, setNewRole] = useState<Role>(currentRole);

  const handleClose = () => {
    setError('');
    setNewRole(currentRole);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newRole === currentRole) {
      handleClose();
      return;
    }

    setError('');
    setLoading(true);

    try {
      await backend.adminUpdateUserRole(userId, newRole);
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  const currentRoleOption = roleOptions.find(r => r.value === currentRole);
  const newRoleOption = roleOptions.find(r => r.value === newRole);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Change User Role" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User info */}
        <div className="text-center pb-4 border-b border-gray-100 dark:border-gray-700">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {userName}
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            {currentRoleOption && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm ${currentRoleOption.color}`}>
                {currentRoleOption.icon}
                {currentRoleOption.label}
              </span>
            )}
            {newRole !== currentRole && (
              <>
                <ArrowRight size={16} className="text-gray-400" />
                {newRoleOption && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm ${newRoleOption.color}`}>
                    {newRoleOption.icon}
                    {newRoleOption.label}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Role selection */}
        <div className="space-y-2">
          {roleOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setNewRole(option.value)}
              disabled={option.value === currentRole}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-colors ${
                option.value === currentRole
                  ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-50 cursor-not-allowed'
                  : newRole === option.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className={`p-2 rounded-lg ${option.color}`}>
                {option.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {option.label}
                </p>
              </div>
              {option.value === currentRole && (
                <span className="text-xs text-gray-500 dark:text-gray-400">Current</span>
              )}
            </button>
          ))}
        </div>

        {/* Warning for admin role */}
        {newRole === 'admin' && currentRole !== 'admin' && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>Warning:</strong> Granting admin privileges gives this user full access to all platform features, including user management, pricing, and system configuration.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading || newRole === currentRole} 
            className="flex-1"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              'Update Role'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
