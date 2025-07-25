import React from 'react';
import { useLocation } from 'wouter';
import { useRealtimeQuote } from '@/hooks/use-realtime-quotes';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RealtimePortfolioHoldingProps {
  holding: {
    symbol: string;
    shares: number;
    avgPrice: number;
  };
}

export function RealtimePortfolioHolding({ holding }: RealtimePortfolioHoldingProps) {
  const [, setLocation] = useLocation();
  const { quote, isConnected } = useRealtimeQuote(holding.symbol);

  const handleClick = () => {
    setLocation(`/stock/${holding.symbol}/charts`);
  };

  // Use real price if available, otherwise fall back to avgPrice
  const currentPrice = quote?.price || holding.avgPrice;
  const gainLoss = (currentPrice - holding.avgPrice) * holding.shares;
  const gainLossPercent = ((currentPrice - holding.avgPrice) / holding.avgPrice) * 100;
  const isPositive = gainLoss >= 0;
  const currentValue = currentPrice * holding.shares;

  return (
    <div 
      className="flex items-center justify-between p-4 hover:bg-secondary/50 rounded-lg cursor-pointer transition-colors group border relative"
      onClick={handleClick}
    >
      {/* Realtime indicator */}
      {isConnected && quote && (
        <div className="absolute top-2 right-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" 
                title="Dados em tempo real" />
        </div>
      )}

      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <span className="text-sm font-medium text-primary">{holding.symbol.charAt(0)}</span>
        </div>
        <div>
          <div className="text-label group-hover:text-primary transition-colors">
            {holding.symbol}
          </div>
          <div className="text-caption">
            {holding.shares} shares × ${currentPrice.toFixed(2)}
          </div>
        </div>
      </div>
      
      <div className="text-right flex items-center space-x-3">
        <div>
          <div className="text-metric">
            ${currentValue.toFixed(2)}
          </div>
          <div className={cn(
            "text-caption",
            isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {isPositive ? "+" : ""}${gainLoss.toFixed(2)} ({isPositive ? "+" : ""}{gainLossPercent.toFixed(2)}%)
          </div>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </div>
  );
}