/**
 * FASE 2 - DIA 8: Monitoring Dashboard Component
 * Comprehensive monitoring dashboard with health, alerts, analytics, and error tracking
 */

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  Database,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Bug,
  FileText,
  Settings,
  RefreshCw,
  Download,
  Play,
  Square,
  Plus,
  CheckCheck
} from 'lucide-react';

interface MonitoringOverview {
  timestamp: string;
  system: {
    health: 'healthy' | 'warning' | 'critical';
    uptime: number;
    version: string;
    environment: string;
    nodeVersion: string;
    platform: string;
    hostname: string;
  };
  monitoring: {
    healthChecks: {
      active: boolean;
      total: number;
      alerts: number;
    };
    analytics: {
      active: boolean;
      metrics: number;
      trends: number;
      alerts: number;
    };
    errorTracking: {
      totalErrors: number;
      newErrors: number;
      criticalErrors: number;
      errorRate: number;
    };
    logging: {
      transports: number;
      activeTransports: number;
      performanceMetrics: number;
    };
  };
  alerts: {
    active: number;
    critical: number;
    recentAlerts: Array<{
      id: string;
      title: string;
      message: string;
      severity: string;
      timestamp: string;
      source: string;
    }>;
  };
  performance: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
      cores: number;
    };
  };
}

interface Alert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  source: string;
  metadata?: Record<string, any>;
}

interface ErrorData {
  id: string;
  fingerprint: string;
  message: string;
  name: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'investigating' | 'resolved' | 'ignored';
  count: number;
  lastSeen: string;
}

export function MonitoringDashboard() {
  const [overview, setOverview] = useState<MonitoringOverview | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [errors, setErrors] = useState<ErrorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  // Fetch monitoring overview
  const fetchOverview = async () => {
    try {
      const response = await fetch('/api/admin/monitoring/overview');
      if (!response.ok) throw new Error('Failed to fetch overview');
      const data = await response.json();
      setOverview(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Fetch alerts
  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/admin/monitoring/alerts?limit=50');
      if (!response.ok) throw new Error('Failed to fetch alerts');
      const data = await response.json();
      setAlerts(data.alerts);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  };

  // Fetch errors
  const fetchErrors = async () => {
    try {
      const response = await fetch('/api/admin/monitoring/errors?limit=50');
      if (!response.ok) throw new Error('Failed to fetch errors');
      const data = await response.json();
      setErrors(data.errors);
    } catch (err) {
      console.error('Failed to fetch errors:', err);
    }
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchOverview(),
        fetchAlerts(),
        fetchErrors()
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchOverview();
      if (selectedTab === 'alerts') fetchAlerts();
      if (selectedTab === 'errors') fetchErrors();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, selectedTab]);

  // Control functions
  const startHealthMonitoring = async () => {
    try {
      const response = await fetch('/api/admin/monitoring/health/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval: 30000 })
      });
      if (!response.ok) throw new Error('Failed to start health monitoring');
      fetchOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start monitoring');
    }
  };

  const stopHealthMonitoring = async () => {
    try {
      const response = await fetch('/api/admin/monitoring/health/stop', {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to stop health monitoring');
      fetchOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop monitoring');
    }
  };

  const startAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/monitoring/analytics/start', {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to start analytics');
      fetchOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start analytics');
    }
  };

  const stopAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/monitoring/analytics/stop', {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to stop analytics');
      fetchOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop analytics');
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/admin/monitoring/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution: 'Resolved via admin panel' })
      });
      if (!response.ok) throw new Error('Failed to resolve alert');
      fetchAlerts();
      fetchOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve alert');
    }
  };

  const exportData = async () => {
    try {
      const response = await fetch('/api/admin/monitoring/export');
      if (!response.ok) throw new Error('Failed to export data');
      const data = await response.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `monitoring-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    }
  };

  // Utility functions
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatMemory = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
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
        <span className="ml-2 text-lg">Loading monitoring dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">Comprehensive monitoring, alerts, and analytics</p>
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
              fetchOverview();
              fetchAlerts();
              fetchErrors();
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportData}
          >
            <Download className="w-4 h-4" />
            Export
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

      {/* System Overview Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              {overview.system.health === 'healthy' ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <Badge className={getStatusColor(overview.system.health)}>
                {overview.system.health.toUpperCase()}
              </Badge>
              <div className="mt-2 text-sm text-muted-foreground">
                Uptime: {formatUptime(overview.system.uptime)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.alerts.active}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {overview.alerts.critical} critical
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
              <MemoryStick className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.performance.memory.percentage.toFixed(1)}%</div>
              <Progress value={overview.performance.memory.percentage} className="mt-2" />
              <div className="mt-1 text-xs text-muted-foreground">
                {formatMemory(overview.performance.memory.used)} / {formatMemory(overview.performance.memory.total)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <Bug className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.monitoring.errorTracking.errorRate.toFixed(1)}%</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {overview.monitoring.errorTracking.newErrors} new errors
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Information */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="health">Health Checks</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="errors">Error Tracking</TabsTrigger>
          <TabsTrigger value="logs">Logging</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {overview && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>System Information</CardTitle>
                  <CardDescription>Runtime environment details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Version:</span>
                    <span className="font-medium">{overview.system.version}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Environment:</span>
                    <span className="font-medium">{overview.system.environment}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Node.js:</span>
                    <span className="font-medium">{overview.system.nodeVersion}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Platform:</span>
                    <span className="font-medium">{overview.system.platform}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Hostname:</span>
                    <span className="font-medium">{overview.system.hostname}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monitoring Services</CardTitle>
                  <CardDescription>Status of monitoring components</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Activity className="w-4 h-4" />
                      <span>Health Checks</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={overview.monitoring.healthChecks.active ? 'default' : 'secondary'}>
                        {overview.monitoring.healthChecks.active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={overview.monitoring.healthChecks.active ? stopHealthMonitoring : startHealthMonitoring}
                      >
                        {overview.monitoring.healthChecks.active ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4" />
                      <span>Performance Analytics</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={overview.monitoring.analytics.active ? 'default' : 'secondary'}>
                        {overview.monitoring.analytics.active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={overview.monitoring.analytics.active ? stopAnalytics : startAnalytics}
                      >
                        {overview.monitoring.analytics.active ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bug className="w-4 h-4" />
                      <span>Error Tracking</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">Active</Badge>
                      <span className="text-sm text-muted-foreground">
                        {overview.monitoring.errorTracking.totalErrors} tracked
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4" />
                      <span>Structured Logging</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">Active</Badge>
                      <span className="text-sm text-muted-foreground">
                        {overview.monitoring.logging.activeTransports}/{overview.monitoring.logging.transports} transports
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Alerts */}
          {overview && overview.alerts.recentAlerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
                <CardDescription>Latest system alerts and notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {overview.alerts.recentAlerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getSeverityColor(alert.severity)}`} />
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
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Health Monitoring Controls</CardTitle>
              <CardDescription>Manage health check monitoring</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {overview && (
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <div className="font-medium">Continuous Health Monitoring</div>
                    <div className="text-sm text-muted-foreground">
                      Status: {overview.monitoring.healthChecks.active ? 'Running' : 'Stopped'}
                    </div>
                  </div>
                  <Button
                    onClick={overview.monitoring.healthChecks.active ? stopHealthMonitoring : startHealthMonitoring}
                  >
                    {overview.monitoring.healthChecks.active ? (
                      <>
                        <Square className="w-4 h-4 mr-2" />
                        Stop Monitoring
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start Monitoring
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics Controls</CardTitle>
              <CardDescription>Manage performance analytics and metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {overview && (
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <div className="font-medium">Performance Analytics</div>
                    <div className="text-sm text-muted-foreground">
                      Status: {overview.monitoring.analytics.active ? 'Running' : 'Stopped'} | 
                      {overview.monitoring.analytics.metrics} metrics tracked
                    </div>
                  </div>
                  <Button
                    onClick={overview.monitoring.analytics.active ? stopAnalytics : startAnalytics}
                  >
                    {overview.monitoring.analytics.active ? (
                      <>
                        <Square className="w-4 h-4 mr-2" />
                        Stop Analytics
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start Analytics
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>Active alerts and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length > 0 ? (
                <div className="space-y-2">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getSeverityColor(alert.severity)}`} />
                        <div>
                          <div className="font-medium">{alert.title}</div>
                          <div className="text-sm text-muted-foreground">{alert.message}</div>
                          <div className="text-xs text-muted-foreground">
                            Source: {alert.source} | {new Date(alert.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={alert.resolved ? 'secondary' : 'destructive'}>
                          {alert.resolved ? 'Resolved' : alert.severity.toUpperCase()}
                        </Badge>
                        {!alert.resolved && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveAlert(alert.id)}
                          >
                            <CheckCheck className="w-3 h-3 mr-1" />
                            Resolve
                          </Button>
                        )}
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

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Tracking</CardTitle>
              <CardDescription>Recent errors and exceptions</CardDescription>
            </CardHeader>
            <CardContent>
              {errors.length > 0 ? (
                <div className="space-y-2">
                  {errors.map((error) => (
                    <div key={error.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getSeverityColor(error.severity)}`} />
                        <div>
                          <div className="font-medium">{error.name}: {error.message}</div>
                          <div className="text-sm text-muted-foreground">
                            Type: {error.type} | Count: {error.count} | Last seen: {new Date(error.lastSeen).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getSeverityColor(error.severity)}>
                          {error.severity.toUpperCase()}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {error.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  No errors tracked
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Structured Logging</CardTitle>
              <CardDescription>Logging system status and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                <FileText className="w-12 h-12 mx-auto mb-2" />
                Logging statistics will be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}