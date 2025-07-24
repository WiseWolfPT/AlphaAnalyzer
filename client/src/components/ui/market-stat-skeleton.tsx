import { Skeleton } from "./skeleton";

export function MarketStatSkeleton() {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <div className="flex items-baseline justify-between">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}