import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';

interface ApiProvider {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'disabled';
  calls: number;
  quota: number;
  resetTime: string;
  responseTime: number;
  errorRate: number;
  lastCall: string;
  isRealKey: boolean;
}

interface ApiStats {
  totalCalls: number;
  successRate: number;
  avgResponseTime: number;
  costSavings: number;
  providers: ApiProvider[];
}

export default function ApiMonitoring() {
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const fetchApiStats = async () => {
    try {
      setIsLoading(true);
      
      // Mock data - in real implementation, this would call /admin/api-status
      const mockStats: ApiStats = {
        totalCalls: 8247,
        successRate: 97.8,
        avgResponseTime: 245,
        costSavings: 2847,
        providers: [
          {
            name: 'Alpha Vantage',
            status: 'healthy',
            calls: 23,
            quota: 25,
            resetTime: '2024-01-16T00:00:00Z',
            responseTime: 189,
            errorRate: 0.0,
            lastCall: '2024-01-15T14:23:12Z',
            isRealKey: true
          },
          {
            name: 'Twelve Data',
            status: 'healthy',
            calls: 547,
            quota: 800,
            resetTime: '2024-01-16T00:00:00Z',
            responseTime: 234,
            errorRate: 1.2,
            lastCall: '2024-01-15T14:24:01Z',
            isRealKey: true
          },
          {
            name: 'FMP',
            status: 'warning',
            calls: 189,
            quota: 250,
            resetTime: '2024-01-16T00:00:00Z',
            responseTime: 456,
            errorRate: 2.8,
            lastCall: '2024-01-15T14:22:45Z',
            isRealKey: true
          },
          {
            name: 'Finnhub',
            status: 'error',
            calls: 3456,
            quota: 3600,
            resetTime: '2024-01-15T15:00:00Z',
            responseTime: 123,
            errorRate: 8.5,
            lastCall: '2024-01-15T14:25:33Z',
            isRealKey: true
          },
          {
            name: 'Yahoo Finance',
            status: 'healthy',
            calls: 32,
            quota: 999999,
            resetTime: 'N/A',
            responseTime: 298,
            errorRate: 0.5,
            lastCall: '2024-01-15T14:21:18Z',
            isRealKey: false
          }
        ]
      };
      
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch API stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApiStats();
    
    // Auto-refresh every 15 seconds
    const interval = setInterval(fetchApiStats, 15000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'disabled': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return AlertTriangle;
      case 'disabled': return Clock;
      default: return Clock;
    }
  };

  const formatTime = (isoString: string) => {
    if (isoString === 'N/A') return 'N/A';
    return new Date(isoString).toLocaleTimeString();
  };

  const getUsageColor = (used: number, total: number) => {
    const percentage = (used / total) * 100;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">API Monitoring</h3>
            <p className="text-sm text-gray-600">
              Real-time monitoring of all financial data providers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowApiKeys(!showApiKeys)}
              className="gap-2"
            >
              {showApiKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showApiKeys ? 'Hide' : 'Show'} Keys
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchApiStats}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCalls.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.successRate}%</div>
              <p className="text-xs text-muted-foreground">Above target (95%)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.avgResponseTime}ms</div>
              <p className="text-xs text-muted-foreground">Under 500ms target</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats?.costSavings}</div>
              <p className="text-xs text-muted-foreground">Cached API calls</p>
            </CardContent>
          </Card>
        </div>

        {/* Provider Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              API Provider Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.providers.map((provider) => {
                const StatusIcon = getStatusIcon(provider.status);
                const usagePercent = (provider.calls / provider.quota) * 100;
                
                return (
                  <div key={provider.name} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <StatusIcon className={`w-5 h-5 ${getStatusColor(provider.status).split(' ')[0]}`} />
                        <div>
                          <h4 className="font-semibold">{provider.name}</h4>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(provider.status)}>
                              {provider.status.toUpperCase()}
                            </Badge>
                            {provider.isRealKey ? (
                              <Badge variant="outline" className="text-green-600 border-green-200">
                                REAL KEY
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-orange-600 border-orange-200">
                                FREE API
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right text-sm">
                        <div className={`font-bold ${getUsageColor(provider.calls, provider.quota)}`}>
                          {provider.calls.toLocaleString()}/{provider.quota.toLocaleString()}
                        </div>
                        <div className="text-gray-500">calls used</div>
                      </div>
                    </div>

                    {/* Usage Progress Bar */}
                    <div className="mb-3">
                      <Progress 
                        value={Math.min(usagePercent, 100)} 
                        className="h-2"
                        // className={`h-2 ${usagePercent >= 90 ? 'bg-red-100' : usagePercent >= 75 ? 'bg-yellow-100' : 'bg-green-100'}`}
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>{usagePercent.toFixed(1)}% used</span>
                        <span>Resets: {formatTime(provider.resetTime)}</span>
                      </div>
                    </div>

                    {/* Provider Stats */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Response Time</div>
                        <div className="font-medium">{provider.responseTime}ms</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Error Rate</div>
                        <div className={`font-medium ${provider.errorRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                          {provider.errorRate}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Last Call</div>
                        <div className="font-medium">{formatTime(provider.lastCall)}</div>
                      </div>
                    </div>

                    {/* API Key Info (if showing) */}
                    {showApiKeys && (
                      <div className="mt-3 p-3 bg-gray-50 rounded border-l-4 border-blue-500">
                        <div className="text-xs font-mono text-gray-700">
                          API Key: {provider.isRealKey ? '••••••••••••••••' : 'FREE_API_NO_KEY'}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Critical Alerts */}
        <div className="space-y-4">
          {stats?.providers.some(p => p.status === 'error') && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Critical:</strong> One or more API providers are experiencing errors. 
                System will automatically fallback to Yahoo Finance.
              </AlertDescription>
            </Alert>
          )}
          
          {stats?.providers.some(p => (p.calls / p.quota) > 0.9) && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Warning:</strong> Some API providers are approaching their daily limits. 
                Consider upgrading to paid tiers for higher quotas.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}