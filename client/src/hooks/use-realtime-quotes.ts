import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

// Initialize Supabase client
const supabase = createClient(
  env.getSupabaseConfig().url,
  env.getSupabaseConfig().anonKey
);

interface RealtimeQuote {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  timestamp: string;
}

interface UseRealtimeQuotesOptions {
  symbols: string[];
  onUpdate?: (quote: RealtimeQuote) => void;
  enabled?: boolean;
}

export function useRealtimeQuotes({ symbols, onUpdate, enabled = true }: UseRealtimeQuotesOptions) {
  const [quotes, setQuotes] = useState<Record<string, RealtimeQuote>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || symbols.length === 0) return;

    console.log('🔌 Connecting to Supabase Realtime for symbols:', symbols);

    // Subscribe to realtime updates
    const channel = supabase
      .channel('quotes-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT and UPDATE
          schema: 'public',
          table: 'cache_quotes',
          filter: symbols.length > 0
            ? `key=in.(${symbols.map(s => `quote_${s}`).join(',')})`
            : undefined
        },
        (payload) => {
          if (payload.new && payload.new.data) {
            const data = payload.new.data as any;
            const quote: RealtimeQuote = {
              symbol: data.symbol,
              price: data.price,
              change: data.change,
              change_percent: data.change_percent,
              volume: data.volume || 0,
              timestamp: data.timestamp
            };
            
            setQuotes(prev => ({
              ...prev,
              [quote.symbol]: quote
            }));

            // Only call onUpdate if it's a function
            if (typeof onUpdate === 'function') {
              try {
                onUpdate(quote);
              } catch (err) {
                console.warn('onUpdate callback threw an error:', err);
              }
            }
          }
        }
      )
      .on('presence', { event: 'sync' }, () => {
        setIsConnected(true);
        console.log('✅ Connected to Supabase Realtime');
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
        } else if (status === 'CHANNEL_ERROR') {
          setError('Failed to connect to realtime updates');
          setIsConnected(false);
        }
      });

    // Cleanup on unmount
    return () => {
      console.log('🔌 Disconnecting from Supabase Realtime');
      supabase.removeChannel(channel);
    };
  }, [symbols.join(','), enabled, onUpdate]);

  return {
    quotes,
    isConnected,
    error
  };
}

// Hook for single symbol
type SingleQuoteOptions = {
  enabled?: boolean;
  onUpdate?: (quote: RealtimeQuote) => void;
} | ((quote: RealtimeQuote) => void) | undefined;

export function useRealtimeQuote(symbol: string, options?: SingleQuoteOptions) {
  const enabled = typeof options === 'object' && options !== null && 'enabled' in options
    ? Boolean(options.enabled)
    : true;

  const onUpdate = typeof options === 'function'
    ? options
    : (typeof options === 'object' && options?.onUpdate ? options.onUpdate : undefined);

  const { quotes, isConnected, error } = useRealtimeQuotes({
    symbols: [symbol],
    onUpdate,
    enabled
  });

  return {
    quote: quotes[symbol],
    isConnected,
    error
  };
}
