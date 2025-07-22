import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  data?: any;
}

export function TestAPIConnection() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Backend Health Check', status: 'pending' },
    { name: 'Stock Quote API (AAPL)', status: 'pending' },
    { name: 'Batch Quotes API', status: 'pending' },
    { name: 'Market Status API', status: 'pending' },
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    const results: TestResult[] = [];

    // Test 1: Backend Health Check
    try {
      const healthRes = await fetch('/api/health');
      const healthData = await healthRes.json();
      results.push({
        name: 'Backend Health Check',
        status: healthRes.ok ? 'success' : 'error',
        message: healthRes.ok ? 'Backend is healthy' : 'Backend health check failed',
        data: healthData,
      });
    } catch (error) {
      results.push({
        name: 'Backend Health Check',
        status: 'error',
        message: `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    // Test 2: Stock Quote API
    try {
      const quoteRes = await fetch('/api/market-data/quote/AAPL');
      const quoteData = await quoteRes.json();
      results.push({
        name: 'Stock Quote API (AAPL)',
        status: quoteRes.ok && quoteData.price ? 'success' : 'error',
        message: quoteRes.ok ? `AAPL Price: $${quoteData.price}` : 'Failed to fetch quote',
        data: quoteData,
      });
    } catch (error) {
      results.push({
        name: 'Stock Quote API (AAPL)',
        status: 'error',
        message: `Failed to fetch: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    // Test 3: Batch Quotes API
    try {
      const batchRes = await fetch('/api/market-data/batch-quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: ['AAPL', 'GOOGL', 'MSFT'] }),
      });
      const batchData = await batchRes.json();
      const quotesCount = Object.keys(batchData).length;
      results.push({
        name: 'Batch Quotes API',
        status: batchRes.ok && quotesCount > 0 ? 'success' : 'error',
        message: batchRes.ok ? `Fetched ${quotesCount} quotes` : 'Failed to fetch batch quotes',
        data: batchData,
      });
    } catch (error) {
      results.push({
        name: 'Batch Quotes API',
        status: 'error',
        message: `Failed to fetch: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    // Test 4: Market Status API
    try {
      const statusRes = await fetch('/api/market-data/market-status');
      const statusData = await statusRes.json();
      results.push({
        name: 'Market Status API',
        status: statusRes.ok ? 'success' : 'error',
        message: statusRes.ok ? `Market is ${statusData.isOpen ? 'OPEN' : 'CLOSED'}` : 'Failed to fetch status',
        data: statusData,
      });
    } catch (error) {
      results.push({
        name: 'Market Status API',
        status: 'error',
        message: `Failed to fetch: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    setTests(results);
    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-gray-500" />;
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>API Connection Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runTests} disabled={isRunning} className="w-full">
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            'Run API Tests'
          )}
        </Button>

        <div className="space-y-2">
          {tests.map((test, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center space-x-3">
                {getStatusIcon(test.status)}
                <div>
                  <p className="font-medium">{test.name}</p>
                  {test.message && (
                    <p className="text-sm text-muted-foreground">{test.message}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">Expected Results:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>✅ Backend Health Check should pass</li>
            <li>✅ Stock quotes should show real prices (not demo data)</li>
            <li>✅ No CORS errors in browser console</li>
            <li>✅ No WebSocket errors (they're disabled)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}