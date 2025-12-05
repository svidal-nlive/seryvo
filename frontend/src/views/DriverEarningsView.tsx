import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Car, 
  Clock,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
  CreditCard,
  CheckCircle,
  Clock3,
  Target,
  Award,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Star,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { backend } from '../services/backend';
import { exportToCSV } from '../utils/csvExport';
import type { Booking } from '../types';

type TimePeriod = 'today' | 'week' | 'month' | 'year' | 'custom';
type ViewTab = 'overview' | 'payouts' | 'goals';

interface EarningsSummary {
  totalEarnings: number;
  tripsCompleted: number;
  averagePerTrip: number;
  tips: number;
  bonuses: number;
  deductions: number;
  netPayout: number;
  hoursOnline: number;
  earningsPerHour: number;
}

interface DailyEarning {
  date: string;
  earnings: number;
  trips: number;
}

interface Payout {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed';
  period_start: string;
  period_end: string;
  scheduled_date: string;
  trips_count: number;
}

interface EarningsGoal {
  id: string;
  type: 'weekly' | 'monthly' | 'trips';
  target: number;
  current: number;
  label: string;
}

// Mock payouts data
const MOCK_PAYOUTS: Payout[] = [
  {
    id: 'payout-1',
    amount: 89500,
    status: 'pending',
    period_start: new Date(Date.now() - 7 * 86400000).toISOString(),
    period_end: new Date().toISOString(),
    scheduled_date: new Date(Date.now() + 2 * 86400000).toISOString(),
    trips_count: 34,
  },
  {
    id: 'payout-2',
    amount: 76200,
    status: 'completed',
    period_start: new Date(Date.now() - 14 * 86400000).toISOString(),
    period_end: new Date(Date.now() - 7 * 86400000).toISOString(),
    scheduled_date: new Date(Date.now() - 5 * 86400000).toISOString(),
    trips_count: 28,
  },
  {
    id: 'payout-3',
    amount: 92100,
    status: 'completed',
    period_start: new Date(Date.now() - 21 * 86400000).toISOString(),
    period_end: new Date(Date.now() - 14 * 86400000).toISOString(),
    scheduled_date: new Date(Date.now() - 12 * 86400000).toISOString(),
    trips_count: 31,
  },
  {
    id: 'payout-4',
    amount: 68800,
    status: 'completed',
    period_start: new Date(Date.now() - 28 * 86400000).toISOString(),
    period_end: new Date(Date.now() - 21 * 86400000).toISOString(),
    scheduled_date: new Date(Date.now() - 19 * 86400000).toISOString(),
    trips_count: 25,
  },
];

export default function DriverEarningsView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<TimePeriod>('week');
  const [viewTab, setViewTab] = useState<ViewTab>('overview');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [dailyEarnings, setDailyEarnings] = useState<DailyEarning[]>([]);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);
  // Start with empty array - data populates when demo data is loaded
  const [payouts] = useState<Payout[]>([]);
  const [goals, setGoals] = useState<EarningsGoal[]>([]);
  const [previousPeriodEarnings, setPreviousPeriodEarnings] = useState(0);

  useEffect(() => {
    loadEarnings();
  }, [user, period, selectedWeekOffset]);

  const loadEarnings = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const allBookings = await backend.getBookings(undefined, user.id);
      const completed = allBookings.filter((b) => b.status === 'completed');

      // Filter by period
      const now = new Date();
      let startDate: Date;
      let endDate = new Date();

      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7 * (selectedWeekOffset + 1) + 1);
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 6);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const filtered = completed.filter((b) => {
        const tripDate = new Date(b.completed_at || b.created_at);
        return tripDate >= startDate && tripDate <= endDate;
      });

      setBookings(filtered);

      // Calculate summary
      const totalEarnings = filtered.reduce(
        (sum, b) => sum + (b.price_breakdown?.driver_earnings?.amount ?? 0),
        0
      );
      const tips = Math.round(totalEarnings * 0.08); // Mock 8% tips
      const bonuses = filtered.length >= 10 ? 2500 : 0; // Mock bonus for 10+ trips
      const deductions = Math.round(totalEarnings * 0.02); // Mock 2% deductions
      const netPayout = totalEarnings + tips + bonuses - deductions;

      setSummary({
        totalEarnings,
        tripsCompleted: filtered.length,
        averagePerTrip: filtered.length > 0 ? Math.round(totalEarnings / filtered.length) : 0,
        tips,
        bonuses,
        deductions,
        netPayout,
        hoursOnline: filtered.length * 0.5, // Mock hours
        earningsPerHour: filtered.length > 0 ? Math.round(totalEarnings / (filtered.length * 0.5)) : 0,
      });

      // Calculate previous period for comparison
      let prevStartDate = new Date(startDate);
      let prevEndDate = new Date(endDate);
      const periodLength = endDate.getTime() - startDate.getTime();
      prevStartDate = new Date(startDate.getTime() - periodLength - 86400000);
      prevEndDate = new Date(endDate.getTime() - periodLength - 86400000);

      const previousFiltered = completed.filter((b) => {
        const tripDate = new Date(b.completed_at || b.created_at);
        return tripDate >= prevStartDate && tripDate <= prevEndDate;
      });
      const prevEarnings = previousFiltered.reduce(
        (sum, b) => sum + (b.price_breakdown?.driver_earnings?.amount ?? 0),
        0
      );
      setPreviousPeriodEarnings(prevEarnings);

      // Calculate goals
      const weeklyTarget = 80000; // $800/week target
      const monthlyTarget = 320000; // $3200/month target
      const tripsTarget = 40; // 40 trips/week target

      setGoals([
        {
          id: 'weekly',
          type: 'weekly',
          target: weeklyTarget,
          current: period === 'week' ? netPayout : Math.round(netPayout / 4),
          label: 'Weekly Earnings Goal',
        },
        {
          id: 'monthly',
          type: 'monthly',
          target: monthlyTarget,
          current: period === 'month' ? netPayout : netPayout,
          label: 'Monthly Earnings Goal',
        },
        {
          id: 'trips',
          type: 'trips',
          target: tripsTarget,
          current: filtered.length,
          label: 'Weekly Trips Goal',
        },
      ]);

      // Calculate daily earnings for chart
      const dailyMap = new Map<string, DailyEarning>();
      
      // Initialize days
      const days = period === 'week' ? 7 : period === 'month' ? 30 : 1;
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const key = date.toISOString().split('T')[0];
        dailyMap.set(key, { date: key, earnings: 0, trips: 0 });
      }

      // Fill with actual data
      filtered.forEach((b) => {
        const key = new Date(b.completed_at || b.created_at).toISOString().split('T')[0];
        const existing = dailyMap.get(key);
        if (existing) {
          existing.earnings += b.price_breakdown?.driver_earnings?.amount ?? 0;
          existing.trips += 1;
        }
      });

      setDailyEarnings(Array.from(dailyMap.values()));
    } catch (error) {
      console.error('Failed to load earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const handleExportEarnings = () => {
    const exportData = bookings.map((b) => ({
      booking_id: b.booking_id,
      date: b.created_at,
      pickup: b.legs?.[0]?.pickup?.address_line || '',
      dropoff: b.legs?.[b.legs.length - 1]?.dropoff?.address_line || '',
      service_type: b.service_type,
      earnings_cents: b.price_breakdown?.driver_earnings?.amount || 0,
      status: b.status,
    }));

    exportToCSV(
      exportData,
      [
        { key: 'booking_id', header: 'Booking ID' },
        { key: 'date', header: 'Date' },
        { key: 'pickup', header: 'Pickup' },
        { key: 'dropoff', header: 'Dropoff' },
        { key: 'service_type', header: 'Service Type' },
        { 
          key: 'earnings_cents', 
          header: 'Earnings ($)', 
          formatter: (val: number) => (val / 100).toFixed(2) 
        },
        { key: 'status', header: 'Status' },
      ],
      `earnings_${period}_${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getWeekLabel = () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 7 * (selectedWeekOffset + 1) + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  const getPayoutStatusBadge = (status: Payout['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'processing':
        return <Badge variant="info">Processing</Badge>;
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
    }
  };

  const getEarningsChange = () => {
    if (!summary || previousPeriodEarnings === 0) return null;
    const change = ((summary.netPayout - previousPeriodEarnings) / previousPeriodEarnings) * 100;
    return {
      value: change,
      isPositive: change >= 0,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const maxDailyEarning = Math.max(...dailyEarnings.map(d => d.earnings), 100);
  const earningsChange = getEarningsChange();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Earnings</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Track your income and performance
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value as TimePeriod);
              setSelectedWeekOffset(0);
            }}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          
          {period === 'week' && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedWeekOffset(o => o + 1)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium min-w-[140px] text-center dark:text-white">
                {getWeekLabel()}
              </span>
              <button
                onClick={() => setSelectedWeekOffset(o => Math.max(0, o - 1))}
                disabled={selectedWeekOffset === 0}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          <Button 
            variant="secondary" 
            onClick={handleExportEarnings} 
            disabled={bookings.length === 0}
          >
            <Download size={18} /> Export
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setViewTab('overview')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            viewTab === 'overview'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <DollarSign size={16} />
            Overview
          </div>
        </button>
        <button
          onClick={() => setViewTab('payouts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            viewTab === 'payouts'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <Wallet size={16} />
            Payouts
            {payouts.some(p => p.status === 'pending') && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </div>
        </button>
        <button
          onClick={() => setViewTab('goals')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            viewTab === 'goals'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <Target size={16} />
            Goals
          </div>
        </button>
      </div>

      {/* Overview Tab */}
      {viewTab === 'overview' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white relative overflow-hidden">
              <div className="flex items-center gap-2 text-green-100 text-sm mb-1">
                <DollarSign size={14} />
                Net Payout
              </div>
              <p className="text-2xl font-bold">{formatMoney(summary?.netPayout ?? 0)}</p>
              {earningsChange && (
                <div className={`flex items-center gap-1 mt-2 text-xs ${earningsChange.isPositive ? 'text-green-100' : 'text-red-200'}`}>
                  {earningsChange.isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(earningsChange.value).toFixed(1)}% vs last period
                </div>
              )}
            </Card>

            <Card>
              <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-sm mb-1">
                <Car size={14} />
                Trips
              </div>
              <p className="text-2xl font-bold dark:text-white">{summary?.tripsCompleted ?? 0}</p>
            </Card>

            <Card>
              <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-sm mb-1">
                <TrendingUp size={14} />
                Avg per Trip
              </div>
              <p className="text-2xl font-bold dark:text-white">{formatMoney(summary?.averagePerTrip ?? 0)}</p>
            </Card>

            <Card>
              <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-sm mb-1">
                <Clock size={14} />
                Per Hour
              </div>
              <p className="text-2xl font-bold dark:text-white">{formatMoney(summary?.earningsPerHour ?? 0)}</p>
        </Card>
      </div>

      {/* Earnings Chart */}
      {period !== 'today' && dailyEarnings.length > 1 && (
        <Card>
          <h3 className="font-semibold mb-4 dark:text-white">Daily Earnings</h3>
          <div className="h-48 flex items-end gap-1">
            {dailyEarnings.map((day, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center group">
                <div 
                  className="w-full bg-blue-500 rounded-t transition-all group-hover:bg-blue-600 relative"
                  style={{ 
                    height: `${Math.max((day.earnings / maxDailyEarning) * 100, 2)}%`,
                    minHeight: day.earnings > 0 ? '8px' : '2px'
                  }}
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-slate-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                      {formatMoney(day.earnings)} • {day.trips} trips
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 mt-1 truncate w-full text-center">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Breakdown */}
      <Card>
        <h3 className="font-semibold mb-4 dark:text-white">Earnings Breakdown</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700">
            <span className="text-gray-600 dark:text-slate-400">Base Earnings</span>
            <span className="font-medium dark:text-white">{formatMoney(summary?.totalEarnings ?? 0)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700">
            <span className="text-gray-600 dark:text-slate-400">Tips Received</span>
            <span className="font-medium text-green-600">+{formatMoney(summary?.tips ?? 0)}</span>
          </div>
          {(summary?.bonuses ?? 0) > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-slate-400">Bonus</span>
                <Badge variant="success">10+ trips</Badge>
              </div>
              <span className="font-medium text-green-600">+{formatMoney(summary?.bonuses ?? 0)}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700">
            <span className="text-gray-600 dark:text-slate-400">Platform Fee</span>
            <span className="font-medium text-red-600">-{formatMoney(summary?.deductions ?? 0)}</span>
          </div>
          <div className="flex justify-between items-center py-2 text-lg font-bold">
            <span className="dark:text-white">Net Payout</span>
            <span className="text-green-600">{formatMoney(summary?.netPayout ?? 0)}</span>
          </div>
        </div>
      </Card>

      {/* Recent Trips */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold dark:text-white">Recent Trips</h3>
          <span className="text-sm text-gray-500 dark:text-slate-400">
            {bookings.length} trips
          </span>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-slate-400">
            <Car size={32} className="mx-auto mb-2 opacity-50" />
            <p>No trips in this period</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {bookings.slice(0, 10).map((booking) => (
              <div key={booking.booking_id} className="py-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate dark:text-white">
                    {booking.legs[0]?.pickup.address_line} → {booking.legs[booking.legs.length - 1]?.dropoff.address_line}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {new Date(booking.completed_at || booking.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="font-semibold text-green-600">
                    {formatMoney(booking.price_breakdown?.driver_earnings?.amount ?? 0)}
                  </p>
                  {booking.client_rating_value && (
                    <p className="text-xs text-yellow-500">
                      {'★'.repeat(booking.client_rating_value)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {bookings.length > 10 && (
          <div className="text-center pt-4">
            <Button variant="secondary" size="sm">
              View All {bookings.length} Trips
            </Button>
          </div>
        )}
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="text-center">
            <Clock size={24} className="mx-auto text-gray-400 mb-2" />
            <p className="text-2xl font-bold dark:text-white">{summary?.hoursOnline.toFixed(1)}h</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Time Online</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <TrendingUp size={24} className="mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold dark:text-white">
              {summary && summary.tripsCompleted > 0 
                ? `+${Math.round(((summary.netPayout / summary.tripsCompleted) / 2000 - 1) * 100)}%` 
                : '—'}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">vs. Average</p>
          </div>
        </Card>
      </div>
        </>
      )}

      {/* Payouts Tab */}
      {viewTab === 'payouts' && (
        <>
          {/* Payout Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white">
              <div className="flex items-center gap-2 text-amber-100 text-sm mb-1">
                <Clock3 size={14} />
                Pending
              </div>
              <p className="text-2xl font-bold">
                {formatMoney(payouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0))}
              </p>
              <p className="text-xs text-amber-100 mt-1">
                {payouts.filter(p => p.status === 'pending').length} payout(s) scheduled
              </p>
            </Card>

            <Card>
              <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-sm mb-1">
                <CheckCircle size={14} />
                Last 30 Days
              </div>
              <p className="text-2xl font-bold dark:text-white">
                {formatMoney(payouts.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0))}
              </p>
            </Card>

            <Card>
              <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-sm mb-1">
                <CreditCard size={14} />
                Payment Method
              </div>
              <p className="text-lg font-bold dark:text-white">Direct Deposit</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">****4521</p>
            </Card>
          </div>

          {/* Payout History */}
          <Card>
            <h3 className="font-semibold mb-4 dark:text-white">Payout History</h3>
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {payouts.map((payout) => (
                <div key={payout.id} className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      payout.status === 'completed' 
                        ? 'bg-green-100 dark:bg-green-900/30' 
                        : payout.status === 'pending'
                        ? 'bg-amber-100 dark:bg-amber-900/30'
                        : 'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      {payout.status === 'completed' ? (
                        <CheckCircle size={18} className="text-green-600" />
                      ) : payout.status === 'pending' ? (
                        <Clock3 size={18} className="text-amber-600" />
                      ) : (
                        <Zap size={18} className="text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium dark:text-white">
                        {new Date(payout.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(payout.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {payout.trips_count} trips • {payout.status === 'completed' ? 'Paid on' : 'Scheduled for'} {new Date(payout.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg dark:text-white">{formatMoney(payout.amount)}</p>
                    {getPayoutStatusBadge(payout.status)}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Payout Settings */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold dark:text-white">Payout Settings</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">Manage your payment preferences</p>
              </div>
              <Button variant="secondary">
                <CreditCard size={16} /> Update Payment Method
              </Button>
            </div>
          </Card>
        </>
      )}

      {/* Goals Tab */}
      {viewTab === 'goals' && (
        <>
          {/* Goal Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {goals.map((goal) => {
              const progress = Math.min((goal.current / goal.target) * 100, 100);
              const isCompleted = goal.current >= goal.target;

              return (
                <Card key={goal.id} className="relative overflow-hidden">
                  {isCompleted && (
                    <div className="absolute top-2 right-2">
                      <Award size={20} className="text-amber-500" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-sm mb-2">
                    <Target size={14} />
                    {goal.label}
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-2xl font-bold dark:text-white">
                      {goal.type === 'trips' ? goal.current : formatMoney(goal.current)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-slate-400">
                      / {goal.type === 'trips' ? goal.target : formatMoney(goal.target)}
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                    {isCompleted ? '🎉 Goal achieved!' : `${progress.toFixed(0)}% complete`}
                  </p>
                </Card>
              );
            })}
          </div>

          {/* Achievements */}
          <Card>
            <h3 className="font-semibold mb-4 dark:text-white">Achievements</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <Star size={28} className="mx-auto text-amber-500 mb-2" />
                <p className="font-semibold text-sm dark:text-white">5-Star Driver</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">4.9+ rating</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <Zap size={28} className="mx-auto text-green-500 mb-2" />
                <p className="font-semibold text-sm dark:text-white">Speed Demon</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">10+ trips/day</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <TrendingUp size={28} className="mx-auto text-blue-500 mb-2" />
                <p className="font-semibold text-sm dark:text-white">Top Earner</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">$1000+ week</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 opacity-50">
                <Award size={28} className="mx-auto text-gray-400 mb-2" />
                <p className="font-semibold text-sm dark:text-white">Road Warrior</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">500+ trips</p>
              </div>
            </div>
          </Card>

          {/* Tip Insights */}
          <Card>
            <h3 className="font-semibold mb-4 dark:text-white">Tips to Boost Earnings</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-800">
                  <Clock size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm dark:text-white">Drive during peak hours</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">7-9 AM and 5-7 PM have 1.5x surge pricing</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-800">
                  <Star size={16} className="text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm dark:text-white">Maintain high ratings</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Drivers with 4.8+ get priority assignments</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-800">
                  <Car size={16} className="text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-sm dark:text-white">Complete 40 trips for weekly bonus</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">You're {Math.max(0, 40 - (summary?.tripsCompleted ?? 0))} trips away from $25 bonus</p>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
