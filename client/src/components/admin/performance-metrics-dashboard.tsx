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
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { 
  Zap, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Monitor,
  Clock,
  Download,
  Upload,
  Gauge,
  AlertTriangle,
  CheckCircle,
  Package,
  Globe,
  Cpu,
  MemoryStick,
  HardDrive,
  Wifi
} from 'lucide-react';
import { performanceMonitor, analytics } from '@/lib/monitoring';

// Performance metrics interfaces
interface PerformanceMetrics {
  overallScore: number;
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  bundleSize: number;
  cacheHitRate: number;
  networkLatency: number;
  errorRate: number;
}

interface WebVitalsMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  inp: number; // Interaction to Next Paint
  timestamp: Date;
  page: string;
  score: number;
}

interface ComponentPerformance {
  name: string;
  renderTime: number;
  memoryUsage: number;
  reRenderCount: number;
  lastRender: Date;
  status: 'excellent' | 'good' | 'needs-improvement' | 'poor';
}

interface BundleAnalysis {
  totalSize: number;
  gzippedSize: number;
  chunkCount: number;
  largestChunks: BundleChunk[];
  duplicatedModules: string[];
  unusedCode: number;
  treeShakingScore: number;
}

interface BundleChunk {
  name: string;
  size: number;
  gzippedSize: number;
  modules: string[];
  loadTime: number;
  lazy: boolean;
}

interface NetworkMetrics {
  requestCount: number;
  averageLatency: number;
  bandwidthUsage: number;
  cacheHitRate: number;
  compressionRatio: number;
  cdnHitRate: number;
  slowestEndpoints: EndpointMetric[];
}

interface EndpointMetric {
  endpoint: string;
  averageTime: number;
  requestCount: number;
  errorRate: number;
  cacheHitRate: number;
}

const PerformanceMetricsDashboard: React.FC = () => {
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    overallScore: 0,
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    bundleSize: 0,
    cacheHitRate: 0,
    networkLatency: 0,
    errorRate: 0
  });
  const [webVitals, setWebVitals] = useState<WebVitalsMetrics[]>([]);
  const [componentPerformance, setComponentPerformance] = useState<ComponentPerformance[]>([]);
  const [bundleAnalysis, setBundleAnalysis] = useState<BundleAnalysis | null>(null);
  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Mock data
  const mockWebVitals: WebVitalsMetrics[] = [
    { fcp: 1200, lcp: 2400, fid: 85, cls: 0.05, ttfb: 450, inp: 95, timestamp: new Date(), page: '/dashboard', score: 92 },
    { fcp: 1800, lcp: 3200, fid: 120, cls: 0.08, ttfb: 680, inp: 135, timestamp: new Date(), page: '/stock-detail', score: 78 },
    { fcp: 900, lcp: 1800, fid: 45, cls: 0.03, ttfb: 320, inp: 65, timestamp: new Date(), page: '/portfolios', score: 96 },
    { fcp: 1600, lcp: 2800, fid: 95, cls: 0.06, ttfb: 520, inp: 105, timestamp: new Date(), page: '/watchlists', score: 85 },
    { fcp: 1400, lcp: 2600, fid: 110, cls: 0.04, ttfb: 480, inp: 125, timestamp: new Date(), page: '/find-stocks', score: 88 }
  ];

  const mockComponentPerformance: ComponentPerformance[] = [
    { name: 'StockCard', renderTime: 8.2, memoryUsage: 2.1, reRenderCount: 3, lastRender: new Date(), status: 'excellent' },
    { name: 'Portfolio', renderTime: 25.6, memoryUsage: 8.4, reRenderCount: 12, lastRender: new Date(), status: 'good' },
    { name: 'ChartWidget', renderTime: 45.3, memoryUsage: 15.2, reRenderCount: 8, lastRender: new Date(), status: 'needs-improvement' },
    { name: 'WatchlistTable', renderTime: 12.1, memoryUsage: 4.8, reRenderCount: 5, lastRender: new Date(), status: 'good' },
    { name: 'NewsWidget', renderTime: 67.8, memoryUsage: 22.1, reRenderCount: 15, lastRender: new Date(), status: 'poor' }
  ];

  const mockBundleAnalysis: BundleAnalysis = {
    totalSize: 1847000, // 1.8MB
    gzippedSize: 512000, // 512KB
    chunkCount: 12,
    largestChunks: [
      { name: 'main.js', size: 456000, gzippedSize: 124000, modules: ['react', 'react-dom'], loadTime: 230, lazy: false },
      { name: 'charts.js', size: 387000, gzippedSize: 98000, modules: ['recharts', 'chart.js'], loadTime: 180, lazy: true },
      { name: 'ui.js', size: 234000, gzippedSize: 67000, modules: ['lucide-react', 'radix-ui'], loadTime: 120, lazy: false },
      { name: 'utils.js', size: 156000, gzippedSize: 45000, modules: ['lodash', 'date-fns'], loadTime: 80, lazy: false }
    ],
    duplicatedModules: ['lodash', 'moment', 'axios'],
    unusedCode: 15.3,
    treeShakingScore: 78
  };

  const mockNetworkMetrics: NetworkMetrics = {
    requestCount: 1250,
    averageLatency: 245,
    bandwidthUsage: 2.4,
    cacheHitRate: 78.5,
    compressionRatio: 68.2,
    cdnHitRate: 89.1,
    slowestEndpoints: [
      { endpoint: '/api/stock/chart', averageTime: 1250, requestCount: 450, errorRate: 2.1, cacheHitRate: 45.2 },
      { endpoint: '/api/portfolio/summary', averageTime: 890, requestCount: 320, errorRate: 1.8, cacheHitRate: 67.3 },
      { endpoint: '/api/market/news', averageTime: 750, requestCount: 280, errorRate: 3.2, cacheHitRate: 23.1 }
    ]
  };

  const mockPerformanceMetrics: PerformanceMetrics = {
    overallScore: 87,
    loadTime: 1.8,
    renderTime: 12.5,
    memoryUsage: 45.2,
    bundleSize: 1.8,
    cacheHitRate: 78.5,
    networkLatency: 245,
    errorRate: 2.1
  };

  // Load data on mount
  useEffect(() => {
    const loadPerformanceData = async () => {
      setIsLoading(true);
      
      // Simulate API loading
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      setPerformanceMetrics(mockPerformanceMetrics);
      setWebVitals(mockWebVitals);
      setComponentPerformance(mockComponentPerformance);
      setBundleAnalysis(mockBundleAnalysis);
      setNetworkMetrics(mockNetworkMetrics);
      
      setIsLoading(false);
      setLastUpdated(new Date());
      
      // Track dashboard usage
      analytics.trackPageView('Performance Metrics Dashboard');
    };
    
    loadPerformanceData();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(loadPerformanceData, 60000);
    return () => clearInterval(interval);
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreColorBg = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getPerformanceStatus = (status: string) => {
    switch (status) {
      case 'excellent': return { color: 'bg-green-500', text: 'Excellent' };
      case 'good': return { color: 'bg-blue-500', text: 'Good' };
      case 'needs-improvement': return { color: 'bg-yellow-500', text: 'Needs Improvement' };
      case 'poor': return { color: 'bg-red-500', text: 'Poor' };
      default: return { color: 'bg-gray-500', text: 'Unknown' };
    }
  };

  const getVitalThreshold = (metric: string, value: number) => {
    const thresholds = {
      fcp: { good: 1800, poor: 3000 },
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      ttfb: { good: 800, poor: 1800 },
      inp: { good: 200, poor: 500 }
    };
    
    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return 'good';
    
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  };

  const refreshData = () => {
    setIsLoading(true);
    setLastUpdated(new Date());
    window.location.reload();
  };

  // Chart data
  const vitalsRadarData = [
    { subject: 'FCP', score: 100 - (webVitals[0]?.fcp || 0) / 30 },
    { subject: 'LCP', score: 100 - (webVitals[0]?.lcp || 0) / 40 },
    { subject: 'FID', score: 100 - (webVitals[0]?.fid || 0) / 3 },
    { subject: 'CLS', score: 100 - (webVitals[0]?.cls || 0) * 400 },
    { subject: 'TTFB', score: 100 - (webVitals[0]?.ttfb || 0) / 18 },
    { subject: 'INP', score: 100 - (webVitals[0]?.inp || 0) / 5 }
  ];

  const componentChart = componentPerformance.map(comp => ({
    name: comp.name,
    renderTime: comp.renderTime,
    memoryUsage: comp.memoryUsage,
    reRenderCount: comp.reRenderCount
  }));

  const bundleChart = bundleAnalysis?.largestChunks.map(chunk => ({
    name: chunk.name,
    size: Math.round(chunk.size / 1024),
    gzipped: Math.round(chunk.gzippedSize / 1024),
    loadTime: chunk.loadTime
  })) || [];

  const networkChart = networkMetrics?.slowestEndpoints.map(endpoint => ({
    name: endpoint.endpoint.split('/').pop(),
    latency: endpoint.averageTime,
    requests: endpoint.requestCount,
    errorRate: endpoint.errorRate
  })) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading performance metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Performance Metrics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive performance monitoring and optimization insights
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

      {/* Performance Score Alert */}
      {performanceMetrics.overallScore < 70 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            Overall performance score is below optimal threshold ({performanceMetrics.overallScore}/100). 
            Consider optimizing bundle size, reducing render times, and improving caching strategies.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Gauge className="h-4 w-4 mr-2" />
              Overall Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(performanceMetrics.overallScore)}`}>
              {performanceMetrics.overallScore}
            </div>
            <div className="text-xs text-muted-foreground">
              {performanceMetrics.overallScore >= 90 ? 'Excellent' : 
               performanceMetrics.overallScore >= 70 ? 'Good' : 'Needs improvement'}
            </div>
            <Progress value={performanceMetrics.overallScore} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Load Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMetrics.loadTime}s</div>
            <div className="text-xs text-muted-foreground">
              {performanceMetrics.loadTime < 2 ? (
                <span className="text-green-500">Fast</span>
              ) : performanceMetrics.loadTime < 4 ? (
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
              <Package className="h-4 w-4 mr-2" />
              Bundle Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMetrics.bundleSize}MB</div>
            <div className="text-xs text-muted-foreground">
              {bundleAnalysis && (
                <span>{Math.round(bundleAnalysis.gzippedSize / 1024)}KB gzipped</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <MemoryStick className="h-4 w-4 mr-2" />
              Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMetrics.memoryUsage}MB</div>
            <div className="text-xs text-muted-foreground">
              {performanceMetrics.memoryUsage < 50 ? (
                <span className="text-green-500">Optimal</span>
              ) : performanceMetrics.memoryUsage < 100 ? (
                <span className="text-yellow-500">Moderate</span>
              ) : (
                <span className="text-red-500">High</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="vitals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vitals">Web Vitals</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="bundle">Bundle Analysis</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
        </TabsList>

        <TabsContent value="vitals">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Web Vitals Radar</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={vitalsRadarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis />
                    <Radar name="Performance" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Core Web Vitals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {webVitals.slice(0, 3).map((vital, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{vital.page}</span>
                        <Badge className={getScoreColorBg(vital.score)}>
                          {vital.score}/100
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span>FCP:</span>
                          <span className={`font-medium ${getVitalThreshold('fcp', vital.fcp) === 'good' ? 'text-green-600' : getVitalThreshold('fcp', vital.fcp) === 'needs-improvement' ? 'text-yellow-600' : 'text-red-600'}`}>
                            {vital.fcp}ms
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>LCP:</span>
                          <span className={`font-medium ${getVitalThreshold('lcp', vital.lcp) === 'good' ? 'text-green-600' : getVitalThreshold('lcp', vital.lcp) === 'needs-improvement' ? 'text-yellow-600' : 'text-red-600'}`}>
                            {vital.lcp}ms
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>FID:</span>
                          <span className={`font-medium ${getVitalThreshold('fid', vital.fid) === 'good' ? 'text-green-600' : getVitalThreshold('fid', vital.fid) === 'needs-improvement' ? 'text-yellow-600' : 'text-red-600'}`}>
                            {vital.fid}ms
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>CLS:</span>
                          <span className={`font-medium ${getVitalThreshold('cls', vital.cls) === 'good' ? 'text-green-600' : getVitalThreshold('cls', vital.cls) === 'needs-improvement' ? 'text-yellow-600' : 'text-red-600'}`}>
                            {vital.cls}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>TTFB:</span>
                          <span className={`font-medium ${getVitalThreshold('ttfb', vital.ttfb) === 'good' ? 'text-green-600' : getVitalThreshold('ttfb', vital.ttfb) === 'needs-improvement' ? 'text-yellow-600' : 'text-red-600'}`}>
                            {vital.ttfb}ms
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>INP:</span>
                          <span className={`font-medium ${getVitalThreshold('inp', vital.inp) === 'good' ? 'text-green-600' : getVitalThreshold('inp', vital.inp) === 'needs-improvement' ? 'text-yellow-600' : 'text-red-600'}`}>
                            {vital.inp}ms
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="components">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Component Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={componentChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="renderTime" fill="#3b82f6" name="Render Time (ms)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Component Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {componentPerformance.map((comp, index) => {
                    const status = getPerformanceStatus(comp.status);
                    return (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${status.color}`} />
                          <div>
                            <div className="font-medium">{comp.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {comp.renderTime}ms render • {comp.memoryUsage}MB memory
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{status.text}</Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {comp.reRenderCount} re-renders
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bundle">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Bundle Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Total Size</div>
                      <div className="text-2xl font-bold">{Math.round((bundleAnalysis?.totalSize || 0) / 1024)}KB</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Gzipped</div>
                      <div className="text-2xl font-bold">{Math.round((bundleAnalysis?.gzippedSize || 0) / 1024)}KB</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Tree Shaking</div>
                      <div className="text-2xl font-bold">{bundleAnalysis?.treeShakingScore}%</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Unused Code</div>
                      <div className="text-2xl font-bold">{bundleAnalysis?.unusedCode}%</div>
                    </div>
                  </div>
                  
                  {bundleAnalysis?.duplicatedModules && bundleAnalysis.duplicatedModules.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">Duplicated Modules</div>
                      <div className="flex flex-wrap gap-2">
                        {bundleAnalysis.duplicatedModules.map((module, index) => (
                          <Badge key={index} variant="destructive">
                            {module}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Largest Chunks</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={bundleChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="size" fill="#3b82f6" name="Size (KB)" />
                    <Bar dataKey="gzipped" fill="#10b981" name="Gzipped (KB)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="network">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Network Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Avg Latency</div>
                      <div className="text-2xl font-bold">{networkMetrics?.averageLatency}ms</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Cache Hit Rate</div>
                      <div className="text-2xl font-bold">{networkMetrics?.cacheHitRate}%</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">CDN Hit Rate</div>
                      <div className="text-2xl font-bold">{networkMetrics?.cdnHitRate}%</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Compression</div>
                      <div className="text-2xl font-bold">{networkMetrics?.compressionRatio}%</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">Bandwidth Usage</div>
                    <Progress value={networkMetrics?.bandwidthUsage || 0} className="h-2" />
                    <div className="text-xs text-muted-foreground mt-1">
                      {networkMetrics?.bandwidthUsage}MB/s
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Slowest Endpoints</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={networkChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="latency" fill="#f59e0b" name="Latency (ms)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceMetricsDashboard;