import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Database, 
  Clock, 
  TrendingUp, 
  Users, 
  FileText,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

interface SystemStats {
  apiStatus: {
    totalProviders: number;
    activeProviders: number;
    totalCalls: number;
    remainingQuota: number;
    resetTime: string;
  };
  cache: {
    hitRate: string;
    totalEntries: number;
    memorySaved: string;
    uptime: number;
  };
  scheduler: {
    totalJobs: number;
    activeJobs: number;
    completedRuns: number;
    failedRuns: number;
  };
  users: {
    totalUsers: number;
    activeUsers: number;
    premiumUsers: number;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Mock data for now - in real implementation, this would call backend APIs
      const mockStats: SystemStats = {
        apiStatus: {
          totalProviders: 5,
          activeProviders: 4,
          totalCalls: 2847,
          remainingQuota: 1653,
          resetTime: '2024-01-15T00:00:00Z'
        },
        cache: {
          hitRate: '87.3%',
          totalEntries: 1205,
          memorySaved: '2,847 API calls',
          uptime: 14725 // seconds
        },
        scheduler: {
          totalJobs: 5,
          activeJobs: 3,
          completedRuns: 156,
          failedRuns: 2
        },
        users: {
          totalUsers: 45,
          activeUsers: 23,
          premiumUsers: 8
        }
      };
      
      setStats(mockStats);
    } catch (err) {
      setError('Failed to load system statistics');
      console.error('Failed to fetch admin stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
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

  if (error) {
    return (
      <AdminLayout>
        <div className="p-8">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header with Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">System Overview</h3>
            <p className="text-sm text-gray-600">
              Real-time monitoring of Alfalyzer's core systems
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSensitiveData(!showSensitiveData)}
              className="gap-2"
            >
              {showSensitiveData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showSensitiveData ? 'Hide' : 'Show'} Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStats}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* System Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* API Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats?.apiStatus.activeProviders}/{stats?.apiStatus.totalProviders}
              </div>
              <p className="text-xs text-muted-foreground">
                Active Providers
              </p>
              {showSensitiveData && (
                <div className="mt-2 space-y-1">
                  <div className="text-xs">
                    <span className="font-medium">Calls:</span> {stats?.apiStatus.totalCalls}
                  </div>
                  <div className="text-xs">
                    <span className="font-medium">Remaining:</span> {stats?.apiStatus.remainingQuota}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cache Performance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cache Performance</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats?.cache.hitRate}
              </div>
              <p className="text-xs text-muted-foreground">
                Hit Rate
              </p>
              {showSensitiveData && (
                <div className="mt-2 space-y-1">
                  <div className="text-xs">
                    <span className="font-medium">Entries:</span> {stats?.cache.totalEntries}
                  </div>
                  <div className="text-xs">
                    <span className="font-medium">Saved:</span> {stats?.cache.memorySaved}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Background Jobs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Background Jobs</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats?.scheduler.activeJobs}/{stats?.scheduler.totalJobs}
              </div>
              <p className="text-xs text-muted-foreground">
                Active Jobs
              </p>
              {showSensitiveData && (
                <div className="mt-2 space-y-1">
                  <div className="text-xs">
                    <span className="font-medium">Completed:</span> {stats?.scheduler.completedRuns}
                  </div>
                  <div className="text-xs text-red-600">
                    <span className="font-medium">Failed:</span> {stats?.scheduler.failedRuns}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">
                {stats?.users.activeUsers}
              </div>
              <p className="text-xs text-muted-foreground">
                Active Users
              </p>
              {showSensitiveData && (
                <div className="mt-2 space-y-1">
                  <div className="text-xs">
                    <span className="font-medium">Total:</span> {stats?.users.totalUsers}
                  </div>
                  <div className="text-xs">
                    <span className="font-medium">Premium:</span> {stats?.users.premiumUsers}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* API Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                API Provider Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: 'Alpha Vantage', status: 'healthy', calls: 23, quota: 25 },
                { name: 'Twelve Data', status: 'healthy', calls: 547, quota: 800 },
                { name: 'FMP', status: 'healthy', calls: 89, quota: 250 },
                { name: 'Finnhub', status: 'warning', calls: 3456, quota: 3600 },
                { name: 'Yahoo Finance', status: 'healthy', calls: 12, quota: 999 }
              ].map((provider) => (
                <div key={provider.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      provider.status === 'healthy' ? 'bg-green-500' :
                      provider.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <span className="font-medium">{provider.name}</span>
                  </div>
                  {showSensitiveData && (
                    <div className="text-sm text-gray-600">
                      {provider.calls}/{provider.quota} calls
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* System Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                System Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  All systems operational. Cache hit rate above 85%.
                </AlertDescription>
              </Alert>
              
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  Finnhub API approaching daily limit (96% used).
                </AlertDescription>
              </Alert>

              <div className="text-sm text-gray-600 mt-4">
                <p>System uptime: {stats?.cache.uptime && formatUptime(stats.cache.uptime)}</p>
                <p>Last updated: {new Date().toLocaleTimeString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
                <Database className="w-6 h-6" />
                <span className="text-sm">Clear Cache</span>
              </Button>
              
              <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
                <RefreshCw className="w-6 h-6" />
                <span className="text-sm">Refresh APIs</span>
              </Button>
              
              <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
                <FileText className="w-6 h-6" />
                <span className="text-sm">Export Logs</span>
              </Button>
              
              <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
                <TrendingUp className="w-6 h-6" />
                <span className="text-sm">View Analytics</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}