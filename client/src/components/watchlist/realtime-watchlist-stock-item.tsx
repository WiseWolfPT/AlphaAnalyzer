import React from 'react';
import { useLocation } from 'wouter';
import { useRealtimeQuote } from '@/hooks/use-realtime-quotes';
import { TrendingUp, TrendingDown, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WatchlistStock } from '@shared/schema';

interface RealtimeWatchlistStockItemProps {
  ws: WatchlistStock;
}

export function RealtimeWatchlistStockItem({ ws }: RealtimeWatchlistStockItemProps) {
  const [, setLocation] = useLocation();
  const { quote, isConnected, error } = useRealtimeQuote(ws.stockSymbol);

  const handleClick = () => {
    setLocation(`/stock/${ws.stockSymbol}/charts`);
  };

  if (error) {
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors group" onClick={handleClick}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <span className="text-sm font-medium text-primary">{ws.stockSymbol.charAt(0)}</span>
          </div>
          <div>
            <div className="font-medium group-hover:text-primary transition-colors">
              {ws.stockSymbol}
            </div>
            <div className="text-sm text-muted-foreground">
              Erro ao carregar
            </div>
          </div>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg animate-pulse">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-300 rounded-lg"></div>
          <div>
            <div className="h-4 bg-gray-300 rounded w-16 mb-1"></div>
            <div className="h-3 bg-gray-300 rounded w-24"></div>
          </div>
        </div>
        <div className="text-right">
          <div className="h-4 bg-gray-300 rounded w-20 mb-1"></div>
          <div className="h-3 bg-gray-300 rounded w-16"></div>
        </div>
      </div>
    );
  }

  const isPositive = quote.change >= 0;

  return (
    <div 
      className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors group relative"
      onClick={handleClick}
    >
      {/* Realtime indicator */}
      {isConnected && (
        <div className="absolute top-2 right-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" 
                title="Dados em tempo real" />
        </div>
      )}

      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <span className="text-sm font-medium text-primary">{ws.stockSymbol.charAt(0)}</span>
        </div>
        <div>
          <div className="font-medium group-hover:text-primary transition-colors">
            {ws.stockSymbol}
          </div>
          <div className="text-sm text-muted-foreground">
            {quote.company_name || `${ws.stockSymbol} Corporation`}
          </div>
        </div>
      </div>
      
      <div className="text-right flex items-center space-x-2">
        <div>
          <div className="font-medium">
            ${quote.price.toFixed(2)}
          </div>
          <div className={cn(
            "text-sm flex items-center gap-1",
            isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>
              {isPositive ? "+" : ""}{quote.change_percent.toFixed(2)}%
            </span>
          </div>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </div>
  );
}