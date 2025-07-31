import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, CheckCircle, XCircle, Wifi } from "lucide-react";

export default function TestSprint1() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const testEndpoint = async (name: string, url: string) => {
    setLoading(true);
    const result = {
      name,
      url,
      status: 'testing',
      data: null,
      error: null,
      timestamp: new Date().toISOString()
    };
    
    setResults(prev => [...prev, result]);
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      result.status = response.ok ? 'success' : 'error';
      result.data = data;
      
      setResults(prev => prev.map(r => r.url === url ? result : r));
    } catch (error: any) {
      result.status = 'error';
      result.error = error.message;
      
      setResults(prev => prev.map(r => r.url === url ? result : r));
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    setResults([]);
    
    // Test 1: Direct backend call
    await testEndpoint(
      'Direct Backend Call',
      'http://jsg00k40sgo0k4swsoc4gcsg.128.140.45.28.sslip.io/api/v1/stock/AAPL/quote'
    );
    
    // Test 2: Via Vercel proxy (relative URL)
    await testEndpoint(
      'Via Vercel Proxy',
      '/api/v1/stock/AAPL/quote'
    );
    
    // Test 3: Health check
    await testEndpoint(
      'Health Check',
      '/api/v1/health'
    );
    
    // Test 4: Cache stats
    await testEndpoint(
      'Cache Stats',
      '/api/v1/cache/stats'
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sprint 1 Test</h1>
            <p className="text-muted-foreground">Testing real Alpha Vantage integration for AAPL</p>
          </div>
          <Button onClick={runAllTests} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Run Tests
          </Button>
        </div>

        {results.length === 0 && (
          <Alert>
            <AlertDescription>
              Click "Run Tests" to start testing the Sprint 1 implementation
            </AlertDescription>
          </Alert>
        )}

        {results.map((result, index) => (
          <Card key={index} className={
            result.status === 'success' ? 'border-green-500' : 
            result.status === 'error' ? 'border-red-500' : 
            'border-yellow-500'
          }>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{result.name}</span>
                {result.status === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                {result.status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
                {result.status === 'testing' && <RefreshCw className="w-5 h-5 text-yellow-500 animate-spin" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">{result.url}</p>
              
              {result.status === 'success' && result.data && (
                <div className="bg-muted p-4 rounded-lg">
                  {result.data.success && result.data.data ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Wifi className="w-4 h-4 text-green-500" />
                        <span className="font-semibold">Real-time Data from {result.data.data.provider}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Symbol: {result.data.data.symbol}</div>
                        <div>Price: ${result.data.data.price}</div>
                        <div>Change: {result.data.data.change}</div>
                        <div>Change %: {result.data.data.changePercent}%</div>
                        <div>Volume: {result.data.data.volume?.toLocaleString()}</div>
                        <div>Cached: {result.data.data._cached ? 'Yes' : 'No'}</div>
                      </div>
                    </div>
                  ) : (
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </div>
              )}
              
              {result.status === 'error' && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {result.error || JSON.stringify(result.data)}
                  </AlertDescription>
                </Alert>
              )}
              
              <p className="text-xs text-muted-foreground mt-2">
                Tested at: {new Date(result.timestamp).toLocaleTimeString()}
              </p>
            </CardContent>
          </Card>
        ))}

        {results.some(r => r.status === 'success' && r.data?.data?.symbol === 'AAPL') && (
          <Alert className="border-green-500">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <AlertDescription>
              <strong>Sprint 1 Complete!</strong> Successfully fetching real AAPL data from Alpha Vantage.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </MainLayout>
  );
}