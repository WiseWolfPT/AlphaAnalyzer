import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { RefreshCw, Activity, Database, Server, Zap, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { formatDistanceToNow } from 'date-fns';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  details?: any;
}

interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  checks: {
    server: HealthCheck;
    redis: HealthCheck;
    database: HealthCheck;
    worker: HealthCheck;
    fmp_api: HealthCheck;
    memory: HealthCheck;
    performance: HealthCheck;
  };
}

export function HealthDashboard() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/health');
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      
      const data = await response.json();
      setHealth(data);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'unhealthy':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.join(' ') || '< 1m';
  };

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error && !health) {
    return (
      <Card className="bg-red-950/20 border-red-900">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <XCircle className="h-6 w-6 text-red-500" />
            <div>
              <p className="font-semibold text-red-400">Health Check Failed</p>
              <p className="text-sm text-gray-400">{error}</p>
            </div>
          </div>
          <Button 
            onClick={fetchHealth} 
            variant="outline" 
            size="sm" 
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!health) return null;

  return (
    <div className="space-y-6">
      {/* Overall Status Card */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <CardTitle>System Health</CardTitle>
              <Badge 
                variant={health.status === 'healthy' ? 'default' : 
                        health.status === 'degraded' ? 'secondary' : 'destructive'}
                className={`${getStatusColor(health.status)} bg-opacity-20`}
              >
                {health.status.toUpperCase()}
              </Badge>
            </div>
            <Button
              onClick={fetchHealth}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-400">Environment</p>
              <p className="font-semibold">{health.environment}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Version</p>
              <p className="font-semibold">{health.version}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Uptime</p>
              <p className="font-semibold">{formatUptime(health.uptime)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Last Update</p>
              <p className="font-semibold">
                {formatDistanceToNow(lastUpdate, { addSuffix: true })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Component Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Server Health */}
        <Card className="glass-card hover:scale-105 transition-transform">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-400" />
                <CardTitle className="text-base">Server</CardTitle>
              </div>
              {getStatusIcon(health.checks.server.status)}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400">
              {health.checks.server.message || 'Server is running'}
            </p>
          </CardContent>
        </Card>

        {/* Database Health */}
        <Card className="glass-card hover:scale-105 transition-transform">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-green-400" />
                <CardTitle className="text-base">Database</CardTitle>
              </div>
              {getStatusIcon(health.checks.database.status)}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400">
              {health.checks.database.message || 'Database connection status'}
            </p>
            {health.checks.database.details?.url && (
              <p className="text-xs text-gray-500 mt-1">
                Project: {health.checks.database.details.url}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Redis Health */}
        <Card className="glass-card hover:scale-105 transition-transform">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-400" />
                <CardTitle className="text-base">Redis Cache</CardTitle>
              </div>
              {getStatusIcon(health.checks.redis.status)}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400">
              {health.checks.redis.message || 'Cache status'}
            </p>
            {health.checks.redis.details?.memoryUsage && (
              <p className="text-xs text-gray-500 mt-1">
                Memory: {health.checks.redis.details.memoryUsage}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Worker Health */}
        <Card className="glass-card hover:scale-105 transition-transform">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-400" />
                <CardTitle className="text-base">Price Worker</CardTitle>
              </div>
              {getStatusIcon(health.checks.worker.status)}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400">
              {health.checks.worker.message || 'Worker status'}
            </p>
            {health.checks.worker.details?.stocksMonitored && (
              <p className="text-xs text-gray-500 mt-1">
                Monitoring: {health.checks.worker.details.stocksMonitored} stocks
              </p>
            )}
          </CardContent>
        </Card>

        {/* FMP API Health */}
        <Card className="glass-card hover:scale-105 transition-transform">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-cyan-400" />
                <CardTitle className="text-base">FMP API</CardTitle>
              </div>
              {getStatusIcon(health.checks.fmp_api.status)}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400">
              {health.checks.fmp_api.message || 'API status'}
            </p>
            {health.checks.fmp_api.details?.endpoint && (
              <p className="text-xs text-gray-500 mt-1">
                Endpoint: {health.checks.fmp_api.details.endpoint}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Memory Health */}
        <Card className="glass-card hover:scale-105 transition-transform">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-orange-400" />
                <CardTitle className="text-base">Memory</CardTitle>
              </div>
              {getStatusIcon(health.checks.memory.status)}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400">
              {health.checks.memory.message || 'Memory usage'}
            </p>
            {health.checks.memory.details?.heapUsagePercent && (
              <p className="text-xs text-gray-500 mt-1">
                Heap: {health.checks.memory.details.heapUsagePercent}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      {health.checks.performance && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {health.checks.performance.details?.avgResponseTime && (
                <div>
                  <p className="text-sm text-gray-400">Avg Response Time</p>
                  <p className="font-semibold">
                    {health.checks.performance.details.avgResponseTime.toFixed(0)}ms
                  </p>
                </div>
              )}
              {health.checks.performance.details?.requestCount !== undefined && (
                <div>
                  <p className="text-sm text-gray-400">Request Count</p>
                  <p className="font-semibold">
                    {health.checks.performance.details.requestCount.toLocaleString()}
                  </p>
                </div>
              )}
              {health.checks.performance.details?.errorRate !== undefined && (
                <div>
                  <p className="text-sm text-gray-400">Error Rate</p>
                  <p className="font-semibold">
                    {(health.checks.performance.details.errorRate * 100).toFixed(2)}%
                  </p>
                </div>
              )}
              {health.checks.performance.details?.cacheHitRate !== undefined && (
                <div>
                  <p className="text-sm text-gray-400">Cache Hit Rate</p>
                  <p className="font-semibold">
                    {(health.checks.performance.details.cacheHitRate * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}