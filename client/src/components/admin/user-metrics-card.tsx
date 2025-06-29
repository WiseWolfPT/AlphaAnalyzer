import * as React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Activity, 
  TrendingUp, 
  Eye, 
  Search,
  CreditCard,
  RefreshCw,
  Calendar,
  BarChart3,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface UserMetricsData {
  activeUsers: {
    daily: number;
    monthly: number;
    trend: number; // percentage change
  };
  requestsPerUser: {
    average: number;
    median: number;
    peak: number;
  };
  popularFeatures: {
    name: string;
    usage: number;
    percentage: number;
  }[];
  popularStocks: {
    symbol: string;
    name: string;
    searches: number;
    percentage: number;
  }[];
  subscriptionDistribution: {
    free: number;
    basic: number;
    premium: number;
    enterprise: number;
  };
  totalUsers: number;
  newUsersToday: number;
  retentionRate: number;
  lastUpdated: Date;
}

export interface UserMetricsCardProps {
  data: UserMetricsData | null;
  loading?: boolean;
  onRefresh?: () => Promise<void>;
  className?: string;
  timeRange?: '24h' | '7d' | '30d';
  onTimeRangeChange?: (range: '24h' | '7d' | '30d') => void;
}

export function UserMetricsCard({
  data,
  loading = false,
  onRefresh,
  className,
  timeRange = '24h',
  onTimeRangeChange
}: UserMetricsCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error('Failed to refresh user metrics:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return "text-green-600";
    if (trend < 0) return "text-red-600";
    return "text-gray-600";
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (trend < 0) return <TrendingUp className="h-3 w-3 text-red-600 rotate-180" />;
    return <BarChart3 className="h-3 w-3 text-gray-600" />;
  };

  const formatLastUpdated = () => {
    if (!data?.lastUpdated) return "Never";
    const now = new Date();
    const diff = now.getTime() - data.lastUpdated.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return data.lastUpdated.toLocaleDateString();
  };

  if (loading || !data) {
    return <UserMetricsCardSkeleton className={className} />;
  }

  const totalSubscriptions = Object.values(data.subscriptionDistribution).reduce((a, b) => a + b, 0);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Metrics Overview
          </CardTitle>
          <div className="flex items-center gap-2">
            {onTimeRangeChange && (
              <div className="flex bg-muted rounded-md p-1">
                {(['24h', '7d', '30d'] as const).map((range) => (
                  <Button
                    key={range}
                    size="sm"
                    variant={timeRange === range ? "default" : "ghost"}
                    onClick={() => onTimeRangeChange(range)}
                    className="h-7 px-3 text-xs"
                  >
                    {range}
                  </Button>
                ))}
              </div>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Active Users */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Active Users</span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold">{data.activeUsers.daily.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Daily Active</div>
                <div className="flex items-center gap-1">
                  {getTrendIcon(data.activeUsers.trend)}
                  <span className={cn("text-xs", getTrendColor(data.activeUsers.trend))}>
                    {Math.abs(data.activeUsers.trend).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Monthly Active Users */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Monthly Active</span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold">{data.activeUsers.monthly.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Unique MAU</div>
                <div className="text-xs text-green-600">
                  {((data.activeUsers.daily / data.activeUsers.monthly) * 100).toFixed(1)}% daily ratio
                </div>
              </div>
            </div>

            {/* New Users */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">New Users</span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold">{data.newUsersToday.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Today</div>
                <div className="text-xs text-blue-600">
                  {data.totalUsers.toLocaleString()} total
                </div>
              </div>
            </div>

            {/* Retention Rate */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Retention</span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold">{data.retentionRate.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">7-day retention</div>
                <Progress value={data.retentionRate} className="h-1" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Popular Features */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Popular Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.popularFeatures.map((feature, index) => (
              <div key={feature.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    #{index + 1}
                  </span>
                  <span className="text-sm">{feature.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{feature.usage.toLocaleString()}</span>
                  <Badge variant="secondary" className="text-xs">
                    {feature.percentage.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Popular Stocks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" />
              Popular Stocks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.popularStocks.map((stock, index) => (
              <div key={stock.symbol} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    #{index + 1}
                  </span>
                  <div>
                    <div className="text-sm font-medium">{stock.symbol}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {stock.name}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{stock.searches.toLocaleString()}</span>
                  <Badge variant="secondary" className="text-xs">
                    {stock.percentage.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Requests per User */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              API Usage per User
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {data.requestsPerUser.average.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">Average</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {data.requestsPerUser.median.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">Median</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">
                  {data.requestsPerUser.peak.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">Peak</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground text-center">
              Requests per user in the last {timeRange}
            </div>
          </CardContent>
        </Card>

        {/* Subscription Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Subscription Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(data.subscriptionDistribution).map(([tier, count]) => {
              const percentage = totalSubscriptions > 0 ? (count / totalSubscriptions) * 100 : 0;
              const tierColors = {
                free: 'bg-gray-500',
                basic: 'bg-blue-500',
                premium: 'bg-green-500',
                enterprise: 'bg-purple-500'
              };
              
              return (
                <div key={tier} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize font-medium">{tier}</span>
                    <span>{count.toLocaleString()} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <Progress 
                    value={percentage} 
                    className={cn("h-2", tierColors[tier as keyof typeof tierColors])}
                  />
                </div>
              );
            })}
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Total: {totalSubscriptions.toLocaleString()} subscriptions
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-xs text-muted-foreground text-center">
        Last updated: {formatLastUpdated()}
      </div>
    </div>
  );
}

// Loading skeleton
export function UserMetricsCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-8" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Skeleton className="h-4 w-48 mx-auto" />
    </div>
  );
}