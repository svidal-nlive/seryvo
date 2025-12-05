import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Target,
  XCircle,
  CheckCircle,
  AlertTriangle,
  Award,
  Clock,
  Star,
} from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

export interface PerformanceMetrics {
  acceptance_rate: number; // 0-100 percentage
  cancellation_rate: number; // 0-100 percentage
  completion_rate: number; // 0-100 percentage
  total_trips: number;
  total_accepted: number;
  total_declined: number;
  total_cancelled: number;
  average_response_time_seconds: number;
  on_time_arrival_rate: number; // 0-100 percentage
}

// Feedback trends data point
export interface RatingTrendPoint {
  date: string;
  rating: number;
  trips: number;
}

interface PerformanceStatsProps {
  metrics: PerformanceMetrics;
  className?: string;
  compact?: boolean;
  ratingTrends?: RatingTrendPoint[];
}

function getPerformanceLevel(rate: number): {
  level: 'excellent' | 'good' | 'fair' | 'poor';
  color: string;
  bgColor: string;
} {
  if (rate >= 90) {
    return { level: 'excellent', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' };
  } else if (rate >= 75) {
    return { level: 'good', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' };
  } else if (rate >= 60) {
    return { level: 'fair', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30' };
  }
  return { level: 'poor', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' };
}

function getCancellationLevel(rate: number): {
  level: 'excellent' | 'good' | 'fair' | 'poor';
  color: string;
  bgColor: string;
} {
  // For cancellation, lower is better
  if (rate <= 5) {
    return { level: 'excellent', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' };
  } else if (rate <= 10) {
    return { level: 'good', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' };
  } else if (rate <= 20) {
    return { level: 'fair', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30' };
  }
  return { level: 'poor', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' };
}

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  return `${Math.round(seconds / 60)}m`;
}

function ProgressRing({
  value,
  size = 60,
  strokeWidth = 6,
  color,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-gray-200 dark:text-slate-700"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={color}
      />
    </svg>
  );
}

export default function PerformanceStats({
  metrics,
  className = '',
  compact = false,
  ratingTrends,
}: PerformanceStatsProps) {
  const acceptanceLevel = getPerformanceLevel(metrics.acceptance_rate);
  const cancellationLevel = getCancellationLevel(metrics.cancellation_rate);
  const completionLevel = getPerformanceLevel(metrics.completion_rate);
  const onTimeLevel = getPerformanceLevel(metrics.on_time_arrival_rate);

  // Generate mock rating trends if not provided
  const trendData: RatingTrendPoint[] = ratingTrends || [
    { date: '6 weeks ago', rating: 4.7, trips: 28 },
    { date: '5 weeks ago', rating: 4.8, trips: 32 },
    { date: '4 weeks ago', rating: 4.6, trips: 25 },
    { date: '3 weeks ago', rating: 4.9, trips: 30 },
    { date: '2 weeks ago', rating: 4.8, trips: 35 },
    { date: 'Last week', rating: 4.9, trips: 27 },
  ];

  // Calculate rating trend direction
  const recentAvg = trendData.slice(-2).reduce((sum, p) => sum + p.rating, 0) / 2;
  const olderAvg = trendData.slice(0, 2).reduce((sum, p) => sum + p.rating, 0) / 2;
  const trendDirection = recentAvg >= olderAvg ? 'up' : 'down';
  const trendDiff = Math.abs(recentAvg - olderAvg).toFixed(1);

  if (compact) {
    return (
      <div className={`grid grid-cols-2 gap-3 ${className}`}>
        <Card className="!p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className={acceptanceLevel.color} />
              <span className="text-xs text-gray-500 dark:text-slate-400">Accept</span>
            </div>
            <span className={`text-lg font-bold ${acceptanceLevel.color}`}>
              {metrics.acceptance_rate.toFixed(0)}%
            </span>
          </div>
        </Card>
        <Card className="!p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle size={16} className={cancellationLevel.color} />
              <span className="text-xs text-gray-500 dark:text-slate-400">Cancel</span>
            </div>
            <span className={`text-lg font-bold ${cancellationLevel.color}`}>
              {metrics.cancellation_rate.toFixed(0)}%
            </span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Summary */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold dark:text-white flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-500" />
          Performance Metrics
        </h3>
        {metrics.total_trips >= 50 && metrics.acceptance_rate >= 90 && metrics.cancellation_rate <= 5 && (
          <Badge variant="success" className="flex items-center gap-1">
            <Award size={12} />
            Top Performer
          </Badge>
        )}
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Acceptance Rate */}
        <Card className={acceptanceLevel.bgColor}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className={acceptanceLevel.color} />
              <span className="text-sm font-medium dark:text-white">Acceptance Rate</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <ProgressRing
                value={metrics.acceptance_rate}
                color={acceptanceLevel.color}
              />
              <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${acceptanceLevel.color}`}>
                {metrics.acceptance_rate.toFixed(0)}%
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400">
              <p>{metrics.total_accepted} accepted</p>
              <p>{metrics.total_declined} declined</p>
            </div>
          </div>
          {metrics.acceptance_rate < 75 && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <AlertTriangle size={12} />
              Accept more trips to improve earnings
            </p>
          )}
        </Card>

        {/* Cancellation Rate */}
        <Card className={cancellationLevel.bgColor}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <XCircle size={18} className={cancellationLevel.color} />
              <span className="text-sm font-medium dark:text-white">Cancellation Rate</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <ProgressRing
                value={100 - metrics.cancellation_rate}
                color={cancellationLevel.color}
              />
              <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${cancellationLevel.color}`}>
                {metrics.cancellation_rate.toFixed(0)}%
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400">
              <p>{metrics.total_cancelled} cancelled</p>
              <p>of {metrics.total_trips} trips</p>
            </div>
          </div>
          {metrics.cancellation_rate > 15 && (
            <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
              <AlertTriangle size={12} />
              High cancellations may affect status
            </p>
          )}
        </Card>

        {/* Completion Rate */}
        <Card className={completionLevel.bgColor}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target size={18} className={completionLevel.color} />
              <span className="text-sm font-medium dark:text-white">Completion Rate</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <ProgressRing
                value={metrics.completion_rate}
                color={completionLevel.color}
              />
              <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${completionLevel.color}`}>
                {metrics.completion_rate.toFixed(0)}%
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400">
              <p>{metrics.total_trips} total trips</p>
              <p>Career total</p>
            </div>
          </div>
        </Card>

        {/* Response Time & On-Time */}
        <Card>
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Clock size={16} className="text-purple-500" />
                <span className="text-sm font-medium dark:text-white">Avg Response</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {formatTime(metrics.average_response_time_seconds)}
              </p>
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
              <div className="flex items-center gap-2 mb-1">
                <Target size={16} className={onTimeLevel.color} />
                <span className="text-sm font-medium dark:text-white">On-Time Arrival</span>
              </div>
              <p className={`text-2xl font-bold ${onTimeLevel.color}`}>
                {metrics.on_time_arrival_rate.toFixed(0)}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Performance Tips */}
      {(metrics.acceptance_rate < 80 || metrics.cancellation_rate > 10) && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
            💡 Tips to Improve Your Performance
          </h4>
          <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
            {metrics.acceptance_rate < 80 && (
              <li>• Accepting more trip requests increases your visibility to premium clients</li>
            )}
            {metrics.cancellation_rate > 10 && (
              <li>• Reducing cancellations helps maintain your driver status and ratings</li>
            )}
            {metrics.average_response_time_seconds > 30 && (
              <li>• Faster response times give you priority for high-value bookings</li>
            )}
          </ul>
        </Card>
      )}

      {/* Rating Trends Chart */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star size={18} className="text-yellow-500 fill-yellow-500" />
            <h4 className="text-sm font-semibold dark:text-white">Rating Trends</h4>
          </div>
          <div className="flex items-center gap-1">
            {trendDirection === 'up' ? (
              <TrendingUp size={16} className="text-green-500" />
            ) : (
              <TrendingDown size={16} className="text-red-500" />
            )}
            <span className={`text-sm font-medium ${trendDirection === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trendDirection === 'up' ? '+' : '-'}{trendDiff}
            </span>
          </div>
        </div>

        {/* Simple Bar Chart for Rating Trends */}
        <div className="space-y-2">
          {trendData.map((point, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-20 flex-shrink-0">{point.date}</span>
              <div className="flex-1 h-6 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    point.rating >= 4.8 ? 'bg-green-500' :
                    point.rating >= 4.5 ? 'bg-blue-500' :
                    point.rating >= 4.0 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${(point.rating / 5) * 100}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white drop-shadow">
                  {point.rating.toFixed(1)} ⭐
                </span>
              </div>
              <span className="text-xs text-gray-400 w-16 text-right">{point.trips} trips</span>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Total: {trendData.reduce((sum, p) => sum + p.trips, 0)} trips rated
          </div>
          <div className="text-xs text-gray-500">
            Avg: {(trendData.reduce((sum, p) => sum + p.rating, 0) / trendData.length).toFixed(2)} ⭐
          </div>
        </div>
      </Card>
    </div>
  );
}

// Helper to calculate metrics from booking data
export function calculatePerformanceMetrics(
  accepted: number,
  declined: number,
  cancelled: number,
  completed: number,
  avgResponseTime: number = 15,
  onTimeRate: number = 92
): PerformanceMetrics {
  const totalOffers = accepted + declined;
  const totalTrips = completed + cancelled;

  return {
    acceptance_rate: totalOffers > 0 ? (accepted / totalOffers) * 100 : 100,
    cancellation_rate: totalTrips > 0 ? (cancelled / totalTrips) * 100 : 0,
    completion_rate: totalTrips > 0 ? (completed / totalTrips) * 100 : 100,
    total_trips: completed,
    total_accepted: accepted,
    total_declined: declined,
    total_cancelled: cancelled,
    average_response_time_seconds: avgResponseTime,
    on_time_arrival_rate: onTimeRate,
  };
}
