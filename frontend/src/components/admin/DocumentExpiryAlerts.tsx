/**
 * Seryvo Platform - Document Expiry Alerts Component
 * Displays expiring and expired driver documents with alerts
 */

import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  FileWarning,
  CheckCircle,
  XCircle,
  Calendar,
  Car,
  User,
  ChevronRight,
  Bell,
  Download,
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { convertToCSV, downloadCSV } from '../../utils/csvExport';

// =============================================================================
// Types
// =============================================================================

interface DriverDocument {
  doc_id: string;
  driver_id: string;
  driver_name: string;
  doc_type: DocumentType;
  status: DocStatus;
  expiry_date: string;
  days_until_expiry: number;
  last_updated: string;
}

type DocumentType = 
  | 'driving_license'
  | 'vehicle_registration'
  | 'vehicle_insurance'
  | 'background_check'
  | 'medical_certificate'
  | 'prd_license'
  | 'vehicle_inspection'
  | 'profile_photo';

type DocStatus = 'valid' | 'expiring_soon' | 'expired' | 'pending_review';
type AlertFilter = 'all' | 'expired' | 'expiring_7' | 'expiring_30';

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  driving_license: 'Driving License',
  vehicle_registration: 'Vehicle Registration',
  vehicle_insurance: 'Vehicle Insurance',
  background_check: 'Background Check',
  medical_certificate: 'Medical Certificate',
  prd_license: 'PRD License',
  vehicle_inspection: 'Vehicle Inspection',
  profile_photo: 'Profile Photo',
};

const DOC_TYPE_ICONS: Record<DocumentType, React.ReactNode> = {
  driving_license: <User className="w-4 h-4" />,
  vehicle_registration: <Car className="w-4 h-4" />,
  vehicle_insurance: <FileWarning className="w-4 h-4" />,
  background_check: <CheckCircle className="w-4 h-4" />,
  medical_certificate: <FileWarning className="w-4 h-4" />,
  prd_license: <FileWarning className="w-4 h-4" />,
  vehicle_inspection: <Car className="w-4 h-4" />,
  profile_photo: <User className="w-4 h-4" />,
};

// =============================================================================
// Mock Data
// =============================================================================

const MOCK_EXPIRING_DOCS: DriverDocument[] = [
  {
    doc_id: 'doc-1',
    driver_id: 'driver-1',
    driver_name: 'Bob Driver',
    doc_type: 'driving_license',
    status: 'expiring_soon',
    expiry_date: '2024-12-15',
    days_until_expiry: 13,
    last_updated: '2024-11-01T10:00:00Z',
  },
  {
    doc_id: 'doc-2',
    driver_id: 'driver-2',
    driver_name: 'Diana Smith',
    doc_type: 'vehicle_insurance',
    status: 'expired',
    expiry_date: '2024-11-28',
    days_until_expiry: -4,
    last_updated: '2024-10-15T09:00:00Z',
  },
  {
    doc_id: 'doc-3',
    driver_id: 'driver-1',
    driver_name: 'Bob Driver',
    doc_type: 'vehicle_inspection',
    status: 'expiring_soon',
    expiry_date: '2024-12-08',
    days_until_expiry: 6,
    last_updated: '2024-06-01T14:00:00Z',
  },
  {
    doc_id: 'doc-4',
    driver_id: 'driver-3',
    driver_name: 'Mike Johnson',
    doc_type: 'background_check',
    status: 'expiring_soon',
    expiry_date: '2024-12-25',
    days_until_expiry: 23,
    last_updated: '2023-12-25T11:00:00Z',
  },
  {
    doc_id: 'doc-5',
    driver_id: 'driver-4',
    driver_name: 'Sarah Wilson',
    doc_type: 'vehicle_registration',
    status: 'expired',
    expiry_date: '2024-11-20',
    days_until_expiry: -12,
    last_updated: '2024-05-20T16:00:00Z',
  },
  {
    doc_id: 'doc-6',
    driver_id: 'driver-5',
    driver_name: 'James Rodriguez',
    doc_type: 'medical_certificate',
    status: 'expiring_soon',
    expiry_date: '2024-12-10',
    days_until_expiry: 8,
    last_updated: '2024-06-10T08:00:00Z',
  },
];

// =============================================================================
// Props
// =============================================================================

interface DocumentExpiryAlertsProps {
  /** Compact mode for dashboard widget */
  compact?: boolean;
  /** Maximum items to show in compact mode */
  maxItems?: number;
  /** Callback when view all is clicked */
  onViewAll?: () => void;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export default function DocumentExpiryAlerts({
  compact = false,
  maxItems = 5,
  onViewAll,
  className = '',
}: DocumentExpiryAlertsProps) {
  const [filter, setFilter] = useState<AlertFilter>('all');
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DriverDocument | null>(null);
  // Start with empty array - data populates when demo data is loaded
  const [expiringDocs, setExpiringDocs] = useState<DriverDocument[]>([]);

  // Filter and sort documents
  const filteredDocs = useMemo(() => {
    let docs = [...expiringDocs];

    switch (filter) {
      case 'expired':
        docs = docs.filter(d => d.days_until_expiry < 0);
        break;
      case 'expiring_7':
        docs = docs.filter(d => d.days_until_expiry >= 0 && d.days_until_expiry <= 7);
        break;
      case 'expiring_30':
        docs = docs.filter(d => d.days_until_expiry >= 0 && d.days_until_expiry <= 30);
        break;
    }

    // Sort by urgency (most urgent first)
    docs.sort((a, b) => a.days_until_expiry - b.days_until_expiry);

    if (compact) {
      docs = docs.slice(0, maxItems);
    }

    return docs;
  }, [filter, compact, maxItems, expiringDocs]);

  // Count stats
  const stats = useMemo(() => ({
    expired: expiringDocs.filter(d => d.days_until_expiry < 0).length,
    expiring7: expiringDocs.filter(d => d.days_until_expiry >= 0 && d.days_until_expiry <= 7).length,
    expiring30: expiringDocs.filter(d => d.days_until_expiry >= 0 && d.days_until_expiry <= 30).length,
    total: expiringDocs.length,
  }), [expiringDocs]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (doc: DriverDocument) => {
    if (doc.days_until_expiry < 0) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Expired {Math.abs(doc.days_until_expiry)}d ago
        </span>
      );
    }
    if (doc.days_until_expiry <= 7) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {doc.days_until_expiry}d left
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {doc.days_until_expiry}d left
      </span>
    );
  };

  const handleNotifyDriver = (doc: DriverDocument) => {
    setSelectedDoc(doc);
    setShowNotifyModal(true);
  };

  const handleSendNotification = () => {
    // In production, this would call an API to send notification
    alert(`Notification sent to ${selectedDoc?.driver_name}`);
    setShowNotifyModal(false);
    setSelectedDoc(null);
  };

  const handleExport = () => {
    const data = filteredDocs.map(doc => ({
      driver: doc.driver_name,
      doc_type: DOC_TYPE_LABELS[doc.doc_type],
      expiry_date: formatDate(doc.expiry_date),
      days_until_expiry: doc.days_until_expiry,
      status: doc.days_until_expiry < 0 ? 'Expired' : 'Expiring Soon',
      last_updated: formatDate(doc.last_updated),
    }));
    
    const columns = [
      { key: 'driver', header: 'Driver' },
      { key: 'doc_type', header: 'Document Type' },
      { key: 'expiry_date', header: 'Expiry Date' },
      { key: 'days_until_expiry', header: 'Days Until Expiry' },
      { key: 'status', header: 'Status' },
      { key: 'last_updated', header: 'Last Updated' },
    ];
    
    const csvContent = convertToCSV(data, columns);
    downloadCSV(csvContent, `document-expiry-alerts-${new Date().toISOString().split('T')[0]}`);
  };

  // Compact widget view
  if (compact) {
    return (
      <Card className={className}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Document Alerts
          </h3>
          {stats.expired > 0 && (
            <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded-full">
              {stats.expired} expired
            </span>
          )}
        </div>

        {filteredDocs.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
            <p>All documents are up to date</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocs.map((doc) => (
              <div
                key={doc.doc_id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    doc.days_until_expiry < 0
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  }`}>
                    {DOC_TYPE_ICONS[doc.doc_type]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {doc.driver_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {DOC_TYPE_LABELS[doc.doc_type]}
                    </p>
                  </div>
                </div>
                {getStatusBadge(doc)}
              </div>
            ))}
          </div>
        )}

        {onViewAll && stats.total > maxItems && (
          <button
            onClick={onViewAll}
            className="mt-4 w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center justify-center gap-1"
          >
            View all {stats.total} alerts <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </Card>
    );
  }

  // Full view
  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
            Document Expiry Alerts
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Monitor and manage driver document expirations
          </p>
        </div>
        <Button variant="secondary" onClick={handleExport} className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
          <Download size={16} /> Export
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card
          onClick={() => setFilter('expired')}
          className={`cursor-pointer hover:ring-2 hover:ring-red-500 transition-all touch-manipulation active:scale-[0.98] ${
            filter === 'expired' ? 'ring-2 ring-red-500' : ''
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.expired}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Expired</p>
            </div>
          </div>
        </Card>

        <Card
          onClick={() => setFilter('expiring_7')}
          className={`cursor-pointer hover:ring-2 hover:ring-amber-500 transition-all touch-manipulation active:scale-[0.98] ${
            filter === 'expiring_7' ? 'ring-2 ring-amber-500' : ''
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-amber-600">{stats.expiring7}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">In 7 days</p>
            </div>
          </div>
        </Card>

        <Card
          onClick={() => setFilter('expiring_30')}
          className={`cursor-pointer hover:ring-2 hover:ring-yellow-500 transition-all touch-manipulation active:scale-[0.98] ${
            filter === 'expiring_30' ? 'ring-2 ring-yellow-500' : ''
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.expiring30}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">In 30 days</p>
            </div>
          </div>
        </Card>

        <Card
          onClick={() => setFilter('all')}
          className={`cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all touch-manipulation active:scale-[0.98] ${
            filter === 'all' ? 'ring-2 ring-blue-500' : ''
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <FileWarning className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.total}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Total Alerts</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Document List */}
      <Card>
        {/* Mobile Card View */}
        <div className="block sm:hidden divide-y divide-gray-200 dark:divide-slate-700 -mx-4 -my-4">
          {filteredDocs.map((doc) => (
            <div key={doc.doc_id} className="p-3 active:bg-gray-50 dark:active:bg-slate-800 touch-manipulation">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{doc.driver_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{DOC_TYPE_LABELS[doc.doc_type]}</p>
                  </div>
                </div>
                {getStatusBadge(doc)}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  {formatDate(doc.expiry_date)}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleNotifyDriver(doc)}
                  className="min-h-[36px]"
                >
                  <Bell size={14} /> Notify
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto -mx-4 -my-4">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Driver
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Document Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Expiry Date
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredDocs.map((doc) => (
                <tr key={doc.doc_id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {doc.driver_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {doc.driver_id}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-500">
                        {DOC_TYPE_ICONS[doc.doc_type]}
                      </div>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {DOC_TYPE_LABELS[doc.doc_type]}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900 dark:text-white">
                        {formatDate(doc.expiry_date)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getStatusBadge(doc)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleNotifyDriver(doc)}
                    >
                      <Bell size={14} /> Notify
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredDocs.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No documents match this filter</p>
          </div>
        )}
      </Card>

      {/* Notify Modal */}
      <Modal
        isOpen={showNotifyModal}
        onClose={() => setShowNotifyModal(false)}
        title="Send Document Reminder"
      >
        {selectedDoc && (
          <div className="p-4 space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Driver</p>
              <p className="font-medium text-gray-900 dark:text-white">{selectedDoc.driver_name}</p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Document</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {DOC_TYPE_LABELS[selectedDoc.doc_type]}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {selectedDoc.days_until_expiry < 0
                  ? `Expired ${Math.abs(selectedDoc.days_until_expiry)} days ago`
                  : `Expires in ${selectedDoc.days_until_expiry} days`}
              </p>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                A reminder will be sent via email and push notification.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => setShowNotifyModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSendNotification} className="flex-1">
                <Bell size={16} /> Send Reminder
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
