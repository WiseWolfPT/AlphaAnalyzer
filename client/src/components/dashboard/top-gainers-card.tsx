import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, ArrowRight } from "lucide-react";
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
    'NVDA': 'NVIDIA Corp',
    'AMD': 'Advanced Micro Devices',
    'TSLA': 'Tesla Inc',
    'META': 'Meta Platforms',
    'AMZN': 'Amazon.com',
    'AAPL': 'Apple Inc',
    'MSFT': 'Microsoft Corp',
    'GOOGL': 'Alphabet Inc',
    'NFLX': 'Netflix Inc',
    'JPM': 'JPMorgan Chase',
    'V': 'Visa Inc',
    'MA': 'Mastercard',
    'WMT': 'Walmart Inc',
    'DIS': 'Walt Disney Co'
  };
  return companyNames[symbol] || symbol;
}

export function TopGainersCard() {
  const [, setLocation] = useLocation();
  const [topGainers, setTopGainers] = useState<Stock[]>([]);
  
  // Popular stocks to track for gainers
  const trackedSymbols = ['NVDA', 'AMD', 'TSLA', 'META', 'AMZN', 'AAPL', 'MSFT', 'GOOGL'];
  const { data: quotesData, isLoading } = useMarketQuotes(trackedSymbols);

  useEffect(() => {
    if (quotesData?.quotes && quotesData.quotes.length > 0) {
      // Convert market quotes to our Stock format and sort by gain percentage
      const stocks = quotesData.quotes
        .map(quote => ({
          symbol: quote.symbol,
          name: getCompanyName(quote.symbol), // Helper function to get company name
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent
        }))
        .filter(stock => stock.changePercent > 0) // Only show gainers
        .sort((a, b) => b.changePercent - a.changePercent) // Sort by highest gain
        .slice(0, 5); // Top 5 gainers
      
      setTopGainers(stocks);
    } else if (!isLoading) {
      // Fallback to mock data if API fails
      const mockGainers: Stock[] = [
        { symbol: "NVDA", name: "NVIDIA Corp", price: 892.45, change: 45.67, changePercent: 5.39 },
        { symbol: "AMD", name: "Advanced Micro", price: 187.23, change: 8.94, changePercent: 5.01 },
        { symbol: "TSLA", name: "Tesla Inc", price: 248.73, change: 11.28, changePercent: 4.75 },
        { symbol: "META", name: "Meta Platforms", price: 512.89, change: 22.34, changePercent: 4.56 },
        { symbol: "AMZN", name: "Amazon.com", price: 165.78, change: 6.89, changePercent: 4.33 }
      ];
      setTopGainers(mockGainers);
    }
  }, [quotesData, isLoading]);

  const handleViewStock = (symbol: string) => {
    setLocation(`/stock/${symbol}/charts`);
  };

  const handleViewAll = () => {
    setLocation("/find-stocks?filter=gainers");
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <TrendingUp className="w-5 h-5" />
            Top Gainers Today
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
    <Card className="h-full hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200/50 dark:border-green-800/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <TrendingUp className="w-5 h-5" />
            Top Gainers Today
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleViewAll}
            className="text-green-600 hover:text-green-700 hover:bg-green-100/50"
          >
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {topGainers.map((stock, index) => (
          <div 
            key={stock.symbol}
            onClick={() => handleViewStock(stock.symbol)}
            className="flex justify-between items-center p-2 rounded-lg hover:bg-green-100/30 dark:hover:bg-green-800/20 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-800 text-xs font-bold text-green-700 dark:text-green-300">
                {index + 1}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-300 text-xs">
                    {stock.symbol}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate max-w-[100px]">
                  {stock.name}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold">${stock.price.toFixed(2)}</p>
              <div className="flex items-center gap-1">
                <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                  +{stock.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}