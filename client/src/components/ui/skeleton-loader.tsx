import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'shimmer' | 'none';
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  animation = 'shimmer',
}: SkeletonProps) {
  const baseClasses = 'bg-muted/50 rounded-md';
  
  const animationClasses = {
    pulse: 'animate-pulse',
    shimmer: 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
    none: '',
  };

  const variantClasses = {
    text: 'h-4 w-full',
    circular: 'rounded-full aspect-square',
    rectangular: 'rounded-md',
    card: 'rounded-lg p-4',
  };

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={cn(
        baseClasses,
        animationClasses[animation],
        variantClasses[variant],
        className
      )}
      style={style}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('glass-card p-6 space-y-4', className)}>
      <div className="flex items-center justify-between">
        <Skeleton variant="text" width="60%" height={24} />
        <Skeleton variant="circular" width={40} height={40} />
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="90%" />
      </div>
      <div className="flex gap-2">
        <Skeleton variant="rectangular" width={80} height={32} />
        <Skeleton variant="rectangular" width={80} height={32} />
      </div>
    </div>
  );
}

export function SkeletonStockCard() {
  return (
    <div className="glass-card p-4 space-y-3 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" width={60} height={20} animation="shimmer" />
          <Skeleton variant="text" width={120} height={16} animation="shimmer" />
        </div>
        <Skeleton variant="circular" width={40} height={40} animation="pulse" />
      </div>
      <div className="flex items-end justify-between">
        <div>
          <Skeleton variant="text" width={80} height={28} animation="shimmer" />
        </div>
        <div className="text-right">
          <Skeleton variant="rectangular" width={60} height={24} animation="shimmer" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 pb-3 border-b border-border">
        <Skeleton variant="text" width="20%" height={20} />
        <Skeleton variant="text" width="30%" height={20} />
        <Skeleton variant="text" width="20%" height={20} />
        <Skeleton variant="text" width="15%" height={20} />
        <Skeleton variant="text" width="15%" height={20} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2">
          <Skeleton variant="text" width="20%" height={16} />
          <Skeleton variant="text" width="30%" height={16} />
          <Skeleton variant="text" width="20%" height={16} />
          <Skeleton variant="text" width="15%" height={16} />
          <Skeleton variant="text" width="15%" height={16} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="glass-card p-6">
      <div className="space-y-4">
        <Skeleton variant="text" width="40%" height={24} />
        <div className="relative h-64">
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-muted/30 rounded-t animate-pulse"
                style={{
                  height: `${Math.random() * 100 + 20}%`,
                  animationDelay: `${i * 100}ms`,
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-between">
          <Skeleton variant="text" width={60} height={12} />
          <Skeleton variant="text" width={60} height={12} />
        </div>
      </div>
    </div>
  );
}