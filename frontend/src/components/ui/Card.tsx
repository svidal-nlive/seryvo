import { forwardRef, type ReactNode, type KeyboardEvent } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  noPadding?: boolean;
  /** Make card focusable for keyboard navigation */
  focusable?: boolean;
  /** ARIA role override */
  role?: string;
  /** Accessible label */
  'aria-label'?: string;
  /** Whether this card is selected */
  'aria-selected'?: boolean;
  /** Tab index for keyboard navigation */
  tabIndex?: number;
  /** Data attribute for keyboard navigation hook */
  'data-focusable'?: string;
}

/**
 * Accessible card component with keyboard support and proper touch targets.
 */
const Card = forwardRef<HTMLDivElement, CardProps>(({
  children, 
  className = '', 
  onClick, 
  noPadding = false,
  focusable,
  role,
  'aria-label': ariaLabel,
  'aria-selected': ariaSelected,
  tabIndex,
  'data-focusable': dataFocusable,
}, ref) => {
  const isInteractive = !!onClick;
  const isFocusable = focusable ?? isInteractive;
  const paddingClass = noPadding ? '' : 'p-4 sm:p-6';

  const handleKeyDown = (e: KeyboardEvent) => {
    if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick?.();
    }
  };

  // Common classes
  const baseClasses = `
    bg-white dark:bg-slate-800 rounded-xl shadow-sm 
    border border-gray-100 dark:border-slate-700 
    ${paddingClass} text-left w-full ${className}
  `;

  // Interactive-specific classes
  const interactiveClasses = isInteractive ? `
    cursor-pointer
    hover:shadow-md hover:border-gray-200 dark:hover:border-slate-600
    active:scale-[0.99] transition-all duration-150
    focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
    dark:focus-visible:ring-offset-slate-900
    touch-manipulation
  ` : '';

  const props = {
    ref,
    className: `${baseClasses} ${interactiveClasses}`.trim(),
    onClick: isInteractive ? onClick : undefined,
    onKeyDown: isInteractive ? handleKeyDown : undefined,
    role: role || (isInteractive ? 'button' : undefined),
    'aria-label': ariaLabel,
    'aria-selected': ariaSelected,
    tabIndex: isFocusable ? (tabIndex ?? 0) : undefined,
    'data-focusable': dataFocusable || (isFocusable ? 'true' : undefined),
  };

  return <div {...props}>{children}</div>;
});

Card.displayName = 'Card';

export default Card;
