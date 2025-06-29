import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Wifi, WifiOff, Activity } from "lucide-react";
import { realDataService } from "@/services/real-data-integration";

export default function DataTestPage() {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDataTest = async () => {
    setLoading(true);
    setError(null);
    setTestResults(null);

    try {
      console.log('🧪 Starting data integration test...');
      
      // Test individual stock fetch
      const testSymbol = 'AAPL';
      const singleStock = await realDataService.getStockQuote(testSymbol);
      
      // Test batch fetch
      const testSymbols = ['AAPL', 'MSFT', 'GOOGL'];
      const batchStocks = await realDataService.getBatchQuotes(testSymbols);
      
      // Test market indices
      const marketIndices = await realDataService.getMarketIndices();
      
      // Get usage stats
      const usageStats = realDataService.getUsageStats();
      
      // Check provider health
      const providerHealth = await realDataService.checkProviderHealth();

      setTestResults({
        singleStock,
        batchStocks,
        marketIndices,
        usageStats,
        providerHealth,
        timestamp: new Date().toISOString()
      });

      console.log('✅ Data integration test completed');
    } catch (error) {
      console.error('❌ Data integration test failed:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDataTest();
  }, []);

  const getSourceIcon = (source?: string) => {
    switch (source) {
      case 'real':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'mock':
        return <WifiOff className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Integration Test</h1>
          <p className="text-muted-foreground">Testing real API integration with fallback</p>
        </div>
        <Button onClick={runDataTest} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Run Test
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <WifiOff className="h-4 w-4" />
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Running data integration tests...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {testResults && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Single Stock Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Single Stock Test
                {getSourceIcon(testResults.singleStock?.source)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {testResults.singleStock ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Symbol:</span>
                    <span className="font-bold">{testResults.singleStock.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Name:</span>
                    <span>{testResults.singleStock.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price:</span>
                    <span className="font-bold">${testResults.singleStock.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Change:</span>
                    <span className={parseFloat(testResults.singleStock.changePercent) >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {testResults.singleStock.changePercent}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Source:</span>
                    <Badge variant={testResults.singleStock.source === 'real' ? 'default' : 'secondary'}>
                      {testResults.singleStock.source}
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No data available</p>
              )}
            </CardContent>
          </Card>

          {/* Batch Stocks Test */}
          <Card>
            <CardHeader>
              <CardTitle>Batch Stocks Test</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(testResults.batchStocks).map(([symbol, stock]: [string, any]) => (
                  <div key={symbol} className="flex items-center justify-between p-2 bg-secondary/20 rounded">
                    <div className="flex items-center gap-2">
                      {getSourceIcon(stock?.source)}
                      <span className="font-medium">{symbol}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>${stock?.price || 'N/A'}</span>
                      <Badge variant={stock?.source === 'real' ? 'default' : 'secondary'} className="text-xs">
                        {stock?.source || 'unknown'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Market Indices Test */}
          <Card>
            <CardHeader>
              <CardTitle>Market Indices Test</CardTitle>
            </CardHeader>
            <CardContent>
              {testResults.marketIndices ? (
                <div className="space-y-2">
                  {Object.entries(testResults.marketIndices).map(([index, data]: [string, any]) => (
                    <div key={index} className="flex justify-between">
                      <span>{index.toUpperCase()}:</span>
                      <div className="text-right">
                        <div className="font-bold">{data.value?.toFixed(2)}</div>
                        <div className={`text-sm ${data.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {data.change >= 0 ? '+' : ''}{data.change?.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No market data available</p>
              )}
            </CardContent>
          </Card>

          {/* Provider Health */}
          <Card>
            <CardHeader>
              <CardTitle>Provider Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(testResults.providerHealth).map(([provider, health]: [string, any]) => (
                  <div key={provider} className="flex items-center justify-between p-2 bg-secondary/20 rounded">
                    <span className="font-medium capitalize">{provider}</span>
                    <div className="flex items-center gap-2">
                      {health.available ? (
                        <Wifi className="h-4 w-4 text-green-500" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">{health.responseTime}ms</span>
                      {health.error && (
                        <span className="text-xs text-red-600">Error</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Usage Stats */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Usage Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Cache</h4>
                  {testResults.usageStats.cache ? (
                    <div className="text-sm space-y-1">
                      <div>Hit Rate: {(testResults.usageStats.cache.hitRate * 100).toFixed(1)}%</div>
                      <div>Total Calls: {testResults.usageStats.cache.totalCalls || 0}</div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No cache stats</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Finnhub</h4>
                  {testResults.usageStats.finnhub ? (
                    <div className="text-sm space-y-1">
                      <div>Requests: {testResults.usageStats.finnhub.requests}</div>
                      <div>Remaining: {testResults.usageStats.finnhub.remaining}</div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Service not available</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Alpha Vantage</h4>
                  {testResults.usageStats.alphavantage ? (
                    <div className="text-sm space-y-1">
                      <div>Daily: {testResults.usageStats.alphavantage.daily?.used || 0}/{testResults.usageStats.alphavantage.daily?.limit || 0}</div>
                      <div>Minute: {testResults.usageStats.alphavantage.minute?.used || 0}/{testResults.usageStats.alphavantage.minute?.limit || 0}</div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Service not available</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle>Test Timestamp</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Test completed at: {new Date(testResults.timestamp).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}