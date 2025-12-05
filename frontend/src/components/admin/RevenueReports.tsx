import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Calendar,
  Car,
  Users,
  CreditCard,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  BarChart3,
  PieChart,
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface RevenueData {
  date: string;
  total_revenue: number;
  trip_count: number;
  avg_trip_value: number;
  commission_earned: number;
  refunds: number;
  net_revenue: number;
}

interface ServiceBreakdown {
  service_type: string;
  revenue: number;
  trip_count: number;
  percentage: number;
}

interface RevenueReportsProps {
  isOpen: boolean;
  onClose: () => void;
}

// Generate data - returns empty array until demo data is loaded
const generateMockData = (_startDate: Date, _endDate: Date): RevenueData[] => {
  // Data will be populated when demo data is loaded via Admin settings
  return [];
};

// Service breakdown - empty until demo data is loaded
const SERVICE_BREAKDOWN: ServiceBreakdown[] = [];

type Period = 'today' | '7days' | '30days' | '90days' | 'custom';
type ViewMode = 'chart' | 'table';

export default function RevenueReports({ isOpen, onClose }: RevenueReportsProps) {
  const [period, setPeriod] = useState<Period>('30days');
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Calculate date range
  const dateRange = useMemo(() => {
    const end = new Date();
    let start = new Date();
    
    switch (period) {
      case 'today':
        break;
      case '7days':
        start.setDate(start.getDate() - 7);
        break;
      case '30days':
        start.setDate(start.getDate() - 30);
        break;
      case '90days':
        start.setDate(start.getDate() - 90);
        break;
      case 'custom':
        if (customStart) start = new Date(customStart);
        if (customEnd) end.setTime(new Date(customEnd).getTime());
        break;
    }
    
    return { start, end };
  }, [period, customStart, customEnd]);

  const data = useMemo(() => 
    generateMockData(dateRange.start, dateRange.end),
    [dateRange]
  );

  // Aggregate totals
  const totals = useMemo(() => {
    return data.reduce(
      (acc, d) => ({
        revenue: acc.revenue + d.total_revenue,
        trips: acc.trips + d.trip_count,
        commission: acc.commission + d.commission_earned,
        refunds: acc.refunds + d.refunds,
        net: acc.net + d.net_revenue,
      }),
      { revenue: 0, trips: 0, commission: 0, refunds: 0, net: 0 }
    );
  }, [data]);

  // Previous period comparison - zero until real data is available
  const prevPeriodChange = {
    revenue: 0,
    trips: 0,
    commission: 0,
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatPercent = (value: number) =>
    `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

  const paginatedData = data.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(data.length / itemsPerPage);

  const handleExportCSV = () => {
    const headers = ['Date', 'Total Revenue', 'Trip Count', 'Avg Trip Value', 'Commission', 'Refunds', 'Net Revenue'];
    const csvContent = [
      headers.join(','),
      ...data.map(d => [
        d.date,
        d.total_revenue.toFixed(2),
        d.trip_count,
        d.avg_trip_value.toFixed(2),
        d.commission_earned.toFixed(2),
        d.refunds.toFixed(2),
        d.net_revenue.toFixed(2),
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${dateRange.start.toISOString().split('T')[0]}-to-${dateRange.end.toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  // Calculate max for simple chart bars
  const maxRevenue = Math.max(...data.map(d => d.total_revenue));

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in overflow-hidden"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-6xl max-h-[95vh] sm:max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 duration-200">
        {/* Fixed Header - Always Visible */}
        <div className="flex-shrink-0 flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-10">
          {/* Mobile drag indicator */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-300 dark:bg-slate-600 rounded-full sm:hidden" />
          
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-green-100 dark:bg-green-900/30 flex-shrink-0">
              <BarChart3 size={20} className="text-green-600 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-semibold dark:text-white truncate">Revenue Reports</h2>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Analyze platform earnings and trends</p>
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

        {/* Controls - Scrollable on mobile */}
        <div className="flex-shrink-0 p-3 sm:p-4 border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-4 min-w-max sm:min-w-0">
            {/* Period Selector */}
            <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1 overflow-x-auto">
              {(['today', '7days', '30days', '90days', 'custom'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap touch-manipulation ${
                    period === p
                      ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {p === 'today' ? 'Today' : 
                   p === '7days' ? '7D' :
                   p === '30days' ? '30D' :
                   p === '90days' ? '90D' : 'Custom'}
                </button>
              ))}
            </div>

            {/* Custom Date Range */}
            {period === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2 sm:px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm"
                />
                <span className="text-gray-400 text-xs">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2 sm:px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm"
                />
              </div>
            )}

            <div className="hidden sm:block flex-1" />

            <div className="flex items-center gap-2 sm:gap-3">
              {/* View Mode Toggle */}
              <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('chart')}
                  className={`p-2 rounded-md transition-all touch-manipulation ${
                    viewMode === 'chart'
                      ? 'bg-white dark:bg-slate-700 shadow'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <BarChart3 size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-md transition-all touch-manipulation ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-slate-700 shadow'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <FileSpreadsheet size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
              </div>

              <Button variant="secondary" onClick={handleExportCSV} className="text-xs sm:text-sm px-2 sm:px-3">
                <Download size={14} className="sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Export</span> CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-4 sm:space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <Card className="p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Gross Revenue</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mt-0.5 sm:mt-1 truncate">
                    {formatCurrency(totals.revenue)}
                  </p>
                </div>
                <div className="p-1.5 sm:p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
                  <DollarSign size={16} className="text-blue-600 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div className={`mt-1.5 sm:mt-2 text-xs sm:text-sm flex items-center gap-1 ${
                prevPeriodChange.revenue >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {prevPeriodChange.revenue >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span className="truncate">{formatPercent(prevPeriodChange.revenue)} vs prev</span>
              </div>
            </Card>

            <Card className="p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Total Trips</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mt-0.5 sm:mt-1">
                    {totals.trips.toLocaleString()}
                  </p>
                </div>
                <div className="p-1.5 sm:p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex-shrink-0">
                  <Car size={16} className="text-purple-600 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div className={`mt-1.5 sm:mt-2 text-xs sm:text-sm flex items-center gap-1 ${
                prevPeriodChange.trips >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {prevPeriodChange.trips >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span className="truncate">{formatPercent(prevPeriodChange.trips)} vs prev</span>
              </div>
            </Card>

            <Card className="p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Commission</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mt-0.5 sm:mt-1 truncate">
                    {formatCurrency(totals.commission)}
                  </p>
                </div>
                <div className="p-1.5 sm:p-2 rounded-lg bg-green-100 dark:bg-green-900/30 flex-shrink-0">
                  <CreditCard size={16} className="text-green-600 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div className={`mt-1.5 sm:mt-2 text-xs sm:text-sm flex items-center gap-1 ${
                prevPeriodChange.commission >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {prevPeriodChange.commission >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span className="truncate">{formatPercent(prevPeriodChange.commission)} vs prev</span>
              </div>
            </Card>

            <Card className="p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Refunds</p>
                  <p className="text-lg sm:text-2xl font-bold text-red-600 mt-0.5 sm:mt-1 truncate">
                    {formatCurrency(totals.refunds)}
                  </p>
                </div>
                <div className="p-1.5 sm:p-2 rounded-lg bg-red-100 dark:bg-red-900/30 flex-shrink-0">
                  <RefreshCw size={16} className="text-red-600 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-500 truncate">
                {((totals.refunds / totals.revenue) * 100).toFixed(2)}% refund rate
              </div>
            </Card>
          </div>

          {/* Chart or Table View */}
          {data.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="flex flex-col items-center justify-center min-h-[300px]">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <TrendingUp size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No Revenue Data</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md">
                  Revenue reports will appear here once transactions are recorded. Load demo data from Admin Settings to see sample analytics.
                </p>
              </div>
            </Card>
          ) : viewMode === 'chart' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Revenue Chart */}
              <Card className="lg:col-span-2 p-3 sm:p-4">
                <h3 className="font-semibold mb-3 sm:mb-4 dark:text-white text-sm sm:text-base">Daily Revenue Trend</h3>
                <div className="h-48 sm:h-64 flex items-end gap-0.5 sm:gap-1 overflow-x-auto pb-4 sm:pb-6">
                  {data.slice(-30).map((d, i) => (
                    <div key={i} className="flex-1 min-w-[4px] sm:min-w-[8px] relative group">
                      <div
                        className="bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                        style={{ height: `${(d.total_revenue / maxRevenue) * 160}px` }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {d.date}: {formatCurrency(d.total_revenue)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>{data[data.length - 30]?.date || data[0]?.date}</span>
                  <span>{data[data.length - 1]?.date}</span>
                </div>
              </Card>

              {/* Service Breakdown */}
              <Card className="p-3 sm:p-4">
                <h3 className="font-semibold mb-3 sm:mb-4 dark:text-white text-sm sm:text-base">Revenue by Service</h3>
                <div className="space-y-3 sm:space-y-4">
                  {SERVICE_BREAKDOWN.map((s, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs sm:text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400 truncate mr-2">{s.service_type}</span>
                        <span className="font-medium dark:text-white flex-shrink-0">{formatCurrency(s.revenue)}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 sm:h-2">
                        <div
                          className={`h-1.5 sm:h-2 rounded-full ${
                            i === 0 ? 'bg-blue-500' :
                            i === 1 ? 'bg-purple-500' :
                            i === 2 ? 'bg-amber-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${s.percentage}%` }}
                        />
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">
                        {s.trip_count} trips ({s.percentage}%)
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ) : (
            <Card className="p-0 sm:p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-600 dark:text-gray-400">Date</th>
                      <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-600 dark:text-gray-400">Revenue</th>
                      <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-600 dark:text-gray-400">Trips</th>
                      <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-600 dark:text-gray-400 hidden sm:table-cell">Avg</th>
                      <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-600 dark:text-gray-400">Comm.</th>
                      <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-600 dark:text-gray-400 hidden sm:table-cell">Refunds</th>
                      <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-600 dark:text-gray-400">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((d, i) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                        <td className="py-2 sm:py-3 px-2 sm:px-4 dark:text-gray-300 whitespace-nowrap">{d.date}</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-right font-medium dark:text-white whitespace-nowrap">
                          {formatCurrency(d.total_revenue)}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-gray-600 dark:text-gray-400">
                          {d.trip_count}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-gray-600 dark:text-gray-400 hidden sm:table-cell whitespace-nowrap">
                          {formatCurrency(d.avg_trip_value)}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-green-600 whitespace-nowrap">
                          {formatCurrency(d.commission_earned)}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-red-500 hidden sm:table-cell whitespace-nowrap">
                          {formatCurrency(d.refunds)}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-right font-medium text-blue-600 whitespace-nowrap">
                          {formatCurrency(d.net_revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 sm:p-4 border-t border-gray-200 dark:border-slate-700">
                <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                  Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, data.length)} of {data.length}
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
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-800 touch-manipulation"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
