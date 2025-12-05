import { 
  createContext, 
  useContext, 
  useCallback, 
  useRef, 
  type ReactNode,
  type ElementType,
  useState,
  useEffect,
} from 'react';

interface Announcement {
  id: string;
  message: string;
  priority: 'polite' | 'assertive';
  timestamp: number;
}

interface ScreenReaderContextValue {
  /** Announce a message to screen readers */
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  /** Clear all announcements */
  clearAnnouncements: () => void;
  /** Current announcements (for debugging) */
  announcements: Announcement[];
}

const ScreenReaderContext = createContext<ScreenReaderContextValue | null>(null);

/**
 * Provider for screen reader announcements using ARIA live regions.
 * Wrap your app with this provider to enable dynamic announcements.
 */
export function ScreenReaderProvider({ children }: { children: ReactNode }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const announcement: Announcement = {
      id,
      message,
      priority,
      timestamp: Date.now(),
    };

    setAnnouncements(prev => [...prev, announcement]);

    // Update the appropriate live region
    const ref = priority === 'assertive' ? assertiveRef : politeRef;
    if (ref.current) {
      // Clear and set to trigger announcement
      ref.current.textContent = '';
      // Use setTimeout to ensure the DOM update triggers the announcement
      requestAnimationFrame(() => {
        if (ref.current) {
          ref.current.textContent = message;
        }
      });
    }

    // Auto-clear old announcements
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => Date.now() - a.timestamp < 5000));
    }, 5000);
  }, []);

  const clearAnnouncements = useCallback(() => {
    setAnnouncements([]);
    if (politeRef.current) politeRef.current.textContent = '';
    if (assertiveRef.current) assertiveRef.current.textContent = '';
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <ScreenReaderContext.Provider value={{ announce, clearAnnouncements, announcements }}>
      {children}
      
      {/* Visually hidden live regions */}
      <div
        ref={politeRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <div
        ref={assertiveRef}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </ScreenReaderContext.Provider>
  );
}

/**
 * Hook to access screen reader announcements.
 */
export function useScreenReader(): ScreenReaderContextValue {
  const context = useContext(ScreenReaderContext);
  if (!context) {
    // Return a no-op implementation if used outside provider
    return {
      announce: () => {},
      clearAnnouncements: () => {},
      announcements: [],
    };
  }
  return context;
}

/**
 * Hook for announcing page/view changes.
 */
export function usePageAnnouncement(title: string, description?: string) {
  const { announce } = useScreenReader();
  
  useEffect(() => {
    const message = description ? `${title}. ${description}` : title;
    announce(message, 'polite');
  }, [title, description, announce]);
}

/**
 * Hook for announcing loading state changes.
 */
export function useLoadingAnnouncement(isLoading: boolean, loadingMessage = 'Loading', loadedMessage = 'Content loaded') {
  const { announce } = useScreenReader();
  const wasLoadingRef = useRef(isLoading);
  
  useEffect(() => {
    if (isLoading && !wasLoadingRef.current) {
      announce(loadingMessage, 'polite');
    } else if (!isLoading && wasLoadingRef.current) {
      announce(loadedMessage, 'polite');
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, loadingMessage, loadedMessage, announce]);
}

/**
 * Hook for announcing list/data updates.
 */
export function useDataAnnouncement<T>(
  data: T[],
  options: {
    itemName?: string;
    announceOnMount?: boolean;
    formatMessage?: (count: number) => string;
  } = {}
) {
  const { announce } = useScreenReader();
  const {
    itemName = 'item',
    announceOnMount = false,
    formatMessage,
  } = options;
  const prevLengthRef = useRef(data.length);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      if (!announceOnMount) return;
    }

    const count = data.length;
    const prevCount = prevLengthRef.current;

    if (count !== prevCount || (announceOnMount && mountedRef.current)) {
      const message = formatMessage
        ? formatMessage(count)
        : `${count} ${itemName}${count !== 1 ? 's' : ''} found`;
      announce(message, 'polite');
    }

    prevLengthRef.current = count;
  }, [data.length, itemName, formatMessage, announceOnMount, announce]);
}

/**
 * Hook for announcing form errors.
 */
export function useErrorAnnouncement(errors: string[]) {
  const { announce } = useScreenReader();

  useEffect(() => {
    if (errors.length > 0) {
      const message = errors.length === 1
        ? `Error: ${errors[0]}`
        : `${errors.length} errors: ${errors.join('. ')}`;
      announce(message, 'assertive');
    }
  }, [errors, announce]);
}

/**
 * Hook for announcing success messages.
 */
export function useSuccessAnnouncement() {
  const { announce } = useScreenReader();

  const announceSuccess = useCallback((message: string) => {
    announce(message, 'polite');
  }, [announce]);

  return announceSuccess;
}

/**
 * Component for visually hidden text (screen reader only).
 */
export function VisuallyHidden({ children, as: Component = 'span' }: { 
  children: ReactNode; 
  as?: ElementType;
}) {
  return (
    <Component className="sr-only">
      {children}
    </Component>
  );
}

/**
 * Skip to main content link component.
 */
export function SkipToContent({ 
  targetId = 'main-content',
  children = 'Skip to main content',
}: { 
  targetId?: string;
  children?: ReactNode;
}) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none"
    >
      {children}
    </a>
  );
}
