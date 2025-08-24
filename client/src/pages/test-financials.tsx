// Test page for Phase 2, Day 8: Connect Charts to Real FMP Data
import { useState } from 'react';
import { useParams } from 'wouter';
import { useDirectFMPFinancials } from '@/hooks/use-cache-data';
import { RevenueChart } from '@/components/charts/revenue-chart';
import { EbitdaChart } from '@/components/charts/ebitda-chart';
import { NetIncomeChart } from '@/components/charts/net-income-chart';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function TestFinancials() {
  const [testSymbol, setTestSymbol] = useState('AAPL');
  const [period, setPeriod] = useState<'quarterly' | 'annual'>('quarterly');
  
  // Fetch financial data using Direct FMP hook
  const { data: financials, isLoading, error, refetch } = useDirectFMPFinancials(testSymbol, period);

  const handleTestStock = (symbol: string) => {
    setTestSymbol(symbol);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Financial Charts Test - Phase 2, Day 8</h1>
            <p className="text-muted-foreground mt-2">
              Testing direct FMP financial data connection for charts
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={period === 'quarterly' ? 'default' : 'outline'}
              onClick={() => setPeriod('quarterly')}
            >
              Quarterly
            </Button>
            <Button 
              variant={period === 'annual' ? 'default' : 'outline'}
              onClick={() => setPeriod('annual')}
            >
              Annual
            </Button>
          </div>
        </div>

        {/* Test Stock Selector */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Test Stocks</h2>
          <div className="flex gap-2 flex-wrap">
            {['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA'].map(symbol => (
              <Button
                key={symbol}
                variant={testSymbol === symbol ? 'default' : 'outline'}
                onClick={() => handleTestStock(symbol)}
                size="sm"
              >
                {symbol}
              </Button>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-4">
            <input
              type="text"
              value={testSymbol}
              onChange={(e) => setTestSymbol(e.target.value.toUpperCase())}
              placeholder="Enter symbol..."
              className="px-3 py-2 border rounded-md bg-background"
            />
            <Button onClick={() => refetch()}>
              Refresh Data
            </Button>
          </div>
        </Card>

        {/* API Response Info */}
        {financials && (
          <Alert>
            <Activity className="h-4 w-4" />
            <AlertTitle>FMP Data Received</AlertTitle>
            <AlertDescription>
              Symbol: {financials.symbol} | Period: {financials.period} | 
              Provider: {financials.provider} | 
              Data Points: Revenue ({financials.revenue?.length || 0}), 
              EBITDA ({financials.ebitda?.length || 0}), 
              Net Income ({financials.netIncome?.length || 0})
            </AlertDescription>
          </Alert>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error.message || 'Failed to fetch financial data'}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="h-[400px] animate-pulse">
                <div className="p-6">
                  <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-64 bg-muted rounded mt-4"></div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Financial Charts Grid */}
        {financials && !isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Revenue Chart */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold">Revenue</h3>
              </div>
              <RevenueChart data={financials.revenue || []} />
            </Card>

            {/* EBITDA Chart */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold">EBITDA</h3>
              </div>
              <EbitdaChart data={financials.ebitda || []} />
            </Card>

            {/* Net Income Chart */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold">Net Income</h3>
              </div>
              <NetIncomeChart data={financials.netIncome || []} />
            </Card>
          </div>
        )}

        {/* Raw Data Display (for debugging) */}
        {financials && (
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Raw API Response (Debug)</h3>
            <pre className="text-xs overflow-auto max-h-96 p-4 bg-muted rounded">
              {JSON.stringify(financials, null, 2)}
            </pre>
          </Card>
        )}

        {/* Latest Metrics */}
        {financials?.latestMetrics && (
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Latest Financial Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-xl font-bold">
                  ${(financials.latestMetrics.revenue / 1000000).toFixed(0)}M
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gross Margin</p>
                <p className="text-xl font-bold">
                  {(financials.latestMetrics.grossProfitRatio * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Operating Margin</p>
                <p className="text-xl font-bold">
                  {(financials.latestMetrics.operatingIncomeRatio * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">EPS</p>
                <p className="text-xl font-bold">
                  ${financials.latestMetrics.eps?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}