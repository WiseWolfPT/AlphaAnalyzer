import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';

export default function ApiDebugPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const tests = [
    {
      name: 'Vercel Proxy Test',
      endpoint: '/api/health',
      description: 'Tests if Vercel proxy is working correctly'
    },
    {
      name: 'Direct Koyeb Test',
      endpoint: 'https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app/api/health',
      description: 'Tests direct connection to Koyeb backend'
    },
    {
      name: 'Market Data Test',
      endpoint: '/api/market-data/market-status',
      description: 'Tests market data endpoint through proxy'
    }
  ];

  const runTests = async () => {
    setStatus('loading');
    setResults([]);
    setError(null);

    const testResults = [];

    for (const test of tests) {
      try {
        console.log(`Running test: ${test.name} - ${test.endpoint}`);
        const startTime = Date.now();
        
        const response = await fetch(test.endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Don't include credentials for CORS simplicity
          mode: 'cors',
        });

        const duration = Date.now() - startTime;
        const data = await response.text();
        
        let jsonData;
        try {
          jsonData = JSON.parse(data);
        } catch {
          jsonData = data;
        }

        testResults.push({
          ...test,
          success: response.ok,
          status: response.status,
          duration,
          data: jsonData,
          headers: Object.fromEntries(response.headers.entries())
        });
      } catch (err: any) {
        console.error(`Test failed: ${test.name}`, err);
        testResults.push({
          ...test,
          success: false,
          error: err.message,
          duration: 0
        });
      }
    }

    setResults(testResults);
    setStatus(testResults.some(r => r.success) ? 'success' : 'error');
  };

  useEffect(() => {
    // Run tests on mount
    runTests();
  }, []);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            API Connection Debugger
            <Button 
              onClick={runTests} 
              disabled={status === 'loading'}
              size="sm"
            >
              {status === 'loading' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Run Tests
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              This page tests the connection between Vercel frontend and Koyeb backend.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {results.map((result, index) => (
              <Card key={index} className={result.success ? 'border-green-500' : 'border-red-500'}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <h3 className="font-semibold">{result.name}</h3>
                    </div>
                    {result.duration > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {result.duration}ms
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{result.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Endpoint:</span>{' '}
                      <code className="bg-muted px-1 py-0.5 rounded">{result.endpoint}</code>
                    </div>
                    {result.status && (
                      <div className="text-sm">
                        <span className="font-medium">Status:</span>{' '}
                        <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                          {result.status}
                        </span>
                      </div>
                    )}
                    {result.error && (
                      <div className="text-sm">
                        <span className="font-medium">Error:</span>{' '}
                        <span className="text-red-600">{result.error}</span>
                      </div>
                    )}
                    {result.data && (
                      <details className="text-sm">
                        <summary className="cursor-pointer font-medium">Response Data</summary>
                        <pre className="mt-2 p-2 bg-muted rounded overflow-auto text-xs">
                          {typeof result.data === 'string' 
                            ? result.data 
                            : JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                    {result.headers && (
                      <details className="text-sm">
                        <summary className="cursor-pointer font-medium">Response Headers</summary>
                        <pre className="mt-2 p-2 bg-muted rounded overflow-auto text-xs">
                          {JSON.stringify(result.headers, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {status === 'idle' && (
            <div className="text-center text-muted-foreground">
              Click "Run Tests" to start debugging
            </div>
          )}

          {status === 'loading' && (
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">Running connection tests...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Environment Info */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Environment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm font-mono">
            <div>Frontend URL: {window.location.origin}</div>
            <div>Backend URL (Expected): https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app</div>
            <div>Environment: {import.meta.env.MODE}</div>
            <div>VITE_API_URL: {import.meta.env.VITE_API_URL || '(not set)'}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}