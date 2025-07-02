import { Card, CardContent, CardHeader } from "./card";
import { Skeleton } from "./skeleton";

export function StockCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-6 w-32 mb-1" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-24 mb-4" />
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
        </div>
      </CardContent>
    </Card>
  );
}