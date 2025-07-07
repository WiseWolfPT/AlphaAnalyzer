import { useEffect, useRef, useState, useCallback } from 'react';

interface TouchGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPullToRefresh?: () => Promise<void>;
  swipeThreshold?: number;
  pullThreshold?: number;
}

export const useTouchGestures = (options: TouchGestureOptions = {}) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPullToRefresh,
    swipeThreshold = 50,
    pullThreshold = 80,
  } = options;

  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    
    // Check if we're at the top of the page for pull-to-refresh
    if (window.scrollY === 0 && onPullToRefresh) {
      setIsPulling(true);
    }
  }, [onPullToRefresh]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const currentY = touch.clientY;
    const startY = touchStartRef.current.y;
    const diff = currentY - startY;

    // Handle pull-to-refresh
    if (isPulling && diff > 0 && onPullToRefresh) {
      e.preventDefault(); // Prevent scrolling
      setPullDistance(Math.min(diff, pullThreshold * 1.5));
    }
  }, [isPulling, onPullToRefresh, pullThreshold]);

  const handleTouchEnd = useCallback(async (e: TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    touchEndRef.current = { x: touch.clientX, y: touch.clientY };

    const deltaX = touchEndRef.current.x - touchStartRef.current.x;
    const deltaY = touchEndRef.current.y - touchStartRef.current.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Handle pull-to-refresh release
    if (isPulling && pullDistance >= pullThreshold && onPullToRefresh) {
      setIsRefreshing(true);
      try {
        await onPullToRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    // Reset pull-to-refresh
    setIsPulling(false);
    setPullDistance(0);

    // Determine swipe direction
    if (absDeltaX > swipeThreshold || absDeltaY > swipeThreshold) {
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }
    }

    // Reset
    touchStartRef.current = null;
    touchEndRef.current = null;
  }, [
    isPulling,
    pullDistance,
    pullThreshold,
    swipeThreshold,
    onPullToRefresh,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
  ]);

  useEffect(() => {
    const element = containerRef.current || document;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    isPulling,
    pullDistance,
    isRefreshing,
  };
};

// Hook específico para pull-to-refresh
export const usePullToRefresh = (onRefresh: () => Promise<void>) => {
  const { isPulling, pullDistance, isRefreshing, containerRef } = useTouchGestures({
    onPullToRefresh: onRefresh,
  });

  return {
    containerRef,
    isPulling,
    pullDistance,
    isRefreshing,
  };
};