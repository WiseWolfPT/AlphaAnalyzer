import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  AlertTriangle, 
  Bug, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Search,
  Filter,
  Eye,
  ExternalLink,
  Clock,
  User,
  Code,
  CheckCircle,
  X
} from 'lucide-react';
import { analytics, Sentry } from '@/lib/monitoring';

// Error monitoring interfaces
interface ErrorReport {
  id: string;
  title: string;
  type: 'javascript' | 'api' | 'network' | 'validation' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stackTrace?: string;
  userAgent: string;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  url: string;
  lineNumber?: number;
  columnNumber?: number;
  component?: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  frequency: number;
  affectedUsers: number;
  firstSeen: Date;
  lastSeen: Date;
  environment: 'development' | 'production' | 'staging';
  release?: string;
  tags: string[];
  metadata?: Record<string, any>;
}

interface ErrorStats {
  totalErrors: number;
  newErrors: number;
  resolvedErrors: number;
  errorRate: number;
  averageResolutionTime: number;
  criticalErrors: number;
  affectedUsers: number;
  topErrorTypes: ErrorTypeCount[];
}

interface ErrorTypeCount {
  type: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

interface ErrorTrend {
  timestamp: Date;
  totalErrors: number;
  criticalErrors: number;
  errorRate: number;
  resolvedErrors: number;
}

const ErrorMonitoringDashboard: React.FC = () => {
  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [errorStats, setErrorStats] = useState<ErrorStats>({
    totalErrors: 0,
    newErrors: 0,
    resolvedErrors: 0,
    errorRate: 0,
    averageResolutionTime: 0,
    criticalErrors: 0,
    affectedUsers: 0,
    topErrorTypes: []
  });
  const [errorTrends, setErrorTrends] = useState<ErrorTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Mock error data
  const mockErrors: ErrorReport[] = [
    {
      id: '1',
      title: 'TypeError: Cannot read property of undefined',
      type: 'javascript',
      severity: 'high',
      message: 'Cannot read property \'price\' of undefined',
      stackTrace: 'at StockCard.render (StockCard.tsx:45:12)\n  at Portfolio.render (Portfolio.tsx:89:23)',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      userId: 'user123',
      sessionId: 'session456',
      timestamp: new Date('2024-01-15T10:30:00'),
      url: '/dashboard',
      lineNumber: 45,
      columnNumber: 12,
      component: 'StockCard',
      resolved: false,
      frequency: 23,
      affectedUsers: 8,
      firstSeen: new Date('2024-01-14T14:20:00'),
      lastSeen: new Date('2024-01-15T10:30:00'),
      environment: 'production',
      release: '1.4.2',
      tags: ['frontend', 'portfolio'],
      metadata: { stockSymbol: 'AAPL' }
    },
    {
      id: '2',
      title: 'API Request Failed: 500 Internal Server Error',
      type: 'api',
      severity: 'critical',
      message: 'Failed to fetch stock data from Alpha Vantage API',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      userId: 'user789',
      sessionId: 'session101',
      timestamp: new Date('2024-01-15T11:15:00'),
      url: '/stock/TSLA',
      resolved: false,
      frequency: 45,
      affectedUsers: 18,
      firstSeen: new Date('2024-01-15T09:00:00'),
      lastSeen: new Date('2024-01-15T11:15:00'),
      environment: 'production',
      release: '1.4.2',
      tags: ['backend', 'api', 'alpha-vantage'],
      metadata: { provider: 'alpha-vantage', endpoint: '/quote' }
    },
    {
      id: '3',
      title: 'Network Request Timeout',
      type: 'network',
      severity: 'medium',
      message: 'Request to /api/portfolio/summary timed out after 30s',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
      userId: 'user456',
      sessionId: 'session789',
      timestamp: new Date('2024-01-15T09:45:00'),
      url: '/portfolios',
      resolved: true,
      resolvedAt: new Date('2024-01-15T10:00:00'),
      resolvedBy: 'admin',
      frequency: 12,
      affectedUsers: 5,
      firstSeen: new Date('2024-01-15T08:30:00'),
      lastSeen: new Date('2024-01-15T09:45:00'),
      environment: 'production',
      release: '1.4.2',
      tags: ['network', 'timeout', 'portfolio']
    },
    {
      id: '4',
      title: 'Validation Error: Invalid stock symbol',
      type: 'validation',
      severity: 'low',
      message: 'Stock symbol "INVALIDSTOCK" is not recognized',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      userId: 'user321',
      sessionId: 'session654',
      timestamp: new Date('2024-01-15T12:00:00'),
      url: '/find-stocks',
      resolved: false,
      frequency: 67,
      affectedUsers: 15,
      firstSeen: new Date('2024-01-14T16:00:00'),
      lastSeen: new Date('2024-01-15T12:00:00'),
      environment: 'production',
      release: '1.4.2',
      tags: ['validation', 'stock-search']
    },
    {
      id: '5',
      title: 'Security Alert: Suspicious login attempt',
      type: 'security',
      severity: 'critical',
      message: 'Multiple failed login attempts detected from IP 192.168.1.100',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      sessionId: 'session987',
      timestamp: new Date('2024-01-15T13:20:00'),
      url: '/login',
      resolved: false,
      frequency: 5,
      affectedUsers: 1,
      firstSeen: new Date('2024-01-15T13:15:00'),
      lastSeen: new Date('2024-01-15T13:20:00'),
      environment: 'production',
      release: '1.4.2',
      tags: ['security', 'auth', 'brute-force'],
      metadata: { ipAddress: '192.168.1.100', attemptCount: 5 }
    }
  ];

  const mockErrorTrends: ErrorTrend[] = [
    { timestamp: new Date('2024-01-15T08:00:00'), totalErrors: 45, criticalErrors: 2, errorRate: 2.1, resolvedErrors: 12 },
    { timestamp: new Date('2024-01-15T09:00:00'), totalErrors: 67, criticalErrors: 3, errorRate: 3.2, resolvedErrors: 15 },
    { timestamp: new Date('2024-01-15T10:00:00'), totalErrors: 89, criticalErrors: 5, errorRate: 4.1, resolvedErrors: 18 },
    { timestamp: new Date('2024-01-15T11:00:00'), totalErrors: 123, criticalErrors: 8, errorRate: 5.8, resolvedErrors: 22 },
    { timestamp: new Date('2024-01-15T12:00:00'), totalErrors: 156, criticalErrors: 12, errorRate: 7.2, resolvedErrors: 28 }
  ];

  // Load data on mount
  useEffect(() => {
    const loadErrorData = async () => {
      setIsLoading(true);
      
      // Simulate API loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setErrors(mockErrors);
      setErrorTrends(mockErrorTrends);
      
      // Calculate error stats
      const totalErrors = mockErrors.length;
      const newErrors = mockErrors.filter(e => !e.resolved).length;
      const resolvedErrors = mockErrors.filter(e => e.resolved).length;
      const criticalErrors = mockErrors.filter(e => e.severity === 'critical').length;
      const affectedUsers = new Set(mockErrors.map(e => e.userId).filter(Boolean)).size;
      
      const errorTypeCount: Record<string, number> = {};
      mockErrors.forEach(error => {
        errorTypeCount[error.type] = (errorTypeCount[error.type] || 0) + 1;
      });
      
      const topErrorTypes = Object.entries(errorTypeCount)
        .map(([type, count]) => ({
          type,
          count,
          percentage: (count / totalErrors) * 100,
          trend: 'stable' as const
        }))
        .sort((a, b) => b.count - a.count);
      
      setErrorStats({
        totalErrors,
        newErrors,
        resolvedErrors,
        errorRate: 5.8,
        averageResolutionTime: 145,
        criticalErrors,
        affectedUsers,
        topErrorTypes
      });
      
      setIsLoading(false);
      setLastUpdated(new Date());
      
      // Track dashboard usage
      analytics.trackPageView('Error Monitoring Dashboard');
    };
    
    loadErrorData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadErrorData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'javascript': return <Code className="h-4 w-4" />;
      case 'api': return <ExternalLink className="h-4 w-4" />;
      case 'network': return <AlertTriangle className="h-4 w-4" />;
      case 'validation': return <AlertCircle className="h-4 w-4" />;
      case 'security': return <Bug className="h-4 w-4" />;
      default: return <Bug className="h-4 w-4" />;
    }
  };

  const resolveError = (errorId: string) => {
    setErrors(prev => prev.map(error => 
      error.id === errorId 
        ? { ...error, resolved: true, resolvedAt: new Date(), resolvedBy: 'admin' }
        : error
    ));
    
    // Track resolution
    analytics.trackPortfolioAction('error_resolved', errorId);
  };

  const filteredErrors = errors.filter(error => {
    if (searchTerm && !error.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !error.message.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (severityFilter !== 'all' && error.severity !== severityFilter) {
      return false;
    }
    if (typeFilter !== 'all' && error.type !== typeFilter) {
      return false;
    }
    if (statusFilter === 'resolved' && !error.resolved) {
      return false;
    }
    if (statusFilter === 'unresolved' && error.resolved) {
      return false;
    }
    return true;
  });

  const refreshData = () => {
    setIsLoading(true);
    setLastUpdated(new Date());
    window.location.reload();
  };

  // Chart data
  const trendChartData = errorTrends.map(trend => ({
    time: trend.timestamp.toLocaleTimeString(),
    total: trend.totalErrors,
    critical: trend.criticalErrors,
    rate: trend.errorRate,
    resolved: trend.resolvedErrors
  }));

  const errorTypeChartData = errorStats.topErrorTypes.map(type => ({
    name: type.type,
    count: type.count,
    percentage: type.percentage
  }));

  const severityDistribution = [
    { name: 'Critical', value: errors.filter(e => e.severity === 'critical').length, color: '#ef4444' },
    { name: 'High', value: errors.filter(e => e.severity === 'high').length, color: '#f97316' },
    { name: 'Medium', value: errors.filter(e => e.severity === 'medium').length, color: '#eab308' },
    { name: 'Low', value: errors.filter(e => e.severity === 'low').length, color: '#3b82f6' }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading error monitoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Error Monitoring Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time error tracking and resolution management
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
      {errorStats.criticalErrors > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            {errorStats.criticalErrors} critical error(s) detected. 
            Immediate attention required to prevent service disruption.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Bug className="h-4 w-4 mr-2" />
              Total Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorStats.totalErrors}</div>
            <div className="text-xs text-muted-foreground">
              {errorStats.newErrors} new, {errorStats.resolvedErrors} resolved
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Error Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorStats.errorRate}%</div>
            <div className="text-xs text-muted-foreground">
              {errorStats.errorRate > 5 ? (
                <span className="text-red-500 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  High
                </span>
              ) : (
                <span className="text-green-500 flex items-center">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Normal
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Avg Resolution Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorStats.averageResolutionTime}m</div>
            <div className="text-xs text-muted-foreground">
              {errorStats.averageResolutionTime < 120 ? (
                <span className="text-green-500">Fast</span>
              ) : errorStats.averageResolutionTime < 300 ? (
                <span className="text-yellow-500">Moderate</span>
              ) : (
                <span className="text-red-500">Slow</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <User className="h-4 w-4 mr-2" />
              Affected Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorStats.affectedUsers}</div>
            <div className="text-xs text-muted-foreground">
              {((errorStats.affectedUsers / 1000) * 100).toFixed(1)}% of total users
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="errors">Error List</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Error Reports</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search errors..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severity</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="javascript">JavaScript</SelectItem>
                      <SelectItem value="api">API</SelectItem>
                      <SelectItem value="network">Network</SelectItem>
                      <SelectItem value="validation">Validation</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="unresolved">Unresolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredErrors.map((error) => (
                  <div key={error.id} className="p-4 border rounded-lg bg-card">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {getTypeIcon(error.type)}
                        <div>
                          <h3 className="font-medium">{error.title}</h3>
                          <p className="text-sm text-muted-foreground">{error.message}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getSeverityBadgeVariant(error.severity)}>
                          {error.severity}
                        </Badge>
                        {error.resolved ? (
                          <Badge variant="secondary">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Resolved
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveError(error.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Frequency:</span> {error.frequency}
                      </div>
                      <div>
                        <span className="font-medium">Users:</span> {error.affectedUsers}
                      </div>
                      <div>
                        <span className="font-medium">Last seen:</span> {error.lastSeen.toLocaleTimeString()}
                      </div>
                      <div>
                        <span className="font-medium">Environment:</span> {error.environment}
                      </div>
                    </div>
                    
                    {error.stackTrace && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                          Show stack trace
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                          {error.stackTrace}
                        </pre>
                      </details>
                    )}
                    
                    <div className="flex flex-wrap gap-1 mt-2">
                      {error.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Error Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} name="Total Errors" />
                    <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} name="Critical" />
                    <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} name="Resolved" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Rate Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="rate" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Error Types Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={errorTypeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Severity Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={severityDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {severityDistribution.map((entry, index) => (
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
      </Tabs>
    </div>
  );
};

export default ErrorMonitoringDashboard;