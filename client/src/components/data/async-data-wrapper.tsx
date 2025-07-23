import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';

interface AsyncDataWrapperProps<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  retry?: () => void;
  children: (data: T) => React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  showRetryButton?: boolean;
  skeletonCount?: number;
  skeletonHeight?: number;
  className?: string;
}

export function AsyncDataWrapper<T>({
  data,
  loading,
  error,
  retry,
  children,
  loadingComponent,
  errorComponent,
  emptyComponent,
  showRetryButton = true,
  skeletonCount = 3,
  skeletonHeight = 100,
  className = '',
}: AsyncDataWrapperProps<T>) {
  // Loading state
  if (loading && !data) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className={`w-full`} style={{ height: skeletonHeight }} />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    if (errorComponent) {
      return <>{errorComponent}</>;
    }

    const isNetworkError = error.message.toLowerCase().includes('network') || 
                          error.message.toLowerCase().includes('fetch');

    return (
      <div className={className}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              {isNetworkError && <WifiOff className="h-4 w-4" />}
              <span>
                {isNetworkError 
                  ? 'Unable to connect to the server. Please check your connection.'
                  : error.message || 'An error occurred while loading data.'}
              </span>
            </div>
            {showRetryButton && retry && (
              <Button
                variant="outline"
                size="sm"
                onClick={retry}
                className="w-fit"
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Try Again
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Empty state
  if (!data || (Array.isArray(data) && data.length === 0)) {
    if (emptyComponent) {
      return <>{emptyComponent}</>;
    }

    return (
      <div className={className}>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No data available</p>
            {showRetryButton && retry && (
              <Button
                variant="outline"
                size="sm"
                onClick={retry}
                className="mt-4"
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Refresh
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state - render children with data
  return <div className={className}>{children(data)}</div>;
}

// Specialized wrapper for list data
interface AsyncListWrapperProps<T> extends Omit<AsyncDataWrapperProps<T[]>, 'children'> {
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string;
  ListHeaderComponent?: React.ReactNode;
  ListFooterComponent?: React.ReactNode;
  ItemSeparatorComponent?: React.ReactNode;
}

export function AsyncListWrapper<T>({
  data,
  loading,
  error,
  retry,
  renderItem,
  keyExtractor,
  ListHeaderComponent,
  ListFooterComponent,
  ItemSeparatorComponent,
  ...props
}: AsyncListWrapperProps<T>) {
  return (
    <AsyncDataWrapper
      data={data}
      loading={loading}
      error={error}
      retry={retry}
      {...props}
    >
      {(items) => (
        <>
          {ListHeaderComponent}
          {items.map((item, index) => (
            <React.Fragment key={keyExtractor ? keyExtractor(item, index) : index}>
              {renderItem(item, index)}
              {index < items.length - 1 && ItemSeparatorComponent}
            </React.Fragment>
          ))}
          {ListFooterComponent}
        </>
      )}
    </AsyncDataWrapper>
  );
}

// Loading skeleton specifically for stock cards
export function StockCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <Skeleton className="h-6 w-16 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Error state specifically for stock data
export function StockDataError({ 
  error, 
  retry 
}: { 
  error: Error; 
  retry?: () => void;
}) {
  const isQuotaError = error.message.toLowerCase().includes('quota') || 
                      error.message.toLowerCase().includes('limit');
  
  return (
    <Card className="border-destructive">
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 text-destructive">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold">
              {isQuotaError ? 'API Limit Reached' : 'Failed to Load Stock Data'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isQuotaError 
                ? 'We\'ve temporarily hit our data limit. Data will refresh automatically in a few minutes.'
                : 'Unable to fetch the latest stock prices. Please try again.'}
            </p>
          </div>
        </div>
        {retry && !isQuotaError && (
          <Button
            variant="outline"
            size="sm"
            onClick={retry}
            className="mt-4 w-full"
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}