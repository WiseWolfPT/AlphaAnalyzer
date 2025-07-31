import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { env } from '@/lib/env';

export function ConnectionTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  const testConnection = async () => {
    setIsLoading(true);
    setResult(null);

    const apiUrl = env.VITE_API_URL || 'http://jsg00k40sgo0k4swsoc4gcsg.128.140.45.28.sslip.io';
    const testUrl = `${apiUrl}/api/market-data/test`;

    console.log('🧪 Testing connection to:', testUrl);

    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: 'Successfully connected to backend!',
          details: data,
        });
      } else {
        setResult({
          success: false,
          message: `Backend returned error: ${response.status}`,
          details: data,
        });
      }
    } catch (error: any) {
      console.error('Connection test failed:', error);
      setResult({
        success: false,
        message: error.message || 'Failed to connect to backend',
        details: {
          error: error.toString(),
          apiUrl,
          suggestion: 'Make sure the backend server is running with: npm run dev',
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Backend Connection Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>API URL: <code className="text-xs bg-muted px-1 py-0.5 rounded">{env.VITE_API_URL || 'http://jsg00k40sgo0k4swsoc4gcsg.128.140.45.28.sslip.io'}</code></p>
        </div>

        <Button
          onClick={testConnection}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            'Test Connection'
          )}
        </Button>

        {result && (
          <Alert variant={result.success ? 'default' : 'destructive'}>
            <div className="flex items-start gap-2">
              {result.success ? (
                <CheckCircle className="h-4 w-4 mt-0.5 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 mt-0.5" />
              )}
              <div className="flex-1">
                <AlertDescription>{result.message}</AlertDescription>
                {result.details && (
                  <pre className="mt-2 text-xs overflow-auto bg-muted p-2 rounded">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}