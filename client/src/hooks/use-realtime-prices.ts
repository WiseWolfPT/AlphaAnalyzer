import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for real-time subscriptions
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface RealtimePriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
  source: 'websocket' | 'polling';
}

export interface RealtimePriceState {
  [symbol: string]: RealtimePriceUpdate;
}

export function useRealtimePrices(symbols: string[] = []) {
  const [prices, setPrices] = useState<RealtimePriceState>({});
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [connectionCount, setConnectionCount] = useState(0);

  // Handle real-time price updates from Supabase Realtime
  const handlePriceUpdate = useCallback((payload: any) => {
    const update = payload.payload as RealtimePriceUpdate;
    
    // Convert timestamp string back to Date object
    update.timestamp = new Date(update.timestamp);
    
    setPrices(prev => ({
      ...prev,
      [update.symbol]: update
    }));
    
    setLastUpdate(new Date());
    
    console.log(`📈 [RealtimePrices] Updated ${update.symbol}: $${update.price} (${update.source})`);
  }, []);

  // Subscribe to Supabase Realtime channel
  useEffect(() => {
    console.log('🔗 [RealtimePrices] Subscribing to market-data channel');
    
    const channel = supabase
      .channel('market-data')
      .on(
        'broadcast',
        { event: 'price-update' },
        handlePriceUpdate
      )
      .subscribe((status) => {
        console.log(`📡 [RealtimePrices] Channel status: ${status}`);
        setIsConnected(status === 'SUBSCRIBED');
        
        if (status === 'SUBSCRIBED') {
          setConnectionCount(prev => prev + 1);
        }
      });

    return () => {
      console.log('🔌 [RealtimePrices] Unsubscribing from market-data channel');
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [handlePriceUpdate]);

  // Fetch initial price data from database
  const fetchInitialPrices = useCallback(async () => {
    if (symbols.length === 0) return;

    try {
      console.log('📊 [RealtimePrices] Fetching initial prices for:', symbols);
      
      const { data, error } = await supabase
        .from('real_time_quotes')
        .select('*')
        .in('symbol', symbols);

      if (error) {
        console.error('❌ [RealtimePrices] Failed to fetch initial prices:', error);
        return;
      }

      if (data) {
        const initialPrices: RealtimePriceState = {};
        data.forEach((quote) => {
          initialPrices[quote.symbol] = {
            symbol: quote.symbol,
            price: parseFloat(quote.price),
            change: parseFloat(quote.change) || 0,
            changePercent: parseFloat(quote.change_percent) || 0,
            volume: parseInt(quote.volume) || 0,
            timestamp: new Date(quote.updated_at),
            source: quote.source as 'websocket' | 'polling'
          };
        });

        setPrices(prev => ({ ...prev, ...initialPrices }));
        console.log(`✅ [RealtimePrices] Loaded initial prices for ${data.length} symbols`);
      }
    } catch (error) {
      console.error('❌ [RealtimePrices] Error fetching initial prices:', error);
    }
  }, [symbols]);

  // Fetch initial prices when symbols change
  useEffect(() => {
    fetchInitialPrices();
  }, [fetchInitialPrices]);

  // Subscribe to WebSocket service for symbols (if running)
  const subscribeToSymbols = useCallback(async (symbolsToSubscribe: string[]) => {
    try {
      const promises = symbolsToSubscribe.map(async (symbol) => {
        const response = await fetch('/api/admin/websocket/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol })
        });
        
        if (!response.ok) {
          console.warn(`⚠️ [RealtimePrices] Failed to subscribe to ${symbol}:`, response.statusText);
          return false;
        }
        
        console.log(`📊 [RealtimePrices] Subscribed to ${symbol}`);
        return true;
      });

      const results = await Promise.all(promises);
      const successCount = results.filter(Boolean).length;
      
      console.log(`✅ [RealtimePrices] Successfully subscribed to ${successCount}/${symbolsToSubscribe.length} symbols`);
      return successCount;
    } catch (error) {
      console.error('❌ [RealtimePrices] Error subscribing to symbols:', error);
      return 0;
    }
  }, []);

  // Get price for a specific symbol
  const getPrice = useCallback((symbol: string): RealtimePriceUpdate | null => {
    return prices[symbol] || null;
  }, [prices]);

  // Get formatted price display
  const getFormattedPrice = useCallback((symbol: string): string => {
    const price = getPrice(symbol);
    if (!price) return '—';
    return `$${price.price.toFixed(2)}`;
  }, [getPrice]);

  // Get price change display
  const getPriceChange = useCallback((symbol: string): { 
    change: number; 
    changePercent: number; 
    isPositive: boolean;
    formatted: string;
  } => {
    const price = getPrice(symbol);
    if (!price) return { 
      change: 0, 
      changePercent: 0, 
      isPositive: false,
      formatted: '—'
    };

    const isPositive = price.change >= 0;
    const sign = isPositive ? '+' : '';
    const formatted = `${sign}${price.change.toFixed(2)} (${sign}${price.changePercent.toFixed(2)}%)`;

    return {
      change: price.change,
      changePercent: price.changePercent,
      isPositive,
      formatted
    };
  }, [getPrice]);

  // Check if data is stale (older than 5 minutes)
  const isDataStale = useCallback((symbol: string): boolean => {
    const price = getPrice(symbol);
    if (!price) return true;

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return price.timestamp < fiveMinutesAgo;
  }, [getPrice]);

  return {
    prices,
    isConnected,
    lastUpdate,
    connectionCount,
    subscribeToSymbols,
    getPrice,
    getFormattedPrice,
    getPriceChange,
    isDataStale,
    refresh: fetchInitialPrices,
    // Utility functions
    symbols: Object.keys(prices),
    hasData: Object.keys(prices).length > 0,
    // Statistics
    stats: {
      totalSymbols: Object.keys(prices).length,
      websocketSources: Object.values(prices).filter(p => p.source === 'websocket').length,
      pollingSources: Object.values(prices).filter(p => p.source === 'polling').length,
      staleData: Object.keys(prices).filter(isDataStale).length
    }
  };
}