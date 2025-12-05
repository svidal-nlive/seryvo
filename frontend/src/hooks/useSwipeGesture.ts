import { useCallback, useRef, useState, useEffect } from 'react';

interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  isSwiping: boolean;
  direction: 'left' | 'right' | 'up' | 'down' | null;
}

interface UseSwipeGestureOptions {
  /** Minimum distance to trigger a swipe */
  threshold?: number;
  /** Prevent vertical scroll during horizontal swipe */
  preventScroll?: boolean;
  /** Direction(s) to detect */
  directions?: ('left' | 'right' | 'up' | 'down')[];
  /** Callback when swipe starts */
  onSwipeStart?: (state: SwipeState) => void;
  /** Callback during swipe */
  onSwipeMove?: (state: SwipeState) => void;
  /** Callback when swipe ends */
  onSwipeEnd?: (state: SwipeState) => void;
  /** Callback for left swipe */
  onSwipeLeft?: () => void;
  /** Callback for right swipe */
  onSwipeRight?: () => void;
  /** Callback for up swipe */
  onSwipeUp?: () => void;
  /** Callback for down swipe */
  onSwipeDown?: () => void;
  /** Enable/disable swipe detection */
  enabled?: boolean;
}

const initialState: SwipeState = {
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  deltaX: 0,
  deltaY: 0,
  isSwiping: false,
  direction: null,
};

/**
 * Hook for detecting swipe gestures on touch devices.
 */
export function useSwipeGesture<T extends HTMLElement = HTMLElement>({
  threshold = 50,
  preventScroll = true,
  directions = ['left', 'right'],
  onSwipeStart,
  onSwipeMove,
  onSwipeEnd,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  enabled = true,
}: UseSwipeGestureOptions = {}) {
  const ref = useRef<T>(null);
  const [state, setState] = useState<SwipeState>(initialState);
  const stateRef = useRef<SwipeState>(initialState);

  const getDirection = useCallback((deltaX: number, deltaY: number): SwipeState['direction'] => {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX < threshold && absY < threshold) return null;

    if (absX > absY) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }, [threshold]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;

    const touch = e.touches[0];
    const newState: SwipeState = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX: 0,
      deltaY: 0,
      isSwiping: true,
      direction: null,
    };

    stateRef.current = newState;
    setState(newState);
    onSwipeStart?.(newState);
  }, [enabled, onSwipeStart]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !stateRef.current.isSwiping) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - stateRef.current.startX;
    const deltaY = touch.clientY - stateRef.current.startY;
    const direction = getDirection(deltaX, deltaY);

    // Prevent scroll if swiping horizontally
    if (preventScroll && direction && ['left', 'right'].includes(direction)) {
      e.preventDefault();
    }

    const newState: SwipeState = {
      ...stateRef.current,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX,
      deltaY,
      direction,
    };

    stateRef.current = newState;
    setState(newState);
    onSwipeMove?.(newState);
  }, [enabled, preventScroll, getDirection, onSwipeMove]);

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !stateRef.current.isSwiping) return;

    const { direction, deltaX, deltaY } = stateRef.current;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Check if swipe meets threshold
    if (direction && (absX >= threshold || absY >= threshold)) {
      if (directions.includes(direction)) {
        switch (direction) {
          case 'left':
            onSwipeLeft?.();
            break;
          case 'right':
            onSwipeRight?.();
            break;
          case 'up':
            onSwipeUp?.();
            break;
          case 'down':
            onSwipeDown?.();
            break;
        }
      }
    }

    onSwipeEnd?.(stateRef.current);

    const newState = { ...initialState };
    stateRef.current = newState;
    setState(newState);
  }, [enabled, threshold, directions, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onSwipeEnd]);

  // Attach event listeners
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    ref,
    ...state,
  };
}

/**
 * Hook for swipeable list items (e.g., swipe to delete/archive).
 */
export function useSwipeableItem<T extends HTMLElement = HTMLElement>({
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  threshold = 80,
  enabled = true,
}: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: { color: string; icon: React.ReactNode; label: string };
  rightAction?: { color: string; icon: React.ReactNode; label: string };
  threshold?: number;
  enabled?: boolean;
}) {
  const [offset, setOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const { ref, deltaX, isSwiping, direction } = useSwipeGesture<T>({
    threshold,
    enabled,
    directions: ['left', 'right'],
    onSwipeMove: (state) => {
      // Limit offset with resistance
      const maxOffset = 120;
      const resistance = 0.5;
      let newOffset = state.deltaX;
      
      if (Math.abs(newOffset) > maxOffset) {
        const excess = Math.abs(newOffset) - maxOffset;
        newOffset = (newOffset > 0 ? 1 : -1) * (maxOffset + excess * resistance);
      }
      
      setOffset(newOffset);
    },
    onSwipeEnd: (state) => {
      const absX = Math.abs(state.deltaX);
      
      if (absX >= threshold) {
        // Trigger action
        if (state.deltaX < 0 && onSwipeLeft) {
          setIsAnimating(true);
          setOffset(-200);
          setTimeout(() => {
            onSwipeLeft();
            setOffset(0);
            setIsAnimating(false);
          }, 200);
        } else if (state.deltaX > 0 && onSwipeRight) {
          setIsAnimating(true);
          setOffset(200);
          setTimeout(() => {
            onSwipeRight();
            setOffset(0);
            setIsAnimating(false);
          }, 200);
        } else {
          setOffset(0);
        }
      } else {
        setOffset(0);
      }
    },
    onSwipeLeft,
    onSwipeRight,
  });

  const style: React.CSSProperties = {
    transform: `translateX(${offset}px)`,
    transition: isAnimating || !isSwiping ? 'transform 0.2s ease-out' : 'none',
  };

  return {
    ref,
    style,
    offset,
    isSwiping,
    direction,
    leftAction,
    rightAction,
  };
}

/**
 * Hook for pull-to-refresh functionality.
 */
export function usePullToRefresh<T extends HTMLElement = HTMLElement>({
  onRefresh,
  threshold = 80,
  enabled = true,
}: {
  onRefresh: () => Promise<void>;
  threshold?: number;
  enabled?: boolean;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const { ref, deltaY, isSwiping } = useSwipeGesture<T>({
    threshold,
    enabled: enabled && !isRefreshing,
    directions: ['down'],
    preventScroll: false,
    onSwipeMove: (state) => {
      // Only allow pull when at top of scroll container
      const element = ref.current;
      if (element && element.scrollTop === 0 && state.deltaY > 0) {
        const resistance = 0.5;
        setPullDistance(state.deltaY * resistance);
      }
    },
    onSwipeEnd: async (state) => {
      if (state.deltaY >= threshold && ref.current?.scrollTop === 0) {
        setIsRefreshing(true);
        setPullDistance(threshold);
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    },
  });

  const indicatorStyle: React.CSSProperties = {
    transform: `translateY(${Math.min(pullDistance, threshold)}px)`,
    opacity: Math.min(pullDistance / threshold, 1),
    transition: isSwiping ? 'none' : 'transform 0.2s, opacity 0.2s',
  };

  return {
    ref,
    isRefreshing,
    pullDistance,
    indicatorStyle,
    progress: Math.min(pullDistance / threshold, 1),
  };
}
