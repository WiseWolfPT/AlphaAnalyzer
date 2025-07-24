import React from 'react';
import { useRealtimeQuote } from '../hooks/use-realtime-quotes';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface RealtimePriceDisplayProps {
  symbol: string;
  className?: string;
}

export function RealtimePriceDisplay({ symbol, className }: RealtimePriceDisplayProps) {
  const { quote, isConnected } = useRealtimeQuote(symbol);

  if (!quote) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="h-6 w-20 bg-gray-200 rounded" />
      </div>
    );
  }

  const isPositive = quote.change >= 0;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold">
          ${quote.price.toFixed(2)}
        </span>
        {isConnected && (
          <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" 
                title="Live updates active" />
        )}
      </div>
      
      <div className={cn(
        "flex items-center gap-1 text-sm",
        isPositive ? "text-green-600" : "text-red-600"
      )}>
        {isPositive ? (
          <ArrowUpIcon className="h-4 w-4" />
        ) : (
          <ArrowDownIcon className="h-4 w-4" />
        )}
        <span>{Math.abs(quote.change).toFixed(2)}</span>
        <span>({Math.abs(quote.change_percent).toFixed(2)}%)</span>
      </div>

      <div className="text-xs text-gray-500">
        Volume: {(quote.volume / 1000000).toFixed(2)}M
      </div>
    </div>
  );
}

// Example usage in a watchlist
export function RealtimeWatchlist({ symbols }: { symbols: string[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {symbols.map(symbol => (
        <div key={symbol} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
          <h3 className="font-semibold mb-2">{symbol}</h3>
          <RealtimePriceDisplay symbol={symbol} />
        </div>
      ))}
    </div>
  );
}