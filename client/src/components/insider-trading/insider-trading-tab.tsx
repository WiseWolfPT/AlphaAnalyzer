import { useInsiderTrading } from '@/hooks/use-insider-trading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, UserCheck, AlertCircle } from 'lucide-react';

interface InsiderTradingTabProps {
  symbol: string;
}

export function InsiderTradingTab({ symbol }: InsiderTradingTabProps) {
  const { data: trades, isLoading, error } = useInsiderTrading(symbol, 50);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-teya-green" />
            Insider Trading - Last 12 Months
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load insider trades</h3>
          <p className="text-muted-foreground">
            Unable to fetch insider trading data. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!trades || trades.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No insider trades found</h3>
          <p className="text-muted-foreground">
            No insider trading activity reported for {symbol} in the last 12 months.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate summary stats
  const totalBuys = trades.filter(t => t.transactionType === 'Buy').length;
  const totalSells = trades.filter(t => t.transactionType === 'Sell').length;
  const totalBuyValue = trades
    .filter(t => t.transactionType === 'Buy')
    .reduce((sum, t) => sum + (t.securitiesTransacted * t.price), 0);
  const totalSellValue = trades
    .filter(t => t.transactionType === 'Sell')
    .reduce((sum, t) => sum + (t.securitiesTransacted * t.price), 0);
  const netSentiment = totalBuys > totalSells ? 'bullish' : totalSells > totalBuys ? 'bearish' : 'neutral';

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Buys</p>
                <p className="text-2xl font-bold text-green-600">{totalBuys}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ${(totalBuyValue / 1e6).toFixed(1)}M
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sells</p>
                <p className="text-2xl font-bold text-red-600">{totalSells}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ${(totalSellValue / 1e6).toFixed(1)}M
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-2",
          netSentiment === 'bullish' ? 'border-green-300 bg-green-50 dark:bg-green-900/20' :
          netSentiment === 'bearish' ? 'border-red-300 bg-red-50 dark:bg-red-900/20' :
          'border-gray-300 bg-gray-50 dark:bg-gray-900/20'
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Sentiment</p>
                <p className={cn(
                  "text-2xl font-bold capitalize",
                  netSentiment === 'bullish' ? 'text-green-600' :
                  netSentiment === 'bearish' ? 'text-red-600' :
                  'text-gray-600'
                )}>
                  {netSentiment}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Buy/Sell Ratio: {totalSells > 0 ? (totalBuys / totalSells).toFixed(2) : '∞'}
                </p>
              </div>
              <UserCheck className={cn(
                "h-8 w-8",
                netSentiment === 'bullish' ? 'text-green-500' :
                netSentiment === 'bearish' ? 'text-red-500' :
                'text-gray-500'
              )} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Transactions</p>
              <p className="text-2xl font-bold">{trades.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Last 12 months
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-teya-green" />
            Recent Insider Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Insider</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Role</th>
                  <th className="text-center p-3 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="text-right p-3 text-sm font-medium text-muted-foreground">Shares</th>
                  <th className="text-right p-3 text-sm font-medium text-muted-foreground">Price</th>
                  <th className="text-right p-3 text-sm font-medium text-muted-foreground">Value</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade, index) => {
                  const tradeValue = trade.securitiesTransacted * trade.price;
                  const isBuy = trade.transactionType === 'Buy';

                  return (
                    <tr
                      key={index}
                      className="border-b hover:bg-secondary/30 transition-colors"
                    >
                      <td className="p-3">
                        <div className="text-sm font-medium">
                          {new Date(trade.transactionDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Filed: {new Date(trade.filingDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm font-medium">{trade.reportingName}</div>
                        <div className="text-xs text-muted-foreground">
                          Owns: {trade.securitiesOwned.toLocaleString()} shares
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-muted-foreground">{trade.typeOfOwner}</div>
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant={isBuy ? "default" : "secondary"}
                          className={cn(
                            "font-medium",
                            isBuy
                              ? "bg-green-500/10 text-green-700 border-green-200"
                              : "bg-red-500/10 text-red-700 border-red-200"
                          )}
                        >
                          {isBuy ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {trade.transactionType}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="text-sm font-medium">
                          {trade.securitiesTransacted.toLocaleString()}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="text-sm font-medium">
                          ${trade.price.toFixed(2)}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="text-sm font-bold">
                          ${(tradeValue / 1e6).toFixed(2)}M
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-1">Important Disclaimer</p>
              <p className="text-blue-700 dark:text-blue-300">
                Insider trading data is reported to the SEC with delays. This information should not be used
                as the sole basis for investment decisions. Always conduct thorough research and consult
                with financial advisors before making investment choices.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
