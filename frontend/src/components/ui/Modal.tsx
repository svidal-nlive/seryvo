import { X } from 'lucide-react';
import { useEffect, useRef, useCallback, type ReactNode, type KeyboardEvent } from 'react';
import { useFocusTrap } from '../../hooks/useKeyboardNavigation';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Custom aria-label for the modal */
  'aria-label'?: string;
  /** ID of element describing the modal */
  'aria-describedby'?: string;
  /** Prevent closing on escape key */
  preventEscapeClose?: boolean;
  /** Prevent closing when clicking backdrop */
  preventBackdropClose?: boolean;
  /** Initial focus element ref */
  initialFocusRef?: React.RefObject<HTMLElement>;
  /** Use full-screen bottom sheet on mobile */
  mobileFullScreen?: boolean;
}

// Desktop size classes - width constraints
const sizeClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  full: 'sm:max-w-4xl',
};

/**
 * Accessible modal component with focus trap, keyboard navigation, and ARIA attributes.
 * Responsive: Full-width bottom sheet on mobile, centered dialog on desktop.
 * Content scrolls while header with close button remains fixed.
 */
export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  preventEscapeClose = false,
  preventBackdropClose = false,
  initialFocusRef,
  mobileFullScreen = true,
}: ModalProps) {
  const { containerRef } = useFocusTrap<HTMLDivElement>(isOpen, initialFocusRef);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).substr(2, 9)}`);
  const descId = useRef(`modal-desc-${Math.random().toString(36).substr(2, 9)}`);

  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !preventEscapeClose) {
      e.stopPropagation();
      onClose();
    }
  }, [onClose, preventEscapeClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !preventBackdropClose) {
      onClose();
    }
  }, [onClose, preventBackdropClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      
      // Calculate scrollbar width to prevent layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Mobile: bottom sheet, full width. Desktop: centered, constrained width
  const modalPositionClasses = mobileFullScreen
    ? 'fixed inset-x-0 bottom-0 sm:inset-auto sm:relative max-h-[90vh] sm:max-h-[85vh]'
    : 'relative max-h-[90vh] sm:max-h-[85vh]';

  const modalShapeClasses = mobileFullScreen
    ? 'rounded-t-2xl sm:rounded-2xl'
    : 'rounded-2xl';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in overflow-hidden"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown as any}
      role="presentation"
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
        aria-labelledby={title ? titleId.current : undefined}
        aria-describedby={ariaDescribedBy || descId.current}
        className={`
          bg-white dark:bg-slate-900 w-full ${sizeClasses[size]} ${modalPositionClasses} ${modalShapeClasses}
          shadow-2xl flex flex-col focus:outline-none
          animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-2 duration-200
        `}
        tabIndex={-1}
      >
        {/* Fixed Header with Close Button - Always visible */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-10">
          {/* Mobile drag handle indicator */}
          {mobileFullScreen && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-300 dark:bg-slate-600 rounded-full sm:hidden" />
          )}
          
          <h2 
            id={titleId.current}
            className="text-base sm:text-lg font-semibold dark:text-white pr-2 truncate"
          >
            {title || <span className="sr-only">Modal</span>}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close modal"
            className="
              flex-shrink-0 p-2 min-w-[44px] min-h-[44px] 
              flex items-center justify-center 
              hover:bg-gray-100 dark:hover:bg-slate-800 
              active:bg-gray-200 dark:active:bg-slate-700
              rounded-lg transition-colors 
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
              touch-manipulation
            "
          >
            <X size={20} className="text-gray-500 dark:text-slate-400" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div 
          id={descId.current} 
          className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
