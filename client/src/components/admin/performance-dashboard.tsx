import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  Activity,
  Database,
  Cpu,
  HardDrive,
  Zap,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
  BarChart3,
  Timer,
  MemoryStick
} from 'lucide-react';

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  metrics: {
    timestamp: string;
    database: any;
    memory: any;
    cpu: any;
    network: any;
  } | null;
  activeAlerts: any[];
  summary: {
    totalAlerts: number;
    criticalAlerts: number;
    uptime: number;
    memoryUsage: number;
    cacheHitRate: number;
  };
}

interface PerformanceTrends {
  timeRange: { start: string; end: string };
  trends: {
    memoryUsage: Array<{ timestamp: string; value: number }>;
    queryPerformance: Array<{ timestamp: string; value: number }>;
    cacheHitRate: Array<{ timestamp: string; value: number }>;
  };
  summary: {
    avgMemoryUsage: number;
    avgQueryTime: number;
    avgCacheHitRate: number;
    peakMemoryUsage: number;
    slowestQuery: number;
  };
}

interface DatabaseStats {
  database: {
    path: string;
    size: number;
    sizeFormatted: string;
    modified: string;
    tables: number;
    totalRows: number;
  };
  tables: Array<{
    name: string;
    rowCount: number;
    columnCount: number;
    indexCount: number;
    columns: any[];
    indexes: string[];
  }>;
  configuration: any;
}

interface PerformanceDashboardData {
  health: SystemHealth;
  trends: PerformanceTrends;
  database: any;
  optimizer: any;
  system: {
    nodeVersion: string;
    platform: string;
    uptime: number;
    pid: number;
    memoryUsage: any;
    cpuUsage: any;
  };
  timestamp: string;
}

export function PerformanceDashboard() {
  const [dashboardData, setDashboardData] = useState<PerformanceDashboardData | null>(null);
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [optimizing, setOptimizing] = useState(false);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/performance/dashboard');
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      const data = await response.json();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Fetch database statistics
  const fetchDatabaseStats = async () => {
    try {
      const response = await fetch('/api/admin/performance/database/stats');
      if (!response.ok) throw new Error('Failed to fetch database stats');
      const data = await response.json();
      setDatabaseStats(data);
    } catch (err) {
      console.error('Failed to fetch database stats:', err);
    }
  };

  // Fetch alerts
  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/admin/performance/alerts');
      if (!response.ok) throw new Error('Failed to fetch alerts');
      const data = await response.json();
      setAlerts(data.alerts);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboardData(),
        fetchDatabaseStats(),
        fetchAlerts()
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchDashboardData();
      fetchAlerts();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Trigger performance optimization
  const triggerOptimization = async () => {
    setOptimizing(true);
    try {
      const response = await fetch('/api/admin/performance/optimize', {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Optimization failed');
      
      // Refresh data after optimization
      setTimeout(() => {
        fetchDashboardData();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Optimization failed');
    } finally {
      setOptimizing(false);
    }
  };

  // Clear cache
  const clearCache = async () => {
    try {
      const response = await fetch('/api/admin/performance/cache/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (!response.ok) throw new Error('Cache clear failed');
      
      fetchDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cache clear failed');
    }
  };

  // Format uptime
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Format memory size
  const formatMemory = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get alert severity color
  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-2 text-lg">Loading performance dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          <p className="text-muted-foreground">System performance monitoring and optimization</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Disable' : 'Enable'} Auto-refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchDashboardData();
              fetchDatabaseStats();
              fetchAlerts();
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearCache}
          >
            <Database className="w-4 h-4" />
            Clear Cache
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={triggerOptimization}
            disabled={optimizing}
          >
            {optimizing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Optimize
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
              <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                ×
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Health Overview */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              {dashboardData.health.status === 'healthy' ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <Badge className={getStatusColor(dashboardData.health.status)}>
                {dashboardData.health.status.toUpperCase()}
              </Badge>
              <div className="mt-2 text-sm text-muted-foreground">
                {dashboardData.health.summary.criticalAlerts} critical alerts
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
              <MemoryStick className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.health.summary.memoryUsage.toFixed(1)}%</div>
              <Progress value={dashboardData.health.summary.memoryUsage} className="mt-2" />
              <div className="mt-1 text-xs text-muted-foreground">
                {formatMemory(dashboardData.system.memoryUsage.heapUsed)} / {formatMemory(dashboardData.system.memoryUsage.heapTotal)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
              <Database className="w-4 h-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.health.summary.cacheHitRate.toFixed(1)}%</div>
              <Progress value={dashboardData.health.summary.cacheHitRate} className="mt-2" />
              <div className="mt-1 text-xs text-muted-foreground">
                {dashboardData.optimizer?.cache?.size || 0} entries cached
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <Activity className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatUptime(dashboardData.system.uptime)}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Since {new Date(Date.now() - dashboardData.system.uptime * 1000).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Information */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="system">System Info</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Query Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Query Performance</CardTitle>
                <CardDescription>Database query execution metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dashboardData?.optimizer?.queries ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Total Queries</div>
                        <div className="text-2xl font-bold">{dashboardData.optimizer.queries.total}</div>
                      </div>
                      <div>
                        <div className="font-medium">Avg Time</div>
                        <div className="text-2xl font-bold">{dashboardData.optimizer.queries.avgExecutionTime}ms</div>
                      </div>
                      <div>
                        <div className="font-medium">Slow Queries</div>
                        <div className="text-2xl font-bold text-red-600">{dashboardData.optimizer.queries.slowQueries}</div>
                      </div>
                      <div>
                        <div className="font-medium">Cache Hit Rate</div>
                        <div className="text-2xl font-bold text-green-600">{dashboardData.optimizer.queries.cacheHitRate.toFixed(1)}%</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Performance optimizer not available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Connection Pool */}
            <Card>
              <CardHeader>
                <CardTitle>Connection Pool</CardTitle>
                <CardDescription>Database connection pool status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dashboardData?.optimizer?.connectionPool ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Active</div>
                        <div className="text-2xl font-bold">{dashboardData.optimizer.connectionPool.activeConnections}</div>
                      </div>
                      <div>
                        <div className="font-medium">Pool Size</div>
                        <div className="text-2xl font-bold">{dashboardData.optimizer.connectionPool.poolSize}</div>
                      </div>
                      <div>
                        <div className="font-medium">Peak Usage</div>
                        <div className="text-2xl font-bold">{dashboardData.optimizer.connectionPool.peakUsage}</div>
                      </div>
                      <div>
                        <div className="font-medium">Created</div>
                        <div className="text-2xl font-bold">{dashboardData.optimizer.connectionPool.connectionsCreated}</div>
                      </div>
                    </div>
                    <Progress 
                      value={(dashboardData.optimizer.connectionPool.activeConnections / dashboardData.optimizer.connectionPool.poolSize) * 100} 
                      className="mt-4"
                    />
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Connection pool not available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Performance Trends */}
          {dashboardData?.trends && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends (24h)</CardTitle>
                <CardDescription>Historical performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium">Avg Memory Usage</div>
                    <div className="text-2xl font-bold">{dashboardData.trends.summary.avgMemoryUsage.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">
                      Peak: {dashboardData.trends.summary.peakMemoryUsage.toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">Avg Query Time</div>
                    <div className="text-2xl font-bold">{dashboardData.trends.summary.avgQueryTime.toFixed(1)}ms</div>
                    <div className="text-xs text-muted-foreground">
                      Slowest: {dashboardData.trends.summary.slowestQuery.toFixed(1)}ms
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">Avg Cache Hit Rate</div>
                    <div className="text-2xl font-bold">{dashboardData.trends.summary.avgCacheHitRate.toFixed(1)}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Database Info */}
            {databaseStats && (
              <Card>
                <CardHeader>
                  <CardTitle>Database Information</CardTitle>
                  <CardDescription>SQLite database statistics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">File Size</div>
                      <div className="text-lg font-bold">{databaseStats.database.sizeFormatted}</div>
                    </div>
                    <div>
                      <div className="font-medium">Tables</div>
                      <div className="text-lg font-bold">{databaseStats.database.tables}</div>
                    </div>
                    <div>
                      <div className="font-medium">Total Rows</div>
                      <div className="text-lg font-bold">{databaseStats.database.totalRows.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="font-medium">Modified</div>
                      <div className="text-lg font-bold">{new Date(databaseStats.database.modified).toLocaleDateString()}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Database Configuration */}
            {databaseStats && (
              <Card>
                <CardHeader>
                  <CardTitle>Database Configuration</CardTitle>
                  <CardDescription>SQLite optimization settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(databaseStats.configuration).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="font-medium">{key}:</span>
                      <span>{String(value)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Table Statistics */}
          {databaseStats && (
            <Card>
              <CardHeader>
                <CardTitle>Table Statistics</CardTitle>
                <CardDescription>Database table information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {databaseStats.tables
                    .sort((a, b) => b.rowCount - a.rowCount)
                    .slice(0, 20)
                    .map((table) => (
                    <div key={table.name} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <span className="font-medium">{table.name}</span>
                        <div className="text-xs text-muted-foreground">
                          {table.columnCount} columns, {table.indexCount} indexes
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{table.rowCount.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">rows</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Alerts</CardTitle>
              <CardDescription>Active performance alerts and warnings</CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length > 0 ? (
                <div className="space-y-2">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getAlertColor(alert.severity)}`} />
                        <div>
                          <div className="font-medium">{alert.title}</div>
                          <div className="text-sm text-muted-foreground">{alert.message}</div>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div>{alert.severity.toUpperCase()}</div>
                        <div>{new Date(alert.timestamp).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  No active alerts
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          {dashboardData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>System Information</CardTitle>
                  <CardDescription>Node.js runtime details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Node.js Version:</span>
                    <span className="font-medium">{dashboardData.system.nodeVersion}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Platform:</span>
                    <span className="font-medium">{dashboardData.system.platform}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Process ID:</span>
                    <span className="font-medium">{dashboardData.system.pid}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Uptime:</span>
                    <span className="font-medium">{formatUptime(dashboardData.system.uptime)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Memory Details</CardTitle>
                  <CardDescription>Detailed memory usage breakdown</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Heap Used:</span>
                    <span className="font-medium">{formatMemory(dashboardData.system.memoryUsage.heapUsed)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Heap Total:</span>
                    <span className="font-medium">{formatMemory(dashboardData.system.memoryUsage.heapTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>External:</span>
                    <span className="font-medium">{formatMemory(dashboardData.system.memoryUsage.external)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>RSS:</span>
                    <span className="font-medium">{formatMemory(dashboardData.system.memoryUsage.rss)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}