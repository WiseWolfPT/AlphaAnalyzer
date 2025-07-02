import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingDown, ArrowRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMarketQuotes } from "@/hooks/use-market-data";

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

// Helper function to get company names
function getCompanyName(symbol: string): string {
  const companyNames: Record<string, string> = {
    'COIN': 'Coinbase Global',
    'RIOT': 'Riot Platforms',
    'MARA': 'Marathon Digital',
    'PINS': 'Pinterest Inc',
    'ROKU': 'Roku Inc',
    'SNAP': 'Snap Inc',
    'PYPL': 'PayPal Holdings',
    'SQ': 'Block Inc',
    'HOOD': 'Robinhood Markets',
    'DKNG': 'DraftKings Inc',
    'PTON': 'Peloton Interactive',
    'ZM': 'Zoom Video',
    'DOCU': 'DocuSign Inc',
    'CRWD': 'CrowdStrike'
  };
  return companyNames[symbol] || symbol;
}

export function TopLosersCard() {
  const [, setLocation] = useLocation();
  const [topLosers, setTopLosers] = useState<Stock[]>([]);
  
  // Stocks often volatile
  const trackedSymbols = ['COIN', 'RIOT', 'MARA', 'PINS', 'ROKU', 'SNAP', 'PYPL', 'SQ', 'HOOD', 'DKNG', 'PTON', 'ZM'];
  const { data: quotesData, isLoading } = useMarketQuotes(trackedSymbols);

  useEffect(() => {
    if (quotesData?.quotes && quotesData.quotes.length > 0) {
      // Convert market quotes to our Stock format and sort by loss percentage
      const stocks = quotesData.quotes
        .map(quote => ({
          symbol: quote.symbol,
          name: getCompanyName(quote.symbol),
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent
        }))
        .filter(stock => stock.changePercent < 0) // Only show losers
        .sort((a, b) => a.changePercent - b.changePercent) // Sort by biggest loss
        .slice(0, 5); // Top 5 losers
      
      setTopLosers(stocks);
    } else if (!isLoading) {
      // Fallback to mock data if API fails
      const mockLosers: Stock[] = [
        { symbol: "COIN", name: "Coinbase Global", price: 89.34, change: -8.76, changePercent: -8.93 },
        { symbol: "RIOT", name: "Riot Platforms", price: 12.45, change: -1.34, changePercent: -9.73 },
        { symbol: "MARA", name: "Marathon Digital", price: 18.67, change: -1.89, changePercent: -9.18 },
        { symbol: "PINS", name: "Pinterest Inc", price: 35.78, change: -2.98, changePercent: -7.69 },
        { symbol: "ROKU", name: "Roku Inc", price: 65.23, change: -4.12, changePercent: -5.94 }
      ];
      setTopLosers(mockLosers);
    }
  }, [quotesData, isLoading]);

  const handleViewStock = (symbol: string) => {
    setLocation(`/stock/${symbol}/charts`);
  };

  const handleViewAll = () => {
    setLocation("/find-stocks?filter=losers");
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <TrendingDown className="w-5 h-5" />
            Top Losers Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="space-y-1">
                  <div className="h-4 bg-muted rounded animate-pulse w-16" />
                  <div className="h-3 bg-muted rounded animate-pulse w-24" />
                </div>
                <div className="text-right space-y-1">
                  <div className="h-4 bg-muted rounded animate-pulse w-12" />
                  <div className="h-3 bg-muted rounded animate-pulse w-14" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full hover:shadow-lg transition-shadow bg-gradient-to-br from-red-50/50 to-rose-50/50 dark:from-red-950/20 dark:to-rose-950/20 border-red-200/50 dark:border-red-800/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <TrendingDown className="w-5 h-5" />
            Top Losers Today
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleViewAll}
            className="text-red-600 hover:text-red-700 hover:bg-red-100/50"
          >
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {topLosers.map((stock, index) => (
          <div 
            key={stock.symbol}
            onClick={() => handleViewStock(stock.symbol)}
            className="flex justify-between items-center p-2 rounded-lg hover:bg-red-100/30 dark:hover:bg-red-800/20 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center justify-center w-6 h-6 rounded-full bg-red-100 dark:bg-red-800 text-xs font-bold text-red-700 dark:text-red-300">
                {index + 1}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-red-300 text-red-700 dark:border-red-700 dark:text-red-300 text-xs">
                    {stock.symbol}
                  </Badge>
                  {stock.changePercent < -8 && (
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate max-w-[100px]">
                  {stock.name}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold">${stock.price.toFixed(2)}</p>
              <div className="flex items-center gap-1">
                <span className="text-red-600 dark:text-red-400 text-sm font-medium">
                  {stock.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}