import { useCallback, useEffect, useRef, useState } from 'react';

interface UseKeyboardNavigationOptions {
  /** Enable/disable keyboard navigation */
  enabled?: boolean;
  /** Selector for navigable items */
  itemSelector?: string;
  /** Enable wrap-around navigation */
  loop?: boolean;
  /** Orientation for arrow key handling */
  orientation?: 'horizontal' | 'vertical' | 'both';
  /** Callback when an item is selected (Enter/Space) */
  onSelect?: (element: HTMLElement, index: number) => void;
  /** Callback when focus changes */
  onFocusChange?: (element: HTMLElement, index: number) => void;
  /** Enable roving tabindex pattern */
  rovingTabIndex?: boolean;
  /** Auto-focus first item on mount */
  autoFocus?: boolean;
}

/**
 * Hook for keyboard navigation within a container.
 * Supports arrow key navigation, enter/space selection, and roving tabindex.
 */
export function useKeyboardNavigation<T extends HTMLElement = HTMLElement>({
  enabled = true,
  itemSelector = '[data-focusable="true"]',
  loop = true,
  orientation = 'vertical',
  onSelect,
  onFocusChange,
  rovingTabIndex = true,
  autoFocus = false,
}: UseKeyboardNavigationOptions = {}) {
  const containerRef = useRef<T>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const getItems = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    return Array.from(containerRef.current.querySelectorAll(itemSelector));
  }, [itemSelector]);

  const focusItem = useCallback((index: number) => {
    const items = getItems();
    if (items.length === 0) return;

    // Handle bounds
    let newIndex = index;
    if (loop) {
      newIndex = ((index % items.length) + items.length) % items.length;
    } else {
      newIndex = Math.max(0, Math.min(index, items.length - 1));
    }

    const element = items[newIndex];
    if (element) {
      // Update tabindex for roving tabindex pattern
      if (rovingTabIndex) {
        items.forEach((item, i) => {
          item.setAttribute('tabindex', i === newIndex ? '0' : '-1');
        });
      }

      element.focus();
      setFocusedIndex(newIndex);
      onFocusChange?.(element, newIndex);
    }
  }, [getItems, loop, rovingTabIndex, onFocusChange]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled || !containerRef.current) return;

    const items = getItems();
    if (items.length === 0) return;

    // Check if focus is within container
    if (!containerRef.current.contains(document.activeElement)) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    
    switch (event.key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          focusItem(currentIndex + 1);
        }
        break;
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          focusItem(currentIndex - 1);
        }
        break;
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          focusItem(currentIndex + 1);
        }
        break;
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          focusItem(currentIndex - 1);
        }
        break;
      case 'Home':
        event.preventDefault();
        focusItem(0);
        break;
      case 'End':
        event.preventDefault();
        focusItem(items.length - 1);
        break;
      case 'Enter':
      case ' ':
        if (document.activeElement && items.includes(document.activeElement as HTMLElement)) {
          event.preventDefault();
          onSelect?.(document.activeElement as HTMLElement, currentIndex);
        }
        break;
    }
  }, [enabled, getItems, focusItem, orientation, onSelect]);

  // Set up event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  // Initialize tabindex on mount
  useEffect(() => {
    if (!rovingTabIndex) return;

    const items = getItems();
    items.forEach((item, i) => {
      item.setAttribute('tabindex', i === 0 ? '0' : '-1');
    });

    if (autoFocus && items.length > 0) {
      items[0].focus();
      setFocusedIndex(0);
    }
  }, [getItems, rovingTabIndex, autoFocus]);

  return {
    containerRef,
    focusedIndex,
    focusItem,
    getItems,
  };
}

/**
 * Hook for managing focus within a focus trap (e.g., modals).
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  isActive: boolean = true,
  initialFocusRef?: React.RefObject<HTMLElement>
) {
  const containerRef = useRef<T>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Get all focusable elements
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    
    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(containerRef.current.querySelectorAll(selector));
  }, []);

  // Handle tab key for focus trapping
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isActive || event.key !== 'Tab') return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) return;

    const firstElement = focusable[0];
    const lastElement = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }, [isActive, getFocusableElements]);

  // Store previous focus and set initial focus
  useEffect(() => {
    if (!isActive) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus initial element or first focusable
    requestAnimationFrame(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else {
        const focusable = getFocusableElements();
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    });

    // Restore focus on cleanup
    return () => {
      previousFocusRef.current?.focus();
    };
  }, [isActive, getFocusableElements, initialFocusRef]);

  // Set up event listener
  useEffect(() => {
    if (!isActive) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, handleKeyDown]);

  return { containerRef, getFocusableElements };
}

/**
 * Hook to detect keyboard vs mouse navigation for focus styles.
 */
export function useKeyboardMode() {
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsKeyboardMode(true);
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardMode(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return isKeyboardMode;
}

/**
 * Hook for skip link functionality.
 */
export function useSkipLink(targetId: string) {
  const handleSkip = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const target = document.getElementById(targetId);
      if (target) {
        target.focus();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [targetId]);

  return { handleSkip };
}
