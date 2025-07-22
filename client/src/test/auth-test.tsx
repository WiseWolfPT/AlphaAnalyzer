import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { marketDataClient } from '@/services/market-data-client';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function AuthTest() {
  const [isLoading, setIsLoading] = useState(true);
  const [testResults, setTestResults] = useState<{
    noAuth: boolean | null;
    withAuth: boolean | null;
    authStatus: string;
  }>({
    noAuth: null,
    withAuth: null,
    authStatus: 'checking...'
  });

  useEffect(() => {
    const runTests = async () => {
      // Test 1: No authentication
      try {
        // Clear any existing token
        marketDataClient.setAuthToken('');
        localStorage.removeItem('alfalyzer-token');
        localStorage.removeItem('auth-token');
        
        const result = await marketDataClient.getQuote('AAPL');
        setTestResults(prev => ({ ...prev, noAuth: true, authStatus: 'No auth needed! ✅' }));
      } catch (error) {
        setTestResults(prev => ({ ...prev, noAuth: false, authStatus: 'Auth required ❌' }));
      }

      // Test 2: With demo token
      try {
        marketDataClient.setAuthToken('demo-token-test');
        const result = await marketDataClient.getQuote('GOOGL');
        setTestResults(prev => ({ ...prev, withAuth: true }));
      } catch (error) {
        setTestResults(prev => ({ ...prev, withAuth: false }));
      }

      setIsLoading(false);
    };

    runTests();
  }, []);

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Authentication Test</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Testing authentication...</span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {testResults.noAuth ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span>Access without auth: {testResults.noAuth ? 'Works' : 'Blocked'}</span>
            </div>
            <div className="flex items-center gap-2">
              {testResults.withAuth ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span>Access with demo token: {testResults.withAuth ? 'Works' : 'Failed'}</span>
            </div>
            <div className="mt-4 p-2 bg-muted rounded text-sm">
              Status: {testResults.authStatus}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}