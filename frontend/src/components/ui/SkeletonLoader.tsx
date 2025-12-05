import { type ReactNode, type CSSProperties } from 'react';

interface SkeletonProps {
  className?: string;
  children?: ReactNode;
  style?: CSSProperties;
}

/**
 * Base skeleton with shimmer animation.
 */
function Skeleton({ className = '', children, style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-slate-700 rounded ${className}`}
      aria-hidden="true"
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * Skeleton for text lines.
 */
export function SkeletonText({ 
  lines = 1, 
  className = '',
  lastLineWidth = '75%',
}: { 
  lines?: number; 
  className?: string;
  lastLineWidth?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`} role="status" aria-label="Loading text">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ width: i === lines - 1 && lines > 1 ? lastLineWidth : '100%' } as React.CSSProperties}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Skeleton for avatar/circular elements.
 */
export function SkeletonAvatar({ 
  size = 40,
  className = '',
}: { 
  size?: number;
  className?: string;
}) {
  return (
    <Skeleton 
      className={`rounded-full shrink-0 ${className}`}
      style={{ width: size, height: size } as React.CSSProperties}
    />
  );
}

/**
 * Skeleton for stat cards.
 */
export function SkeletonStatCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 sm:p-6 ${className}`}
      role="status"
      aria-label="Loading statistic"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-12 w-12 rounded-lg" />
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700">
        <Skeleton className="h-3 w-32" />
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Skeleton for list items / table rows.
 */
export function SkeletonRow({ 
  columns = 4,
  hasAvatar = false,
  className = '',
}: { 
  columns?: number;
  hasAvatar?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-4 py-3 px-4 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 ${className}`}
      role="status"
      aria-label="Loading row"
    >
      {hasAvatar && <SkeletonAvatar size={40} />}
      <div className="flex-1 flex items-center gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="h-4 flex-1"
            style={{ maxWidth: i === 0 ? '200px' : i === columns - 1 ? '80px' : '120px' } as React.CSSProperties}
          />
        ))}
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Skeleton for cards (booking card, ticket card, etc.).
 */
export function SkeletonCard({ 
  className = '',
  variant = 'default',
}: { 
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
}) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 ${className}`}
      role="status"
      aria-label="Loading card"
    >
      {variant === 'compact' ? (
        <div className="flex items-center gap-3">
          <SkeletonAvatar size={32} />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ) : variant === 'detailed' ? (
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <SkeletonAvatar size={48} />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex items-center gap-2 pt-2">
            <Skeleton className="h-8 flex-1 rounded-lg" />
          </div>
        </div>
      )}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Grid of skeleton stat cards.
 */
export function SkeletonStatsGrid({ 
  count = 4,
  className = '',
}: { 
  count?: number;
  className?: string;
}) {
  return (
    <div 
      className={`grid grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}
      role="status"
      aria-label="Loading statistics"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
      <span className="sr-only">Loading statistics...</span>
    </div>
  );
}

/**
 * List of skeleton rows.
 */
export function SkeletonList({ 
  rows = 5,
  hasAvatar = false,
  columns = 4,
  className = '',
}: { 
  rows?: number;
  hasAvatar?: boolean;
  columns?: number;
  className?: string;
}) {
  return (
    <div 
      className={`divide-y divide-gray-100 dark:divide-slate-700 ${className}`}
      role="status"
      aria-label="Loading list"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} hasAvatar={hasAvatar} columns={columns} />
      ))}
      <span className="sr-only">Loading list...</span>
    </div>
  );
}

/**
 * Grid of skeleton cards.
 */
export function SkeletonCardGrid({ 
  count = 6,
  variant = 'default',
  className = '',
}: { 
  count?: number;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}) {
  return (
    <div 
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}
      role="status"
      aria-label="Loading cards"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} variant={variant} />
      ))}
      <span className="sr-only">Loading cards...</span>
    </div>
  );
}

/**
 * Full dashboard skeleton.
 */
export function SkeletonDashboard({ 
  statCount = 4,
  cardCount = 6,
  showList = true,
}: {
  statCount?: number;
  cardCount?: number;
  showList?: boolean;
}) {
  return (
    <div className="space-y-6" role="status" aria-label="Loading dashboard">
      <SkeletonStatsGrid count={statCount} />
      {showList && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-slate-700">
            <Skeleton className="h-6 w-40" />
          </div>
          <SkeletonList rows={5} hasAvatar />
        </div>
      )}
      {cardCount > 0 && (
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <SkeletonCardGrid count={cardCount} variant="default" />
        </div>
      )}
      <span className="sr-only">Loading dashboard...</span>
    </div>
  );
}

export default Skeleton;
