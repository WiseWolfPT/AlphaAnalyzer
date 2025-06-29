import * as React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  TrendingUp,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface APIProvider {
  id: string;
  name: string;
  status: "connected" | "connecting" | "failed" | "disabled";
  health: number; // 0-100
  responseTime: number; // in ms
  successRate: number; // 0-100
  dailyUsage: number;
  dailyLimit: number;
  lastChecked: Date;
  endpoint?: string;
  errorMessage?: string;
}

export interface APIStatusCardProps {
  provider: APIProvider;
  onRefresh?: (providerId: string) => Promise<void>;
  onToggle?: (providerId: string, enabled: boolean) => Promise<void>;
  className?: string;
  compact?: boolean;
  showControls?: boolean;
}

export function APIStatusCard({
  provider,
  onRefresh,
  onToggle,
  className,
  compact = false,
  showControls = true
}: APIStatusCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh(provider.id);
    } catch (error) {
      console.error(`Failed to refresh ${provider.name}:`, error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggle = async () => {
    if (!onToggle || isToggling) return;
    
    setIsToggling(true);
    try {
      await onToggle(provider.id, provider.status === "disabled");
    } catch (error) {
      console.error(`Failed to toggle ${provider.name}:`, error);
    } finally {
      setIsToggling(false);
    }
  };

  const getStatusIcon = () => {
    switch (provider.status) {
      case "connected":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "connecting":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "disabled":
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = () => {
    switch (provider.status) {
      case "connected":
        return "default" as const;
      case "connecting":
        return "secondary" as const;
      case "failed":
        return "destructive" as const;
      case "disabled":
        return "outline" as const;
      default:
        return "outline" as const;
    }
  };

  const getHealthColor = () => {
    if (provider.health >= 80) return "text-green-600";
    if (provider.health >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const formatLastChecked = () => {
    const now = new Date();
    const diff = now.getTime() - provider.lastChecked.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return provider.lastChecked.toLocaleDateString();
  };

  const usagePercentage = (provider.dailyUsage / provider.dailyLimit) * 100;

  if (compact) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <div className="font-medium">{provider.name}</div>
              <div className="text-sm text-muted-foreground">
                {provider.responseTime}ms • {provider.successRate}% success
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant()}>
              {provider.status}
            </Badge>
            {showControls && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <CardTitle className="text-base">{provider.name}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusBadgeVariant()}>
            {provider.status}
          </Badge>
          {showControls && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleToggle}
                disabled={isToggling}
              >
                {provider.status === "disabled" ? "Enable" : "Disable"}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Health Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Health Score</span>
            <span className={cn("font-medium", getHealthColor())}>
              {provider.health}%
            </span>
          </div>
          <Progress value={provider.health} className="h-2" />
        </div>

        {/* Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Daily Usage</span>
            <span className="font-medium">
              {provider.dailyUsage.toLocaleString()} / {provider.dailyLimit.toLocaleString()}
            </span>
          </div>
          <Progress 
            value={usagePercentage} 
            className={cn(
              "h-2",
              usagePercentage > 90 && "bg-red-100",
              usagePercentage > 80 && usagePercentage <= 90 && "bg-yellow-100"
            )}
          />
          <div className="text-xs text-muted-foreground">
            {usagePercentage.toFixed(1)}% used today
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Response Time</span>
            </div>
            <div className="text-sm font-medium">{provider.responseTime}ms</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Success Rate</span>
            </div>
            <div className="text-sm font-medium text-green-600">
              {provider.successRate}%
            </div>
          </div>
        </div>

        {/* Error Message */}
        {provider.errorMessage && provider.status === "failed" && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-sm text-red-700">{provider.errorMessage}</div>
          </div>
        )}

        {/* Last Checked */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>Last checked: {formatLastChecked()}</span>
          {provider.endpoint && (
            <span className="truncate max-w-[120px]">{provider.endpoint}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Loading skeleton for API status cards
export function APIStatusCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-4 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-6 w-6" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-6 w-6" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}