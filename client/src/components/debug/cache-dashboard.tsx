import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { RefreshCw, TrendingUp, Database, Zap, Activity, AlertTriangle } from 'lucide-react';

interface CacheStats {
  hits: number;
  misses: number;
  staleHits: number;
  apiCalls: number;
  avgResponseTime: number;
  memoryUsage: number;
  popularStocks: Array<{
    symbol: string;
    score: number;
    factors: {
      recentViews: number;
      uniqueUsers: number;
      searchFrequency: number;
      newsActivity: number;
    };
  }>;
}

interface OptimizationStats {
  totalRequests: number;
  batchedRequests: number;
  deduplicatedRequests: number;
  apiCallsSaved: number;
  avgBatchSize: number;
  costSavings: number;
  quotaUsage: Array<{
    provider: string;
    usage: number;
    limit: number;
  }>;
}

interface PerformanceMetric {
  timestamp: number;
  hitRate: number;
  responseTime: number;
  apiCalls: number;
  memoryUsage: number;
}

export function CacheDashboard() {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [optimizationStats, setOptimizationStats] = useState<OptimizationStats | null>(null);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceMetric[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Load initial data
    refreshStats();

    // Set up real-time updates
    const interval = setInterval(refreshStats, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const refreshStats = async () => {
    setIsRefreshing(true);

    try {
      // In a real implementation, these would be API calls
      const mockCacheStats: CacheStats = {
        hits: 8543,
        misses: 234,
        staleHits: 1205,
        apiCalls: 127,
        avgResponseTime: 45,
        memoryUsage: 34567890,
        popularStocks: [
          {
            symbol: 'AAPL',
            score: 95,
            factors: {
              recentViews: 450,
              uniqueUsers: 23,
              searchFrequency: 89,
              newsActivity: 12
            }
          },
          {
            symbol: 'TSLA',
            score: 87,
            factors: {
              recentViews: 380,
              uniqueUsers: 19,
              searchFrequency: 76,
              newsActivity: 8
            }
          },
          {
            symbol: 'MSFT',
            score: 82,
            factors: {
              recentViews: 320,
              uniqueUsers: 18,
              searchFrequency: 65,
              newsActivity: 5
            }
          }
        ]
      };

      const mockOptimizationStats: OptimizationStats = {
        totalRequests: 9876,
        batchedRequests: 8543,
        deduplicatedRequests: 1234,
        apiCallsSaved: 6789,
        avgBatchSize: 12.4,
        costSavings: 245.67,
        quotaUsage: [
          { provider: 'twelvedata', usage: 456, limit: 800 },
          { provider: 'fmp', usage: 89, limit: 250 },
          { provider: 'finnhub', usage: 23, limit: 60 },
          { provider: 'alphavantage', usage: 12, limit: 25 }
        ]
      };

      setCacheStats(mockCacheStats);
      setOptimizationStats(mockOptimizationStats);

      // Add to performance history
      const newMetric: PerformanceMetric = {
        timestamp: Date.now(),
        hitRate: calculateHitRate(mockCacheStats),
        responseTime: mockCacheStats.avgResponseTime,
        apiCalls: mockCacheStats.apiCalls,
        memoryUsage: mockCacheStats.memoryUsage / (1024 * 1024) // Convert to MB
      };

      setPerformanceHistory(prev => [...prev.slice(-29), newMetric]); // Keep last 30 points
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const calculateHitRate = (stats: CacheStats): number => {
    const total = stats.hits + stats.misses + stats.staleHits;
    return total > 0 ? ((stats.hits + stats.staleHits) / total) * 100 : 0;
  };

  const formatBytes = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  if (!cacheStats || !optimizationStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading cache dashboard...</span>
      </div>
    );
  }

  const hitRate = calculateHitRate(cacheStats);
  const totalQuotaUsed = optimizationStats.quotaUsage.reduce((sum, q) => sum + q.usage, 0);
  const totalQuotaLimit = optimizationStats.quotaUsage.reduce((sum, q) => sum + q.limit, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cache Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of cache efficiency and API optimization
          </p>
        </div>
        <Button onClick={refreshStats} disabled={isRefreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hitRate.toFixed(1)}%</div>
            <Progress value={hitRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Target: 95%+
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls Today</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuotaUsed}</div>
            <Progress value={(totalQuotaUsed / 500) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Limit: 500/day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cacheStats.avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground mt-2">
              Target: &lt;100ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(cacheStats.memoryUsage)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Limit: 500MB
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="optimization">API Optimization</TabsTrigger>
          <TabsTrigger value="popular">Popular Stocks</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cache Hit Rate Over Time</CardTitle>
                <CardDescription>Last 30 data points</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()} 
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'Hit Rate']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="hitRate" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Time Trend</CardTitle>
                <CardDescription>Average response time in milliseconds</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()} 
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value: number) => [`${value}ms`, 'Response Time']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cache Performance Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Cache Hits</span>
                    <Badge variant="secondary">{formatNumber(cacheStats.hits)}</Badge>
                  </div>
                  <Progress value={(cacheStats.hits / (cacheStats.hits + cacheStats.misses + cacheStats.staleHits)) * 100} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Stale Hits</span>
                    <Badge variant="outline">{formatNumber(cacheStats.staleHits)}</Badge>
                  </div>
                  <Progress value={(cacheStats.staleHits / (cacheStats.hits + cacheStats.misses + cacheStats.staleHits)) * 100} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Cache Misses</span>
                    <Badge variant="destructive">{formatNumber(cacheStats.misses)}</Badge>
                  </div>
                  <Progress value={(cacheStats.misses / (cacheStats.hits + cacheStats.misses + cacheStats.staleHits)) * 100} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>API Call Optimization</CardTitle>
                <CardDescription>Request batching and deduplication savings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Total Requests</span>
                    <Badge>{formatNumber(optimizationStats.totalRequests)}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Batched Requests</span>
                    <Badge variant="secondary">{formatNumber(optimizationStats.batchedRequests)}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Deduplicated</span>
                    <Badge variant="outline">{formatNumber(optimizationStats.deduplicatedRequests)}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>API Calls Saved</span>
                    <Badge variant="default">{formatNumber(optimizationStats.apiCallsSaved)}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Avg Batch Size</span>
                    <Badge>{optimizationStats.avgBatchSize.toFixed(1)}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Savings</CardTitle>
                <CardDescription>Estimated savings from optimization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-green-600">
                    ${optimizationStats.costSavings.toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Saved this month through smart batching
                  </p>
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <div className="text-sm font-medium text-green-800">
                      Efficiency: {((optimizationStats.apiCallsSaved / optimizationStats.totalRequests) * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-green-700 mt-1">
                      API calls reduced through optimization
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="popular" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Popular Stocks Analytics</CardTitle>
              <CardDescription>Most accessed stocks and their activity metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cacheStats.popularStocks.map((stock, index) => (
                  <div key={stock.symbol} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="font-mono text-lg font-bold">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-lg">{stock.symbol}</span>
                        <Badge variant="default">Score: {stock.score}</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm text-muted-foreground">
                        <div>Views: {stock.factors.recentViews}</div>
                        <div>Users: {stock.factors.uniqueUsers}</div>
                        <div>Searches: {stock.factors.searchFrequency}</div>
                        <div>News: {stock.factors.newsActivity}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {optimizationStats.quotaUsage.map((provider) => (
              <Card key={provider.provider}>
                <CardHeader>
                  <CardTitle className="capitalize">{provider.provider}</CardTitle>
                  <CardDescription>
                    Daily quota usage and limits
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Usage</span>
                      <span className="font-mono">
                        {provider.usage} / {provider.limit}
                      </span>
                    </div>
                    <Progress 
                      value={(provider.usage / provider.limit) * 100} 
                      className={`h-2 ${
                        provider.usage / provider.limit > 0.8 ? 'bg-red-100' :
                        provider.usage / provider.limit > 0.6 ? 'bg-yellow-100' :
                        'bg-green-100'
                      }`}
                    />
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        {((provider.usage / provider.limit) * 100).toFixed(1)}% used
                      </span>
                      <span>
                        {provider.limit - provider.usage} remaining
                      </span>
                    </div>
                    {provider.usage / provider.limit > 0.8 && (
                      <div className="flex items-center space-x-2 p-2 bg-red-50 rounded-md">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-700">High usage warning</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}