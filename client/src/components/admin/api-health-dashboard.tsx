import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Server, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Zap,
  AlertCircle
} from 'lucide-react';
import { performanceMonitor, analytics } from '@/lib/monitoring';

// Mock data types - replace with real API calls
interface APIProvider {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'maintenance';
  responseTime: number;
  uptime: number;
  errorRate: number;
  requestCount: number;
  quotaUsed: number;
  quotaLimit: number;
  lastCheck: Date;
  endpoints: APIEndpoint[];
}

interface APIEndpoint {
  path: string;
  method: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  errorRate: number;
  requestCount: number;
  lastError?: string;
}

interface HealthMetrics {
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  uptime: number;
  activeAlerts: number;
  criticalIssues: number;
}

const APIHealthDashboard: React.FC = () => {
  const [providers, setProviders] = useState<APIProvider[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics>({
    totalRequests: 0,
    averageResponseTime: 0,
    errorRate: 0,
    uptime: 0,
    activeAlerts: 0,
    criticalIssues: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Mock API providers data
  const mockProviders: APIProvider[] = [
    {
      id: 'alpha-vantage',
      name: 'Alpha Vantage',
      status: 'healthy',
      responseTime: 850,
      uptime: 99.2,
      errorRate: 0.5,
      requestCount: 1250,
      quotaUsed: 450,
      quotaLimit: 500,
      lastCheck: new Date(),
      endpoints: [
        { path: '/query', method: 'GET', status: 'healthy', responseTime: 850, errorRate: 0.2, requestCount: 800 },
        { path: '/global-quote', method: 'GET', status: 'healthy', responseTime: 650, errorRate: 0.1, requestCount: 450 }
      ]
    },
    {
      id: 'finnhub',
      name: 'Finnhub',
      status: 'degraded',
      responseTime: 1200,
      uptime: 97.8,
      errorRate: 2.1,
      requestCount: 980,
      quotaUsed: 850,
      quotaLimit: 1000,
      lastCheck: new Date(),
      endpoints: [
        { path: '/quote', method: 'GET', status: 'degraded', responseTime: 1200, errorRate: 2.5, requestCount: 600, lastError: 'Rate limit exceeded' },
        { path: '/news', method: 'GET', status: 'healthy', responseTime: 900, errorRate: 0.8, requestCount: 380 }
      ]
    },
    {
      id: 'fmp',
      name: 'Financial Modeling Prep',
      status: 'healthy',
      responseTime: 650,
      uptime: 99.8,
      errorRate: 0.2,
      requestCount: 2100,
      quotaUsed: 1800,
      quotaLimit: 2000,
      lastCheck: new Date(),
      endpoints: [
        { path: '/profile', method: 'GET', status: 'healthy', responseTime: 650, errorRate: 0.1, requestCount: 1200 },
        { path: '/ratios', method: 'GET', status: 'healthy', responseTime: 720, errorRate: 0.3, requestCount: 900 }
      ]
    },
    {
      id: 'twelve-data',
      name: 'Twelve Data',
      status: 'unhealthy',
      responseTime: 3200,
      uptime: 94.5,
      errorRate: 8.5,
      requestCount: 150,
      quotaUsed: 120,
      quotaLimit: 800,
      lastCheck: new Date(),
      endpoints: [
        { path: '/time_series', method: 'GET', status: 'unhealthy', responseTime: 3200, errorRate: 12.0, requestCount: 100, lastError: 'Service unavailable' },
        { path: '/real_time_price', method: 'GET', status: 'degraded', responseTime: 2800, errorRate: 5.0, requestCount: 50 }
      ]
    }
  ];

  // Load data on mount
  useEffect(() => {
    const loadHealthData = async () => {
      setIsLoading(true);
      
      // Simulate API loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProviders(mockProviders);
      
      // Calculate aggregated metrics
      const totalRequests = mockProviders.reduce((sum, p) => sum + p.requestCount, 0);
      const avgResponseTime = mockProviders.reduce((sum, p) => sum + p.responseTime, 0) / mockProviders.length;
      const avgErrorRate = mockProviders.reduce((sum, p) => sum + p.errorRate, 0) / mockProviders.length;
      const avgUptime = mockProviders.reduce((sum, p) => sum + p.uptime, 0) / mockProviders.length;
      const activeAlerts = mockProviders.filter(p => p.status === 'degraded' || p.status === 'unhealthy').length;
      const criticalIssues = mockProviders.filter(p => p.status === 'unhealthy').length;
      
      setHealthMetrics({
        totalRequests,
        averageResponseTime: avgResponseTime,
        errorRate: avgErrorRate,
        uptime: avgUptime,
        activeAlerts,
        criticalIssues
      });
      
      setIsLoading(false);
      setLastUpdated(new Date());
      
      // Track dashboard usage
      analytics.trackPageView('API Health Dashboard');
    };
    
    loadHealthData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'unhealthy': return 'bg-red-500';
      case 'maintenance': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'unhealthy': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'maintenance': return <Server className="h-4 w-4 text-blue-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const refreshData = () => {
    setIsLoading(true);
    setLastUpdated(new Date());
    // Trigger re-fetch
    window.location.reload();
  };

  // Chart data
  const responseTimeData = providers.map(p => ({
    name: p.name,
    responseTime: p.responseTime,
    errorRate: p.errorRate
  }));

  const quotaData = providers.map(p => ({
    name: p.name,
    used: p.quotaUsed,
    limit: p.quotaLimit,
    percentage: Math.round((p.quotaUsed / p.quotaLimit) * 100)
  }));

  const statusDistribution = [
    { name: 'Healthy', value: providers.filter(p => p.status === 'healthy').length, color: '#10b981' },
    { name: 'Degraded', value: providers.filter(p => p.status === 'degraded').length, color: '#f59e0b' },
    { name: 'Unhealthy', value: providers.filter(p => p.status === 'unhealthy').length, color: '#ef4444' },
    { name: 'Maintenance', value: providers.filter(p => p.status === 'maintenance').length, color: '#3b82f6' }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading API health data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">API Health Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of financial data providers
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {healthMetrics.criticalIssues > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            {healthMetrics.criticalIssues} critical issue(s) detected in API providers. 
            Immediate attention required.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthMetrics.totalRequests.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Last 24 hours</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(healthMetrics.averageResponseTime)}ms</div>
            <div className="text-xs text-muted-foreground">
              {healthMetrics.averageResponseTime > 1000 ? (
                <span className="text-red-500 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Slow
                </span>
              ) : (
                <span className="text-green-500 flex items-center">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Good
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthMetrics.errorRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">
              {healthMetrics.errorRate > 5 ? (
                <span className="text-red-500">High</span>
              ) : healthMetrics.errorRate > 2 ? (
                <span className="text-yellow-500">Moderate</span>
              ) : (
                <span className="text-green-500">Low</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthMetrics.uptime.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">
              {healthMetrics.uptime > 99 ? (
                <span className="text-green-500">Excellent</span>
              ) : healthMetrics.uptime > 95 ? (
                <span className="text-yellow-500">Good</span>
              ) : (
                <span className="text-red-500">Poor</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{healthMetrics.activeAlerts}</div>
            <div className="text-xs text-muted-foreground">Requiring attention</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{healthMetrics.criticalIssues}</div>
            <div className="text-xs text-muted-foreground">Immediate action needed</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="quotas">Quotas</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="providers">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {providers.map((provider) => (
              <Card key={provider.id} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      {getStatusIcon(provider.status)}
                      <span>{provider.name}</span>
                    </CardTitle>
                    <Badge variant={provider.status === 'healthy' ? 'default' : 'destructive'}>
                      {provider.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Response Time</div>
                        <div className="text-lg font-semibold">{provider.responseTime}ms</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Error Rate</div>
                        <div className="text-lg font-semibold">{provider.errorRate}%</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Uptime</div>
                        <div className="text-lg font-semibold">{provider.uptime}%</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Requests</div>
                        <div className="text-lg font-semibold">{provider.requestCount}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">Quota Usage</div>
                      <Progress 
                        value={(provider.quotaUsed / provider.quotaLimit) * 100} 
                        className="h-2"
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        {provider.quotaUsed} / {provider.quotaLimit} requests
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">Endpoints</div>
                      <div className="space-y-1">
                        {provider.endpoints.map((endpoint, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="flex items-center space-x-2">
                              {getStatusIcon(endpoint.status)}
                              <span>{endpoint.method} {endpoint.path}</span>
                            </span>
                            <span className="text-muted-foreground">{endpoint.responseTime}ms</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Response Time by Provider</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={responseTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="responseTime" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Provider Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quotas">
          <Card>
            <CardHeader>
              <CardTitle>API Quota Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quotaData.map((quota, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{quota.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {quota.used} / {quota.limit} ({quota.percentage}%)
                      </span>
                    </div>
                    <Progress 
                      value={quota.percentage} 
                      className={`h-2 ${quota.percentage > 90 ? 'bg-red-100' : quota.percentage > 70 ? 'bg-yellow-100' : 'bg-green-100'}`}
                    />
                    {quota.percentage > 90 && (
                      <div className="text-xs text-red-600 flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        High quota usage - consider optimization
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Error Rate Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={responseTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="errorRate" stroke="#ef4444" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {providers
                    .filter(p => p.errorRate > 0)
                    .sort((a, b) => b.errorRate - a.errorRate)
                    .slice(0, 5)
                    .map((provider, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(provider.status)}`} />
                          <div>
                            <div className="font-medium">{provider.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {provider.endpoints.find(e => e.lastError)?.lastError || 'Generic error'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-red-600">{provider.errorRate}%</div>
                          <div className="text-sm text-muted-foreground">error rate</div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default APIHealthDashboard;