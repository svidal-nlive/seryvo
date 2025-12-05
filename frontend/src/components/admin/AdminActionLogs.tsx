import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Search,
  Filter,
  Download,
  Clock,
  User,
  Settings,
  Shield,
  DollarSign,
  UserPlus,
  UserMinus,
  Key,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

interface AdminAction {
  id: string;
  timestamp: string;
  admin_id: string;
  admin_name: string;
  admin_role: string;
  action_type: AdminActionType;
  action_category: ActionCategory;
  target_type: string;
  target_id: string;
  target_name?: string;
  description: string;
  ip_address: string;
  outcome: 'success' | 'failure' | 'pending';
  metadata?: Record<string, unknown>;
}

type AdminActionType = 
  | 'user_create'
  | 'user_update'
  | 'user_delete'
  | 'user_suspend'
  | 'user_activate'
  | 'role_change'
  | 'permission_grant'
  | 'permission_revoke'
  | 'settings_change'
  | 'surcharge_create'
  | 'surcharge_update'
  | 'surcharge_delete'
  | 'refund_issue'
  | 'credit_apply'
  | 'booking_cancel'
  | 'driver_approve'
  | 'driver_reject'
  | 'report_generate'
  | 'export_data';

type ActionCategory = 'user_management' | 'permissions' | 'financial' | 'settings' | 'operations';

const ACTION_CONFIG: Record<AdminActionType, { label: string; icon: React.ReactNode; category: ActionCategory }> = {
  user_create: { label: 'User Created', icon: <UserPlus size={14} />, category: 'user_management' },
  user_update: { label: 'User Updated', icon: <User size={14} />, category: 'user_management' },
  user_delete: { label: 'User Deleted', icon: <UserMinus size={14} />, category: 'user_management' },
  user_suspend: { label: 'User Suspended', icon: <XCircle size={14} />, category: 'user_management' },
  user_activate: { label: 'User Activated', icon: <CheckCircle size={14} />, category: 'user_management' },
  role_change: { label: 'Role Changed', icon: <Shield size={14} />, category: 'permissions' },
  permission_grant: { label: 'Permission Granted', icon: <Key size={14} />, category: 'permissions' },
  permission_revoke: { label: 'Permission Revoked', icon: <Key size={14} />, category: 'permissions' },
  settings_change: { label: 'Settings Changed', icon: <Settings size={14} />, category: 'settings' },
  surcharge_create: { label: 'Surcharge Created', icon: <DollarSign size={14} />, category: 'financial' },
  surcharge_update: { label: 'Surcharge Updated', icon: <DollarSign size={14} />, category: 'financial' },
  surcharge_delete: { label: 'Surcharge Deleted', icon: <DollarSign size={14} />, category: 'financial' },
  refund_issue: { label: 'Refund Issued', icon: <RefreshCw size={14} />, category: 'financial' },
  credit_apply: { label: 'Credit Applied', icon: <DollarSign size={14} />, category: 'financial' },
  booking_cancel: { label: 'Booking Canceled', icon: <XCircle size={14} />, category: 'operations' },
  driver_approve: { label: 'Driver Approved', icon: <CheckCircle size={14} />, category: 'operations' },
  driver_reject: { label: 'Driver Rejected', icon: <XCircle size={14} />, category: 'operations' },
  report_generate: { label: 'Report Generated', icon: <ClipboardList size={14} />, category: 'operations' },
  export_data: { label: 'Data Exported', icon: <Download size={14} />, category: 'operations' },
};

const CATEGORY_COLORS: Record<ActionCategory, string> = {
  user_management: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  permissions: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  financial: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  settings: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  operations: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

// Generate admin actions - returns empty array until demo data is loaded
const generateMockActions = (): AdminAction[] => {
  // Data will be populated when demo data is loaded via Admin settings
  return [];
};

interface AdminActionLogsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminActionLogs({ isOpen, onClose }: AdminActionLogsProps) {
  const [actions] = useState<AdminAction[]>(generateMockActions);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ActionCategory | 'all'>('all');
  const [adminFilter, setAdminFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'success' | 'failure'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAction, setSelectedAction] = useState<AdminAction | null>(null);
  const itemsPerPage = 15;

  // Get unique admins for filter
  const uniqueAdmins = useMemo(() => {
    const admins = new Map<string, { id: string; name: string }>();
    actions.forEach(a => admins.set(a.admin_id, { id: a.admin_id, name: a.admin_name }));
    return Array.from(admins.values());
  }, [actions]);

  // Filtered actions
  const filteredActions = useMemo(() => {
    return actions.filter(action => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        if (
          !action.admin_name.toLowerCase().includes(searchLower) &&
          !action.description.toLowerCase().includes(searchLower) &&
          !action.target_name?.toLowerCase().includes(searchLower) &&
          !action.target_id.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== 'all' && action.action_category !== categoryFilter) return false;

      // Admin filter
      if (adminFilter !== 'all' && action.admin_id !== adminFilter) return false;

      // Outcome filter
      if (outcomeFilter !== 'all' && action.outcome !== outcomeFilter) return false;

      // Date filters
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (new Date(action.timestamp) < fromDate) return false;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (new Date(action.timestamp) > toDate) return false;
      }

      return true;
    });
  }, [actions, search, categoryFilter, adminFilter, outcomeFilter, dateFrom, dateTo]);

  const paginatedActions = filteredActions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredActions.length / itemsPerPage);

  const formatTimestamp = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Admin', 'Role', 'Action', 'Category', 'Target', 'Description', 'IP', 'Outcome'];
    const csvContent = [
      headers.join(','),
      ...filteredActions.map(a => [
        a.timestamp,
        a.admin_name,
        a.admin_role,
        a.action_type,
        a.action_category,
        a.target_name || a.target_id,
        `"${a.description}"`,
        a.ip_address,
        a.outcome,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin-actions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in overflow-hidden"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-5xl max-h-[95vh] sm:max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 duration-200">
        {/* Fixed Header - Always Visible */}
        <div className="flex-shrink-0 flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-10">
          {/* Mobile drag indicator */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-300 dark:bg-slate-600 rounded-full sm:hidden" />
          
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex-shrink-0">
              <ClipboardList size={20} className="text-purple-600 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-semibold dark:text-white truncate">Admin Action Logs</h2>
              <p className="text-xs sm:text-sm text-gray-500">{filteredActions.length} actions found</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="flex-shrink-0 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 active:bg-gray-200 transition-colors touch-manipulation"
          >
            <span className="text-xl text-gray-500">✕</span>
          </button>
        </div>

        {/* Filters - Collapsible on mobile */}
        <div className="flex-shrink-0 p-3 sm:p-4 border-b border-gray-200 dark:border-slate-700 space-y-3 sm:space-y-4 overflow-x-auto">
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search actions..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-2 sm:gap-4">
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as ActionCategory | 'all')}
                className="flex-1 sm:flex-none px-2 sm:px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm min-w-[100px]"
              >
                <option value="all">All Categories</option>
                <option value="user_management">User Mgmt</option>
                <option value="permissions">Permissions</option>
                <option value="financial">Financial</option>
                <option value="settings">Settings</option>
                <option value="operations">Operations</option>
              </select>

              {/* Admin Filter */}
              <select
                value={adminFilter}
                onChange={(e) => setAdminFilter(e.target.value)}
                className="flex-1 sm:flex-none px-2 sm:px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm min-w-[100px]"
              >
                <option value="all">All Admins</option>
                {uniqueAdmins.map(admin => (
                  <option key={admin.id} value={admin.id}>{admin.name}</option>
                ))}
              </select>

              {/* Outcome Filter */}
              <select
                value={outcomeFilter}
                onChange={(e) => setOutcomeFilter(e.target.value as 'all' | 'success' | 'failure')}
                className="flex-1 sm:flex-none px-2 sm:px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm"
              >
                <option value="all">All</option>
                <option value="success">Success</option>
                <option value="failure">Failed</option>
              </select>

              <Button variant="secondary" onClick={handleExportCSV} className="text-xs sm:text-sm px-2 sm:px-3">
                <Download size={14} className="sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          </div>

          {/* Date Range - Collapsible */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Calendar size={14} className="text-gray-400 sm:w-4 sm:h-4" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-2 sm:px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm"
              />
              <span className="text-gray-400 text-xs">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-2 sm:px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Actions List - Scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {actions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-8">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <ClipboardList size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No Admin Actions Logged</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md">
                Admin action logs will appear here once activities are recorded. Load demo data from Admin Settings to see sample entries.
              </p>
            </div>
          ) : (
          <table className="w-full text-xs sm:text-sm min-w-[600px]">
            <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0 z-[5]">
              <tr>
                <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-600 dark:text-gray-400">Time</th>
                <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-600 dark:text-gray-400">Admin</th>
                <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-600 dark:text-gray-400">Action</th>
                <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-600 dark:text-gray-400 hidden sm:table-cell">Target</th>
                <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-600 dark:text-gray-400 hidden md:table-cell">IP</th>
              </tr>
            </thead>
            <tbody>
              {paginatedActions.map(action => (
                <tr
                  key={action.id}
                  onClick={() => setSelectedAction(action)}
                  className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors active:bg-gray-100 touch-manipulation"
                >
                  <td className="py-2 sm:py-3 px-2 sm:px-4">
                    <div className="flex items-center gap-1 sm:gap-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      <Clock size={12} className="sm:w-[14px] sm:h-[14px] flex-shrink-0" />
                      <span className="text-[10px] sm:text-sm">{formatTimestamp(action.timestamp)}</span>
                    </div>
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4">
                    <div className="min-w-0">
                      <p className="font-medium dark:text-white text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none">{action.admin_name}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500 truncate">{action.admin_role}</p>
                    </div>
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${CATEGORY_COLORS[action.action_category]} whitespace-nowrap`}>
                        {ACTION_CONFIG[action.action_type].icon}
                        <span className="ml-0.5 sm:ml-1 hidden xs:inline">{ACTION_CONFIG[action.action_type].label}</span>
                      </span>
                    </div>
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    <span className="truncate block max-w-[120px]">{action.target_name || action.target_id}</span>
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4">
                    {action.outcome === 'success' ? (
                      <span className="flex items-center gap-1 text-green-600 text-xs sm:text-sm">
                        <CheckCircle size={12} className="sm:w-[14px] sm:h-[14px]" /> <span className="hidden sm:inline">Success</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600 text-xs sm:text-sm">
                        <XCircle size={12} className="sm:w-[14px] sm:h-[14px]" /> <span className="hidden sm:inline">Failed</span>
                      </span>
                    )}
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-500 font-mono text-[10px] sm:text-xs hidden md:table-cell">
                    {action.ip_address}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>

        {/* Pagination - Only show if there's data */}
        {actions.length > 0 && (
        <div className="flex-shrink-0 p-3 sm:p-4 border-t border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
            {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredActions.length)} of {filteredActions.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-800 touch-manipulation"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 px-2">
              {currentPage} / {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-800 touch-manipulation"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        )}
      </div>

      {/* Action Detail Modal */}
      {selectedAction && (
        <div 
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in"
          onClick={(e) => e.target === e.currentTarget && setSelectedAction(null)}
        >
          <Card className="w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl m-0 sm:m-4">
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-white dark:bg-slate-800 pb-2 -mt-2 pt-2">
              <h3 className="text-base sm:text-lg font-semibold dark:text-white">Action Details</h3>
              <button
                onClick={() => setSelectedAction(null)}
                aria-label="Close"
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 touch-manipulation"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Timestamp</p>
                  <p className="dark:text-white text-sm sm:text-base">{new Date(selectedAction.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Outcome</p>
                  <p className={`text-sm sm:text-base ${selectedAction.outcome === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedAction.outcome === 'success' ? '✓ Success' : '✗ Failed'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Admin</p>
                  <p className="dark:text-white text-sm sm:text-base">{selectedAction.admin_name}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">{selectedAction.admin_role}</p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-gray-500 uppercase">IP Address</p>
                  <p className="font-mono text-xs sm:text-sm dark:text-white break-all">{selectedAction.ip_address}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Action Type</p>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs sm:text-sm ${CATEGORY_COLORS[selectedAction.action_category]}`}>
                  {ACTION_CONFIG[selectedAction.action_type].icon}
                  {ACTION_CONFIG[selectedAction.action_type].label}
                </span>
              </div>

              <div>
                <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Target</p>
                <p className="dark:text-white text-sm sm:text-base">
                  {selectedAction.target_type}: {selectedAction.target_name || selectedAction.target_id}
                </p>
              </div>

              <div>
                <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Description</p>
                <p className="dark:text-gray-300 text-sm sm:text-base">{selectedAction.description}</p>
              </div>
            </div>

            <div className="mt-4 sm:mt-6 flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedAction(null)} className="min-h-[44px]">
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
