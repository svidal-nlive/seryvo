/**
 * Seryvo Platform - Region Performance Reports
 * Analytics dashboard showing performance metrics by geographic region
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MapPin,
  TrendingUp,
  TrendingDown,
  Users,
  Car,
  DollarSign,
  Clock,
  Star,
  Download,
  Filter,
  RefreshCw,
  ChevronDown,
  BarChart3,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { convertToCSV, downloadCSV } from '../utils/csvExport';

// =============================================================================
// Types
// =============================================================================

interface RegionStats {
  id: string;
  name: string;
  code: string;
  // Booking metrics
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  completionRate: number;
  // Revenue metrics
  totalRevenue: number;
  avgFare: number;
  revenueGrowth: number; // percentage vs last period
  // Driver metrics
  activeDrivers: number;
  avgDriverRating: number;
  avgWaitTime: number; // minutes
  // Demand metrics
  peakHours: string;
  demandScore: number; // 1-100
  supplyScore: number; // 1-100
  // Trend
  trend: 'up' | 'down' | 'stable';
}

interface RegionComparison {
  metric: string;
  regions: { [regionCode: string]: number };
  unit: string;
}

interface HeatmapData {
  regionCode: string;
  hour: number;
  value: number;
}

type TimePeriod = 'today' | 'week' | 'month' | 'quarter' | 'year';
type MetricType = 'bookings' | 'revenue' | 'drivers' | 'satisfaction';

// =============================================================================
// Mock Data
// =============================================================================

const MOCK_REGIONS: RegionStats[] = [
  {
    id: 'region-1',
    name: 'Downtown Core',
    code: 'DTC',
    totalBookings: 2456,
    completedBookings: 2234,
    cancelledBookings: 145,
    completionRate: 91.0,
    totalRevenue: 89450,
    avgFare: 36.50,
    revenueGrowth: 12.5,
    activeDrivers: 78,
    avgDriverRating: 4.7,
    avgWaitTime: 4.2,
    peakHours: '7-9 AM, 5-7 PM',
    demandScore: 92,
    supplyScore: 85,
    trend: 'up',
  },
  {
    id: 'region-2',
    name: 'Airport District',
    code: 'APT',
    totalBookings: 1823,
    completedBookings: 1745,
    cancelledBookings: 52,
    completionRate: 95.7,
    totalRevenue: 124680,
    avgFare: 68.40,
    revenueGrowth: 8.2,
    activeDrivers: 45,
    avgDriverRating: 4.8,
    avgWaitTime: 6.8,
    peakHours: '6-10 AM, 4-8 PM',
    demandScore: 88,
    supplyScore: 72,
    trend: 'up',
  },
  {
    id: 'region-3',
    name: 'Business Park',
    code: 'BPK',
    totalBookings: 1245,
    completedBookings: 1156,
    cancelledBookings: 67,
    completionRate: 92.9,
    totalRevenue: 45230,
    avgFare: 36.30,
    revenueGrowth: -3.4,
    activeDrivers: 32,
    avgDriverRating: 4.5,
    avgWaitTime: 5.5,
    peakHours: '8-10 AM, 5-7 PM',
    demandScore: 75,
    supplyScore: 80,
    trend: 'down',
  },
  {
    id: 'region-4',
    name: 'University Area',
    code: 'UNI',
    totalBookings: 978,
    completedBookings: 867,
    cancelledBookings: 89,
    completionRate: 88.7,
    totalRevenue: 28340,
    avgFare: 29.00,
    revenueGrowth: 22.1,
    activeDrivers: 28,
    avgDriverRating: 4.4,
    avgWaitTime: 7.2,
    peakHours: '8-10 AM, 10 PM-12 AM',
    demandScore: 82,
    supplyScore: 65,
    trend: 'up',
  },
  {
    id: 'region-5',
    name: 'Suburban North',
    code: 'SBN',
    totalBookings: 654,
    completedBookings: 598,
    cancelledBookings: 42,
    completionRate: 91.4,
    totalRevenue: 32450,
    avgFare: 49.60,
    revenueGrowth: 5.8,
    activeDrivers: 22,
    avgDriverRating: 4.6,
    avgWaitTime: 9.5,
    peakHours: '7-9 AM, 4-6 PM',
    demandScore: 55,
    supplyScore: 58,
    trend: 'stable',
  },
  {
    id: 'region-6',
    name: 'Entertainment District',
    code: 'ENT',
    totalBookings: 1567,
    completedBookings: 1389,
    cancelledBookings: 134,
    completionRate: 88.6,
    totalRevenue: 52340,
    avgFare: 33.40,
    revenueGrowth: 18.9,
    activeDrivers: 41,
    avgDriverRating: 4.3,
    avgWaitTime: 8.2,
    peakHours: '8 PM-2 AM',
    demandScore: 95,
    supplyScore: 62,
    trend: 'up',
  },
];

const MOCK_HOURLY_HEATMAP: HeatmapData[] = (() => {
  const data: HeatmapData[] = [];
  const regions = ['DTC', 'APT', 'BPK', 'UNI', 'SBN', 'ENT'];
  
  regions.forEach(region => {
    for (let hour = 0; hour < 24; hour++) {
      let base = 20;
      // Morning rush
      if (hour >= 7 && hour <= 9) base = region === 'DTC' ? 95 : 70;
      // Evening rush
      if (hour >= 17 && hour <= 19) base = region === 'DTC' ? 90 : 75;
      // Late night for entertainment
      if (hour >= 21 || hour <= 2) base = region === 'ENT' ? 88 : 25;
      // Airport early/late
      if ((hour >= 5 && hour <= 8) || (hour >= 16 && hour <= 20)) {
        if (region === 'APT') base = 85;
      }
      
      data.push({
        regionCode: region,
        hour,
        value: base + Math.floor(Math.random() * 15),
      });
    }
  });
  
  return data;
})();

// =============================================================================
// Helper Functions
// =============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

function getHeatmapColor(value: number): string {
  if (value >= 80) return 'bg-green-500';
  if (value >= 60) return 'bg-green-400';
  if (value >= 40) return 'bg-yellow-400';
  if (value >= 20) return 'bg-orange-400';
  return 'bg-red-400';
}

function getDemandSupplyBalance(demand: number, supply: number): { status: string; color: string } {
  const ratio = supply / demand;
  if (ratio >= 0.9) return { status: 'Balanced', color: 'text-green-600' };
  if (ratio >= 0.7) return { status: 'Slight Shortage', color: 'text-yellow-600' };
  return { status: 'Driver Shortage', color: 'text-red-600' };
}

// =============================================================================
// Component
// =============================================================================

export default function RegionPerformanceView() {
  const [regions, setRegions] = useState<RegionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<TimePeriod>('week');
  const [metricType, setMetricType] = useState<MetricType>('bookings');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'bookings' | 'revenue' | 'rating' | 'growth'>('bookings');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    // Demo data is only available when loaded via Admin > Demo Data settings
    await new Promise(resolve => setTimeout(resolve, 500));
    // Start with empty array - data populates when demo data is loaded
    setRegions([]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, period]);

  // Calculate totals
  const totals = useMemo(() => {
    return {
      bookings: regions.reduce((sum, r) => sum + r.totalBookings, 0),
      revenue: regions.reduce((sum, r) => sum + r.totalRevenue, 0),
      drivers: regions.reduce((sum, r) => sum + r.activeDrivers, 0),
      avgRating: regions.length > 0 
        ? regions.reduce((sum, r) => sum + r.avgDriverRating, 0) / regions.length 
        : 0,
      avgWaitTime: regions.length > 0
        ? regions.reduce((sum, r) => sum + r.avgWaitTime, 0) / regions.length
        : 0,
    };
  }, [regions]);

  // Sort regions
  const sortedRegions = useMemo(() => {
    const sorted = [...regions].sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortBy) {
        case 'bookings':
          aVal = a.totalBookings;
          bVal = b.totalBookings;
          break;
        case 'revenue':
          aVal = a.totalRevenue;
          bVal = b.totalRevenue;
          break;
        case 'rating':
          aVal = a.avgDriverRating;
          bVal = b.avgDriverRating;
          break;
        case 'growth':
          aVal = a.revenueGrowth;
          bVal = b.revenueGrowth;
          break;
        default:
          aVal = a.totalBookings;
          bVal = b.totalBookings;
      }
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    return sorted;
  }, [regions, sortBy, sortOrder]);

  // Export functions
  const handleExportSummary = () => {
    const columns = [
      { key: 'name', header: 'Region' },
      { key: 'totalBookings', header: 'Total Bookings' },
      { key: 'completionRate', header: 'Completion Rate (%)' },
      { key: 'totalRevenue', header: 'Revenue ($)' },
      { key: 'avgFare', header: 'Avg Fare ($)' },
      { key: 'revenueGrowth', header: 'Growth (%)' },
      { key: 'activeDrivers', header: 'Active Drivers' },
      { key: 'avgDriverRating', header: 'Avg Rating' },
      { key: 'avgWaitTime', header: 'Avg Wait (min)' },
    ];
    
    const data = regions.map(r => ({
      name: r.name,
      totalBookings: String(r.totalBookings),
      completionRate: r.completionRate.toFixed(1),
      totalRevenue: r.totalRevenue.toFixed(2),
      avgFare: r.avgFare.toFixed(2),
      revenueGrowth: r.revenueGrowth.toFixed(1),
      activeDrivers: String(r.activeDrivers),
      avgDriverRating: r.avgDriverRating.toFixed(1),
      avgWaitTime: r.avgWaitTime.toFixed(1),
    }));
    
    const csv = convertToCSV(data, columns);
    downloadCSV(csv, `region-performance-${period}-${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportDetailed = () => {
    const columns = [
      { key: 'name', header: 'Region' },
      { key: 'code', header: 'Code' },
      { key: 'totalBookings', header: 'Total Bookings' },
      { key: 'completedBookings', header: 'Completed' },
      { key: 'cancelledBookings', header: 'Cancelled' },
      { key: 'completionRate', header: 'Completion %' },
      { key: 'totalRevenue', header: 'Revenue' },
      { key: 'avgFare', header: 'Avg Fare' },
      { key: 'revenueGrowth', header: 'Growth %' },
      { key: 'activeDrivers', header: 'Drivers' },
      { key: 'avgDriverRating', header: 'Rating' },
      { key: 'avgWaitTime', header: 'Wait Time' },
      { key: 'demandScore', header: 'Demand Score' },
      { key: 'supplyScore', header: 'Supply Score' },
      { key: 'peakHours', header: 'Peak Hours' },
    ];
    
    const data = regions.map(r => ({
      name: r.name,
      code: r.code,
      totalBookings: String(r.totalBookings),
      completedBookings: String(r.completedBookings),
      cancelledBookings: String(r.cancelledBookings),
      completionRate: r.completionRate.toFixed(1),
      totalRevenue: r.totalRevenue.toFixed(2),
      avgFare: r.avgFare.toFixed(2),
      revenueGrowth: r.revenueGrowth.toFixed(1),
      activeDrivers: String(r.activeDrivers),
      avgDriverRating: r.avgDriverRating.toFixed(1),
      avgWaitTime: r.avgWaitTime.toFixed(1),
      demandScore: String(r.demandScore),
      supplyScore: String(r.supplyScore),
      peakHours: r.peakHours,
    }));
    
    const csv = convertToCSV(data, columns);
    downloadCSV(csv, `region-detailed-${period}-${new Date().toISOString().split('T')[0]}`);
  };

  // Toggle sort
  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-7 h-7 text-blue-600" />
            Region Performance
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Analytics and insights by geographic region
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {/* Period Selector */}
          <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
            {(['today', 'week', 'month', 'quarter'] as TimePeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  period === p
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          
          <Button variant="secondary" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={16} /> Filters
          </Button>
          
          <Button variant="secondary" onClick={loadData}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
          
          <div className="relative group">
            <Button variant="secondary">
              <Download size={16} /> Export <ChevronDown size={14} />
            </Button>
            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={handleExportSummary}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                Export Summary (CSV)
              </button>
              <button
                onClick={handleExportDetailed}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                Export Detailed (CSV)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Metric Focus
              </label>
              <select
                value={metricType}
                onChange={(e) => setMetricType(e.target.value as MetricType)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              >
                <option value="bookings">Bookings</option>
                <option value="revenue">Revenue</option>
                <option value="drivers">Driver Performance</option>
                <option value="satisfaction">Customer Satisfaction</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              >
                <option value="bookings">Total Bookings</option>
                <option value="revenue">Revenue</option>
                <option value="rating">Driver Rating</option>
                <option value="growth">Revenue Growth</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Order
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              >
                <option value="desc">Highest First</option>
                <option value="asc">Lowest First</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 dark:text-gray-400 text-sm">Total Bookings</span>
            <BarChart3 className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatNumber(totals.bookings)}
          </p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> +8.5% vs last {period}
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 dark:text-gray-400 text-sm">Total Revenue</span>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totals.revenue)}
          </p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> +12.3% growth
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 dark:text-gray-400 text-sm">Active Drivers</span>
            <Car className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {totals.drivers}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Across all regions
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 dark:text-gray-400 text-sm">Avg Rating</span>
            <Star className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {totals.avgRating.toFixed(1)}
          </p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> +0.1 improvement
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 dark:text-gray-400 text-sm">Avg Wait Time</span>
            <Clock className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {totals.avgWaitTime.toFixed(1)}m
          </p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <TrendingDown className="w-3 h-3" /> -0.8m faster
          </p>
        </Card>
      </div>

      {/* Region Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {sortedRegions.map((region) => {
          const balance = getDemandSupplyBalance(region.demandScore, region.supplyScore);
          const isSelected = selectedRegion === region.id;
          
          return (
            <Card
              key={region.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                isSelected ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedRegion(isSelected ? null : region.id)}
            >
              {/* Region Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-mono bg-gray-100 dark:bg-slate-700 rounded">
                      {region.code}
                    </span>
                    {region.trend === 'up' && (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    )}
                    {region.trend === 'down' && (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                    {region.name}
                  </h3>
                </div>
                <div className={`text-sm font-medium ${balance.color}`}>
                  {balance.status}
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Bookings</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatNumber(region.totalBookings)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {region.completionRate.toFixed(1)}% completed
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(region.totalRevenue)}
                  </p>
                  <p className={`text-xs flex items-center gap-1 ${
                    region.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {region.revenueGrowth >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {region.revenueGrowth >= 0 ? '+' : ''}{region.revenueGrowth.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Driver Stats */}
              <div className="flex items-center justify-between py-2 border-t border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-sm">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{region.activeDrivers}</span>
                    <span className="text-gray-500 dark:text-gray-400">drivers</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span className="font-medium">{region.avgDriverRating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>{region.avgWaitTime.toFixed(1)}m wait</span>
                </div>
              </div>

              {/* Expanded Details */}
              {isSelected && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Avg Fare</p>
                      <p className="font-medium">{formatCurrency(region.avgFare)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Cancelled</p>
                      <p className="font-medium">{region.cancelledBookings} trips</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Demand Score</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${region.demandScore}%` }}
                          />
                        </div>
                        <span className="font-medium">{region.demandScore}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Supply Score</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${region.supplyScore}%` }}
                          />
                        </div>
                        <span className="font-medium">{region.supplyScore}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm">
                    <p className="text-gray-500 dark:text-gray-400">Peak Hours</p>
                    <p className="font-medium">{region.peakHours}</p>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Demand Heatmap */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Hourly Demand Heatmap
          </h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-400 rounded" />
              <span className="text-gray-500 dark:text-gray-400">Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-400 rounded" />
              <span className="text-gray-500 dark:text-gray-400">Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded" />
              <span className="text-gray-500 dark:text-gray-400">High</span>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-2">
                  Region
                </th>
                {Array.from({ length: 24 }, (_, i) => (
                  <th key={i} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 pb-2 px-0.5">
                    {i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {regions.length === 0 ? (
                <tr>
                  <td colSpan={25} className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No region data available. Load demo data to see sample heatmap.
                  </td>
                </tr>
              ) : (
              regions.map((region) => (
                <tr key={region.code}>
                  <td className="py-1 pr-2 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    {region.code}
                  </td>
                  {Array.from({ length: 24 }, (_, hour) => {
                    // Heatmap data would come from backend when demo data is loaded
                    const value = 0;
                    return (
                      <td key={hour} className="px-0.5 py-1">
                        <div
                          className={`w-6 h-6 rounded ${getHeatmapColor(value)} opacity-80`}
                          title={`${region.name} at ${hour}:00 - Score: ${value}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Alerts & Recommendations */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Insights & Recommendations
        </h2>
        
        <div className="space-y-3">
          {regions.length === 0 ? (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              No region data available. Load demo data to see insights and recommendations.
            </div>
          ) : (
          <>
          {/* Driver shortage alert */}
          {regions.filter(r => r.supplyScore < r.demandScore * 0.7).length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Driver Shortage Detected
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  {regions.filter(r => r.supplyScore < r.demandScore * 0.7)
                    .map(r => r.name)
                    .join(', ')} 
                  {' '}have high demand but insufficient driver supply. Consider surge pricing or driver incentives.
                </p>
              </div>
            </div>
          )}
          
          {/* High growth region */}
          {(() => {
            const highGrowth = regions.filter(r => r.revenueGrowth > 15);
            if (highGrowth.length > 0) {
              return (
                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">
                      High Growth Regions
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      {highGrowth.map(r => `${r.name} (+${r.revenueGrowth.toFixed(1)}%)`).join(', ')} 
                      {' '}showing strong revenue growth. Consider expanding driver coverage.
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          })()}
          
          {/* Wait time concern */}
          {(() => {
            const highWait = regions.filter(r => r.avgWaitTime > 8);
            if (highWait.length > 0) {
              return (
                <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <Clock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-800 dark:text-orange-200">
                      Long Wait Times
                    </p>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      {highWait.map(r => `${r.name} (${r.avgWaitTime.toFixed(1)}m)`).join(', ')} 
                      {' '}have above-average wait times. Customer satisfaction may be impacted.
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          })()}
          </>
          )}
        </div>
      </Card>

      {/* Comparison Table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Region Comparison
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Region
                </th>
                <th 
                  className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  onClick={() => handleSort('bookings')}
                >
                  Bookings {sortBy === 'bookings' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th 
                  className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  onClick={() => handleSort('revenue')}
                >
                  Revenue {sortBy === 'revenue' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Avg Fare
                </th>
                <th 
                  className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  onClick={() => handleSort('growth')}
                >
                  Growth {sortBy === 'growth' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Drivers
                </th>
                <th 
                  className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  onClick={() => handleSort('rating')}
                >
                  Rating {sortBy === 'rating' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Wait Time
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRegions.map((region, idx) => (
                <tr 
                  key={region.id}
                  className={`border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 ${
                    idx === 0 ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-mono bg-gray-100 dark:bg-slate-700 rounded">
                        {region.code}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {region.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">
                    {formatNumber(region.totalBookings)}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">
                    {formatCurrency(region.totalRevenue)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                    {formatCurrency(region.avgFare)}
                  </td>
                  <td className={`py-3 px-4 text-right font-medium ${
                    region.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {region.revenueGrowth >= 0 ? '+' : ''}{region.revenueGrowth.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                    {region.activeDrivers}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {region.avgDriverRating.toFixed(1)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                    {region.avgWaitTime.toFixed(1)}m
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 dark:bg-slate-800/50 font-medium">
                <td className="py-3 px-4 text-gray-900 dark:text-white">
                  Total / Average
                </td>
                <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                  {formatNumber(totals.bookings)}
                </td>
                <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                  {formatCurrency(totals.revenue)}
                </td>
                <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                  {formatCurrency(totals.revenue / totals.bookings || 0)}
                </td>
                <td className="py-3 px-4 text-right text-green-600">
                  +10.2%
                </td>
                <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                  {totals.drivers}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-gray-900 dark:text-white">
                      {totals.avgRating.toFixed(1)}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                  {totals.avgWaitTime.toFixed(1)}m
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
