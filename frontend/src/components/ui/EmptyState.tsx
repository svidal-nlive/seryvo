import { type ReactNode } from 'react';
import { 
  Inbox, 
  Calendar, 
  MessageSquare, 
  Search, 
  FileQuestion, 
  Car, 
  CreditCard,
  Users,
  MapPin,
  Bell,
  type LucideIcon,
} from 'lucide-react';
import Button from './Button';

// Illustration SVGs for different scenarios
const illustrations = {
  noData: (
    <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
      <circle cx="100" cy="100" r="80" className="fill-gray-100 dark:fill-slate-800" />
      <rect x="60" y="70" width="80" height="60" rx="8" className="fill-gray-200 dark:fill-slate-700" />
      <rect x="70" y="85" width="40" height="4" rx="2" className="fill-gray-300 dark:fill-slate-600" />
      <rect x="70" y="95" width="60" height="4" rx="2" className="fill-gray-300 dark:fill-slate-600" />
      <rect x="70" y="105" width="30" height="4" rx="2" className="fill-gray-300 dark:fill-slate-600" />
      <circle cx="145" cy="145" r="25" className="fill-blue-100 dark:fill-blue-900/30" />
      <path d="M138 145l6 6 12-12" className="stroke-blue-500" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  noBookings: (
    <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
      <circle cx="100" cy="100" r="80" className="fill-blue-50 dark:fill-blue-900/20" />
      <rect x="50" y="60" width="100" height="80" rx="10" className="fill-white dark:fill-slate-800 stroke-blue-200 dark:stroke-blue-800" strokeWidth="2" />
      <circle cx="75" cy="95" r="15" className="fill-blue-100 dark:fill-blue-900/30" />
      <rect x="100" y="85" width="35" height="5" rx="2" className="fill-blue-200 dark:fill-blue-800" />
      <rect x="100" y="95" width="25" height="5" rx="2" className="fill-gray-200 dark:fill-slate-700" />
      <rect x="60" y="120" width="80" height="8" rx="4" className="fill-blue-500/20" />
      <path d="M60 60l10-10h70l10 10" className="stroke-blue-300 dark:stroke-blue-700" strokeWidth="2" fill="none" />
      <line x1="100" y1="60" x2="100" y2="50" className="stroke-blue-300 dark:stroke-blue-700" strokeWidth="2" />
    </svg>
  ),
  noTickets: (
    <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
      <circle cx="100" cy="100" r="80" className="fill-green-50 dark:fill-green-900/20" />
      <rect x="55" y="55" width="90" height="90" rx="12" className="fill-white dark:fill-slate-800 stroke-green-200 dark:stroke-green-800" strokeWidth="2" />
      <path d="M75 95l10 10 25-25" className="stroke-green-500" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="115" y="85" width="15" height="3" rx="1.5" className="fill-gray-200 dark:fill-slate-700" />
      <rect x="75" y="115" width="50" height="3" rx="1.5" className="fill-gray-200 dark:fill-slate-700" />
      <rect x="75" y="125" width="35" height="3" rx="1.5" className="fill-gray-200 dark:fill-slate-700" />
      <circle cx="150" cy="50" r="20" className="fill-green-100 dark:fill-green-900/30" />
      <path d="M143 50l5 5 9-9" className="stroke-green-600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  noMessages: (
    <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
      <circle cx="100" cy="100" r="80" className="fill-purple-50 dark:fill-purple-900/20" />
      <path d="M50 70h100a10 10 0 0110 10v50a10 10 0 01-10 10h-60l-25 20v-20h-15a10 10 0 01-10-10v-50a10 10 0 0110-10z" className="fill-white dark:fill-slate-800 stroke-purple-200 dark:stroke-purple-800" strokeWidth="2" />
      <circle cx="70" cy="100" r="6" className="fill-purple-200 dark:fill-purple-800" />
      <circle cx="100" cy="100" r="6" className="fill-purple-200 dark:fill-purple-800" />
      <circle cx="130" cy="100" r="6" className="fill-purple-200 dark:fill-purple-800" />
    </svg>
  ),
  noResults: (
    <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
      <circle cx="100" cy="100" r="80" className="fill-amber-50 dark:fill-amber-900/20" />
      <circle cx="90" cy="85" r="35" className="fill-white dark:fill-slate-800 stroke-amber-300 dark:stroke-amber-700" strokeWidth="3" />
      <line x1="115" y1="110" x2="145" y2="140" className="stroke-amber-400 dark:stroke-amber-600" strokeWidth="6" strokeLinecap="round" />
      <path d="M75 85h30M90 70v30" className="stroke-amber-200 dark:stroke-amber-800" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  noDrivers: (
    <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
      <circle cx="100" cy="100" r="80" className="fill-indigo-50 dark:fill-indigo-900/20" />
      <ellipse cx="100" cy="130" rx="50" ry="20" className="fill-indigo-100 dark:fill-indigo-900/30" />
      <rect x="60" y="100" width="80" height="35" rx="8" className="fill-white dark:fill-slate-800 stroke-indigo-200 dark:stroke-indigo-800" strokeWidth="2" />
      <circle cx="80" cy="130" r="8" className="fill-indigo-300 dark:fill-indigo-700" />
      <circle cx="120" cy="130" r="8" className="fill-indigo-300 dark:fill-indigo-700" />
      <rect x="70" y="85" width="60" height="20" rx="4" className="fill-indigo-200 dark:fill-indigo-800" />
      <rect x="90" y="70" width="20" height="20" rx="2" className="fill-indigo-100 dark:fill-indigo-900/50" />
    </svg>
  ),
  noPayments: (
    <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
      <circle cx="100" cy="100" r="80" className="fill-emerald-50 dark:fill-emerald-900/20" />
      <rect x="45" y="70" width="110" height="70" rx="10" className="fill-white dark:fill-slate-800 stroke-emerald-200 dark:stroke-emerald-800" strokeWidth="2" />
      <rect x="45" y="85" width="110" height="20" className="fill-emerald-100 dark:fill-emerald-900/30" />
      <rect x="55" y="115" width="30" height="15" rx="3" className="fill-emerald-200 dark:fill-emerald-800" />
      <circle cx="140" cy="122" r="8" className="fill-emerald-300 dark:fill-emerald-700" />
      <circle cx="125" cy="122" r="8" className="fill-emerald-400 dark:fill-emerald-600" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
      <circle cx="100" cy="100" r="80" className="fill-red-50 dark:fill-red-900/20" />
      <circle cx="100" cy="100" r="50" className="fill-white dark:fill-slate-800 stroke-red-200 dark:stroke-red-800" strokeWidth="2" />
      <path d="M85 85l30 30M115 85l-30 30" className="stroke-red-400" strokeWidth="4" strokeLinecap="round" />
      <circle cx="100" cy="100" r="40" className="stroke-red-300 dark:stroke-red-700" strokeWidth="2" fill="none" strokeDasharray="8 4" />
    </svg>
  ),
};

type IllustrationType = keyof typeof illustrations;

interface EmptyStateProps {
  /** Type of illustration to show */
  type?: IllustrationType;
  /** Custom icon instead of illustration */
  icon?: LucideIcon;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Additional content below actions */
  children?: ReactNode;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Custom className */
  className?: string;
}

const sizeClasses = {
  sm: {
    container: 'py-8',
    illustration: 'w-24 h-24',
    title: 'text-base',
    description: 'text-sm',
  },
  md: {
    container: 'py-12',
    illustration: 'w-40 h-40',
    title: 'text-lg',
    description: 'text-sm',
  },
  lg: {
    container: 'py-16',
    illustration: 'w-56 h-56',
    title: 'text-xl',
    description: 'text-base',
  },
};

// Icon mapping for type fallbacks
const typeIcons: Record<IllustrationType, LucideIcon> = {
  noData: Inbox,
  noBookings: Calendar,
  noTickets: MessageSquare,
  noMessages: MessageSquare,
  noResults: Search,
  noDrivers: Car,
  noPayments: CreditCard,
  error: FileQuestion,
};

export default function EmptyState({
  type = 'noData',
  icon: CustomIcon,
  title,
  description,
  action,
  secondaryAction,
  children,
  size = 'md',
  className = '',
}: EmptyStateProps) {
  const classes = sizeClasses[size];
  const Icon = CustomIcon || typeIcons[type];
  const ActionIcon = action?.icon;

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${classes.container} ${className}`}
      role="status"
      aria-label={title}
    >
      {/* Illustration or Icon */}
      <div className={`${classes.illustration} mb-6`} aria-hidden="true">
        {illustrations[type] || (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-slate-800 rounded-full">
            <Icon className="w-1/2 h-1/2 text-gray-400 dark:text-slate-500" />
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className={`font-semibold text-gray-900 dark:text-white mb-2 ${classes.title}`}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className={`text-gray-500 dark:text-slate-400 max-w-sm mb-6 ${classes.description}`}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action && (
            <Button onClick={action.onClick} variant="primary">
              {ActionIcon && <ActionIcon size={18} />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="secondary">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}

      {/* Additional content */}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}

// Preset components for common scenarios
export function NoBookingsState({ onCreateBooking }: { onCreateBooking?: () => void }) {
  return (
    <EmptyState
      type="noBookings"
      title="No bookings yet"
      description="You haven't made any bookings. Book your first ride to get started!"
      action={onCreateBooking ? {
        label: 'Book a Ride',
        onClick: onCreateBooking,
        icon: Calendar,
      } : undefined}
    />
  );
}

export function NoTicketsState({ onCreateTicket }: { onCreateTicket?: () => void }) {
  return (
    <EmptyState
      type="noTickets"
      title="All caught up!"
      description="No open support tickets. Need help with something?"
      action={onCreateTicket ? {
        label: 'Create Ticket',
        onClick: onCreateTicket,
        icon: MessageSquare,
      } : undefined}
    />
  );
}

export function NoMessagesState() {
  return (
    <EmptyState
      type="noMessages"
      title="No messages"
      description="Your inbox is empty. Messages from support and drivers will appear here."
      size="sm"
    />
  );
}

export function NoSearchResultsState({ 
  query,
  onClear,
}: { 
  query?: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      type="noResults"
      title="No results found"
      description={query ? `We couldn't find anything matching "${query}"` : 'Try adjusting your search or filters'}
      action={onClear ? {
        label: 'Clear Search',
        onClick: onClear,
        icon: Search,
      } : undefined}
    />
  );
}

export function NoDriversAvailableState() {
  return (
    <EmptyState
      type="noDrivers"
      title="No drivers available"
      description="All drivers are currently busy. Please try again in a few minutes."
      size="sm"
    />
  );
}

export function ErrorState({ 
  message,
  onRetry,
}: { 
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      type="error"
      title="Something went wrong"
      description={message || 'We encountered an error loading this content. Please try again.'}
      action={onRetry ? {
        label: 'Try Again',
        onClick: onRetry,
      } : undefined}
    />
  );
}
