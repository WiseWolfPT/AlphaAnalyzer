import { cn } from "@/lib/utils"

function Skeleton({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "shimmer" | "pulse" | "enhanced"
}) {
  const variantClasses = {
    default: "animate-pulse bg-muted",
    shimmer: "loading-shimmer bg-muted",
    pulse: "loading-pulse bg-muted",
    enhanced: "skeleton-enhanced bg-muted"
  };

  return (
    <div
      className={cn(
        "rounded-md",
        variantClasses[variant],
        className
      )}
      role="status"
      aria-label="Loading..."
      {...props}
    />
  )
}

// Enhanced skeleton with better visual feedback
function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-3 p-4 border rounded-lg", className)} {...props}>
      <div className="space-y-2">
        <Skeleton variant="enhanced" className="h-4 w-[250px]" />
        <Skeleton variant="enhanced" className="h-4 w-[200px]" />
      </div>
      <Skeleton variant="enhanced" className="h-[200px] w-full" />
      <div className="space-y-2">
        <Skeleton variant="enhanced" className="h-4 w-[180px]" />
        <Skeleton variant="enhanced" className="h-4 w-[160px]" />
      </div>
    </div>
  );
}

// Stock card specific skeleton
function SkeletonStockCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-4 p-6 border rounded-xl bg-card", className)} {...props}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton variant="enhanced" className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton variant="enhanced" className="h-4 w-16" />
            <Skeleton variant="enhanced" className="h-3 w-24" />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Skeleton variant="enhanced" className="h-4 w-4" />
          <Skeleton variant="enhanced" className="h-4 w-12" />
        </div>
      </div>
      
      <div className="space-y-2">
        <Skeleton variant="enhanced" className="h-6 w-20" />
        <Skeleton variant="enhanced" className="h-4 w-16" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-muted/50 rounded-lg p-2 space-y-1">
          <Skeleton variant="enhanced" className="h-3 w-16" />
          <Skeleton variant="enhanced" className="h-4 w-12" />
        </div>
        <div className="bg-muted/50 rounded-lg p-2 space-y-1">
          <Skeleton variant="enhanced" className="h-3 w-12" />
          <Skeleton variant="enhanced" className="h-4 w-16" />
        </div>
      </div>

      <div className="flex gap-2">
        <Skeleton variant="enhanced" className="h-9 flex-1" />
        <Skeleton variant="enhanced" className="h-9 flex-1" />
      </div>
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonStockCard }
