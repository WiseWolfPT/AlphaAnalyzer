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
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Users, 
  MousePointer, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Globe,
  Smartphone,
  Monitor,
  AlertTriangle,
  Eye,
  Navigation,
  Zap
} from 'lucide-react';
import { performanceMonitor, analytics } from '@/lib/monitoring';

// Real User Monitoring interfaces
interface UserSession {
  id: string;
  userId?: string;
  sessionStart: Date;
  sessionEnd?: Date;
  duration: number;
  pageViews: number;
  bounceRate: boolean;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  location: string;
  subscriptionTier: 'free' | 'premium' | 'pro';
  userAgent: string;
  actions: UserAction[];
}

interface UserAction {
  type: 'click' | 'scroll' | 'form_submit' | 'api_call' | 'navigation';
  timestamp: Date;
  element?: string;
  page: string;
  metadata?: Record<string, any>;
}

interface WebVitals {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  timestamp: Date;
  page: string;
  deviceType: string;
}

interface RUMMetrics {
  activeUsers: number;
  totalSessions: number;
  averageSessionDuration: number;
  bounceRate: number;
  pageViews: number;
  topPages: PageMetric[];
  performanceScore: number;
  errorRate: number;
  conversionRate: number;
}

interface PageMetric {
  page: string;
  views: number;
  avgLoadTime: number;
  exitRate: number;
  uniqueUsers: number;
}

interface UserFlow {
  from: string;
  to: string;
  count: number;
  percentage: number;
  avgTime: number;
}

const RUMDashboard: React.FC = () => {
  const [rumMetrics, setRumMetrics] = useState<RUMMetrics>({
    activeUsers: 0,
    totalSessions: 0,
    averageSessionDuration: 0,
    bounceRate: 0,
    pageViews: 0,
    topPages: [],
    performanceScore: 0,
    errorRate: 0,
    conversionRate: 0
  });
  const [webVitals, setWebVitals] = useState<WebVitals[]>([]);
  const [userFlows, setUserFlows] = useState<UserFlow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  // Mock data
  const mockWebVitals: WebVitals[] = [
    { fcp: 1200, lcp: 2400, fid: 85, cls: 0.05, ttfb: 450, timestamp: new Date(), page: '/dashboard', deviceType: 'desktop' },
    { fcp: 1800, lcp: 3200, fid: 120, cls: 0.08, ttfb: 680, timestamp: new Date(), page: '/stock-detail', deviceType: 'mobile' },
    { fcp: 900, lcp: 1800, fid: 45, cls: 0.03, ttfb: 320, timestamp: new Date(), page: '/portfolios', deviceType: 'desktop' },
    { fcp: 1600, lcp: 2800, fid: 95, cls: 0.06, ttfb: 520, timestamp: new Date(), page: '/watchlists', deviceType: 'tablet' },
    { fcp: 1400, lcp: 2600, fid: 110, cls: 0.04, ttfb: 480, timestamp: new Date(), page: '/find-stocks', deviceType: 'mobile' }
  ];

  const mockUserFlows: UserFlow[] = [
    { from: 'Landing', to: 'Dashboard', count: 1250, percentage: 45.2, avgTime: 125 },
    { from: 'Dashboard', to: 'Stock Detail', count: 890, percentage: 32.1, avgTime: 89 },
    { from: 'Stock Detail', to: 'Portfolios', count: 650, percentage: 23.5, avgTime: 156 },
    { from: 'Portfolios', to: 'Watchlists', count: 420, percentage: 15.1, avgTime: 98 },
    { from: 'Find Stocks', to: 'Stock Detail', count: 780, percentage: 28.2, avgTime: 67 }
  ];

  const mockRumMetrics: RUMMetrics = {
    activeUsers: 1847,
    totalSessions: 3920,
    averageSessionDuration: 342,
    bounceRate: 32.8,
    pageViews: 12650,
    topPages: [
      { page: '/dashboard', views: 3450, avgLoadTime: 1200, exitRate: 25.3, uniqueUsers: 1890 },
      { page: '/stock-detail', views: 2890, avgLoadTime: 1800, exitRate: 35.7, uniqueUsers: 1650 },
      { page: '/portfolios', views: 2340, avgLoadTime: 950, exitRate: 28.9, uniqueUsers: 1420 },
      { page: '/watchlists', views: 1980, avgLoadTime: 1100, exitRate: 31.2, uniqueUsers: 1230 },
      { page: '/find-stocks', views: 1990, avgLoadTime: 1350, exitRate: 29.8, uniqueUsers: 1280 }
    ],
    performanceScore: 87,
    errorRate: 2.3,
    conversionRate: 8.7
  };

  // Load data on mount
  useEffect(() => {
    const loadRUMData = async () => {
      setIsLoading(true);
      
      // Simulate API loading
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setRumMetrics(mockRumMetrics);
      setWebVitals(mockWebVitals);
      setUserFlows(mockUserFlows);
      
      setIsLoading(false);
      setLastUpdated(new Date());
      
      // Track dashboard usage
      analytics.trackPageView('RUM Dashboard');
    };
    
    loadRUMData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadRUMData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const refreshData = () => {
    setIsLoading(true);
    setLastUpdated(new Date());
    // Trigger re-fetch
    window.location.reload();
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getVitalsColor = (metric: string, value: number) => {
    const thresholds = {
      fcp: { good: 1800, poor: 3000 },
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      ttfb: { good: 800, poor: 1800 }
    };
    
    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return 'text-gray-500';
    
    if (value <= threshold.good) return 'text-green-500';
    if (value <= threshold.poor) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Chart data
  const vitalsChartData = webVitals.map(v => ({
    page: v.page.replace('/', ''),
    FCP: v.fcp,
    LCP: v.lcp,
    FID: v.fid,
    CLS: v.cls * 1000, // Scale for visibility
    TTFB: v.ttfb
  }));

  const deviceDistribution = [
    { name: 'Desktop', value: 58, color: '#3b82f6' },
    { name: 'Mobile', value: 35, color: '#10b981' },
    { name: 'Tablet', value: 7, color: '#f59e0b' }
  ];

  const browserDistribution = [
    { name: 'Chrome', value: 68, color: '#4285f4' },
    { name: 'Safari', value: 18, color: '#ff6b6b' },
    { name: 'Firefox', value: 9, color: '#ff9500' },
    { name: 'Edge', value: 5, color: '#0078d4' }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading user monitoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Real User Monitoring (RUM)</h1>
          <p className="text-muted-foreground">
            Live user experience and performance insights
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Time Range:</span>
            <Button
              variant={timeRange === '1h' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('1h')}
            >
              1h
            </Button>
            <Button
              variant={timeRange === '24h' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('24h')}
            >
              24h
            </Button>
            <Button
              variant={timeRange === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('7d')}
            >
              7d
            </Button>
            <Button
              variant={timeRange === '30d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('30d')}
            >
              30d
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rumMetrics.activeUsers.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Currently online</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Avg Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(rumMetrics.averageSessionDuration / 60)}m</div>
            <div className="text-xs text-muted-foreground">
              {rumMetrics.averageSessionDuration > 300 ? (
                <span className="text-green-500">Good engagement</span>
              ) : (
                <span className="text-yellow-500">Could improve</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingDown className="h-4 w-4 mr-2" />
              Bounce Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rumMetrics.bounceRate}%</div>
            <div className="text-xs text-muted-foreground">
              {rumMetrics.bounceRate < 40 ? (
                <span className="text-green-500">Low</span>
              ) : rumMetrics.bounceRate < 60 ? (
                <span className="text-yellow-500">Moderate</span>
              ) : (
                <span className="text-red-500">High</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              Performance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(rumMetrics.performanceScore)}`}>
              {rumMetrics.performanceScore}
            </div>
            <div className="text-xs text-muted-foreground">
              {rumMetrics.performanceScore >= 90 ? 'Excellent' : 
               rumMetrics.performanceScore >= 70 ? 'Good' : 'Needs improvement'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rumMetrics.conversionRate}%</div>
            <div className="text-xs text-muted-foreground">
              {rumMetrics.conversionRate > 10 ? (
                <span className="text-green-500">Excellent</span>
              ) : rumMetrics.conversionRate > 5 ? (
                <span className="text-yellow-500">Good</span>
              ) : (
                <span className="text-red-500">Low</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Alerts */}
      {rumMetrics.performanceScore < 70 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-yellow-800">
            Performance score is below optimal threshold. Consider optimizing page load times and user experience.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs defaultValue="vitals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vitals">Web Vitals</TabsTrigger>
          <TabsTrigger value="pages">Top Pages</TabsTrigger>
          <TabsTrigger value="flows">User Flows</TabsTrigger>
          <TabsTrigger value="devices">Devices & Browsers</TabsTrigger>
        </TabsList>

        <TabsContent value="vitals">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Core Web Vitals</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={vitalsChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="page" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="FCP" fill="#3b82f6" name="First Contentful Paint" />
                    <Bar dataKey="LCP" fill="#10b981" name="Largest Contentful Paint" />
                    <Bar dataKey="TTFB" fill="#f59e0b" name="Time to First Byte" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Web Vitals Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {webVitals.map((vital, index) => (
                    <div key={index} className="p-4 bg-muted rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{vital.page}</span>
                        <span className="text-sm text-muted-foreground">{vital.deviceType}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">FCP: </span>
                          <span className={getVitalsColor('fcp', vital.fcp)}>{vital.fcp}ms</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">LCP: </span>
                          <span className={getVitalsColor('lcp', vital.lcp)}>{vital.lcp}ms</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">FID: </span>
                          <span className={getVitalsColor('fid', vital.fid)}>{vital.fid}ms</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">CLS: </span>
                          <span className={getVitalsColor('cls', vital.cls)}>{vital.cls}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">TTFB: </span>
                          <span className={getVitalsColor('ttfb', vital.ttfb)}>{vital.ttfb}ms</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <CardTitle>Top Pages Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rumMetrics.topPages.map((page, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{page.page}</div>
                        <div className="text-sm text-muted-foreground">
                          {page.views.toLocaleString()} views • {page.uniqueUsers.toLocaleString()} unique users
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Load Time: </span>
                        <span className={page.avgLoadTime > 2000 ? 'text-red-500' : page.avgLoadTime > 1500 ? 'text-yellow-500' : 'text-green-500'}>
                          {page.avgLoadTime}ms
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Exit Rate: </span>
                        <span className={page.exitRate > 40 ? 'text-red-500' : page.exitRate > 30 ? 'text-yellow-500' : 'text-green-500'}>
                          {page.exitRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flows">
          <Card>
            <CardHeader>
              <CardTitle>User Flow Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userFlows.map((flow, index) => (
                  <div key={index} className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-4">
                        <Navigation className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{flow.from}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">{flow.to}</span>
                      </div>
                      <Badge variant="secondary">{flow.percentage}%</Badge>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{flow.count.toLocaleString()} transitions</span>
                      <span>Avg time: {flow.avgTime}s</span>
                    </div>
                    <Progress value={flow.percentage} className="mt-2 h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Device Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={deviceDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {deviceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Browser Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={browserDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {browserDistribution.map((entry, index) => (
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

export default RUMDashboard;