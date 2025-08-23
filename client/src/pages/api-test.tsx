import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { api } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/config/api";

interface QuoteData {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
}

interface ApiResponse {
  quotes?: QuoteData[];
  [key: string]: any;
}

export default function ApiTest() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testApi = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Changed to GET per backend requirements
      const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'].join(',');
      const result = await api.get<ApiResponse>(
        `${API_ENDPOINTS.quotes.batch}?symbols=${symbols}`
      );
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testApi();
  }, []);

  return (
    <MainLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              API Test - Market Data
              <Button onClick={testApi} disabled={loading} size="sm">
                <RefreshCw className={loading ? "animate-spin" : ""} />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && <p>Loading...</p>}
            
            {error && (
              <div className="text-red-500">
                <p className="font-semibold">Error:</p>
                <p>{error}</p>
              </div>
            )}
            
            {data && (
              <div className="space-y-4">
                <p className="font-semibold">Response:</p>
                <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                  {JSON.stringify(data, null, 2)}
                </pre>
                
                {data.quotes && (
                  <div>
                    <p className="font-semibold mt-4">Stocks Found: {data.quotes.length}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                      {data.quotes.map((quote, index) => (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <h3 className="font-bold">{quote.symbol}</h3>
                            <p className="text-sm text-muted-foreground">{quote.name}</p>
                            <p className="text-lg font-semibold">${quote.price}</p>
                            <p className={quote.changePercent >= 0 ? "text-green-600" : "text-red-600"}>
                              {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent?.toFixed(2)}%
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}