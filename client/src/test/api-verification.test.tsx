import { useEffect, useState } from 'react';
import { marketDataClient } from '@/services/market-data-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  details?: any;
  duration?: number;
}

export function APIVerificationTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'running' | 'success' | 'partial' | 'failed'>('idle');

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);
    setOverallStatus('running');
    const testResults: TestResult[] = [];

    // Test 1: Basic connectivity
    const test1Start = Date.now();
    try {
      // Use relative path to go through Vercel proxy
      const response = await fetch(`/api/market-data/test`);
      const data = await response.json();
      testResults.push({
        name: 'Backend Connectivity',
        success: response.ok,
        message: response.ok ? 'Successfully connected to backend' : `Failed with status ${response.status}`,
        details: data,
        duration: Date.now() - test1Start
      });
    } catch (error: any) {
      testResults.push({
        name: 'Backend Connectivity',
        success: false,
        message: error.message,
        details: { error: error.toString() },
        duration: Date.now() - test1Start
      });
    }
    setResults([...testResults]);

    // Test 2: Single stock quote
    const test2Start = Date.now();
    try {
      // Set demo token for testing
      marketDataClient.setAuthToken('demo-token-test');
      const quote = await marketDataClient.getQuote('AAPL');
      testResults.push({
        name: 'Single Stock Quote (AAPL)',
        success: true,
        message: `Successfully fetched quote: $${quote.price}`,
        details: quote,
        duration: Date.now() - test2Start
      });
    } catch (error: any) {
      testResults.push({
        name: 'Single Stock Quote (AAPL)',
        success: false,
        message: error.message,
        details: { error: error.toString() },
        duration: Date.now() - test2Start
      });
    }
    setResults([...testResults]);

    // Test 3: Batch quotes
    const test3Start = Date.now();
    try {
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
      const batchResponse = await marketDataClient.getBatchQuotes(symbols);
      const successCount = batchResponse.quotes?.length || 0;
      testResults.push({
        name: 'Batch Quotes',
        success: successCount > 0,
        message: `Fetched ${successCount}/${symbols.length} quotes`,
        details: {
          requested: symbols,
          received: batchResponse.quotes?.map(q => q.symbol),
          failed: batchResponse.failed,
          errors: batchResponse.errors
        },
        duration: Date.now() - test3Start
      });
    } catch (error: any) {
      testResults.push({
        name: 'Batch Quotes',
        success: false,
        message: error.message,
        details: { error: error.toString() },
        duration: Date.now() - test3Start
      });
    }
    setResults([...testResults]);

    // Test 4: Market overview
    const test4Start = Date.now();
    try {
      const overview = await marketDataClient.getMarketOverview();
      testResults.push({
        name: 'Market Overview',
        success: overview !== null,
        message: overview ? 'Successfully fetched market indices' : 'No data returned',
        details: overview,
        duration: Date.now() - test4Start
      });
    } catch (error: any) {
      testResults.push({
        name: 'Market Overview',
        success: false,
        message: error.message,
        details: { error: error.toString() },
        duration: Date.now() - test4Start
      });
    }
    setResults([...testResults]);

    // Test 5: Stock search
    const test5Start = Date.now();
    try {
      const searchResults = await marketDataClient.search('Apple');
      testResults.push({
        name: 'Stock Search',
        success: searchResults.length > 0,
        message: `Found ${searchResults.length} results`,
        details: searchResults.slice(0, 5), // Show first 5 results
        duration: Date.now() - test5Start
      });
    } catch (error: any) {
      testResults.push({
        name: 'Stock Search',
        success: false,
        message: error.message,
        details: { error: error.toString() },
        duration: Date.now() - test5Start
      });
    }
    setResults([...testResults]);

    // Test 6: API status
    const test6Start = Date.now();
    try {
      const status = await marketDataClient.getStatus();
      testResults.push({
        name: 'API Status',
        success: true,
        message: 'Successfully fetched API status',
        details: status,
        duration: Date.now() - test6Start
      });
    } catch (error: any) {
      testResults.push({
        name: 'API Status',
        success: false,
        message: error.message,
        details: { error: error.toString() },
        duration: Date.now() - test6Start
      });
    }
    setResults([...testResults]);

    // Determine overall status
    const successCount = testResults.filter(r => r.success).length;
    if (successCount === testResults.length) {
      setOverallStatus('success');
    } else if (successCount > 0) {
      setOverallStatus('partial');
    } else {
      setOverallStatus('failed');
    }

    setIsRunning(false);
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>API Verification Tests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <p>API URL: <code className="text-xs bg-muted px-1 py-0.5 rounded">{import.meta.env.VITE_API_URL || 'https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app'}</code></p>
          </div>
          <Button
            onClick={runTests}
            disabled={isRunning}
            variant={overallStatus === 'success' ? 'default' : overallStatus === 'failed' ? 'destructive' : 'outline'}
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Tests...
              </>
            ) : (
              'Run All Tests'
            )}
          </Button>
        </div>

        {overallStatus !== 'idle' && overallStatus !== 'running' && (
          <Alert variant={overallStatus === 'success' ? 'default' : overallStatus === 'partial' ? 'default' : 'destructive'}>
            <div className="flex items-start gap-2">
              {overallStatus === 'success' ? (
                <CheckCircle className="h-4 w-4 mt-0.5 text-green-500" />
              ) : overallStatus === 'partial' ? (
                <AlertCircle className="h-4 w-4 mt-0.5 text-yellow-500" />
              ) : (
                <XCircle className="h-4 w-4 mt-0.5" />
              )}
              <AlertDescription>
                {overallStatus === 'success' 
                  ? 'All tests passed! API integration is working correctly.' 
                  : overallStatus === 'partial' 
                  ? `${results.filter(r => r.success).length}/${results.length} tests passed. Some features may not work properly.`
                  : 'All tests failed. Please check if the backend server is running.'}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 mt-0.5 text-red-600" />
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{result.name}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{result.message}</p>
                    </div>
                  </div>
                  {result.duration && (
                    <span className="text-xs text-muted-foreground">{result.duration}ms</span>
                  )}
                </div>
                {result.details && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer">View Details</summary>
                    <pre className="mt-1 text-xs overflow-auto bg-muted p-2 rounded max-h-32">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-4">
          <h4 className="font-medium text-sm mb-2">What was fixed:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>✅ Frontend API endpoints now use <code>/quotes/batch</code> correctly</li>
            <li>✅ Backend rate limiting reduced from 5s to 1s for better development experience</li>
            <li>✅ Added proper error handling with fallback service when backend is unavailable</li>
            <li>✅ Fixed authentication flow to allow demo access without login</li>
            <li>✅ Improved logging for better debugging</li>
          </ul>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium text-sm mb-2">How to test manually:</h4>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Ensure backend is running: <code>npm run dev</code></li>
            <li>Visit the Find Stocks page at <code>/find-stocks</code></li>
            <li>Stock cards should show real prices (not mock data)</li>
            <li>Click on a stock card to see detailed charts</li>
            <li>Use the ConnectionTest component at the bottom of Find Stocks page</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

// Page component for standalone testing
export default function APITestPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">API Integration Verification</h1>
      <APIVerificationTest />
    </div>
  );
}