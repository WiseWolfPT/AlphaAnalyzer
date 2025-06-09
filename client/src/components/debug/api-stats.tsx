import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Database, Zap, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { realAPI } from '@/lib/real-api';
import { cacheManager } from '@/lib/cache-manager';
import { apiRotation } from '@/lib/api-rotation';

interface APIStatsProps {
  className?: string;
}

export function APIStats({ className }: APIStatsProps) {
  const [stats, setStats] = useState<any>(null);
  const [connectivity, setConnectivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const apiStats = realAPI.getAPIStats();
      setStats(apiStats);
    } catch (error) {
      console.error('Failed to load API stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnectivity = async () => {
    setLoading(true);
    try {
      const results = await realAPI.testConnectivity();
      setConnectivity(results);
    } catch (error) {
      console.error('Failed to test connectivity:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (!stats && !loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">API stats not available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            API & Cache Statistics
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={loadStats} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" variant="outline" onClick={testConnectivity} disabled={loading}>
              Test APIs
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="usage" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="usage">API Usage</TabsTrigger>
            <TabsTrigger value="cache">Cache Stats</TabsTrigger>
            <TabsTrigger value="connectivity">Connectivity</TabsTrigger>
          </TabsList>
          
          <TabsContent value="usage" className="space-y-4">
            {stats?.providers && (
              <div className="grid gap-4">
                {stats.providers.map((provider: any) => (
                  <div key={provider.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">{provider.name}</span>
                        <Badge variant={provider.enabled ? "default" : "secondary"}>
                          {provider.enabled ? "Active" : "Disabled"}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {provider.usage}/{provider.limit}
                      </span>
                    </div>
                    <Progress value={provider.percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {provider.percentage}% used today
                    </p>
                  </div>
                ))}
              </div>
            )}
            
            {stats && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.totalCalls}</div>
                  <div className="text-sm text-muted-foreground">Total Calls</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.successRate}%</div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="cache" className="space-y-4">
            {stats?.cacheStats && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-secondary/30 rounded-lg">
                    <Database className="h-6 w-6 mx-auto mb-2" />
                    <div className="text-xl font-bold">{stats.cacheStats.totalEntries}</div>
                    <div className="text-sm text-muted-foreground">Cached Items</div>
                  </div>
                  <div className="text-center p-4 bg-secondary/30 rounded-lg">
                    <Zap className="h-6 w-6 mx-auto mb-2" />
                    <div className="text-xl font-bold">
                      {Object.keys(stats.cacheStats.categories).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Categories</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Cache by Category</h4>
                  {Object.entries(stats.cacheStats.categories).map(([category, count]) => (
                    <div key={category} className="flex justify-between">
                      <span className="capitalize">{category}</span>
                      <Badge variant="secondary">{count as number}</Badge>
                    </div>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    cacheManager.clear();
                    loadStats();
                  }}
                >
                  Clear Cache
                </Button>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="connectivity" className="space-y-4">
            {connectivity.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click "Test APIs" to check connectivity
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {connectivity.map((result) => (
                  <div key={result.provider} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="font-medium capitalize">{result.provider}</span>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                        {result.success ? 'Connected' : 'Failed'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {result.responseTime}ms
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}