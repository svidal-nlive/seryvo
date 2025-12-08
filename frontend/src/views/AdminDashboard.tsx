import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  DollarSign,
  Car,
  ShieldCheck,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Settings,
  FileText,
  MapPin,
  Activity,
  Zap,
  Plus,
  Trash2,
  Save,
  X,
  Shield,
  Plane,
  ScrollText,
  Radio,
  RefreshCw,
  Database,
  Key,
} from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { SkeletonStatsGrid, SkeletonCardGrid, SkeletonList } from '../components/ui/SkeletonLoader';
import EmptyState from '../components/ui/EmptyState';
import RBACPermissionManager from '../components/admin/RBACPermissionManager';
import AuditTrailViewer from '../components/admin/AuditTrailViewer';
import SurchargeManager from '../components/admin/SurchargeManager';
import RevenueReports from '../components/admin/RevenueReports';
import AdminActionLogs from '../components/admin/AdminActionLogs';
import { FleetMap } from '../components/map';
import DemoDataSettingsView from './admin/DemoDataSettingsView';
import APIKeysSettingsView from './admin/APIKeysSettingsView';
import { backend } from '../services/backend';
import { useWebSocket } from '../hooks/useWebSocket';
import { ChannelType, MessageType } from '../services/websocket';
import type { Booking, SupportTicket } from '../types';

interface AdminStats {
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  totalDrivers: number;
  availableDrivers: number;
  openTickets: number;
  totalRevenue: number;
}

interface SurgeRule {
  id: string;
  name: string;
  time_start: string;
  time_end: string;
  days: string[];
  multiplier: number;
  is_active: boolean;
}

// Default surge pricing rules
const DEFAULT_SURGE_RULES: SurgeRule[] = [
  {
    id: 'surge-1',
    name: 'Morning Rush',
    time_start: '07:00',
    time_end: '09:30',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    multiplier: 1.5,
    is_active: true,
  },
  {
    id: 'surge-2',
    name: 'Evening Rush',
    time_start: '17:00',
    time_end: '19:30',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    multiplier: 1.75,
    is_active: true,
  },
  {
    id: 'surge-3',
    name: 'Weekend Nights',
    time_start: '22:00',
    time_end: '02:00',
    days: ['Fri', 'Sat'],
    multiplier: 2.0,
    is_active: true,
  },
  {
    id: 'surge-4',
    name: 'Holiday Premium',
    time_start: '00:00',
    time_end: '23:59',
    days: ['Sun'],
    multiplier: 1.25,
    is_active: false,
  },
];

export default function AdminDashboard() {
  const { navigateTo } = useNavigation();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [recentTickets, setRecentTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(false);

  // Surge pricing state
  const [showSurgeModal, setShowSurgeModal] = useState(false);
  // Start with empty array - data populates when demo data is loaded
  const [surgeRules, setSurgeRules] = useState<SurgeRule[]>([]);
  const [editingRule, setEditingRule] = useState<SurgeRule | null>(null);

  // New admin feature modals
  const [showRBACModal, setShowRBACModal] = useState(false);
  const [showAuditView, setShowAuditView] = useState(false);
  const [showSurchargeView, setShowSurchargeView] = useState(false);
  const [showRevenueReports, setShowRevenueReports] = useState(false);
  const [showActionLogs, setShowActionLogs] = useState(false);
  const [showFleetMap, setShowFleetMap] = useState(false);
  const [showDemoDataSettings, setShowDemoDataSettings] = useState(false);
  const [showAPIKeysSettings, setShowAPIKeysSettings] = useState(false);

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Handle WebSocket stats updates
  const handleStatsUpdate = useCallback((data: { stats?: AdminStats }) => {
    if (data.stats) {
      setStats(data.stats);
      setLastUpdate(new Date());
      setIsLive(true);
    }
  }, []);

  // WebSocket connection for real-time updates
  const { isConnected, subscribe } = useWebSocket({
    autoConnect: true,
    channels: [ChannelType.ADMIN],
    onConnect: () => {
      setIsLive(true);
      subscribe(ChannelType.ADMIN);
    },
    onDisconnect: () => setIsLive(false),
  });

  // Listen for admin stats updates
  useEffect(() => {
    if (!isConnected) return;

    // Simulate receiving stats updates via WebSocket
    // In production, this would come from the actual WebSocket message handler
    const interval = setInterval(async () => {
      const freshStats = await backend.getAdminStats();
      handleStatsUpdate({ stats: freshStats });
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [isConnected, handleStatsUpdate]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [statsData, bookings, tickets] = await Promise.all([
      backend.getAdminStats(),
      backend.getAllBookings(),
      backend.getTickets(),
    ]);
    setStats(statsData);
    setRecentBookings(bookings.slice(0, 5));
    setRecentTickets(tickets.slice(0, 5));
    setLoading(false);
  };

  const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  if (loading || !stats) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading admin dashboard">
        <SkeletonStatsGrid count={6} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="h-6 w-40 bg-gray-200 dark:bg-slate-700 rounded mb-4 animate-pulse" />
            <SkeletonList rows={5} hasAvatar columns={3} />
          </Card>
          <Card>
            <div className="h-6 w-32 bg-gray-200 dark:bg-slate-700 rounded mb-4 animate-pulse" />
            <SkeletonList rows={5} hasAvatar columns={2} />
          </Card>
        </div>
        <span className="sr-only">Loading admin dashboard, please wait...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Grid */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-4">
          <h2 className="text-lg sm:text-xl font-semibold">Platform Overview</h2>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Live indicator */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gray-100 dark:bg-slate-800">
              {isLive ? (
                <>
                  <Radio size={12} className="text-green-500 animate-pulse sm:w-3.5 sm:h-3.5" />
                  <span className="text-[10px] sm:text-xs font-medium text-green-600 dark:text-green-400">Live</span>
                </>
              ) : (
                <>
                  <Radio size={12} className="text-gray-400 sm:w-3.5 sm:h-3.5" />
                  <span className="text-[10px] sm:text-xs font-medium text-gray-500">Offline</span>
                </>
              )}
            </div>
            {/* Last update time */}
            {lastUpdate && (
              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 hidden xs:inline">
                Updated {formatTime(lastUpdate.toISOString())}
              </span>
            )}
            {/* Manual refresh */}
            <button 
              className="p-2 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors touch-manipulation" 
              onClick={() => loadData()}
              title="Refresh stats"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-blue-500' : 'text-gray-500'} />
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 relative overflow-hidden">
            {isLive && <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-500" />}
            <div className="p-2 sm:p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex-shrink-0">
              <Car size={16} className="sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-sm text-gray-500 dark:text-slate-400 truncate">Total Bookings</p>
              <p className="text-base sm:text-xl font-bold">{stats.totalBookings}</p>
            </div>
          </Card>

          <Card className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 relative overflow-hidden">
            {isLive && <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500 to-orange-500" />}
            <div className="p-2 sm:p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex-shrink-0">
              <Activity size={16} className="sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-sm text-gray-500 dark:text-slate-400 truncate">Active Trips</p>
              <p className="text-base sm:text-xl font-bold">{stats.activeBookings}</p>
            </div>
          </Card>

          <Card className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 relative overflow-hidden">
            {isLive && <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-green-500 to-emerald-500" />}
            <div className="p-2 sm:p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 flex-shrink-0">
              <Users size={16} className="sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-sm text-gray-500 dark:text-slate-400 truncate">Drivers</p>
              <p className="text-base sm:text-xl font-bold">
                {stats.availableDrivers}/{stats.totalDrivers}
              </p>
            </div>
          </Card>

          <Card className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 relative overflow-hidden">
            {isLive && <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-500 to-pink-500" />}
            <div className="p-2 sm:p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex-shrink-0">
              <DollarSign size={16} className="sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-sm text-gray-500 dark:text-slate-400 truncate">Revenue</p>
              <p className="text-base sm:text-xl font-bold text-green-600">{formatMoney(stats.totalRevenue)}</p>
            </div>
          </Card>
        </div>
      </section>

      {/* Secondary Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="flex items-center justify-between p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <CheckCircle size={16} className="text-green-500 sm:w-5 sm:h-5" />
            <div>
              <p className="text-[10px] sm:text-sm text-gray-500">Completed</p>
              <p className="text-sm sm:text-base font-bold">{stats.completedBookings}</p>
            </div>
          </div>
          <TrendingUp size={14} className="text-green-500 sm:w-4 sm:h-4" />
        </Card>

        <Card className="flex items-center justify-between p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <AlertTriangle size={16} className="text-amber-500 sm:w-5 sm:h-5" />
            <div>
              <p className="text-[10px] sm:text-sm text-gray-500">Open Tickets</p>
              <p className="text-sm sm:text-base font-bold">{stats.openTickets}</p>
            </div>
          </div>
          {stats.openTickets > 0 && (
            <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 text-[10px] sm:text-xs rounded-full whitespace-nowrap">
              Attention
            </span>
          )}
        </Card>

        <Card className="flex items-center justify-between p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <ShieldCheck size={16} className="text-blue-500 sm:w-5 sm:h-5" />
            <div>
              <p className="text-[10px] sm:text-sm text-gray-500">System Health</p>
              <p className="text-sm sm:text-base font-bold text-green-600">Operational</p>
            </div>
          </div>
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse" />
        </Card>
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Quick Actions</h2>
        <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
          <Card 
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 active:bg-gray-100 transition-colors flex items-center gap-2 sm:gap-3 p-3 sm:p-4 touch-manipulation"
            onClick={() => navigateTo('users')}
          >
            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
              <Users size={14} className="text-blue-600 sm:w-[18px] sm:h-[18px]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium dark:text-white truncate">User Mgmt</p>
              <p className="text-[10px] sm:text-xs text-gray-400 truncate hidden xs:block">Clients & Drivers</p>
            </div>
            <ChevronRight size={14} className="text-gray-400 hidden sm:block sm:w-4 sm:h-4" />
          </Card>

          <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 active:bg-gray-100 transition-colors flex items-center gap-2 sm:gap-3 p-3 sm:p-4 touch-manipulation" onClick={() => setShowSurgeModal(true)}>
            <div className="p-1.5 sm:p-2 rounded-lg bg-green-100 dark:bg-green-900/30 flex-shrink-0">
              <DollarSign size={14} className="text-green-600 sm:w-[18px] sm:h-[18px]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium dark:text-white truncate">Surge Pricing</p>
              <p className="text-[10px] sm:text-xs text-gray-400 truncate hidden xs:block">Configure multipliers</p>
            </div>
            <Zap size={14} className="text-amber-500 hidden sm:block sm:w-4 sm:h-4" />
          </Card>

          <Card 
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 active:bg-gray-100 transition-colors flex items-center gap-2 sm:gap-3 p-3 sm:p-4 touch-manipulation"
            onClick={() => navigateTo('policies')}
          >
            <div className="p-1.5 sm:p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex-shrink-0">
              <FileText size={14} className="text-amber-600 sm:w-[18px] sm:h-[18px]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium dark:text-white truncate">Policies</p>
              <p className="text-[10px] sm:text-xs text-gray-400 truncate hidden xs:block">Rules & limits</p>
            </div>
            <ChevronRight size={14} className="text-gray-400 hidden sm:block sm:w-4 sm:h-4" />
          </Card>

          <Card 
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 active:bg-gray-100 transition-colors flex items-center gap-2 sm:gap-3 p-3 sm:p-4 touch-manipulation"
            onClick={() => navigateTo('settings')}
          >
            <div className="p-1.5 sm:p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex-shrink-0">
              <Settings size={14} className="text-purple-600 sm:w-[18px] sm:h-[18px]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium dark:text-white truncate">Settings</p>
              <p className="text-[10px] sm:text-xs text-gray-400 truncate hidden xs:block">Platform config</p>
            </div>
            <ChevronRight size={14} className="text-gray-400 hidden sm:block sm:w-4 sm:h-4" />
          </Card>
        </div>

        {/* Second Row of Quick Actions */}
        <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4 mt-2 sm:mt-3">
          <Card 
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 active:bg-gray-100 transition-colors flex items-center gap-2 sm:gap-3 p-3 sm:p-4 touch-manipulation"
            onClick={() => setShowRBACModal(true)}
          >
            <div className="p-1.5 sm:p-2 rounded-lg bg-red-100 dark:bg-red-900/30 flex-shrink-0">
              <Shield size={14} className="text-red-600 sm:w-[18px] sm:h-[18px]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium dark:text-white truncate">Permissions</p>
              <p className="text-[10px] sm:text-xs text-gray-400 truncate hidden xs:block">RBAC management</p>
            </div>
            <ChevronRight size={14} className="text-gray-400 hidden sm:block sm:w-4 sm:h-4" />
          </Card>

          <Card 
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 active:bg-gray-100 transition-colors flex items-center gap-2 sm:gap-3 p-3 sm:p-4 touch-manipulation"
            onClick={() => setShowActionLogs(true)}
          >
            <div className="p-1.5 sm:p-2 rounded-lg bg-slate-100 dark:bg-slate-700 flex-shrink-0">
              <ScrollText size={14} className="text-slate-600 dark:text-slate-400 sm:w-[18px] sm:h-[18px]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium dark:text-white truncate">Admin Logs</p>
              <p className="text-[10px] sm:text-xs text-gray-400 truncate hidden xs:block">Action history</p>
            </div>
            <ChevronRight size={14} className="text-gray-400 hidden sm:block sm:w-4 sm:h-4" />
          </Card>

          <Card 
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 active:bg-gray-100 transition-colors flex items-center gap-2 sm:gap-3 p-3 sm:p-4 touch-manipulation"
            onClick={() => setShowSurchargeView(true)}
          >
            <div className="p-1.5 sm:p-2 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex-shrink-0">
              <Plane size={14} className="text-sky-600 sm:w-[18px] sm:h-[18px]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium dark:text-white truncate">Surcharges</p>
              <p className="text-[10px] sm:text-xs text-gray-400 truncate hidden xs:block">Airport & toll fees</p>
            </div>
            <ChevronRight size={14} className="text-gray-400 hidden sm:block sm:w-4 sm:h-4" />
          </Card>

          <Card 
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 active:bg-gray-100 transition-colors flex items-center gap-2 sm:gap-3 p-3 sm:p-4 touch-manipulation"
            onClick={() => setShowRevenueReports(true)}
          >
            <div className="p-1.5 sm:p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex-shrink-0">
              <FileText size={14} className="text-teal-600 sm:w-[18px] sm:h-[18px]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium dark:text-white truncate">Reports</p>
              <p className="text-[10px] sm:text-xs text-gray-400 truncate hidden xs:block">Analytics & data</p>
            </div>
            <ChevronRight size={14} className="text-gray-400 hidden sm:block sm:w-4 sm:h-4" />
          </Card>
        </div>

        {/* Third Row - Fleet Map */}
        <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 mt-2 sm:mt-3">
          <Card 
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 active:bg-gray-100 transition-colors flex items-center gap-2 sm:gap-3 p-3 sm:p-4 touch-manipulation"
            onClick={() => setShowFleetMap(true)}
          >
            <div className="p-1.5 sm:p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex-shrink-0">
              <MapPin size={14} className="text-indigo-600 sm:w-[18px] sm:h-[18px]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium dark:text-white truncate">Fleet Live Map</p>
              <p className="text-[10px] sm:text-xs text-gray-400 truncate">Real-time driver locations</p>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] sm:text-xs text-green-600 dark:text-green-400">Live</span>
            </div>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 active:bg-gray-100 transition-colors flex items-center gap-2 sm:gap-3 p-3 sm:p-4 touch-manipulation"
            onClick={() => setShowDemoDataSettings(true)}
          >
            <div className="p-1.5 sm:p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex-shrink-0">
              <Database size={14} className="text-amber-600 sm:w-[18px] sm:h-[18px]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium dark:text-white truncate">Demo Data</p>
              <p className="text-[10px] sm:text-xs text-gray-400 truncate">Load or clear sample data</p>
            </div>
            <ChevronRight size={14} className="text-gray-400 hidden sm:block sm:w-4 sm:h-4" />
          </Card>

          <Card 
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 active:bg-gray-100 transition-colors flex items-center gap-2 sm:gap-3 p-3 sm:p-4 touch-manipulation"
            onClick={() => setShowAPIKeysSettings(true)}
          >
            <div className="p-1.5 sm:p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex-shrink-0">
              <Key size={14} className="text-rose-600 sm:w-[18px] sm:h-[18px]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium dark:text-white truncate">API Keys</p>
              <p className="text-[10px] sm:text-xs text-gray-400 truncate">Manage platform API keys</p>
            </div>
            <ChevronRight size={14} className="text-gray-400 hidden sm:block sm:w-4 sm:h-4" />
          </Card>
        </div>
      </section>

      {/* Recent Activity */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Recent Bookings */}
        <section>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-semibold">Recent Bookings</h2>
            <Button variant="ghost" className="text-xs sm:text-sm min-h-[40px] sm:min-h-0 px-2 sm:px-3 touch-manipulation">
              <span className="hidden xs:inline">View All</span>
              <span className="xs:hidden">All</span>
              <ChevronRight size={14} />
            </Button>
          </div>
          <div className="space-y-2">
            {recentBookings.map((booking) => (
              <Card
                key={booking.booking_id}
                className="flex items-center justify-between gap-2 p-3 sm:p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 active:bg-gray-100 transition-colors touch-manipulation"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-gray-100 dark:bg-slate-800 flex-shrink-0">
                    <MapPin size={14} className="text-gray-500 sm:w-4 sm:h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium dark:text-white truncate max-w-[120px] sm:max-w-[200px]">
                      {booking.legs[0]?.pickup.address_line}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-400">{formatTime(booking.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  <Badge status={booking.status} />
                  {booking.price_breakdown && (
                    <span className="text-xs sm:text-sm font-medium hidden xs:inline">
                      {formatMoney(booking.price_breakdown.grand_total.amount)}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Recent Tickets */}
        <section>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-semibold">Support Tickets</h2>
            <Button variant="ghost" className="text-xs sm:text-sm min-h-[40px] sm:min-h-0 px-2 sm:px-3 touch-manipulation">
              <span className="hidden xs:inline">View All</span>
              <span className="xs:hidden">All</span>
              <ChevronRight size={14} />
            </Button>
          </div>
          <div className="space-y-2">
            {recentTickets.map((ticket) => (
              <Card
                key={ticket.ticket_id}
                className="flex items-center justify-between gap-2 p-3 sm:p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 active:bg-gray-100 transition-colors touch-manipulation"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div
                    className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                      ticket.priority === 'urgent' || ticket.priority === 'high'
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : 'bg-gray-100 dark:bg-slate-800'
                    }`}
                  >
                    <AlertTriangle
                      size={14}
                      className={`sm:w-4 sm:h-4 ${
                        ticket.priority === 'urgent' || ticket.priority === 'high'
                          ? 'text-red-500'
                          : 'text-gray-500'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium dark:text-white truncate max-w-[120px] sm:max-w-[200px]">
                      {ticket.subject}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-400">{formatTime(ticket.updated_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium whitespace-nowrap ${
                      ticket.status === 'open'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                        : ticket.status === 'in_progress'
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                        : ticket.status === 'resolved'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-600'
                    }`}
                  >
                    {ticket.status === 'in_progress' ? 'In Prog' : ticket.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>

      {/* Surge Pricing Modal */}
      <Modal
        isOpen={showSurgeModal}
        onClose={() => { setShowSurgeModal(false); setEditingRule(null); }}
        title="Surge Pricing Rules"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure time-based surge pricing multipliers. Active rules will automatically apply to fares during the specified time windows.
          </p>

          {/* Surge Rules List */}
          <div className="space-y-2 sm:space-y-3">
            {surgeRules.map((rule) => (
              <div
                key={rule.id}
                className={`p-3 sm:p-4 rounded-lg border ${
                  rule.is_active
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                      <Zap size={14} className={`flex-shrink-0 sm:w-4 sm:h-4 ${rule.is_active ? 'text-amber-500' : 'text-gray-400'}`} />
                      <span className="font-medium text-sm sm:text-base dark:text-white truncate">{rule.name}</span>
                      {!rule.is_active && (
                        <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-gray-200 dark:bg-slate-600 rounded text-gray-600 dark:text-gray-300">
                          Disabled
                        </span>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p className="flex items-center gap-1">
                        <Clock size={12} className="flex-shrink-0" />
                        <span>{rule.time_start} - {rule.time_end}</span>
                      </p>
                      <p className="flex flex-wrap gap-1">
                        {rule.days.map((day) => (
                          <span
                            key={day}
                            className="px-1 sm:px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px] sm:text-xs"
                          >
                            {day}
                          </span>
                        ))}
                      </p>
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:text-right">
                    <p className="text-xl sm:text-2xl font-bold text-amber-600">{rule.multiplier}x</p>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingRule(rule)}
                        className="min-h-[36px] sm:min-h-0 px-2 sm:px-3 text-xs sm:text-sm touch-manipulation"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSurgeRules(surgeRules.map((r) =>
                            r.id === rule.id ? { ...r, is_active: !r.is_active } : r
                          ));
                        }}
                        className="min-h-[36px] sm:min-h-0 px-2 sm:px-3 text-xs sm:text-sm touch-manipulation"
                      >
                        {rule.is_active ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Rule Button */}
          <Button
            variant="secondary"
            className="w-full min-h-[44px] sm:min-h-0"
            onClick={() => setEditingRule({
              id: `surge-${Date.now()}`,
              name: 'New Rule',
              time_start: '12:00',
              time_end: '14:00',
              days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
              multiplier: 1.5,
              is_active: true,
            })}
          >
            <Plus size={16} /> Add Surge Rule
          </Button>

          {/* Active Surge Info */}
          <div className="p-2.5 sm:p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300">
              <Zap size={12} className="inline mr-1 sm:w-3.5 sm:h-3.5" />
              <strong>{surgeRules.filter((r) => r.is_active).length}</strong> active rules.
              <span className="hidden sm:inline"> Surge pricing affects all service types equally.</span>
            </p>
          </div>
        </div>
      </Modal>

      {/* Edit Surge Rule Modal */}
      <Modal
        isOpen={!!editingRule}
        onClose={() => setEditingRule(null)}
        title={editingRule?.id.startsWith('surge-new') || !surgeRules.find((r) => r.id === editingRule?.id) ? 'Add Surge Rule' : 'Edit Surge Rule'}
        size="md"
      >
        {editingRule && (
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                Rule Name
              </label>
              <input
                type="text"
                value={editingRule.name}
                onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-sm min-h-[44px] sm:min-h-0"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                  Start Time
                </label>
                <input
                  type="time"
                  value={editingRule.time_start}
                  onChange={(e) => setEditingRule({ ...editingRule, time_start: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-sm min-h-[44px] sm:min-h-0"
                />
              </div>
              <div>
                <label className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                  End Time
                </label>
                <input
                  type="time"
                  value={editingRule.time_end}
                  onChange={(e) => setEditingRule({ ...editingRule, time_end: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-sm min-h-[44px] sm:min-h-0"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">
                Days of Week
              </label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    onClick={() => {
                      const days = editingRule.days.includes(day)
                        ? editingRule.days.filter((d) => d !== day)
                        : [...editingRule.days, day];
                      setEditingRule({ ...editingRule, days });
                    }}
                    className={`px-2.5 sm:px-3 py-1.5 sm:py-1.5 min-h-[36px] sm:min-h-0 rounded-lg text-xs sm:text-sm font-medium transition-colors touch-manipulation ${
                      editingRule.days.includes(day)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">
                Surge Multiplier: <span className="text-amber-600 font-bold">{editingRule.multiplier}x</span>
              </label>
              <input
                type="range"
                min="1"
                max="3"
                step="0.25"
                value={editingRule.multiplier}
                onChange={(e) => setEditingRule({ ...editingRule, multiplier: parseFloat(e.target.value) })}
                className="w-full h-3 sm:h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] sm:text-xs text-gray-400 mt-1">
                <span>1x</span>
                <span>2x</span>
                <span>3x</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 sm:p-0">
              <input
                type="checkbox"
                id="rule-active"
                checked={editingRule.is_active}
                onChange={(e) => setEditingRule({ ...editingRule, is_active: e.target.checked })}
                className="w-5 h-5 sm:w-4 sm:h-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="rule-active" className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Rule is active
              </label>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
              <div className="flex gap-2 sm:gap-3">
                {surgeRules.find((r) => r.id === editingRule.id) && (
                  <Button
                    variant="danger"
                    onClick={() => {
                      setSurgeRules(surgeRules.filter((r) => r.id !== editingRule.id));
                      setEditingRule(null);
                    }}
                    className="flex items-center justify-center gap-1 min-h-[44px] sm:min-h-0 flex-1 sm:flex-none"
                  >
                    <Trash2 size={16} /> <span className="hidden sm:inline">Delete</span>
                  </Button>
                )}
              </div>
              <div className="hidden sm:block flex-1" />
              <div className="flex gap-2 sm:gap-3">
                <Button 
                  variant="secondary" 
                  onClick={() => setEditingRule(null)}
                  className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0"
                >
                  Cancel
                </Button>
                <Button
                  variant="success"
                  onClick={() => {
                    const existingIdx = surgeRules.findIndex((r) => r.id === editingRule.id);
                    if (existingIdx >= 0) {
                      setSurgeRules(surgeRules.map((r) => r.id === editingRule.id ? editingRule : r));
                    } else {
                      setSurgeRules([...surgeRules, editingRule]);
                    }
                    setEditingRule(null);
                  }}
                  className="flex items-center justify-center gap-1 flex-1 sm:flex-none min-h-[44px] sm:min-h-0"
                >
                  <Save size={16} /> Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* RBAC Permission Manager */}
      <RBACPermissionManager 
        isOpen={showRBACModal} 
        onClose={() => setShowRBACModal(false)} 
      />

      {/* Audit Trail Viewer Modal */}
      <Modal
        isOpen={showAuditView}
        onClose={() => setShowAuditView(false)}
        title="Audit Trail"
        size="xl"
      >
        <AuditTrailViewer />
      </Modal>

      {/* Surcharge Manager Modal */}
      <Modal
        isOpen={showSurchargeView}
        onClose={() => setShowSurchargeView(false)}
        title="Surcharge Management"
        size="xl"
      >
        <SurchargeManager />
      </Modal>

      {/* Revenue Reports */}
      <RevenueReports
        isOpen={showRevenueReports}
        onClose={() => setShowRevenueReports(false)}
      />

      {/* Admin Action Logs */}
      <AdminActionLogs
        isOpen={showActionLogs}
        onClose={() => setShowActionLogs(false)}
      />

      {/* Fleet Live Map */}
      <Modal
        isOpen={showFleetMap}
        onClose={() => setShowFleetMap(false)}
        title="Fleet Live Map"
        size="xl"
      >
        <div className="p-0 -m-6">
          <FleetMap height="70vh" />
        </div>
      </Modal>

      {/* Demo Data Settings */}
      <Modal
        isOpen={showDemoDataSettings}
        onClose={() => setShowDemoDataSettings(false)}
        title="Demo Data Settings"
        size="lg"
      >
        <div className="p-0 -m-6">
          <DemoDataSettingsView onBack={() => setShowDemoDataSettings(false)} />
        </div>
      </Modal>

      {/* API Keys Settings */}
      <Modal
        isOpen={showAPIKeysSettings}
        onClose={() => setShowAPIKeysSettings(false)}
        title="API Keys & Configuration"
        size="xl"
      >
        <div className="p-4">
          <APIKeysSettingsView />
        </div>
      </Modal>
    </div>
  );
}
