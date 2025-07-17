import React, { useEffect } from 'react';
import { useRealtimePrices, type RealtimePriceUpdate } from '../hooks/use-realtime-prices';
import { Badge } from './ui/badge';
import { TrendingUp, TrendingDown, Wifi, WifiOff, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface RealtimePriceProps {
  symbol: string;
  autoSubscribe?: boolean;
  showSource?: boolean;
  showTimestamp?: boolean;
  className?: string;
}

export function RealtimePrice({ 
  symbol, 
  autoSubscribe = true, 
  showSource = false,
  showTimestamp = false,
  className 
}: RealtimePriceProps) {
  const { 
    getPrice, 
    getFormattedPrice, 
    getPriceChange, 
    isConnected, 
    subscribeToSymbols,
    isDataStale
  } = useRealtimePrices([symbol]);

  const price = getPrice(symbol);
  const priceChange = getPriceChange(symbol);
  const isStale = isDataStale(symbol);

  // Auto-subscribe to symbol if enabled
  useEffect(() => {
    if (autoSubscribe && symbol) {
      subscribeToSymbols([symbol]);
    }
  }, [symbol, autoSubscribe, subscribeToSymbols]);

  if (!price) {
    return (
      <div className={cn("flex items-center space-x-2 text-muted-foreground", className)}>
        <span>—</span>
        {showSource && (
          <Badge variant="outline" className="text-xs">
            <WifiOff className="w-3 h-3 mr-1" />
            No data
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {/* Price */}
      <span className="font-semibold">
        {getFormattedPrice(symbol)}
      </span>

      {/* Change */}
      <div className={cn(
        "flex items-center space-x-1 text-sm",
        priceChange.isPositive ? "text-green-600" : "text-red-600"
      )}>
        {priceChange.isPositive ? (
          <TrendingUp className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )}
        <span>{priceChange.formatted}</span>
      </div>

      {/* Connection Status */}
      {showSource && (
        <Badge 
          variant={isConnected ? "default" : "secondary"} 
          className="text-xs"
        >
          {isConnected ? (
            <>
              <Wifi className="w-3 h-3 mr-1" />
              {price.source}
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 mr-1" />
              offline
            </>
          )}
        </Badge>
      )}

      {/* Timestamp */}
      {showTimestamp && (
        <div className={cn(
          "flex items-center text-xs text-muted-foreground",
          isStale && "text-yellow-600"
        )}>
          <Clock className="w-3 h-3 mr-1" />
          {price.timestamp.toLocaleTimeString()}
          {isStale && " (stale)"}
        </div>
      )}
    </div>
  );
}

interface RealtimePriceListProps {
  symbols: string[];
  autoSubscribe?: boolean;
  showHeaders?: boolean;
  className?: string;
}

export function RealtimePriceList({ 
  symbols, 
  autoSubscribe = true, 
  showHeaders = true,
  className 
}: RealtimePriceListProps) {
  const { 
    prices, 
    isConnected, 
    subscribeToSymbols,
    stats,
    lastUpdate
  } = useRealtimePrices(symbols);

  // Auto-subscribe to all symbols
  useEffect(() => {
    if (autoSubscribe && symbols.length > 0) {
      subscribeToSymbols(symbols);
    }
  }, [symbols, autoSubscribe, subscribeToSymbols]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Headers */}
      {showHeaders && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Real-time Prices</h3>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span>Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-500" />
                <span>Disconnected</span>
              </>
            )}
            {lastUpdate && (
              <span>• Last update: {lastUpdate.toLocaleTimeString()}</span>
            )}
          </div>
        </div>
      )}

      {/* Statistics */}
      {showHeaders && stats.totalSymbols > 0 && (
        <div className="flex space-x-4 text-sm text-muted-foreground">
          <span>{stats.totalSymbols} symbols</span>
          <span>{stats.websocketSources} WebSocket</span>
          <span>{stats.pollingSources} polling</span>
          {stats.staleData > 0 && (
            <span className="text-yellow-600">{stats.staleData} stale</span>
          )}
        </div>
      )}

      {/* Price List */}
      <div className="space-y-2">
        {symbols.map((symbol) => (
          <div key={symbol} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="font-medium">{symbol}</div>
            <RealtimePrice 
              symbol={symbol} 
              autoSubscribe={false} // Already subscribed above
              showSource={true}
              showTimestamp={false}
            />
          </div>
        ))}
      </div>

      {symbols.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No symbols to display
        </div>
      )}
    </div>
  );
}

interface RealtimePriceTickerProps {
  symbols: string[];
  autoSubscribe?: boolean;
  scrollSpeed?: number;
  className?: string;
}

export function RealtimePriceTicker({ 
  symbols, 
  autoSubscribe = true,
  scrollSpeed = 50,
  className 
}: RealtimePriceTickerProps) {
  const { prices, subscribeToSymbols } = useRealtimePrices(symbols);

  // Auto-subscribe to all symbols
  useEffect(() => {
    if (autoSubscribe && symbols.length > 0) {
      subscribeToSymbols(symbols);
    }
  }, [symbols, autoSubscribe, subscribeToSymbols]);

  return (
    <div className={cn("overflow-hidden whitespace-nowrap", className)}>
      <div 
        className="inline-flex space-x-8 animate-scroll"
        style={{
          animationDuration: `${scrollSpeed}s`,
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite'
        }}
      >
        {symbols.map((symbol) => (
          <div key={symbol} className="inline-flex items-center space-x-2 min-w-fit">
            <span className="font-medium">{symbol}</span>
            <RealtimePrice 
              symbol={symbol} 
              autoSubscribe={false}
              showSource={false}
              className="text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}