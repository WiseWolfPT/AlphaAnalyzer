// Reusable component templates based on successful patterns
// These templates provide consistent structure and behavior for common financial components

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  AlertTriangle, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  Info,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFinancialData, useAutoRefresh } from '@/hooks/financial-hooks-templates';
import type {
  StockData,
  FinancialError,
  CardComponentProps,
  LoadingStateProps
} from '@/types/financial-interfaces';

// ============================================================================
// LOADING STATE COMPONENTS
// ============================================================================

export function LoadingState({ 
  message = "Loading...", 
  size = 'md',
  variant = 'spinner',
  className
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  if (variant === 'spinner') {
    return (
      <div className={cn("flex items-center justify-center min-h-[200px]", className)}>
        <div className="text-center">
          <Activity className={`${sizeClasses[size]} animate-spin mx-auto mb-4 text-primary`} />
          <p className="text-muted-foreground">{message}</p>
        </div>
      </div>
    );
  }

  if (variant === 'skeleton') {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={cn("animate-pulse bg-gray-200 rounded-lg min-h-[200px]", className)}>
        <div className="sr-only">{message}</div>
      </div>
    );
  }

  return null;
}

export function InlineLoader({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin" />
      {message && <span>{message}</span>}
    </div>
  );
}

// ============================================================================
// ERROR DISPLAY COMPONENTS
// ============================================================================

interface ErrorDisplayProps {
  error: FinancialError;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  variant?: 'card' | 'alert' | 'inline';
}

export function ErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss, 
  showDetails = false,
  variant = 'alert'
}: ErrorDisplayProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-yellow-600 border-yellow-200';
      case 'medium': return 'text-orange-600 border-orange-200';
      case 'high': return 'text-red-600 border-red-200';
      case 'critical': return 'text-red-800 border-red-300';
      default: return 'text-gray-600 border-gray-200';
    }
  };

  if (variant === 'card') {
    return (
      <Card className={cn("border-2", getSeverityColor(error.severity))}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Something went wrong
          </CardTitle>
          <CardDescription>{error.userMessage}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showDetails && (
            <Alert>
              <AlertTitle>Error Details</AlertTitle>
              <AlertDescription>
                <div className="space-y-1 text-sm">
                  <p><strong>Category:</strong> {error.category}</p>
                  <p><strong>ID:</strong> <code>{error.id}</code></p>
                  <p><strong>Time:</strong> {error.timestamp.toLocaleString()}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}
          <div className="flex gap-2">
            {onRetry && error.retryable && (
              <Button onClick={onRetry} size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
            {onDismiss && (
              <Button onClick={onDismiss} variant="outline" size="sm">
                Dismiss
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <AlertTriangle className="w-4 h-4" />
        <span>{error.userMessage}</span>
        {onRetry && error.retryable && (
          <Button onClick={onRetry} size="sm" variant="ghost" className="h-6 px-2">
            <RefreshCw className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{error.userMessage}</span>
        {onRetry && error.retryable && (
          <Button onClick={onRetry} size="sm" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

// ============================================================================
// FINANCIAL CARD COMPONENTS
// ============================================================================

interface FinancialCardProps extends CardComponentProps {
  value: string | number;
  change?: number;
  changePercent?: number;
  subtitle?: string;
  variant?: 'default' | 'metric' | 'stock';
}

export function FinancialCard({
  title,
  subtitle,
  icon: Icon,
  value,
  change,
  changePercent,
  loading,
  error,
  className,
  onClick,
  variant = 'default'
}: FinancialCardProps) {
  if (loading) {
    return (
      <Card className={cn("p-6", className)}>
        <LoadingState variant="skeleton" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("p-6 border-red-200", className)}>
        <ErrorDisplay error={error} variant="inline" />
      </Card>
    );
  }

  const isPositive = changePercent ? changePercent >= 0 : change ? change >= 0 : undefined;

  return (
    <Card 
      className={cn(
        "p-6 transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-lg hover:-translate-y-0.5",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-muted-foreground" />}
          <h3 className="font-medium text-sm text-muted-foreground">{title}</h3>
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold">{value}</div>
          {subtitle && (
            <div className="text-sm text-muted-foreground">{subtitle}</div>
          )}
        </div>
        
        {(change !== undefined || changePercent !== undefined) && (
          <div className="text-right">
            {changePercent !== undefined && (
              <div className={cn(
                "text-sm font-medium flex items-center gap-1",
                isPositive ? "text-green-600" : "text-red-600"
              )}>
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
              </div>
            )}
            {change !== undefined && (
              <div className={cn(
                "text-xs",
                isPositive ? "text-green-600" : "text-red-600"
              )}>
                {isPositive ? '+' : ''}${Math.abs(change).toFixed(2)}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// STOCK CARD COMPONENT TEMPLATE
// ============================================================================

interface StockCardProps {
  symbol: string;
  onPerformanceClick?: () => void;
  onQuickInfoClick?: () => void;
  showMiniChart?: boolean;
  className?: string;
}

export function StockCard({ 
  symbol, 
  onPerformanceClick, 
  onQuickInfoClick, 
  showMiniChart = true,
  className 
}: StockCardProps) {
  const [imageError, setImageError] = useState(false);
  
  // Use the financial data hook
  const { data: stock, loading, error } = useFinancialData<StockData>(
    ['stock', symbol],
    () => fetch(`/api/stocks/${symbol}`).then(res => res.json()),
    { enabled: !!symbol }
  );

  if (loading) {
    return (
      <Card className={cn("p-6", className)}>
        <LoadingState message="Loading stock data..." variant="skeleton" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("p-6", className)}>
        <ErrorDisplay error={error} />
      </Card>
    );
  }

  if (!stock) return null;

  const changePercent = parseFloat(stock.changePercent);
  const isPositive = changePercent >= 0;
  
  // Intrinsic value calculations
  const currentPrice = parseFloat(stock.price);
  const intrinsicValue = stock.intrinsicValue ? parseFloat(stock.intrinsicValue) : null;
  const valuationDiff = intrinsicValue ? ((currentPrice - intrinsicValue) / intrinsicValue) * 100 : null;
  const isUndervalued = valuationDiff ? valuationDiff < 0 : false;

  return (
    <Card className={cn(
      "group relative p-6 cursor-pointer transition-all duration-300",
      "hover:shadow-lg hover:-translate-y-1 hover:border-primary/50",
      className
    )}>
      {/* Action Icons */}
      <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {onQuickInfoClick && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickInfoClick();
            }}
            title="Quick Company Overview"
          >
            <Info className="h-4 w-4" />
          </Button>
        )}
        {onPerformanceClick && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPerformanceClick();
            }}
            title="View Performance Analytics"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-start gap-4 mb-4">
        {/* Company Logo */}
        <div className="w-12 h-12 rounded-xl bg-secondary/50 flex-shrink-0 flex items-center justify-center overflow-hidden border border-border/30">
          {stock.logo && !imageError ? (
            <img
              src={stock.logo}
              alt={`${stock.name} logo`}
              className="w-full h-full object-cover rounded-xl"
              onError={() => setImageError(true)}
            />
          ) : (
            <span className="text-sm font-bold text-primary">
              {stock.symbol.charAt(0)}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-bold text-foreground text-lg">{stock.symbol}</div>
          <div className="text-sm text-muted-foreground truncate">{stock.name}</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-foreground">${stock.price}</span>
          <div className={cn(
            "px-2 py-1 rounded-lg text-sm font-semibold",
            isPositive 
              ? "bg-emerald-500/10 text-emerald-500" 
              : "bg-red-500/10 text-red-500"
          )}>
            {isPositive ? '+' : ''}{stock.changePercent}%
          </div>
        </div>

        {/* Intrinsic Value Section */}
        {intrinsicValue && (
          <div className="bg-secondary/20 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-primary/20" />
                <span className="text-xs text-muted-foreground">Intrinsic Value</span>
              </div>
              <span className="text-sm font-bold text-primary">${intrinsicValue.toFixed(2)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <Badge 
                variant={isUndervalued ? "default" : "secondary"}
                className={cn(
                  "text-xs flex items-center gap-1",
                  isUndervalued 
                    ? "bg-green-500/10 text-green-600" 
                    : "bg-red-500/10 text-red-600"
                )}
              >
                {isUndervalued ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {isUndervalued ? 'Undervalued' : 'Overvalued'}
              </Badge>
              <span className={cn(
                "text-xs font-medium",
                isUndervalued ? "text-green-600" : "text-red-600"
              )}>
                {isUndervalued ? '' : '+'}{valuationDiff?.toFixed(1)}%
              </span>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Market Cap</span>
          <span className="text-foreground font-medium">{stock.marketCap}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Change</span>
          <span className={cn(
            "font-medium",
            isPositive ? "text-emerald-500" : "text-red-500"
          )}>
            {isPositive ? '+' : ''}${stock.change}
          </span>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// METRICS DASHBOARD COMPONENT TEMPLATE
// ============================================================================

interface MetricsDashboardProps {
  timeRange?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

export function MetricsDashboard({ 
  timeRange = '1h',
  autoRefresh = true,
  refreshInterval = 30000,
  className 
}: MetricsDashboardProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);

  const timeRanges = [
    { label: '5 minutes', value: '5m' },
    { label: '1 hour', value: '1h' },
    { label: '24 hours', value: '24h' },
    { label: '7 days', value: '7d' }
  ];

  // This would integrate with your metrics system
  const { data: metrics, loading, error } = useFinancialData(
    ['metrics', selectedTimeRange],
    () => fetch(`/api/metrics?timeRange=${selectedTimeRange}`).then(res => res.json()),
    { 
      enabled: true,
      refetchInterval: autoRefresh ? refreshInterval : undefined
    }
  );

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <LoadingState message="Loading metrics dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("space-y-6", className)}>
        <ErrorDisplay error={error} />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Metrics Dashboard</h1>
          <p className="text-muted-foreground">Monitor system performance and API usage</p>
        </div>
        
        <div className="flex items-center gap-4">
          <select 
            value={selectedTimeRange} 
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            {timeRanges.map(range => (
              <option key={range.value} value={range.value}>{range.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FinancialCard
          title="Total API Calls"
          icon={Activity}
          value={metrics?.totalCalls || 0}
          subtitle={`${metrics?.successfulCalls || 0} successful`}
        />
        
        <FinancialCard
          title="Average Response Time"
          value={`${metrics?.avgResponseTime || 0}ms`}
          subtitle={`P95: ${metrics?.p95ResponseTime || 0}ms`}
        />
        
        <FinancialCard
          title="Cache Hit Rate"
          value={`${metrics?.cacheHitRate || 0}%`}
          changePercent={5.2} // Example improvement
          subtitle="Performance boost"
        />
        
        <FinancialCard
          title="Error Rate"
          value={`${metrics?.errorRate || 0}%`}
          changePercent={-2.1} // Example reduction
          subtitle="Reliability improved"
        />
      </div>
    </div>
  );
}

// ============================================================================
// AUTO-REFRESH WRAPPER COMPONENT
// ============================================================================

interface AutoRefreshWrapperProps {
  enabled: boolean;
  interval: number;
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  showStatus?: boolean;
}

export function AutoRefreshWrapper({ 
  enabled, 
  interval, 
  onRefresh, 
  children, 
  showStatus = true 
}: AutoRefreshWrapperProps) {
  const { isRefreshing, lastRefresh } = useAutoRefresh(onRefresh, {
    enabled,
    interval
  });

  return (
    <div className="relative">
      {children}
      
      {showStatus && (
        <div className="absolute top-2 right-2 flex items-center gap-2">
          {isRefreshing && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Refreshing...</span>
            </div>
          )}
          
          {lastRefresh && !isRefreshing && (
            <div className="text-xs text-muted-foreground">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default {
  LoadingState,
  InlineLoader,
  ErrorDisplay,
  FinancialCard,
  StockCard,
  MetricsDashboard,
  AutoRefreshWrapper
};