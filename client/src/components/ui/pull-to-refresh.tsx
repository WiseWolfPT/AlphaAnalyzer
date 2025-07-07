import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef } from 'react';

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export function PullToRefreshIndicator({
  isPulling,
  pullDistance,
  isRefreshing,
  threshold = 80,
}: PullToRefreshIndicatorProps) {
  if (!isPulling && !isRefreshing && pullDistance === 0) {
    return null;
  }

  const pullPercentage = Math.min((pullDistance / threshold) * 100, 100);
  const rotation = (pullDistance / threshold) * 360;

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 flex justify-center z-50 transition-all duration-300',
        isPulling || isRefreshing ? 'opacity-100' : 'opacity-0'
      )}
      style={{
        transform: `translateY(${isRefreshing ? 60 : pullDistance}px)`,
      }}
    >
      <div
        className={cn(
          'relative w-10 h-10 rounded-full bg-background shadow-lg border border-border flex items-center justify-center',
          isRefreshing && 'animate-bounce'
        )}
      >
        <RefreshCw
          className={cn(
            'w-5 h-5 text-primary transition-transform',
            isRefreshing && 'animate-spin'
          )}
          style={{
            transform: !isRefreshing ? `rotate(${rotation}deg)` : undefined,
          }}
        />
        {!isRefreshing && (
          <div
            className="absolute inset-0 rounded-full border-2 border-primary"
            style={{
              clipPath: `polygon(50% 50%, 50% 0%, ${
                50 + 50 * Math.sin((pullPercentage * Math.PI) / 50)
              }% ${50 - 50 * Math.cos((pullPercentage * Math.PI) / 50)}%)`,
              opacity: pullPercentage / 100,
            }}
          />
        )}
      </div>
    </div>
  );
}

interface PullToRefreshContainerProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
}

export function PullToRefreshContainer({
  children,
  onRefresh,
  className,
}: PullToRefreshContainerProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || touchStartY.current === null) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - touchStartY.current;

    if (distance > 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, 150));
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;

    if (pullDistance > 80) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    setIsPulling(false);
    setPullDistance(0);
    touchStartY.current = null;
  };

  return (
    <div
      className={cn('relative', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <PullToRefreshIndicator
        isPulling={isPulling}
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
      />
      <div
        style={{
          transform: isPulling ? `translateY(${pullDistance * 0.5}px)` : undefined,
          transition: isPulling ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}