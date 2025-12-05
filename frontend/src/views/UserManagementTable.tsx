import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  MoreVertical,
  User,
  Car,
  Headphones,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Ban,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  UserPlus,
  Mail,
  Edit,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { backend } from '../services/backend';
import { exportUsersToCSV } from '../utils/csvExport';
import UserProvisioningModal from './UserProvisioningModal';
import RoleChangeModal from './RoleChangeModal';
import type { Client, Driver, SupportAgent, Admin, Role, DriverCoreStatus } from '../types';

type AnyUser = Client | Driver | SupportAgent | Admin;

const roleIcons: Record<Role, React.ReactNode> = {
  client: <User size={16} className="text-gray-500" />,
  driver: <Car size={16} className="text-blue-500" />,
  support_agent: <Headphones size={16} className="text-teal-500" />,
  admin: <Shield size={16} className="text-purple-500" />,
};

const roleLabels: Record<Role, string> = {
  client: 'Client',
  driver: 'Driver',
  support_agent: 'Support',
  admin: 'Admin',
};

const roleColors: Record<Role, string> = {
  client: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  driver: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  support_agent: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300',
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
};

const coreStatusIcons: Record<DriverCoreStatus, React.ReactNode> = {
  pending_verification: <Clock size={14} />,
  inactive: <XCircle size={14} />,
  active: <CheckCircle size={14} />,
  suspended: <AlertTriangle size={14} />,
  banned: <Ban size={14} />,
};

const coreStatusColors: Record<DriverCoreStatus, string> = {
  pending_verification: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  suspended: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
  banned: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

const ITEMS_PER_PAGE = 10;

export default function UserManagementTable() {
  const [users, setUsers] = useState<AnyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [statusFilter, setStatusFilter] = useState<DriverCoreStatus | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AnyUser | null>(null);
  const [actionMenuUser, setActionMenuUser] = useState<string | null>(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showRoleChangeModal, setShowRoleChangeModal] = useState(false);
  const [userToChangeRole, setUserToChangeRole] = useState<AnyUser | null>(null);
  const [userStats, setUserStats] = useState({
    totalClients: 0,
    totalDrivers: 0,
    activeDrivers: 0,
    pendingDrivers: 0,
    suspendedDrivers: 0,
    totalSupportAgents: 0,
    totalAdmins: 0,
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await backend.getAllUsers({
        role: roleFilter || undefined,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
      });
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, searchQuery, statusFilter]);

  const loadStats = async () => {
    const stats = await backend.getUserStats();
    setUserStats(stats);
  };

  useEffect(() => {
    loadUsers();
    loadStats();
  }, [loadUsers]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, searchQuery, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const handleStatusChange = async (userId: string, newStatus: DriverCoreStatus) => {
    await backend.updateDriverStatus(userId, newStatus);
    setActionMenuUser(null);
    loadUsers();
    loadStats();
  };

  const handleUserCreated = () => {
    setShowCreateUserModal(false);
    loadUsers();
    loadStats();
  };

  const handleRoleChanged = () => {
    setShowRoleChangeModal(false);
    setUserToChangeRole(null);
    loadUsers();
    loadStats();
  };

  const openRoleChangeModal = (user: AnyUser) => {
    setUserToChangeRole(user);
    setShowRoleChangeModal(true);
    setActionMenuUser(null);
  };

  // Pagination
  const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
  const paginatedUsers = users.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatCoreStatus = (status: DriverCoreStatus): string => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-gray-100 dark:bg-gray-700 flex-shrink-0">
              <User size={16} className="text-gray-600 dark:text-gray-400 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Clients</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                {userStats.totalClients}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex-shrink-0">
              <Car size={16} className="text-blue-600 dark:text-blue-400 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Drivers</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                {userStats.totalDrivers}
              </p>
              <p className="text-[10px] sm:text-xs text-green-600">
                {userStats.activeDrivers} active
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex-shrink-0">
              <Clock size={16} className="text-amber-600 dark:text-amber-400 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Pending</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                {userStats.pendingDrivers}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex-shrink-0">
              <Headphones size={16} className="text-teal-600 dark:text-teal-400 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Support</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                {userStats.totalSupportAgents + userStats.totalAdmins}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 sm:w-[18px] sm:h-[18px]"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-h-[44px] sm:min-h-0"
                />
              </div>
            </form>

            {/* Filter Toggle & Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="primary"
                onClick={() => setShowCreateUserModal(true)}
                className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0 text-sm"
              >
                <UserPlus size={16} />
                <span className="hidden sm:inline">Add User</span>
              </Button>

              <Button
                variant="secondary"
                onClick={() => setShowFilters(!showFilters)}
                className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0 text-sm"
              >
                <Filter size={16} />
                <span className="hidden xs:inline">Filters</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}
                />
              </Button>

              <Button
                variant="secondary"
                onClick={() => exportUsersToCSV(users)}
                disabled={users.length === 0}
                className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0 text-sm"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              {/* Role Filter */}
              <div className="flex-1 sm:flex-none">
                <label className="block text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Role
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as Role | '')}
                  className="w-full sm:w-auto px-3 py-2.5 sm:py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm min-h-[44px] sm:min-h-0"
                >
                  <option value="">All Roles</option>
                  <option value="client">Client</option>
                  <option value="driver">Driver</option>
                  <option value="support_agent">Support</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Status Filter (for drivers) */}
              <div className="flex-1 sm:flex-none">
                <label className="block text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Driver Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as DriverCoreStatus | '')}
                  className="w-full sm:w-auto px-3 py-2.5 sm:py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm min-h-[44px] sm:min-h-0"
                >
                  <option value="">All Statuses</option>
                  <option value="pending_verification">Pending</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                  <option value="banned">Banned</option>
                </select>
              </div>

              {/* Clear Filters */}
              {(roleFilter || statusFilter || searchQuery) && (
                <Button
                  variant="ghost"
                  className="self-end min-h-[44px] sm:min-h-0 text-sm"
                  onClick={() => {
                    setRoleFilter('');
                    setStatusFilter('');
                    setSearchQuery('');
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Users Table */}
      <Card noPadding className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                  Status
                </th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                  Rating
                </th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                    No users found
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const isDriver = user.role === 'driver';
                  const driver = isDriver ? (user as Driver) : null;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors active:bg-gray-100"
                    >
                      {/* User Info */}
                      <td className="px-3 sm:px-4 py-3 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <User size={16} className="text-gray-400 sm:w-5 sm:h-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[180px]">
                              {user.full_name}
                            </p>
                            <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 truncate max-w-[100px] sm:max-w-[180px]">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-3 sm:px-4 py-3 sm:py-4">
                        <span
                          className={`inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${roleColors[user.role]}`}
                        >
                          {roleIcons[user.role]}
                          <span className="hidden xs:inline">{roleLabels[user.role]}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 sm:px-4 py-3 sm:py-4 hidden sm:table-cell">
                        {isDriver && driver ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${coreStatusColors[driver.core_status]}`}
                          >
                            {coreStatusIcons[driver.core_status]}
                            <span className="hidden md:inline">{formatCoreStatus(driver.core_status)}</span>
                          </span>
                        ) : (
                          <span className="text-xs sm:text-sm text-gray-400">—</span>
                        )}
                      </td>

                      {/* Rating */}
                      <td className="px-3 sm:px-4 py-3 sm:py-4 hidden md:table-cell">
                        {isDriver && driver?.rating_average ? (
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500 text-xs sm:text-sm">★</span>
                            <span className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm">
                              {driver.rating_average.toFixed(1)}
                            </span>
                            <span className="text-[10px] sm:text-sm text-gray-400">
                              ({driver.rating_count})
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs sm:text-sm text-gray-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-right">
                        <div className="relative inline-block">
                          <button
                            onClick={() =>
                              setActionMenuUser(actionMenuUser === user.id ? null : user.id)
                            }
                            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation"
                            aria-label="Actions"
                          >
                            <MoreVertical size={16} className="text-gray-500 sm:w-[18px] sm:h-[18px]" />
                          </button>

                          {/* Action Menu */}
                          {actionMenuUser === user.id && (
                            <div className="absolute right-0 mt-1 w-40 sm:w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setActionMenuUser(null);
                                }}
                                className="w-full px-4 py-2.5 sm:py-2 text-left text-xs sm:text-sm hover:bg-gray-100 dark:hover:bg-gray-700 min-h-[44px] sm:min-h-0 flex items-center gap-2"
                              >
                                <User size={14} />
                                View Details
                              </button>
                              <button
                                onClick={() => openRoleChangeModal(user)}
                                className="w-full px-4 py-2.5 sm:py-2 text-left text-xs sm:text-sm hover:bg-gray-100 dark:hover:bg-gray-700 min-h-[44px] sm:min-h-0 flex items-center gap-2"
                              >
                                <Edit size={14} />
                                Change Role
                              </button>
                              {isDriver && (
                                <>
                                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                                  {driver?.core_status !== 'active' && (
                                    <button
                                      onClick={() => handleStatusChange(user.id, 'active')}
                                      className="w-full px-4 py-2.5 sm:py-2 text-left text-xs sm:text-sm text-green-600 hover:bg-gray-100 dark:hover:bg-gray-700 min-h-[44px] sm:min-h-0"
                                    >
                                      Activate
                                    </button>
                                  )}
                                  {driver?.core_status !== 'suspended' && driver?.core_status !== 'banned' && (
                                    <button
                                      onClick={() => handleStatusChange(user.id, 'suspended')}
                                      className="w-full px-4 py-2.5 sm:py-2 text-left text-xs sm:text-sm text-orange-600 hover:bg-gray-100 dark:hover:bg-gray-700 min-h-[44px] sm:min-h-0"
                                    >
                                      Suspend
                                    </button>
                                  )}
                                  {driver?.core_status !== 'banned' && (
                                    <button
                                      onClick={() => handleStatusChange(user.id, 'banned')}
                                      className="w-full px-4 py-2.5 sm:py-2 text-left text-xs sm:text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 min-h-[44px] sm:min-h-0"
                                    >
                                      Ban
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 sm:px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 order-2 sm:order-1">
              <span className="hidden sm:inline">Showing </span>
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, users.length)}
              <span className="hidden sm:inline"> of </span>
              <span className="sm:hidden"> / </span>
              {users.length}
              <span className="hidden sm:inline"> users</span>
            </p>
            <div className="flex items-center gap-2 order-1 sm:order-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-3 sm:p-2 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 min-w-[80px] text-center">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-3 sm:p-2 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* User Details Modal */}
      <Modal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title="User Details"
        size="md"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              <div className="w-16 h-16 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                {selectedUser.avatar_url ? (
                  <img
                    src={selectedUser.avatar_url}
                    alt={selectedUser.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={32} className="text-gray-400" />
                  </div>
                )}
              </div>
              <div className="text-center sm:text-left min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {selectedUser.full_name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{selectedUser.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  User ID
                </p>
                <p className="font-mono text-xs sm:text-sm text-gray-900 dark:text-white truncate">{selectedUser.id}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Role
                </p>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${roleColors[selectedUser.role]}`}
                >
                  {roleIcons[selectedUser.role]}
                  {roleLabels[selectedUser.role]}
                </span>
              </div>
              {selectedUser.role === 'driver' && (
                <>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Status
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${coreStatusColors[(selectedUser as Driver).core_status]}`}
                    >
                      {coreStatusIcons[(selectedUser as Driver).core_status]}
                      {formatCoreStatus((selectedUser as Driver).core_status)}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Rating
                    </p>
                    {(selectedUser as Driver).rating_average ? (
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500 text-sm">★</span>
                        <span className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm">
                          {(selectedUser as Driver).rating_average?.toFixed(1)}
                        </span>
                        <span className="text-[10px] sm:text-sm text-gray-400">
                          ({(selectedUser as Driver).rating_count})
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-gray-400">No ratings yet</p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button 
                variant="secondary" 
                onClick={() => setSelectedUser(null)} 
                className="w-full sm:flex-1 min-h-[44px] sm:min-h-0"
              >
                Close
              </Button>
              <Button 
                onClick={() => {
                  if (selectedUser) {
                    openRoleChangeModal(selectedUser);
                    setSelectedUser(null);
                  }
                }}
                className="w-full sm:flex-1 min-h-[44px] sm:min-h-0"
              >
                Change Role
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* User Provisioning Modal */}
      <UserProvisioningModal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onSuccess={handleUserCreated}
      />

      {/* Role Change Modal */}
      {userToChangeRole && (
        <RoleChangeModal
          isOpen={showRoleChangeModal}
          onClose={() => {
            setShowRoleChangeModal(false);
            setUserToChangeRole(null);
          }}
          userId={userToChangeRole.id}
          userName={userToChangeRole.full_name}
          currentRole={userToChangeRole.role}
          onSuccess={handleRoleChanged}
        />
      )}

      {/* Click outside handler for action menu */}
      {actionMenuUser && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActionMenuUser(null)}
        />
      )}
    </div>
  );
}
