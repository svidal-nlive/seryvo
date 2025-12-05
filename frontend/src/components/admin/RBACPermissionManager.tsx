import React, { useState, useEffect } from 'react';
import {
  Shield,
  Edit2,
  Save,
  X,
  Check,
  AlertTriangle,
  Lock,
  Unlock,
  Users,
  Car,
  Headphones,
  Settings,
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Card from '../ui/Card';
import type { RolePermissions, Permission, DetailedRole } from '../../types';

// Default role permissions based on RBAC Matrix v2
const DEFAULT_ROLE_PERMISSIONS: RolePermissions[] = [
  {
    role: 'client',
    displayName: 'Client',
    description: 'End users who book rides',
    permissions: ['view_own_bookings', 'create_booking', 'cancel_own_booking'],
    isEditable: false,
  },
  {
    role: 'driver',
    displayName: 'Driver',
    description: 'Service providers who fulfill rides',
    permissions: ['view_own_bookings'],
    isEditable: false,
  },
  {
    role: 'support_t1',
    displayName: 'Support Tier 1',
    description: 'First-line support agents',
    permissions: [
      'view_own_bookings',
      'create_booking',
      'cancel_own_booking',
      'view_all_bookings',
      'view_users',
      'impersonate_user',
    ],
    isEditable: true,
  },
  {
    role: 'support_t2',
    displayName: 'Support Tier 2',
    description: 'Senior support with escalation powers',
    permissions: [
      'view_own_bookings',
      'create_booking',
      'cancel_own_booking',
      'view_all_bookings',
      'modify_any_booking',
      'adjust_fare',
      'waive_cancellation_fee',
      'apply_credit',
      'view_users',
      'impersonate_user',
      'view_audit_logs',
    ],
    isEditable: true,
  },
  {
    role: 'admin_business',
    displayName: 'Business Admin',
    description: 'Business operations management',
    permissions: [
      'view_own_bookings',
      'create_booking',
      'cancel_own_booking',
      'view_all_bookings',
      'modify_any_booking',
      'adjust_fare',
      'waive_cancellation_fee',
      'apply_credit',
      'suspend_driver',
      'modify_pricing',
      'manage_promo_codes',
      'view_users',
      'manage_users',
      'view_audit_logs',
      'manage_documents',
      'impersonate_user',
      'view_analytics',
      'export_data',
      'manage_policies',
      'manage_surcharges',
    ],
    isEditable: true,
  },
  {
    role: 'admin_super',
    displayName: 'Super Admin',
    description: 'Full system access',
    permissions: [
      'view_own_bookings',
      'create_booking',
      'cancel_own_booking',
      'view_all_bookings',
      'modify_any_booking',
      'adjust_fare',
      'waive_cancellation_fee',
      'apply_credit',
      'suspend_driver',
      'ban_driver',
      'modify_pricing',
      'manage_promo_codes',
      'view_users',
      'manage_users',
      'manage_roles',
      'view_audit_logs',
      'manage_documents',
      'impersonate_user',
      'view_analytics',
      'export_data',
      'manage_policies',
      'manage_surcharges',
    ],
    isEditable: false,
  },
];

const PERMISSION_CATEGORIES: { name: string; permissions: { key: Permission; label: string; description: string }[] }[] = [
  {
    name: 'Bookings',
    permissions: [
      { key: 'view_own_bookings', label: 'View Own Bookings', description: 'View their own booking history' },
      { key: 'create_booking', label: 'Create Booking', description: 'Create new bookings' },
      { key: 'cancel_own_booking', label: 'Cancel Own Booking', description: 'Cancel their own bookings' },
      { key: 'view_all_bookings', label: 'View All Bookings', description: 'View all system bookings' },
      { key: 'modify_any_booking', label: 'Modify Any Booking', description: 'Edit any booking details' },
    ],
  },
  {
    name: 'Billing & Fees',
    permissions: [
      { key: 'adjust_fare', label: 'Adjust Fare', description: 'Modify booking fares' },
      { key: 'waive_cancellation_fee', label: 'Waive Cancellation Fee', description: 'Waive cancellation penalties' },
      { key: 'apply_credit', label: 'Apply Credit', description: 'Issue account credits' },
    ],
  },
  {
    name: 'Driver Management',
    permissions: [
      { key: 'suspend_driver', label: 'Suspend Driver', description: 'Temporarily suspend drivers' },
      { key: 'ban_driver', label: 'Ban Driver', description: 'Permanently ban drivers' },
      { key: 'manage_documents', label: 'Manage Documents', description: 'Review and approve driver documents' },
    ],
  },
  {
    name: 'User Management',
    permissions: [
      { key: 'view_users', label: 'View Users', description: 'View user profiles' },
      { key: 'manage_users', label: 'Manage Users', description: 'Create and edit users' },
      { key: 'manage_roles', label: 'Manage Roles', description: 'Assign and modify roles' },
      { key: 'impersonate_user', label: 'Impersonate User', description: 'View as another user' },
    ],
  },
  {
    name: 'Platform Settings',
    permissions: [
      { key: 'modify_pricing', label: 'Modify Pricing', description: 'Edit fare and pricing rules' },
      { key: 'manage_promo_codes', label: 'Manage Promo Codes', description: 'Create and edit promotions' },
      { key: 'manage_policies', label: 'Manage Policies', description: 'Edit cancellation and fee policies' },
      { key: 'manage_surcharges', label: 'Manage Surcharges', description: 'Configure location-based fees' },
    ],
  },
  {
    name: 'Analytics & Audit',
    permissions: [
      { key: 'view_analytics', label: 'View Analytics', description: 'Access reporting dashboards' },
      { key: 'view_audit_logs', label: 'View Audit Logs', description: 'View system audit trail' },
      { key: 'export_data', label: 'Export Data', description: 'Download reports and data' },
    ],
  },
];

const roleIcons: Record<DetailedRole, React.ReactNode> = {
  client: <Users size={20} className="text-gray-500" />,
  driver: <Car size={20} className="text-blue-500" />,
  support_t1: <Headphones size={20} className="text-teal-500" />,
  support_t2: <Headphones size={20} className="text-teal-600" />,
  admin_business: <Settings size={20} className="text-purple-500" />,
  admin_super: <Shield size={20} className="text-red-500" />,
};

interface RBACPermissionManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RBACPermissionManager({ isOpen, onClose }: RBACPermissionManagerProps) {
  const [roles, setRoles] = useState<RolePermissions[]>(DEFAULT_ROLE_PERMISSIONS);
  const [selectedRole, setSelectedRole] = useState<DetailedRole>('support_t1');
  const [editingRole, setEditingRole] = useState<DetailedRole | null>(null);
  const [editedPermissions, setEditedPermissions] = useState<Permission[]>([]);
  const [saving, setSaving] = useState(false);

  const currentRole = roles.find((r) => r.role === selectedRole);
  const isEditing = editingRole === selectedRole;

  const handleStartEdit = () => {
    if (currentRole?.isEditable) {
      setEditingRole(selectedRole);
      setEditedPermissions([...currentRole.permissions]);
    }
  };

  const handleCancelEdit = () => {
    setEditingRole(null);
    setEditedPermissions([]);
  };

  const handleTogglePermission = (permission: Permission) => {
    setEditedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    setRoles((prev) =>
      prev.map((r) =>
        r.role === editingRole ? { ...r, permissions: editedPermissions } : r
      )
    );
    setEditingRole(null);
    setEditedPermissions([]);
    setSaving(false);
  };

  const hasPermission = (permission: Permission): boolean => {
    if (isEditing) {
      return editedPermissions.includes(permission);
    }
    return currentRole?.permissions.includes(permission) ?? false;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Role & Permission Management" size="xl">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 -mx-4 sm:-mx-6 px-4 sm:px-6">
        {/* Role List - Horizontal scroll on mobile, vertical on desktop */}
        <div className="md:w-56 flex-shrink-0 md:border-r border-gray-200 dark:border-gray-700 md:pr-4">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 sm:mb-3">
            Roles
          </h3>
          <div className="flex md:flex-col gap-2 md:gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
            {roles.map((role) => (
              <button
                key={role.role}
                onClick={() => {
                  if (!isEditing) {
                    setSelectedRole(role.role);
                  }
                }}
                disabled={isEditing}
                className={`
                  flex-shrink-0 md:w-full flex items-center gap-2 sm:gap-3 px-3 py-2 sm:py-2.5 rounded-lg text-left transition-colors touch-manipulation
                  ${selectedRole === role.role
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 bg-gray-50 dark:bg-gray-800 md:bg-transparent'
                  }
                  ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {roleIcons[role.role]}
                <div className="min-w-0">
                  <p className="font-medium text-xs sm:text-sm truncate">{role.displayName}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate hidden md:block">
                    {role.permissions.length} permissions
                  </p>
                </div>
                {!role.isEditable && (
                  <Lock size={12} className="text-gray-400 flex-shrink-0 sm:w-[14px] sm:h-[14px]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Permission Details */}
        <div className="flex-1 min-w-0">
          {currentRole && (
            <>
              {/* Role Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {roleIcons[currentRole.role]}
                    <h3 className="text-base sm:text-lg font-semibold dark:text-white">
                      {currentRole.displayName}
                    </h3>
                    {!currentRole.isEditable && (
                      <span className="px-2 py-0.5 text-[10px] sm:text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        System Role
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {currentRole.description}
                  </p>
                </div>
                {currentRole.isEditable && !isEditing && (
                  <Button variant="secondary" size="sm" onClick={handleStartEdit} className="self-start min-h-[44px] sm:min-h-0">
                    <Edit2 size={14} /> Edit
                  </Button>
                )}
                {isEditing && (
                  <div className="flex gap-2 self-start">
                    <Button variant="secondary" size="sm" onClick={handleCancelEdit} className="min-h-[44px] sm:min-h-0">
                      <X size={14} /> Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving} className="min-h-[44px] sm:min-h-0">
                      <Save size={14} /> {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Editing Warning */}
              {isEditing && (
                <div className="flex items-center gap-2 p-2 sm:p-3 mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 sm:w-[18px] sm:h-[18px]" />
                  <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300">
                    Changes to permissions will affect all users with this role
                  </p>
                </div>
              )}

              {/* Permission Categories */}
              <div className="space-y-4 sm:space-y-6 max-h-[40vh] md:max-h-[50vh] overflow-y-auto overscroll-contain pr-1">
                {PERMISSION_CATEGORIES.map((category) => (
                  <div key={category.name}>
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sticky top-0 bg-white dark:bg-slate-900 py-1">
                      {category.name}
                    </h4>
                    <div className="grid gap-2">
                      {category.permissions.map((perm) => {
                        const isGranted = hasPermission(perm.key);
                        const canToggle = isEditing;

                        return (
                          <div
                            key={perm.key}
                            onClick={() => canToggle && handleTogglePermission(perm.key)}
                            className={`
                              flex items-center justify-between p-2 sm:p-3 rounded-lg border transition-colors touch-manipulation
                              ${isGranted
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                              }
                              ${canToggle ? 'cursor-pointer hover:shadow-sm active:bg-gray-100 dark:active:bg-gray-700' : ''}
                            `}
                          >
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                              <div
                                className={`
                                  w-4 h-4 sm:w-5 sm:h-5 rounded flex items-center justify-center flex-shrink-0
                                  ${isGranted
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-200 dark:bg-gray-600'
                                  }
                                `}
                              >
                                {isGranted && <Check size={12} className="sm:w-[14px] sm:h-[14px]" />}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-xs sm:text-sm font-medium truncate ${isGranted ? 'text-green-800 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {perm.label}
                                </p>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate hidden sm:block">
                                  {perm.description}
                                </p>
                              </div>
                            </div>
                            {isGranted ? (
                              <Unlock size={14} className="text-green-600 flex-shrink-0 sm:w-4 sm:h-4" />
                            ) : (
                              <Lock size={14} className="text-gray-400 flex-shrink-0 sm:w-4 sm:h-4" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4 -mx-4 sm:-mx-6 px-4 sm:px-6">
        <Button variant="secondary" onClick={onClose} className="min-h-[44px]">
          Close
        </Button>
      </div>
    </Modal>
  );
}
