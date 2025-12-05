import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Car, 
  Star, 
  Shield, 
  FileText, 
  Edit2, 
  Camera,
  Check,
  X,
  Clock,
  AlertCircle,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import type { Client, Driver, SupportAgent, Admin, DriverCoreStatus } from '../types';

// Document status types for drivers
interface DriverDocument {
  id: string;
  type: 'license' | 'insurance' | 'registration' | 'background_check';
  name: string;
  status: 'pending' | 'verified' | 'expired' | 'rejected';
  expires_at?: string;
  uploaded_at: string;
}

// Mock driver documents
const MOCK_DRIVER_DOCUMENTS: DriverDocument[] = [
  {
    id: 'doc-001',
    type: 'license',
    name: 'Driver License',
    status: 'verified',
    expires_at: '2026-03-15',
    uploaded_at: '2024-01-10',
  },
  {
    id: 'doc-002',
    type: 'insurance',
    name: 'Vehicle Insurance',
    status: 'verified',
    expires_at: '2025-07-22',
    uploaded_at: '2024-02-05',
  },
  {
    id: 'doc-003',
    type: 'registration',
    name: 'Vehicle Registration',
    status: 'pending',
    uploaded_at: '2024-03-01',
  },
  {
    id: 'doc-004',
    type: 'background_check',
    name: 'Background Check',
    status: 'verified',
    uploaded_at: '2024-01-15',
  },
];

const documentStatusColors: Record<DriverDocument['status'], string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  verified: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

const documentStatusIcons: Record<DriverDocument['status'], React.ReactNode> = {
  pending: <Clock size={14} />,
  verified: <Check size={14} />,
  expired: <AlertCircle size={14} />,
  rejected: <X size={14} />,
};

const coreStatusColors: Record<DriverCoreStatus, string> = {
  pending_verification: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  suspended: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
  banned: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

export default function ProfileView() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: '',
    address: '',
  });
  // Start with empty array - data populates when demo data is loaded
  const [driverDocuments] = useState<DriverDocument[]>([]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">Please log in to view your profile</p>
      </div>
    );
  }

  const isDriver = user.role === 'driver';
  const driver = isDriver ? (user as Driver) : null;

  const handleEditSubmit = () => {
    // In a real app, this would call an API
    console.log('Saving profile:', editForm);
    setIsEditing(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCoreStatus = (status: DriverCoreStatus): string => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      {/* Profile Header */}
      <Card className="relative p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={32} className="text-gray-400 sm:w-10 sm:h-10" />
                </div>
              )}
            </div>
            <button
              className="absolute bottom-0 right-0 p-1.5 sm:p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors min-w-[32px] min-h-[32px] sm:min-w-0 sm:min-h-0 flex items-center justify-center touch-manipulation"
              aria-label="Change avatar"
            >
              <Camera size={14} />
            </button>
          </div>

          {/* User Info */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {user.full_name}
              </h1>
              <span
                className={`
                  inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium capitalize
                  ${user.role === 'admin' 
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
                    : user.role === 'driver'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                    : user.role === 'support_agent'
                    ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300'
                  }
                `}
              >
                {user.role.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 mt-1 truncate">
              <Mail size={12} className="flex-shrink-0 sm:w-3.5 sm:h-3.5" />
              <span className="truncate">{user.email}</span>
            </p>

            {/* Driver-specific info */}
            {isDriver && driver && (
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4 mt-2 sm:mt-3">
                <span className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${coreStatusColors[driver.core_status]}`}>
                  <Shield size={10} className="sm:w-3 sm:h-3" />
                  {formatCoreStatus(driver.core_status)}
                </span>
                {driver.rating_average && (
                  <span className="flex items-center gap-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                    <Star size={14} className="text-yellow-500 fill-yellow-500 sm:w-4 sm:h-4" />
                    {driver.rating_average.toFixed(1)}
                    <span className="text-gray-400 hidden xs:inline">({driver.rating_count})</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Edit Button */}
          <Button 
            variant="secondary" 
            onClick={() => setIsEditing(true)}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 mt-2 sm:mt-0"
          >
            <Edit2 size={16} /> Edit Profile
          </Button>
        </div>
      </Card>

      {/* Profile Details */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
        {/* Personal Information */}
        <Card className="p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <User size={18} className="text-blue-500 sm:w-5 sm:h-5" />
            Personal Information
          </h2>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5 sm:mb-1">
                Full Name
              </p>
              <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">{user.full_name}</p>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5 sm:mb-1">
                Email Address
              </p>
              <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white truncate">{user.email}</p>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5 sm:mb-1">
                Phone Number
              </p>
              <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">+1 (555) 123-4567</p>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5 sm:mb-1">
                Member Since
              </p>
              <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">January 2024</p>
            </div>
          </div>
        </Card>

        {/* Account Settings */}
        <Card className="p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <Shield size={18} className="text-green-500 sm:w-5 sm:h-5" />
            Account Settings
          </h2>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 dark:border-gray-700">
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">Two-Factor Auth</p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden xs:block">Add extra security</p>
              </div>
              <Button variant="secondary" className="text-xs min-h-[36px] sm:min-h-0 flex-shrink-0">Enable</Button>
            </div>
            <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 dark:border-gray-700">
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">Notifications</p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden xs:block">Trip updates</p>
              </div>
              <Button variant="secondary" className="text-xs min-h-[36px] sm:min-h-0 flex-shrink-0">Manage</Button>
            </div>
            <div className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">Password</p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden xs:block">Update password</p>
              </div>
              <Button variant="secondary" className="text-xs min-h-[36px] sm:min-h-0 flex-shrink-0">Update</Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Driver Documents Section */}
      {isDriver && (
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <FileText size={18} className="text-purple-500 sm:w-5 sm:h-5" />
              Documents
            </h2>
            <Button variant="secondary" className="text-xs w-full sm:w-auto min-h-[40px] sm:min-h-0">
              Upload Document
            </Button>
          </div>

          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
            {driverDocuments.length === 0 ? (
              <div className="col-span-2 text-center py-4 text-gray-500 dark:text-gray-400">
                No documents uploaded. Load demo data to see sample documents.
              </div>
            ) : (
            driverDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors touch-manipulation"
              >
                <div className="flex-shrink-0 p-1.5 sm:p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                  <FileText size={16} className="text-gray-600 dark:text-gray-400 sm:w-5 sm:h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-2">
                    <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white truncate">
                      {doc.name}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium w-fit ${documentStatusColors[doc.status]}`}
                    >
                      {documentStatusIcons[doc.status]}
                      <span className="hidden xs:inline">{doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}</span>
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Uploaded: {formatDate(doc.uploaded_at)}
                  </p>
                  {doc.expires_at && (
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                      Expires: {formatDate(doc.expires_at)}
                    </p>
                  )}
                </div>
              </div>
            ))
            )}
          </div>
        </Card>
      )}

      {/* Vehicle Information (for drivers) */}
      {isDriver && (
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Car size={18} className="text-blue-500 sm:w-5 sm:h-5" />
              Vehicle Info
            </h2>
            <Button variant="secondary" className="text-xs w-full sm:w-auto min-h-[40px] sm:min-h-0">
              Edit Vehicle
            </Button>
          </div>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5 sm:mb-1">
                Make & Model
              </p>
              <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">Toyota Camry 2022</p>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5 sm:mb-1">
                License Plate
              </p>
              <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">ABC 1234</p>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5 sm:mb-1">
                Color
              </p>
              <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">Silver</p>
            </div>
          </div>
        </Card>
      )}

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title="Edit Profile"
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleEditSubmit();
          }}
          className="space-y-3 sm:space-y-4"
        >
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={editForm.full_name}
              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-h-[44px] sm:min-h-0"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-h-[44px] sm:min-h-0"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
              className="w-full px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-h-[44px] sm:min-h-0"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Address
            </label>
            <input
              type="text"
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              placeholder="123 Main St, City, State"
              className="w-full px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-h-[44px] sm:min-h-0"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditing(false)}
              className="w-full sm:flex-1 min-h-[44px] sm:min-h-0"
            >
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:flex-1 min-h-[44px] sm:min-h-0">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
