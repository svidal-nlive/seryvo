import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  User,
  Car,
  CreditCard,
  FileText,
  Settings,
  AlertTriangle,
  Info,
  AlertCircle,
  Eye,
  Clock,
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import type { AuditLogEntry, AuditAction, AuditSeverity } from '../../types';

// Mock audit log data
const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit-001',
    action: 'booking_cancelled',
    severity: 'warning',
    actor_id: 'support-001',
    actor_name: 'Sarah Support',
    actor_role: 'support_agent',
    target_type: 'booking',
    target_id: 'BK-2025-001234',
    target_name: 'Booking #BK-2025-001234',
    description: 'Cancelled booking with reason: Customer requested',
    metadata: { reason: 'customer_request', refund_issued: true },
    ip_address: '192.168.1.100',
    occurred_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'audit-002',
    action: 'credit_applied',
    severity: 'info',
    actor_id: 'support-001',
    actor_name: 'Sarah Support',
    actor_role: 'support_agent',
    target_type: 'user',
    target_id: 'client-002',
    target_name: 'John Client',
    description: 'Applied $25.00 credit for service issue',
    metadata: { amount_cents: 2500, reason: 'service_issue' },
    ip_address: '192.168.1.100',
    occurred_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'audit-003',
    action: 'driver_suspended',
    severity: 'critical',
    actor_id: 'admin-001',
    actor_name: 'Admin User',
    actor_role: 'admin',
    target_type: 'driver',
    target_id: 'driver-003',
    target_name: 'Mike Driver',
    description: 'Driver suspended due to multiple complaints',
    metadata: { reason: 'multiple_complaints', complaint_count: 5 },
    ip_address: '192.168.1.50',
    occurred_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: 'audit-004',
    action: 'fare_adjusted',
    severity: 'warning',
    actor_id: 'support-002',
    actor_name: 'Tom Support',
    actor_role: 'support_agent',
    target_type: 'booking',
    target_id: 'BK-2025-001230',
    target_name: 'Booking #BK-2025-001230',
    description: 'Fare reduced from $45.00 to $35.00 (route issue)',
    metadata: { original_fare: 4500, new_fare: 3500 },
    ip_address: '192.168.1.101',
    occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'audit-005',
    action: 'pricing_updated',
    severity: 'warning',
    actor_id: 'admin-001',
    actor_name: 'Admin User',
    actor_role: 'admin',
    target_type: 'pricing',
    target_id: 'pricing-standard',
    target_name: 'Standard Fare Configuration',
    description: 'Updated base fare from $5.00 to $5.50',
    metadata: { field: 'base_fare', old_value: 500, new_value: 550 },
    ip_address: '192.168.1.50',
    occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 'audit-006',
    action: 'promo_code_created',
    severity: 'info',
    actor_id: 'admin-001',
    actor_name: 'Admin User',
    actor_role: 'admin',
    target_type: 'promo_code',
    target_id: 'promo-winter25',
    target_name: 'WINTER25',
    description: 'Created promo code WINTER25 for 25% off',
    metadata: { discount_percent: 25, max_uses: 1000 },
    ip_address: '192.168.1.50',
    occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'audit-007',
    action: 'document_approved',
    severity: 'info',
    actor_id: 'admin-001',
    actor_name: 'Admin User',
    actor_role: 'admin',
    target_type: 'driver',
    target_id: 'driver-004',
    target_name: 'Jane Driver',
    description: 'Approved driver license document',
    metadata: { document_type: 'drivers_license' },
    ip_address: '192.168.1.50',
    occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: 'audit-008',
    action: 'user_login',
    severity: 'info',
    actor_id: 'admin-001',
    actor_name: 'Admin User',
    actor_role: 'admin',
    description: 'Admin logged in successfully',
    ip_address: '192.168.1.50',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
  {
    id: 'audit-009',
    action: 'impersonation_started',
    severity: 'critical',
    actor_id: 'admin-001',
    actor_name: 'Admin User',
    actor_role: 'admin',
    target_type: 'user',
    target_id: 'client-005',
    target_name: 'Customer Smith',
    description: 'Started impersonation session for debugging',
    metadata: { reason: 'customer_support_ticket' },
    ip_address: '192.168.1.50',
    occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
  },
  {
    id: 'audit-010',
    action: 'role_changed',
    severity: 'critical',
    actor_id: 'admin-001',
    actor_name: 'Admin User',
    actor_role: 'admin',
    target_type: 'user',
    target_id: 'support-003',
    target_name: 'New Support Agent',
    description: 'Changed role from support_t1 to support_t2',
    metadata: { old_role: 'support_t1', new_role: 'support_t2' },
    ip_address: '192.168.1.50',
    occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

const actionLabels: Record<AuditAction, string> = {
  user_login: 'User Login',
  user_logout: 'User Logout',
  booking_created: 'Booking Created',
  booking_updated: 'Booking Updated',
  booking_cancelled: 'Booking Cancelled',
  status_changed: 'Status Changed',
  fare_adjusted: 'Fare Adjusted',
  fee_waived: 'Fee Waived',
  credit_applied: 'Credit Applied',
  refund_issued: 'Refund Issued',
  driver_suspended: 'Driver Suspended',
  driver_activated: 'Driver Activated',
  driver_banned: 'Driver Banned',
  user_created: 'User Created',
  user_updated: 'User Updated',
  role_changed: 'Role Changed',
  permission_updated: 'Permission Updated',
  pricing_updated: 'Pricing Updated',
  promo_code_created: 'Promo Code Created',
  promo_code_updated: 'Promo Code Updated',
  document_approved: 'Document Approved',
  document_rejected: 'Document Rejected',
  policy_updated: 'Policy Updated',
  surcharge_updated: 'Surcharge Updated',
  impersonation_started: 'Impersonation Started',
  impersonation_ended: 'Impersonation Ended',
};

const actionIcons: Partial<Record<AuditAction, React.ReactNode>> = {
  user_login: <User size={16} />,
  user_logout: <User size={16} />,
  booking_created: <FileText size={16} />,
  booking_updated: <FileText size={16} />,
  booking_cancelled: <FileText size={16} />,
  fare_adjusted: <CreditCard size={16} />,
  credit_applied: <CreditCard size={16} />,
  refund_issued: <CreditCard size={16} />,
  driver_suspended: <Car size={16} />,
  driver_activated: <Car size={16} />,
  driver_banned: <Car size={16} />,
  pricing_updated: <Settings size={16} />,
  role_changed: <Settings size={16} />,
};

const severityColors: Record<AuditSeverity, string> = {
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

const severityIcons: Record<AuditSeverity, React.ReactNode> = {
  info: <Info size={14} />,
  warning: <AlertTriangle size={14} />,
  critical: <AlertCircle size={14} />,
};

const ITEMS_PER_PAGE = 10;

export default function AuditTrailViewer() {
  // Start with empty array - data populates when demo data is loaded
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<AuditAction | ''>('');
  const [severityFilter, setSeverityFilter] = useState<AuditSeverity | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !log.description.toLowerCase().includes(query) &&
        !log.actor_name.toLowerCase().includes(query) &&
        !(log.target_name?.toLowerCase().includes(query))
      ) {
        return false;
      }
    }
    if (actionFilter && log.action !== actionFilter) return false;
    if (severityFilter && log.severity !== severityFilter) return false;
    if (dateFrom && new Date(log.occurred_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(log.occurred_at) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatDateTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateStr: string): string => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'Action', 'Severity', 'Actor', 'Role', 'Target', 'Description', 'IP Address'].join(','),
      ...filteredLogs.map((log) =>
        [
          log.occurred_at,
          actionLabels[log.action],
          log.severity,
          log.actor_name,
          log.actor_role,
          log.target_name || '-',
          `"${log.description.replace(/"/g, '""')}"`,
          log.ip_address || '-',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Audit Trail</h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            System activity logs and security events
          </p>
        </div>
        <Button variant="secondary" onClick={handleExport} className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
          <Download size={18} /> Export CSV
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <Button variant="secondary" onClick={() => setShowFilters(!showFilters)} className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
              <Filter size={18} />
              <span className="sm:inline">Filters</span>
              <ChevronDown
                size={16}
                className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}
              />
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Action
                </label>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value as AuditAction | '')}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm min-h-[44px] sm:min-h-0"
                >
                  <option value="">All Actions</option>
                  {Object.entries(actionLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Severity
                </label>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value as AuditSeverity | '')}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm min-h-[44px] sm:min-h-0"
                >
                  <option value="">All</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm min-h-[44px] sm:min-h-0"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm min-h-[44px] sm:min-h-0"
                />
              </div>

              {(actionFilter || severityFilter || dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  className="col-span-2 sm:col-span-1 self-end min-h-[44px] sm:min-h-0"
                  onClick={() => {
                    setActionFilter('');
                    setSeverityFilter('');
                    setDateFrom('');
                    setDateTo('');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card noPadding>
        {/* Mobile Cards View */}
        <div className="block sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
          {paginatedLogs.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              No audit logs found matching your criteria
            </div>
          ) : (
            paginatedLogs.map((log) => (
              <div key={log.id} className="p-3 active:bg-gray-50 dark:active:bg-gray-800 touch-manipulation">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="text-gray-500 flex-shrink-0">
                      {actionIcons[log.action] || <FileText size={16} />}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {actionLabels[log.action]}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${severityColors[log.severity]}`}
                  >
                    {severityIcons[log.severity]}
                    {log.severity.charAt(0).toUpperCase() + log.severity.slice(1)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{log.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock size={12} />
                    {formatRelativeTime(log.occurred_at)}
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <span className="truncate max-w-[100px]">{log.actor_name}</span>
                  </div>
                  <button
                    onClick={() => setSelectedLog(log)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                    aria-label="View details"
                  >
                    <Eye size={16} className="text-gray-500" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Target
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No audit logs found matching your criteria
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {formatRelativeTime(log.occurred_at)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDateTime(log.occurred_at)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="text-gray-500">
                          {actionIcons[log.action] || <FileText size={16} />}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {actionLabels[log.action]}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {log.actor_name}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {log.actor_role.replace('_', ' ')}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {log.target_name ? (
                        <p className="text-sm text-gray-900 dark:text-white">{log.target_name}</p>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${severityColors[log.severity]}`}
                      >
                        {severityIcons[log.severity]}
                        {log.severity.charAt(0).toUpperCase() + log.severity.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="View details"
                      >
                        <Eye size={18} className="text-gray-500" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 sm:px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length}{' '}
              entries
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Log Details Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Log Details"
        size="md"
      >
        {selectedLog && (
          <div className="space-y-4">
            {/* Action Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                  {actionIcons[selectedLog.action] || <FileText size={20} />}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {actionLabels[selectedLog.action]}
                  </h3>
                  <p className="text-sm text-gray-500">{formatDateTime(selectedLog.occurred_at)}</p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${severityColors[selectedLog.severity]}`}
              >
                {severityIcons[selectedLog.severity]}
                {selectedLog.severity.charAt(0).toUpperCase() + selectedLog.severity.slice(1)}
              </span>
            </div>

            {/* Description */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-900 dark:text-white">{selectedLog.description}</p>
            </div>

            {/* Details Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Actor
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedLog.actor_name}
                </p>
                <p className="text-sm text-gray-500 capitalize">
                  {selectedLog.actor_role.replace('_', ' ')}
                </p>
              </div>
              {selectedLog.target_name && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Target
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedLog.target_name}
                  </p>
                  <p className="text-sm text-gray-500 capitalize">{selectedLog.target_type}</p>
                </div>
              )}
              {selectedLog.ip_address && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    IP Address
                  </p>
                  <p className="font-mono text-sm text-gray-900 dark:text-white">
                    {selectedLog.ip_address}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Log ID
                </p>
                <p className="font-mono text-sm text-gray-900 dark:text-white">{selectedLog.id}</p>
              </div>
            </div>

            {/* Metadata */}
            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Additional Data
                </p>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg font-mono text-sm overflow-x-auto">
                  <pre className="text-gray-900 dark:text-white">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* User Agent */}
            {selectedLog.user_agent && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  User Agent
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 break-all">
                  {selectedLog.user_agent}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button variant="secondary" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
