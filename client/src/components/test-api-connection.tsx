import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { API_CONFIG } from '@/config/api';

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
    { name: 'Simple POST Test', status: 'pending' },
    { name: 'Batch Quotes API', status: 'pending' },
    { name: 'Market Status API', status: 'pending' },
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    const results: TestResult[] = [];
    const baseURL = API_CONFIG.baseURL;

    // Test 1: Backend Health Check (v1)
    try {
      const healthRes = await fetch(`${baseURL}/api/v1/health`);
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

    // Test 2: Stock Quote API (Real Alpha Vantage)
    try {
      const quoteRes = await fetch(`${baseURL}/api/v1/stock/AAPL/quote`);
      const quoteData = await quoteRes.json();
      const price = quoteData.success && quoteData.data ? quoteData.data.price : quoteData.price;
      results.push({
        name: 'Stock Quote API (AAPL)',
        status: quoteRes.ok && price ? 'success' : 'error',
        message: quoteRes.ok ? `AAPL Price: $${price} (Real-time)` : 'Failed to fetch quote',
        data: quoteData,
      });
    } catch (error) {
      results.push({
        name: 'Stock Quote API (AAPL)',
        status: 'error',
        message: `Failed to fetch: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    // Test 2.5: Simple POST Test to debug Coolify issue
    try {
      const postRes = await fetch(`${baseURL}/api/market-data/test-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data', timestamp: Date.now() }),
      });
      
      const contentType = postRes.headers.get('content-type');
      let postData;
      
      if (contentType && contentType.includes('application/json')) {
        postData = await postRes.json();
      } else {
        const text = await postRes.text();
        postData = { error: 'Non-JSON response', body: text.substring(0, 100) };
      }
      
      results.push({
        name: 'Simple POST Test',
        status: postRes.ok ? 'success' : 'error',
        message: postRes.ok ? 'POST request successful' : `Failed with status ${postRes.status}`,
        data: postData,
      });
    } catch (error) {
      results.push({
        name: 'Simple POST Test',
        status: 'error',
        message: `Failed to POST: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    // Test 3: Batch Quotes API - Fixed endpoint and added proper error handling
    try {
      const batchRes = await fetch(`${baseURL}/api/market-data/quotes/batch?symbols=AAPL,GOOGL,MSFT`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      // Check if response is JSON
      const contentType = batchRes.headers.get('content-type');
      let batchData;
      
      if (contentType && contentType.includes('application/json')) {
        batchData = await batchRes.json();
      } else {
        // If not JSON, it's likely an HTML error page
        const text = await batchRes.text();
        throw new Error(`Unexpected response format: ${text.substring(0, 100)}...`);
      }
      
      const quotesCount = batchData.quotes ? batchData.quotes.length : 0;
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
      const statusRes = await fetch(`${baseURL}/api/market-data/market-status`);
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