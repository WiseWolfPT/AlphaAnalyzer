import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  TrendingUp,
  Zap,
  BarChart3
} from 'lucide-react';

interface RateLimitUsage {
  provider: string;
  endpoint: string;
  used: number;
  dailyLimit: number;
  minuteLimit?: number;
  usagePercent: number;
  callsLastHour: number;
  callsLastMinute: number;
  lastCall?: string;
  resetAt: string;
}

interface DashboardData {
  providers: RateLimitUsage[];
  alerts: {
    alerts: Array<{ provider: string; endpoint: string; usagePercent: number; level: 'warning' | 'alert' }>;
    summary: { total: number; warnings: number; alerts: number };
  };
  performance: {
    totalCalls: number;
    averageResponseTime: number;
    successRate: number;
    callsPerHour: number[];
    slowestCalls: Array<{ endpoint: string; responseTime: number; timestamp: string }>;
  };
  summary: {
    totalProviders: number;
    activeProviders: number;
    averageUsage: number;
    totalCalls24h: number;
  };
}

export function RateLimitDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/rate-limits/dashboard');
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`);
      }
      
      const dashboardData = await response.json();
      setData(dashboardData);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to fetch rate limit data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return 'text-red-600';
    if (percent >= 80) return 'text-yellow-600';
    if (percent >= 60) return 'text-blue-600';
    return 'text-green-600';
  };

  const getUsageBadgeVariant = (percent: number) => {
    if (percent >= 90) return 'destructive';
    if (percent >= 80) return 'secondary';
    return 'default';
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading rate limit data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rate Limit Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor API quotas and usage across all providers
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {lastUpdate && (
            <span className="text-sm text-muted-foreground">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalProviders}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.activeProviders} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Usage</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getUsageColor(data.summary.averageUsage)}`}>
              {data.summary.averageUsage}%
            </div>
            <Progress value={data.summary.averageUsage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">24h API Calls</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalCalls24h.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Success rate: {data.performance.successRate}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.alerts.summary.total}
            </div>
            <div className="flex space-x-2 text-xs">
              <span className="text-red-600">{data.alerts.summary.warnings} warnings</span>
              <span className="text-yellow-600">{data.alerts.summary.alerts} alerts</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {data.alerts.alerts.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <strong>Quota Usage Alerts:</strong>
              {data.alerts.alerts.map((alert, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span>{alert.provider}/{alert.endpoint}</span>
                  <Badge variant={alert.level === 'warning' ? 'destructive' : 'secondary'}>
                    {alert.usagePercent}% used
                  </Badge>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="providers" className="w-full">
        <TabsList>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="logs">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.entries(
              data.providers.reduce((acc, usage) => {
                if (!acc[usage.provider]) acc[usage.provider] = [];
                acc[usage.provider].push(usage);
                return acc;
              }, {} as Record<string, RateLimitUsage[]>)
            ).map(([provider, endpoints]) => (
              <Card key={provider}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="capitalize">{provider.replace('_', ' ')}</span>
                    <Badge variant="outline">
                      {endpoints.length} endpoints
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {endpoints.map((endpoint) => (
                    <div key={endpoint.endpoint} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{endpoint.endpoint}</span>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getUsageBadgeVariant(endpoint.usagePercent)}>
                            {endpoint.usagePercent}%
                          </Badge>
                          {endpoint.callsLastMinute > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Zap className="h-3 w-3 mr-1" />
                              {endpoint.callsLastMinute}/min
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <Progress value={endpoint.usagePercent} className="h-2" />
                      
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{endpoint.used} / {endpoint.dailyLimit} calls</span>
                        <span>
                          Last: {endpoint.lastCall 
                            ? new Date(endpoint.lastCall).toLocaleTimeString()
                            : 'Never'
                          }
                        </span>
                      </div>
                      
                      {endpoint.minuteLimit && (
                        <div className="text-xs text-muted-foreground">
                          Rate limit: {endpoint.minuteLimit} calls/minute
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Last 24 hours</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total API Calls:</span>
                  <strong>{data.performance.totalCalls.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Average Response Time:</span>
                  <strong>{data.performance.averageResponseTime}ms</strong>
                </div>
                <div className="flex justify-between">
                  <span>Success Rate:</span>
                  <strong className={data.performance.successRate >= 95 ? 'text-green-600' : 'text-yellow-600'}>
                    {data.performance.successRate}%
                  </strong>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Slowest Endpoints</CardTitle>
                <CardDescription>Highest response times</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.performance.slowestCalls.slice(0, 5).map((call, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{call.endpoint}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-mono">{call.responseTime}ms</span>
                        <Clock className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Calls per hour chart (simplified) */}
          <Card>
            <CardHeader>
              <CardTitle>API Calls per Hour</CardTitle>
              <CardDescription>Last 24 hours activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end space-x-1 h-32">
                {data.performance.callsPerHour.map((calls, index) => (
                  <div
                    key={index}
                    className="flex-1 bg-primary rounded-t"
                    style={{
                      height: `${Math.max(calls / Math.max(...data.performance.callsPerHour) * 100, 2)}%`
                    }}
                    title={`Hour ${index}: ${calls} calls`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>24h ago</span>
                <span>Now</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent API Activity</CardTitle>
              <CardDescription>Latest API calls and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2" />
                <p>Real-time logs feature coming soon</p>
                <p className="text-sm">This will show recent API calls, errors, and performance metrics</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}