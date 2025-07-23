import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, CheckCircle, AlertCircle, Clock, Activity, Database } from 'lucide-react';
import { marketDataClient } from '@/services/market-data-client';

interface CacheStats {
  total_assets: number;
  total_prices: number;
  fresh_quotes: number;
  stale_quotes: number;
  avg_age_seconds: number;
  most_recent_update: string;
  providers_active: number;
  api_calls_last_hour: number;
  cache_hit_rate: number;
}

interface ApiProvider {
  name: string;
  isActive: boolean;
  priority: number;
  quotaLimit: number | null;
  quotaUsed: number;
  quotaRemaining: number | null;
  avgResponseTime: number | null;
  successRate: number | null;
  lastError: string | null;
  lastErrorAt: string | null;
}

export function CacheMonitor() {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [providers, setProviders] = useState<ApiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      
      const [statsResponse, providersResponse] = await Promise.all([
        marketDataClient.getCacheStats(),
        marketDataClient.getProviderStatus()
      ]);

      if (statsResponse) {
        setCacheStats(statsResponse);
      }
      
      if (providersResponse?.providers) {
        setProviders(providersResponse.providers);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching cache data:', err);
      setError('Failed to fetch cache statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const getProviderStatusColor = (provider: ApiProvider): string => {
    if (!provider.isActive) return 'bg-gray-500';
    if (provider.lastError && provider.lastErrorAt) {
      const errorTime = new Date(provider.lastErrorAt).getTime();
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      if (errorTime > fiveMinutesAgo) return 'bg-yellow-500';
    }
    return 'bg-green-500';
  };

  if (loading && !refreshing) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading cache statistics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Cache Monitor</h1>
        <Badge variant={refreshing ? 'secondary' : 'outline'} className="gap-2">
          <Activity className={`h-3 w-3 ${refreshing ? 'animate-pulse' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Live'}
        </Badge>
      </div>

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {cacheStats && (
        <>
          {/* Cache Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Assets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cacheStats.total_assets.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tracked symbols
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Cache Hit Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cacheStats.cache_hit_rate.toFixed(1)}%</div>
                <Progress value={cacheStats.cache_hit_rate} className="mt-2 h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Fresh Quotes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold text-green-600">
                    {cacheStats.fresh_quotes}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    / {cacheStats.fresh_quotes + cacheStats.stale_quotes}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Updated in last minute
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  API Calls (1h)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cacheStats.api_calls_last_hour}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  External API requests
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cache Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5" />
                Cache Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Cache Freshness</span>
                    <span className="text-sm text-muted-foreground">
                      {((cacheStats.fresh_quotes / (cacheStats.fresh_quotes + cacheStats.stale_quotes)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={(cacheStats.fresh_quotes / (cacheStats.fresh_quotes + cacheStats.stale_quotes)) * 100}
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Average Age</span>
                    <span className="text-sm text-muted-foreground">
                      {formatTime(cacheStats.avg_age_seconds)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Last update: {new Date(cacheStats.most_recent_update).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <span>
                    {cacheStats.total_prices.toLocaleString()} price records stored • 
                    {cacheStats.providers_active} active providers
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Providers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">API Providers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {providers.map((provider) => (
                  <div
                    key={provider.name}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${getProviderStatusColor(provider)}`} />
                      <div>
                        <div className="font-medium capitalize">{provider.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Priority: {provider.priority}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {provider.quotaLimit && (
                        <div className="text-sm">
                          <span className="font-medium">{provider.quotaUsed}</span>
                          <span className="text-muted-foreground"> / {provider.quotaLimit}</span>
                        </div>
                      )}
                      
                      {provider.avgResponseTime && (
                        <Badge variant="outline" className="text-xs">
                          {provider.avgResponseTime}ms
                        </Badge>
                      )}
                      
                      {provider.successRate && (
                        <Badge 
                          variant={provider.successRate > 95 ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {provider.successRate.toFixed(1)}%
                        </Badge>
                      )}
                      
                      {!provider.isActive && (
                        <Badge variant="destructive" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}