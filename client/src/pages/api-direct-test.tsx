import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { realDataService } from "@/services/real-data-integration";

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  data?: any;
  error?: string;
  responseTime?: number;
}

export default function ApiDirectTest() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'API Keys Check', status: 'pending' },
    { name: 'Direct Finnhub API', status: 'pending' },
    { name: 'Direct Alpha Vantage API', status: 'pending' },
    { name: 'Direct Twelve Data API', status: 'pending' },
    { name: 'Direct FMP API', status: 'pending' },
    { name: 'Real Data Service', status: 'pending' }
  ]);
  
  const [logs, setLogs] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(message);
  };

  const updateTest = (name: string, updates: Partial<TestResult>) => {
    setTests(prev => prev.map(test => 
      test.name === name ? { ...test, ...updates } : test
    ));
  };

  const testAPIKeys = () => {
    addLog('🔍 Testing API Keys...');
    updateTest('API Keys Check', { status: 'pending' });

    const keys = {
      FINNHUB: import.meta.env.VITE_FINNHUB_API_KEY,
      ALPHA_VANTAGE: import.meta.env.VITE_ALPHA_VANTAGE_API_KEY,
      TWELVE_DATA: import.meta.env.VITE_TWELVE_DATA_API_KEY,
      FMP: import.meta.env.VITE_FMP_API_KEY
    };

    const keyStatus = Object.entries(keys).map(([name, key]) => ({
      name,
      present: !!key,
      preview: key ? `${key.substring(0, 10)}...` : 'NOT FOUND'
    }));

    const allKeysPresent = keyStatus.every(k => k.present);

    updateTest('API Keys Check', {
      status: allKeysPresent ? 'success' : 'error',
      data: keyStatus,
      error: allKeysPresent ? undefined : 'Some API keys are missing'
    });

    addLog(`API Keys: ${allKeysPresent ? '✅ All present' : '❌ Some missing'}`);
    keyStatus.forEach(k => addLog(`  ${k.name}: ${k.preview}`));
  };

  const testDirectFinnhub = async () => {
    const startTime = Date.now();
    addLog('🔍 Testing Direct Finnhub API...');
    updateTest('Direct Finnhub API', { status: 'pending' });

    try {
      const apiKey = import.meta.env.VITE_FINNHUB_API_KEY;
      if (!apiKey) throw new Error('VITE_FINNHUB_API_KEY not found');

      const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${apiKey}`);
      const data = await response.json();
      const responseTime = Date.now() - startTime;

      if (response.ok && data.c) {
        updateTest('Direct Finnhub API', {
          status: 'success',
          data,
          responseTime
        });
        addLog(`✅ Finnhub: AAPL price $${data.c} (${responseTime}ms)`);
      } else {
        throw new Error(`API returned error: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      updateTest('Direct Finnhub API', {
        status: 'error',
        error: errorMsg,
        responseTime
      });
      addLog(`❌ Finnhub error: ${errorMsg}`);
    }
  };

  const testDirectAlphaVantage = async () => {
    const startTime = Date.now();
    addLog('🔍 Testing Direct Alpha Vantage API...');
    updateTest('Direct Alpha Vantage API', { status: 'pending' });

    try {
      const apiKey = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY;
      if (!apiKey) throw new Error('VITE_ALPHA_VANTAGE_API_KEY not found');

      const response = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${apiKey}`);
      const data = await response.json();
      const responseTime = Date.now() - startTime;

      if (response.ok && data['Global Quote']) {
        updateTest('Direct Alpha Vantage API', {
          status: 'success',
          data,
          responseTime
        });
        const price = data['Global Quote']['05. price'];
        addLog(`✅ Alpha Vantage: AAPL price $${price} (${responseTime}ms)`);
      } else {
        throw new Error(`API returned error: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      updateTest('Direct Alpha Vantage API', {
        status: 'error',
        error: errorMsg,
        responseTime
      });
      addLog(`❌ Alpha Vantage error: ${errorMsg}`);
    }
  };

  const testDirectTwelveData = async () => {
    const startTime = Date.now();
    addLog('🔍 Testing Direct Twelve Data API...');
    updateTest('Direct Twelve Data API', { status: 'pending' });

    try {
      const apiKey = import.meta.env.VITE_TWELVE_DATA_API_KEY;
      if (!apiKey) throw new Error('VITE_TWELVE_DATA_API_KEY not found');

      const response = await fetch(`https://api.twelvedata.com/quote?symbol=AAPL&apikey=${apiKey}`);
      const data = await response.json();
      const responseTime = Date.now() - startTime;

      if (response.ok && data.close) {
        updateTest('Direct Twelve Data API', {
          status: 'success',
          data,
          responseTime
        });
        addLog(`✅ Twelve Data: AAPL price $${data.close} (${responseTime}ms)`);
      } else {
        throw new Error(`API returned error: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      updateTest('Direct Twelve Data API', {
        status: 'error',
        error: errorMsg,
        responseTime
      });
      addLog(`❌ Twelve Data error: ${errorMsg}`);
    }
  };

  const testDirectFMP = async () => {
    const startTime = Date.now();
    addLog('🔍 Testing Direct FMP API...');
    updateTest('Direct FMP API', { status: 'pending' });

    try {
      const apiKey = import.meta.env.VITE_FMP_API_KEY;
      if (!apiKey) throw new Error('VITE_FMP_API_KEY not found');

      const response = await fetch(`https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=${apiKey}`);
      const data = await response.json();
      const responseTime = Date.now() - startTime;

      if (response.ok && Array.isArray(data) && data[0]?.price) {
        updateTest('Direct FMP API', {
          status: 'success',
          data,
          responseTime
        });
        addLog(`✅ FMP: AAPL price $${data[0].price} (${responseTime}ms)`);
      } else {
        throw new Error(`API returned error: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      updateTest('Direct FMP API', {
        status: 'error',
        error: errorMsg,
        responseTime
      });
      addLog(`❌ FMP error: ${errorMsg}`);
    }
  };

  const testRealDataService = async () => {
    const startTime = Date.now();
    addLog('🔍 Testing Real Data Service...');
    updateTest('Real Data Service', { status: 'pending' });

    try {
      const quote = await realDataService.getStockQuote('AAPL');
      const responseTime = Date.now() - startTime;

      if (quote) {
        updateTest('Real Data Service', {
          status: 'success',
          data: quote,
          responseTime
        });
        addLog(`✅ Real Data Service: AAPL price $${quote.price} from ${quote.source} (${responseTime}ms)`);
      } else {
        throw new Error('Real Data Service returned null');
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      updateTest('Real Data Service', {
        status: 'error',
        error: errorMsg,
        responseTime
      });
      addLog(`❌ Real Data Service error: ${errorMsg}`);
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setLogs([]);
    addLog('🚀 Starting comprehensive API tests...');

    // Test API keys first
    testAPIKeys();
    
    // Wait a bit then test all APIs
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await Promise.all([
      testDirectFinnhub(),
      testDirectAlphaVantage(),
      testDirectTwelveData(),
      testDirectFMP()
    ]);
    
    // Test real data service last
    await testRealDataService();
    
    addLog('🏁 All tests completed!');
    setTesting(false);
  };

  useEffect(() => {
    runAllTests();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending': return <RefreshCw className="w-4 h-4 animate-spin" />;
      default: return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge className="bg-green-500">Success</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      case 'pending': return <Badge variant="secondary">Testing...</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Direct API Test</h1>
          <p className="text-muted-foreground">Testing real API connections and data flow</p>
        </div>
        <Button onClick={runAllTests} disabled={testing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
          Run All Tests
        </Button>
      </div>

      {/* Test Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tests.map((test) => (
          <Card key={test.name}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{test.name}</CardTitle>
                {getStatusIcon(test.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {getStatusBadge(test.status)}
              
              {test.responseTime && (
                <p className="text-xs text-muted-foreground">
                  Response time: {test.responseTime}ms
                </p>
              )}
              
              {test.error && (
                <Alert className="border-red-500">
                  <AlertDescription className="text-xs">
                    {test.error}
                  </AlertDescription>
                </Alert>
              )}
              
              {test.data && test.name === 'API Keys Check' && (
                <div className="space-y-1">
                  {test.data.map((key: any) => (
                    <div key={key.name} className="flex justify-between text-xs">
                      <span>{key.name}:</span>
                      <span className={key.present ? 'text-green-600' : 'text-red-600'}>
                        {key.preview}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              {test.data && test.name !== 'API Keys Check' && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">
                    View raw data
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(test.data, null, 2)}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Console Log */}
      <Card>
        <CardHeader>
          <CardTitle>Test Console</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-64 overflow-auto">
            {logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Test Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">
                {tests.filter(t => t.status === 'success').length}
              </p>
              <p className="text-sm text-muted-foreground">Passed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">
                {tests.filter(t => t.status === 'error').length}
              </p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">
                {tests.filter(t => t.status === 'pending').length}
              </p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}