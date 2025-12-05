/**
 * Seryvo Platform - Driver Payout Summaries View
 * Admin view for managing and reviewing driver payouts
 */

import { useState, useMemo } from 'react';
import {
  DollarSign,
  Download,
  TrendingUp,
  TrendingDown,
  User,
  Car,
  ChevronDown,
  Search,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { downloadCSV, convertToCSV } from '../utils/csvExport';

// =============================================================================
// Types
// =============================================================================

interface DriverPayoutSummary {
  driver_id: string;
  driver_name: string;
  total_trips: number;
  total_earnings: number;
  total_tips: number;
  total_bonuses: number;
  total_deductions: number;
  net_payout: number;
  pending_amount: number;
  last_payout_date: string | null;
  status: 'active' | 'pending_payout' | 'paid' | 'on_hold';
}

type PayoutPeriod = 'today' | 'week' | 'month' | 'quarter' | 'custom';
type SortField = 'driver_name' | 'total_earnings' | 'net_payout' | 'total_trips';
type SortDirection = 'asc' | 'desc';

// =============================================================================
// Mock Data
// =============================================================================

const MOCK_PAYOUT_SUMMARIES: DriverPayoutSummary[] = [
  {
    driver_id: 'driver-1',
    driver_name: 'Bob Driver',
    total_trips: 47,
    total_earnings: 234500,
    total_tips: 18500,
    total_bonuses: 5000,
    total_deductions: 4680,
    net_payout: 253320,
    pending_amount: 45000,
    last_payout_date: '2024-12-01T10:00:00Z',
    status: 'pending_payout',
  },
  {
    driver_id: 'driver-2',
    driver_name: 'Diana Smith',
    total_trips: 62,
    total_earnings: 312000,
    total_tips: 24500,
    total_bonuses: 10000,
    total_deductions: 6240,
    net_payout: 340260,
    pending_amount: 0,
    last_payout_date: '2024-12-02T14:00:00Z',
    status: 'paid',
  },
  {
    driver_id: 'driver-3',
    driver_name: 'Mike Johnson',
    total_trips: 38,
    total_earnings: 189500,
    total_tips: 12000,
    total_bonuses: 2500,
    total_deductions: 3790,
    net_payout: 200210,
    pending_amount: 78000,
    last_payout_date: '2024-11-28T09:00:00Z',
    status: 'pending_payout',
  },
  {
    driver_id: 'driver-4',
    driver_name: 'Sarah Wilson',
    total_trips: 29,
    total_earnings: 145000,
    total_tips: 9500,
    total_bonuses: 0,
    total_deductions: 2900,
    net_payout: 151600,
    pending_amount: 151600,
    last_payout_date: null,
    status: 'on_hold',
  },
  {
    driver_id: 'driver-5',
    driver_name: 'James Rodriguez',
    total_trips: 55,
    total_earnings: 275000,
    total_tips: 21000,
    total_bonuses: 7500,
    total_deductions: 5500,
    net_payout: 298000,
    pending_amount: 0,
    last_payout_date: '2024-12-02T16:30:00Z',
    status: 'paid',
  },
];

// =============================================================================
// Component
// =============================================================================

export default function DriverPayoutSummariesView() {
  // Start with empty array - data populates when demo data is loaded
  const [summaries] = useState<DriverPayoutSummary[]>([]);
  const [period, setPeriod] = useState<PayoutPeriod>('week');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DriverPayoutSummary['status'] | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('net_payout');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedDrivers, setSelectedDrivers] = useState<Set<string>>(new Set());

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Never';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate totals
  const totals = useMemo(() => {
    return summaries.reduce(
      (acc, s) => ({
        trips: acc.trips + s.total_trips,
        earnings: acc.earnings + s.total_earnings,
        tips: acc.tips + s.total_tips,
        bonuses: acc.bonuses + s.total_bonuses,
        deductions: acc.deductions + s.total_deductions,
        netPayout: acc.netPayout + s.net_payout,
        pending: acc.pending + s.pending_amount,
      }),
      { trips: 0, earnings: 0, tips: 0, bonuses: 0, deductions: 0, netPayout: 0, pending: 0 }
    );
  }, [summaries]);

  // Filter and sort summaries
  const filteredSummaries = useMemo(() => {
    let result = [...summaries];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.driver_name.toLowerCase().includes(query) ||
          s.driver_id.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'driver_name':
          comparison = a.driver_name.localeCompare(b.driver_name);
          break;
        case 'total_earnings':
          comparison = a.total_earnings - b.total_earnings;
          break;
        case 'net_payout':
          comparison = a.net_payout - b.net_payout;
          break;
        case 'total_trips':
          comparison = a.total_trips - b.total_trips;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [summaries, searchQuery, statusFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleSelectDriver = (driverId: string) => {
    const newSelected = new Set(selectedDrivers);
    if (newSelected.has(driverId)) {
      newSelected.delete(driverId);
    } else {
      newSelected.add(driverId);
    }
    setSelectedDrivers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedDrivers.size === filteredSummaries.length) {
      setSelectedDrivers(new Set());
    } else {
      setSelectedDrivers(new Set(filteredSummaries.map((s) => s.driver_id)));
    }
  };

  const handleExportCSV = () => {
    const data = filteredSummaries.map((s) => ({
      driver_id: s.driver_id,
      driver_name: s.driver_name,
      total_trips: s.total_trips,
      earnings: formatCurrency(s.total_earnings),
      tips: formatCurrency(s.total_tips),
      bonuses: formatCurrency(s.total_bonuses),
      deductions: formatCurrency(s.total_deductions),
      net_payout: formatCurrency(s.net_payout),
      pending_amount: formatCurrency(s.pending_amount),
      last_payout: formatDate(s.last_payout_date),
      status: s.status,
    }));

    const columns = [
      { key: 'driver_id', header: 'Driver ID' },
      { key: 'driver_name', header: 'Driver Name' },
      { key: 'total_trips', header: 'Total Trips' },
      { key: 'earnings', header: 'Earnings' },
      { key: 'tips', header: 'Tips' },
      { key: 'bonuses', header: 'Bonuses' },
      { key: 'deductions', header: 'Deductions' },
      { key: 'net_payout', header: 'Net Payout' },
      { key: 'pending_amount', header: 'Pending Amount' },
      { key: 'last_payout', header: 'Last Payout' },
      { key: 'status', header: 'Status' },
    ];

    const csvContent = convertToCSV(data, columns);
    downloadCSV(csvContent, `driver-payouts-${period}-${new Date().toISOString().split('T')[0]}`);
  };

  const handleProcessPayouts = () => {
    // In production, this would call an API to process payouts
    alert(`Processing payouts for ${selectedDrivers.size} driver(s)`);
  };

  const getStatusBadge = (status: DriverPayoutSummary['status']) => {
    const configs = {
      active: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Active' },
      pending_payout: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', label: 'Pending Payout' },
      paid: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Paid' },
      on_hold: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'On Hold' },
    };
    const config = configs[status];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="w-4 h-4 text-gray-400" />;
    return sortDirection === 'asc' ? (
      <TrendingUp className="w-4 h-4 text-blue-500" />
    ) : (
      <TrendingDown className="w-4 h-4 text-blue-500" />
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Driver Payout Summaries
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Review and process driver earnings and payouts
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleExportCSV}>
            <Download size={16} /> Export CSV
          </Button>
          {selectedDrivers.size > 0 && (
            <Button variant="primary" onClick={handleProcessPayouts}>
              <DollarSign size={16} /> Process Payouts ({selectedDrivers.size})
            </Button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.trips}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Trips</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.earnings)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Earnings</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(totals.tips)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Tips</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-purple-600">{formatCurrency(totals.bonuses)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Bonuses</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.deductions)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Deductions</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totals.netPayout)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Net Payout</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(totals.pending)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Period Selector */}
          <div className="flex gap-2">
            {(['today', 'week', 'month', 'quarter'] as PayoutPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  period === p
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search drivers..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg
                         bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg
                       bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending_payout">Pending Payout</option>
            <option value="paid">Paid</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>
      </Card>

      {/* Payout Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedDrivers.size === filteredSummaries.length && filteredSummaries.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 dark:border-slate-600"
                  />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                  onClick={() => handleSort('driver_name')}
                >
                  <div className="flex items-center gap-1">
                    Driver <SortIcon field="driver_name" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                  onClick={() => handleSort('total_trips')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Trips <SortIcon field="total_trips" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                  onClick={() => handleSort('total_earnings')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Earnings <SortIcon field="total_earnings" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Tips
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Bonuses
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Deductions
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                  onClick={() => handleSort('net_payout')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Net Payout <SortIcon field="net_payout" />
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Last Payout
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredSummaries.map((summary) => (
                <tr
                  key={summary.driver_id}
                  className={`hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${
                    selectedDrivers.has(summary.driver_id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedDrivers.has(summary.driver_id)}
                      onChange={() => handleSelectDriver(summary.driver_id)}
                      className="rounded border-gray-300 dark:border-slate-600"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {summary.driver_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {summary.driver_id}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                    {summary.total_trips}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-green-600">
                    {formatCurrency(summary.total_earnings)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-blue-600">
                    {formatCurrency(summary.total_tips)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-purple-600">
                    {formatCurrency(summary.total_bonuses)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-red-600">
                    -{formatCurrency(summary.total_deductions)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-600">
                    {formatCurrency(summary.net_payout)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getStatusBadge(summary.status)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(summary.last_payout_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSummaries.length === 0 && (
          <div className="text-center py-12">
            <Car className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No driver payouts found</p>
          </div>
        )}
      </Card>
    </div>
  );
}
