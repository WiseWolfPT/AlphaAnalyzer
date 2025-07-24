import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

// Initialize Supabase client
const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
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
}

export function useRealtimeQuotes({ symbols, onUpdate }: UseRealtimeQuotesOptions) {
  const [quotes, setQuotes] = useState<Record<string, RealtimeQuote>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (symbols.length === 0) return;

    console.log('🔌 Connecting to Supabase Realtime for symbols:', symbols);

    // Subscribe to realtime updates
    const channel = supabase
      .channel('quotes-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'realtime_quotes',
          filter: symbols.length === 1 
            ? `symbol=eq.${symbols[0]}` 
            : undefined // Can't filter multiple symbols easily
        },
        (payload) => {
          const quote = payload.new as RealtimeQuote;
          
          // Only process if it's one of our symbols
          if (symbols.includes(quote.symbol)) {
            console.log('📊 Realtime quote update:', quote);
            
            setQuotes(prev => ({
              ...prev,
              [quote.symbol]: quote
            }));

            onUpdate?.(quote);
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
  }, [symbols.join(','), onUpdate]);

  return {
    quotes,
    isConnected,
    error
  };
}

// Hook for single symbol
export function useRealtimeQuote(symbol: string, onUpdate?: (quote: RealtimeQuote) => void) {
  const { quotes, isConnected, error } = useRealtimeQuotes({
    symbols: [symbol],
    onUpdate
  });

  return {
    quote: quotes[symbol],
    isConnected,
    error
  };
}