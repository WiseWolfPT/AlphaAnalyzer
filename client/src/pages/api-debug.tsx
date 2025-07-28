import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface TestResult {
  endpoint: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  data?: any;
}

export default function ApiDebugPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  const testEndpoints = async () => {
    setTesting(true);
    setResults([]);

    const endpoints = [
      { name: 'Health Check', url: '/api/health' },
      { name: 'Market Status', url: '/api/market-data/market-status' },
      { name: 'Single Quote (AAPL)', url: '/api/market-data/quote/AAPL' },
      { name: 'Batch Quotes', url: '/api/market-data/quotes/batch', method: 'POST', body: { symbols: ['AAPL', 'GOOGL'] } },
    ];

    for (const endpoint of endpoints) {
      setResults(prev => [...prev, { endpoint: endpoint.name, status: 'pending' }]);

      try {
        const options: RequestInit = {
          method: endpoint.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        };

        if (endpoint.body) {
          options.body = JSON.stringify(endpoint.body);
        }

        const response = await fetch(endpoint.url, options);
        const data = await response.json();

        setResults(prev => 
          prev.map(r => 
            r.endpoint === endpoint.name 
              ? { ...r, status: response.ok ? 'success' : 'error', message: response.ok ? 'OK' : `Status: ${response.status}`, data }
              : r
          )
        );
      } catch (error) {
        setResults(prev => 
          prev.map(r => 
            r.endpoint === endpoint.name 
              ? { ...r, status: 'error', message: error instanceof Error ? error.message : 'Unknown error' }
              : r
          )
        );
      }
    }

    setTesting(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>API Connection Debugger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              This page tests the connection between Vercel frontend and Koyeb backend.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p><strong>Frontend URL:</strong> {window.location.origin}</p>
            <p><strong>Backend Proxy:</strong> /api/* → https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app/api/*</p>
          </div>

          <Button onClick={testEndpoints} disabled={testing} className="w-full">
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Test API Endpoints'
            )}
          </Button>

          {results.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Test Results:</h3>
              {results.map((result, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                  {result.status === 'pending' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {result.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {result.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                  <span className="font-medium">{result.endpoint}:</span>
                  <span className={result.status === 'error' ? 'text-red-500' : 'text-green-500'}>
                    {result.message || result.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {results.some(r => r.data) && (
            <div className="space-y-2">
              <h3 className="font-semibold">Response Data:</h3>
              <pre className="bg-muted p-4 rounded overflow-auto text-xs">
                {JSON.stringify(results.filter(r => r.data).map(r => ({ endpoint: r.endpoint, data: r.data })), null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}