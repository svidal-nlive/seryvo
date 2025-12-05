import type { ReactNode } from 'react';
import type { BookingStatus } from '../../types';

const statusStyles: Record<BookingStatus, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  requested: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  driver_assigned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  driver_en_route_pickup: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  driver_arrived: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
  in_progress: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  canceled_by_client: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  canceled_by_driver: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  canceled_by_system: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  no_show_client: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300',
  no_show_driver: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300',
  disputed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  refunded: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300',
};

const humanLabels: Record<BookingStatus, string> = {
  draft: 'Draft',
  requested: 'Requested',
  driver_assigned: 'Driver Assigned',
  driver_en_route_pickup: 'En Route',
  driver_arrived: 'Arrived',
  in_progress: 'In Progress',
  completed: 'Completed',
  canceled_by_client: 'Canceled',
  canceled_by_driver: 'Canceled',
  canceled_by_system: 'Canceled',
  no_show_client: 'No-Show',
  no_show_driver: 'No-Show',
  disputed: 'Disputed',
  refunded: 'Refunded',
};

const variantStyles = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export interface BadgeProps {
  status?: BookingStatus;
  variant?: keyof typeof variantStyles;
  children?: ReactNode;
  className?: string;
}

export default function Badge({ status, variant, children, className = '' }: BadgeProps) {
  // Determine which style to use
  let styleClass: string;
  let content: ReactNode;

  if (status) {
    styleClass = statusStyles[status];
    content = humanLabels[status];
  } else if (variant) {
    styleClass = variantStyles[variant];
    content = children;
  } else {
    styleClass = variantStyles.neutral;
    content = children;
  }

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${styleClass} ${className}`}
    >
      {content}
    </span>
  );
}
