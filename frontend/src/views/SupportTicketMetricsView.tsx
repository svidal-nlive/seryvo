/**
 * Seryvo Platform - Support Ticket Metrics View
 * Analytics dashboard for support ticket performance
 */

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle,
  AlertTriangle,
  Timer,
  Calendar,
  Download,
  Filter,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { backend } from '../services/backend';
import { convertToCSV, downloadCSV } from '../utils/csvExport';
import type { SupportTicket, TicketCategory } from '../types';

// =============================================================================
// Types
// =============================================================================

interface TicketMetrics {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  avgResolutionTime: number; // in minutes
  avgFirstResponseTime: number; // in minutes
  satisfactionRate: number; // percentage
  escalationRate: number; // percentage
}

interface AgentPerformance {
  agent_id: string;
  agent_name: string;
  ticketsHandled: number;
  ticketsResolved: number;
  avgResolutionTime: number;
  satisfactionScore: number;
}

interface DailyVolume {
  date: string;
  opened: number;
  resolved: number;
  escalated: number;
}

type TimePeriod = 'today' | 'week' | 'month' | 'quarter';

// =============================================================================
// Mock Data
// =============================================================================

const MOCK_AGENT_PERFORMANCE: AgentPerformance[] = [
  { agent_id: 'agent-1', agent_name: 'Sam Support', ticketsHandled: 87, ticketsResolved: 72, avgResolutionTime: 45, satisfactionScore: 4.6 },
  { agent_id: 'agent-2', agent_name: 'Alex Helper', ticketsHandled: 64, ticketsResolved: 58, avgResolutionTime: 38, satisfactionScore: 4.8 },
  { agent_id: 'agent-3', agent_name: 'Jordan Assist', ticketsHandled: 52, ticketsResolved: 41, avgResolutionTime: 62, satisfactionScore: 4.2 },
];

const MOCK_DAILY_VOLUME: DailyVolume[] = [
  { date: '2024-11-26', opened: 12, resolved: 10, escalated: 1 },
  { date: '2024-11-27', opened: 15, resolved: 14, escalated: 2 },
  { date: '2024-11-28', opened: 8, resolved: 12, escalated: 0 },
  { date: '2024-11-29', opened: 18, resolved: 15, escalated: 3 },
  { date: '2024-11-30', opened: 22, resolved: 18, escalated: 2 },
  { date: '2024-12-01', opened: 14, resolved: 16, escalated: 1 },
  { date: '2024-12-02', opened: 11, resolved: 9, escalated: 1 },
];

const MOCK_CATEGORY_BREAKDOWN = [
  { category: 'trip_issue', count: 45, percentage: 35 },
  { category: 'payment_dispute', count: 32, percentage: 25 },
  { category: 'account_issue', count: 25, percentage: 20 },
  { category: 'safety_incident', count: 15, percentage: 12 },
  { category: 'other', count: 10, percentage: 8 },
];

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  trip_issue: 'Trip Issues',
  account_issue: 'Account Issues',
  payment_dispute: 'Payment Disputes',
  safety_incident: 'Safety Incidents',
  other: 'Other',
};

const CATEGORY_COLORS: Record<TicketCategory, string> = {
  trip_issue: 'bg-blue-500',
  payment_dispute: 'bg-amber-500',
  account_issue: 'bg-purple-500',
  safety_incident: 'bg-red-500',
  other: 'bg-gray-500',
};

// =============================================================================
// Component
// =============================================================================

export default function SupportTicketMetricsView() {
  const [period, setPeriod] = useState<TimePeriod>('week');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  // Start with empty arrays - data populates when demo data is loaded
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);
  const [dailyVolume, setDailyVolume] = useState<DailyVolume[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<{category: string; count: number; percentage: number}[]>([]);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    const data = await backend.getTickets();
    setTickets(data);
  };

  // Calculate metrics from tickets
  const metrics: TicketMetrics = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter(t => ['open', 'in_progress', 'waiting_on_client', 'waiting_on_driver'].includes(t.status)).length;
    const resolved = tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length;
    const escalated = tickets.filter(t => t.status === 'escalated').length;

    return {
      totalTickets: total,
      openTickets: open,
      resolvedTickets: resolved,
      avgResolutionTime: 48, // Mock: 48 minutes average
      avgFirstResponseTime: 12, // Mock: 12 minutes average
      satisfactionRate: 92, // Mock: 92%
      escalationRate: total > 0 ? Math.round((escalated / total) * 100) : 0,
    };
  }, [tickets]);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleExportMetrics = () => {
    const data = [
      { metric: 'Total Tickets', value: String(metrics.totalTickets) },
      { metric: 'Open Tickets', value: String(metrics.openTickets) },
      { metric: 'Resolved Tickets', value: String(metrics.resolvedTickets) },
      { metric: 'Avg Resolution Time', value: formatDuration(metrics.avgResolutionTime) },
      { metric: 'Avg First Response', value: formatDuration(metrics.avgFirstResponseTime) },
      { metric: 'Satisfaction Rate', value: `${metrics.satisfactionRate}%` },
      { metric: 'Escalation Rate', value: `${metrics.escalationRate}%` },
    ];
    
    const columns = [
      { key: 'metric', header: 'Metric' },
      { key: 'value', header: 'Value' },
    ];
    
    const csvContent = convertToCSV(data, columns);
    downloadCSV(csvContent, `support-metrics-${period}-${new Date().toISOString().split('T')[0]}`);
  };

  // Calculate max for volume chart scaling - handle empty array
  const maxVolume = dailyVolume.length > 0 ? Math.max(...dailyVolume.map(d => Math.max(d.opened, d.resolved))) : 1;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Support Ticket Metrics
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Performance analytics and insights
          </p>
        </div>
        <div className="flex gap-3">
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
          <Button variant="secondary" onClick={handleExportMetrics}>
            <Download size={16} /> Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 dark:text-gray-400 text-sm">Total Tickets</span>
            <BarChart3 className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{metrics.totalTickets}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> +12% from last {period}
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 dark:text-gray-400 text-sm">Avg Resolution Time</span>
            <Timer className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatDuration(metrics.avgResolutionTime)}
          </p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <TrendingDown className="w-3 h-3" /> -8% faster
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 dark:text-gray-400 text-sm">Satisfaction Rate</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {metrics.satisfactionRate}%
          </p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> +2% improvement
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 dark:text-gray-400 text-sm">Escalation Rate</span>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {metrics.escalationRate}%
          </p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <TrendingDown className="w-3 h-3" /> -3% reduction
          </p>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Trend Chart */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Daily Volume Trend
          </h3>
          <div className="h-48">
            {dailyVolume.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-500 dark:text-gray-400">
                No volume data available. Load demo data to see sample metrics.
              </div>
            ) : (
            <div className="flex items-end justify-between h-40 gap-2">
              {dailyVolume.map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-0.5 items-end h-32">
                    {/* Opened */}
                    <div
                      className="flex-1 bg-blue-500 rounded-t"
                      style={{ height: `${(day.opened / maxVolume) * 100}%` }}
                      title={`Opened: ${day.opened}`}
                    />
                    {/* Resolved */}
                    <div
                      className="flex-1 bg-green-500 rounded-t"
                      style={{ height: `${(day.resolved / maxVolume) * 100}%` }}
                      title={`Resolved: ${day.resolved}`}
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(day.date)}
                  </span>
                </div>
              ))}
            </div>
            )}
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span className="text-gray-600 dark:text-gray-400">Opened</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span className="text-gray-600 dark:text-gray-400">Resolved</span>
            </div>
          </div>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5 text-purple-500" />
            Category Breakdown
          </h3>
          <div className="space-y-4">
            {categoryBreakdown.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                No category data available. Load demo data to see sample breakdown.
              </div>
            ) : (
            categoryBreakdown.map((item) => (
              <div key={item.category}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300">
                    {CATEGORY_LABELS[item.category as TicketCategory]}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${CATEGORY_COLORS[item.category as TicketCategory]} rounded-full transition-all`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))
            )}
          </div>
        </Card>
      </div>

      {/* Agent Performance Table */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" />
          Agent Performance
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Agent
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Tickets Handled
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Resolved
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Resolution Rate
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Avg Time
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Satisfaction
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {agentPerformance.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No agent performance data available. Load demo data to see sample metrics.
                  </td>
                </tr>
              ) : (
              agentPerformance.map((agent) => {
                const resolutionRate = Math.round((agent.ticketsResolved / agent.ticketsHandled) * 100);
                return (
                  <tr key={agent.agent_id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                          <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {agent.agent_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                      {agent.ticketsHandled}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-green-600">
                      {agent.ticketsResolved}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`text-sm font-medium ${
                          resolutionRate >= 80
                            ? 'text-green-600'
                            : resolutionRate >= 60
                            ? 'text-amber-600'
                            : 'text-red-600'
                        }`}
                      >
                        {resolutionRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                      {formatDuration(agent.avgResolutionTime)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {agent.satisfactionScore.toFixed(1)}
                        </span>
                        <span className="text-amber-500">★</span>
                      </div>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">First Response</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {formatDuration(metrics.avgFirstResponseTime)}
          </p>
          <p className="text-xs text-blue-500">Average time to first reply</p>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <p className="text-sm text-green-600 dark:text-green-400 mb-1">Resolution Rate</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">
            {metrics.totalTickets > 0
              ? Math.round((metrics.resolvedTickets / metrics.totalTickets) * 100)
              : 0}%
          </p>
          <p className="text-xs text-green-500">Tickets fully resolved</p>
        </Card>
        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-1">Pending</p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
            {metrics.openTickets}
          </p>
          <p className="text-xs text-amber-500">Tickets awaiting action</p>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
          <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Active Agents</p>
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
            {agentPerformance.length}
          </p>
          <p className="text-xs text-purple-500">Currently handling tickets</p>
        </Card>
      </div>
    </div>
  );
}
