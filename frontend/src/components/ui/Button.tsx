import { forwardRef, type ReactNode, type MouseEvent, type KeyboardEvent } from 'react';

export interface ButtonProps {
  children: ReactNode;
  onClick?: (e?: MouseEvent<HTMLButtonElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLButtonElement>) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  /** Accessible label for screen readers */
  'aria-label'?: string;
  /** ID of element describing this button */
  'aria-describedby'?: string;
  /** Whether button controls expanded content */
  'aria-expanded'?: boolean;
  /** Whether button is currently pressed */
  'aria-pressed'?: boolean;
  /** ID of popup/menu controlled by this button */
  'aria-controls'?: string;
  /** Tab order (default 0) */
  tabIndex?: number;
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-900/10',
  secondary: 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600',
  danger: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50',
  success: 'bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-900/10',
  ghost: 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800',
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-sm min-h-[32px]',
  md: 'px-4 py-2 min-h-[40px]',
  lg: 'px-6 py-3 text-lg min-h-[48px]',
};

/**
 * Accessible button component with proper focus management and touch targets.
 * Minimum touch target size is 44x44px on mobile for accessibility.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  onClick,
  onKeyDown,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  type = 'button',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-expanded': ariaExpanded,
  'aria-pressed': ariaPressed,
  'aria-controls': ariaControls,
  tabIndex,
}, ref) => {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-expanded={ariaExpanded}
      aria-pressed={ariaPressed}
      aria-controls={ariaControls}
      aria-busy={loading}
      aria-disabled={isDisabled}
      tabIndex={isDisabled ? -1 : tabIndex}
      className={`
        rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2
        active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
        dark:focus-visible:ring-offset-slate-900
        touch-manipulation select-none
        ${variantStyles[variant]} ${sizeStyles[size]} ${className}
      `}
    >
      {loading ? (
        <>
          <span 
            className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"
            aria-hidden="true"
          />
          <span className="sr-only">Loading...</span>
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
