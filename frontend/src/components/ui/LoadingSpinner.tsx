interface LoadingSpinnerProps {
  size?: number;
  /** Accessible label for screen readers */
  label?: string;
  /** Show as inline element */
  inline?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Accessible loading spinner with screen reader support.
 */
export default function LoadingSpinner({ 
  size = 24,
  label = 'Loading',
  inline = false,
  className = '',
}: LoadingSpinnerProps) {
  const Wrapper = inline ? 'span' : 'div';
  
  return (
    <Wrapper 
      className={`${inline ? 'inline-flex' : 'flex'} items-center justify-center gap-2 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span
        className="animate-spin rounded-full border-2 border-current border-t-transparent text-blue-600"
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </Wrapper>
  );
}

/**
 * Full-page loading overlay.
 */
export function LoadingOverlay({ 
  message = 'Loading...',
  transparent = false,
}: { 
  message?: string;
  transparent?: boolean;
}) {
  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${
        transparent ? 'bg-white/80 dark:bg-slate-900/80' : 'bg-white dark:bg-slate-900'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={message}
    >
      <LoadingSpinner size={48} label={message} />
      <p className="mt-4 text-gray-600 dark:text-slate-400">{message}</p>
    </div>
  );
}

/**
 * Inline loading indicator for buttons or small areas.
 */
export function LoadingDots({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} role="status" aria-label="Loading">
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      <span className="sr-only">Loading</span>
    </span>
  );
}
