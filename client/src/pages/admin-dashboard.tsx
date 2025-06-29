import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  Database, 
  Globe, 
  MessageSquare, 
  Settings, 
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { apiMetricsCollector, type APIMetricsSnapshot, type ProviderQuota } from '@/lib/api-metrics';
import { cn } from '@/lib/utils';

interface SystemMetrics {
  apiMetrics: APIMetricsSnapshot;
  quotaStatus: ProviderQuota[];
  cacheMetrics: {
    totalRequests: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
    avgResponseTimeWithCache: number;
    avgResponseTimeWithoutCache: number;
  };
  errorAnalysis: {
    errorsByType: Record<string, number>;
    errorsByProvider: Record<string, number>;
    errorsByEndpoint: Record<string, number>;
    errorTrends: Array<{ timestamp: number; errorCount: number }>;
  };
  systemHealth: {
    status: 'healthy' | 'warning' | 'error';
    issues: string[];
    metrics: {
      totalMetrics: number;
      oldestMetric: number;
      newestMetric: number;
      storageUsed: number;
    };
  };
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const timeRanges = [
    { label: '5 minutes', value: '5m', ms: 5 * 60 * 1000 },
    { label: '1 hour', value: '1h', ms: 60 * 60 * 1000 },
    { label: '24 hours', value: '24h', ms: 24 * 60 * 60 * 1000 },
    { label: '7 days', value: '7d', ms: 7 * 24 * 60 * 60 * 1000 }
  ];

  const fetchMetrics = async () => {
    try {
      const currentTimeRange = timeRanges.find(t => t.value === timeRange)?.ms || 60 * 60 * 1000;
      
      const systemMetrics: SystemMetrics = {
        apiMetrics: apiMetricsCollector.generateSnapshot(currentTimeRange),
        quotaStatus: apiMetricsCollector.getQuotaStatus(),
        cacheMetrics: apiMetricsCollector.getCacheMetrics(),
        errorAnalysis: apiMetricsCollector.getErrorAnalysis(currentTimeRange),
        systemHealth: apiMetricsCollector.healthCheck()
      };

      setMetrics(systemMetrics);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [timeRange]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, timeRange]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': case 'success': case 'online': return 'text-green-600';
      case 'warning': case 'degraded': case 'rate_limited': return 'text-yellow-600';
      case 'error': case 'critical': case 'offline': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'healthy': case 'success': case 'online': case 'active': return 'default';
      case 'warning': case 'degraded': case 'rate_limited': return 'secondary';
      case 'error': case 'critical': case 'offline': case 'expired': case 'suspended': return 'destructive';
      default: return 'outline';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load metrics. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor system performance and API usage</p>
        </div>
        
        <div className="flex items-center gap-4">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            {timeRanges.map(range => (
              <option key={range.value} value={range.value}>{range.label}</option>
            ))}
          </select>
          
          <Button 
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          
          <Button onClick={fetchMetrics} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Alert */}
      {metrics.systemHealth.status !== 'healthy' && (
        <Alert className={cn(
          metrics.systemHealth.status === 'error' ? 'border-red-500' : 'border-yellow-500'
        )}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            System Status: <strong>{metrics.systemHealth.status.toUpperCase()}</strong>
            <br />
            Issues: {metrics.systemHealth.issues.join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.apiMetrics.totalCalls)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.apiMetrics.successfulCalls} successful, {metrics.apiMetrics.errorCalls} errors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(metrics.apiMetrics.avgResponseTime)}</div>
            <p className="text-xs text-muted-foreground">
              95th percentile: {formatDuration(metrics.apiMetrics.p95ResponseTime)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.apiMetrics.cacheHitRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(metrics.cacheMetrics.cacheHits)} hits, {formatNumber(metrics.cacheMetrics.cacheMisses)} misses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.apiMetrics.totalCalls > 0 
                ? ((metrics.apiMetrics.errorCalls / metrics.apiMetrics.totalCalls) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.apiMetrics.errorCalls} errors total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics Tabs */}
      <Tabs defaultValue="api-usage">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="api-usage">API Usage</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {/* API Usage Tab */}
        <TabsContent value="api-usage" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Endpoints</CardTitle>
                <CardDescription>Most frequently called endpoints</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(metrics.apiMetrics.endpointStats)
                  .sort(([,a], [,b]) => b.calls - a.calls)
                  .slice(0, 5)
                  .map(([endpoint, stats]) => (
                    <div key={endpoint} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium truncate">{endpoint}</p>
                        <p className="text-xs text-muted-foreground">
                          {stats.calls} calls, {formatDuration(stats.avgResponseTime)} avg
                        </p>
                      </div>
                      <Badge variant={stats.errors > stats.calls * 0.1 ? "destructive" : "default"}>
                        {((1 - stats.errors / stats.calls) * 100).toFixed(1)}% success
                      </Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Slowest Endpoints</CardTitle>
                <CardDescription>Endpoints with highest response times</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics.apiMetrics.topSlowEndpoints.slice(0, 5).map((endpoint, index) => (
                  <div key={endpoint.endpoint} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium truncate">{endpoint.endpoint}</p>
                      <p className="text-xs text-muted-foreground">
                        Average response time
                      </p>
                    </div>
                    <Badge variant={endpoint.avgTime > 2000 ? "destructive" : endpoint.avgTime > 1000 ? "secondary" : "default"}>
                      {formatDuration(endpoint.avgTime)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Providers Tab */}
        <TabsContent value="providers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Provider Statistics</CardTitle>
                <CardDescription>API calls and performance by provider</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(metrics.apiMetrics.providerStats).map(([provider, stats]) => (
                  <div key={provider} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{provider}</span>
                      <Badge variant="outline">{stats.calls} calls</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground grid grid-cols-3 gap-2">
                      <span>Errors: {stats.errors}</span>
                      <span>Avg: {formatDuration(stats.avgResponseTime)}</span>
                      <span>Quota: {stats.quotaUsage.toFixed(1)}%</span>
                    </div>
                    <Progress value={stats.quotaUsage} className="h-1" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quota Status</CardTitle>
                <CardDescription>API quota usage across providers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics.quotaStatus.map((quota) => {
                  const usagePercent = (quota.currentDailyUsage / quota.dailyLimit) * 100;
                  return (
                    <div key={quota.provider} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">{quota.provider}</span>
                        <Badge variant={getStatusBadgeVariant(usagePercent > 80 ? 'warning' : 'default')}>
                          {quota.currentDailyUsage}/{quota.dailyLimit}
                        </Badge>
                      </div>
                      <Progress value={usagePercent} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {usagePercent.toFixed(1)}% used • Resets: {new Date(quota.lastDailyReset + 24 * 60 * 60 * 1000).toLocaleTimeString()}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cache Performance</CardTitle>
                <CardDescription>Caching efficiency metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">{metrics.cacheMetrics.hitRate.toFixed(1)}%</div>
                  <p className="text-sm text-muted-foreground">Hit Rate</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Cache Hits</span>
                    <span>{formatNumber(metrics.cacheMetrics.cacheHits)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Cache Misses</span>
                    <span>{formatNumber(metrics.cacheMetrics.cacheMisses)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Cached Response Time</span>
                    <span>{formatDuration(metrics.cacheMetrics.avgResponseTimeWithCache)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Uncached Response Time</span>
                    <span>{formatDuration(metrics.cacheMetrics.avgResponseTimeWithoutCache)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Time Distribution</CardTitle>
                <CardDescription>Performance percentiles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Average</span>
                    <span>{formatDuration(metrics.apiMetrics.avgResponseTime)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Median (50th)</span>
                    <span>{formatDuration(metrics.apiMetrics.medianResponseTime)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>95th Percentile</span>
                    <span>{formatDuration(metrics.apiMetrics.p95ResponseTime)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Overall system status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  {metrics.systemHealth.status === 'healthy' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : metrics.systemHealth.status === 'warning' ? (
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={cn("font-medium", getStatusColor(metrics.systemHealth.status))}>
                    {metrics.systemHealth.status.toUpperCase()}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Metrics</span>
                    <span>{formatNumber(metrics.systemHealth.metrics.totalMetrics)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Storage Used</span>
                    <span>{(metrics.systemHealth.metrics.storageUsed / 1024 / 1024).toFixed(1)}MB</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Errors</CardTitle>
                <CardDescription>Most frequent error messages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics.apiMetrics.topErrors.slice(0, 5).map((error, index) => (
                  <div key={index} className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{error.error}</p>
                      <p className="text-xs text-muted-foreground">
                        {error.count} occurrences
                      </p>
                    </div>
                    <Badge variant="destructive">{error.count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Errors by Type</CardTitle>
                <CardDescription>Error classification breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(metrics.errorAnalysis.errorsByType)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{type.replace('_', ' ')}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Errors by Provider</CardTitle>
                <CardDescription>Error distribution across API providers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(metrics.errorAnalysis.errorsByProvider)
                  .sort(([,a], [,b]) => b - a)
                  .map(([provider, count]) => (
                    <div key={provider} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{provider}</span>
                      <Badge variant="destructive">{count}</Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Errors by Endpoint</CardTitle>
                <CardDescription>Endpoints with most errors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(metrics.errorAnalysis.errorsByEndpoint)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([endpoint, count]) => (
                    <div key={endpoint} className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{endpoint}</p>
                      </div>
                      <Badge variant="destructive">{count}</Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>Metrics collection system status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Status</span>
                    <Badge variant={getStatusBadgeVariant(metrics.systemHealth.status)}>
                      {metrics.systemHealth.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Metrics Collected</span>
                    <span>{formatNumber(metrics.systemHealth.metrics.totalMetrics)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Storage Usage</span>
                    <span>{(metrics.systemHealth.metrics.storageUsed / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Oldest Metric</span>
                    <span>{new Date(metrics.systemHealth.metrics.oldestMetric).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Latest Metric</span>
                    <span>{new Date(metrics.systemHealth.metrics.newestMetric).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Issues</CardTitle>
                <CardDescription>Current system health issues</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.systemHealth.issues.length === 0 ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">No issues detected</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {metrics.systemHealth.issues.map((issue, index) => (
                      <div key={index} className="flex items-start gap-2 text-yellow-600">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{issue}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}