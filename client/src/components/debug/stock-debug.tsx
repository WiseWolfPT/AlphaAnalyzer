import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { realDataService } from "@/services/real-data-integration";

export function StockDebug() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const testSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];

  const runTests = async () => {
    setLoading(true);
    setTestResults([]);
    
    for (const symbol of testSymbols) {
      try {
        console.log(`Testing ${symbol}...`);
        const start = Date.now();
        const result = await realDataService.getStockQuote(symbol);
        const duration = Date.now() - start;
        
        setTestResults(prev => [...prev, {
          symbol,
          success: !!result,
          data: result,
          duration,
          error: null
        }]);
      } catch (error) {
        setTestResults(prev => [...prev, {
          symbol,
          success: false,
          data: null,
          duration: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        }]);
      }
    }
    
    setLoading(false);
  };

  const checkHealth = async () => {
    try {
      const health = await realDataService.checkProviderHealth();
      console.log('Provider health:', health);
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  return (
    <div className="p-6 bg-card rounded-lg border">
      <h2 className="text-xl font-bold mb-4">Stock Data Service Debug</h2>
      
      <div className="flex gap-2 mb-4">
        <Button onClick={runTests} disabled={loading}>
          {loading ? 'Testing...' : 'Test Stock Data'}
        </Button>
        <Button onClick={checkHealth} variant="outline">
          Check Provider Health
        </Button>
      </div>

      {testResults.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">Test Results:</h3>
          {testResults.map((result, index) => (
            <div key={index} className={`p-2 rounded border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex justify-between items-center">
                <span className="font-mono">{result.symbol}</span>
                <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                  {result.success ? '✅ Success' : '❌ Failed'}
                </span>
              </div>
              {result.data && (
                <div className="text-sm mt-1">
                  Price: ${result.data.price} | Source: {result.data.source} | Duration: {result.duration}ms
                </div>
              )}
              {result.error && (
                <div className="text-sm text-red-600 mt-1">
                  Error: {result.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}