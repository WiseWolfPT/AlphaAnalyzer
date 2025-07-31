import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { env } from '@/lib/env';
import { AlertCircle, CheckCircle, RefreshCw, Globe } from 'lucide-react';

export function ApiDiagnostic() {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [testStatus, setTestStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use relative URL to leverage Vercel proxy
  const apiUrl = '';

  const checkHealth = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Checking API health at:', `${apiUrl}/api/market-data/health`);
      
      const response = await fetch(`${apiUrl}/api/market-data/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });

      console.log('📡 Health check response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Health check data:', data);
      setHealthStatus(data);
    } catch (err) {
      console.error('❌ Health check error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const testQuote = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Testing quote API at:', `${apiUrl}/api/market-data/quote/AAPL`);
      
      const response = await fetch(`${apiUrl}/api/market-data/quote/AAPL`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });

      console.log('📡 Quote test response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Quote test data:', data);
      setTestStatus(data);
    } catch (err) {
      console.error('❌ Quote test error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          API Diagnostic Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Environment Info */}
        <div className="space-y-2">
          <h3 className="font-semibold">Environment Configuration</h3>
          <div className="text-sm space-y-1 font-mono bg-gray-100 p-3 rounded">
            <div>VITE_API_URL: <span className="text-blue-600">{apiUrl}</span></div>
            <div>NODE_ENV: <span className="text-green-600">{env.NODE_ENV}</span></div>
            <div>Current URL: <span className="text-purple-600">{window.location.origin}</span></div>
          </div>
        </div>

        {/* Health Status */}
        {healthStatus && (
          <div className="space-y-2">
            <h3 className="font-semibold">Health Check Status</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {healthStatus.status === 'healthy' ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                <span>Status: {healthStatus.status}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={healthStatus.hasRealData ? 'default' : 'secondary'}>
                  {healthStatus.hasRealData ? 'Real Data' : 'Mock Data'}
                </Badge>
                <span className="text-sm text-gray-600">{healthStatus.message}</span>
              </div>
              {healthStatus.providers && (
                <div className="text-sm">
                  <div>Configured providers: {healthStatus.providers.configured.join(', ') || 'None'}</div>
                  <div>Active providers: {healthStatus.providers.active.join(', ') || 'None'}</div>
                </div>
              )}
              {healthStatus.cors && (
                <div className="text-sm">
                  <div>CORS Origin: {healthStatus.cors.origin}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Test Quote */}
        {testStatus && (
          <div className="space-y-2">
            <h3 className="font-semibold">Test Quote (AAPL)</h3>
            <div className="text-sm space-y-1 bg-gray-100 p-3 rounded">
              <div>Symbol: {testStatus.symbol}</div>
              <div>Price: ${testStatus.price}</div>
              <div>Provider: {testStatus.provider}</div>
              <div>Cached: {testStatus._cached ? 'Yes' : 'No'}</div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-3 rounded">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="font-semibold">Error:</span>
            </div>
            <div className="text-sm text-red-600 mt-1">{error}</div>
            {error.includes('Failed to fetch') && (
              <div className="text-xs text-red-500 mt-2">
                This might be a CORS issue or the backend is not accessible.
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={checkHealth}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Check Health
          </Button>
          <Button
            onClick={testQuote}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            Test Quote API
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-500 border-t pt-3">
          <p>This diagnostic panel helps identify API connectivity issues.</p>
          <p>Check the browser console for detailed logs.</p>
        </div>
      </CardContent>
    </Card>
  );
}