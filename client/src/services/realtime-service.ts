/**
 * Supabase Realtime Service for Live Stock Updates
 * Implements WebSocket connections for real-time price updates
 */

import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '@/config/api';

export interface RealtimeQuote {
  id?: string;
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  timestamp: string;
}

export interface RealtimeSubscription {
  unsubscribe: () => void;
}

class RealtimeService {
  private supabase;
  private channels: Map<string, RealtimeChannel> = new Map();
  private listeners: Map<string, Set<(quote: RealtimeQuote) => void>> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.supabase = createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey,
      {
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      }
    );

    // Log configuration in development
    if (import.meta.env.DEV) {
      console.log(
        '%c🔌 Realtime Service Initialized',
        'color: green; font-size: 14px; font-weight: bold;',
        '\nSupabase URL:', SUPABASE_CONFIG.url,
        '\nWebSocket support enabled'
      );
    }
  }

  /**
   * Subscribe to real-time quotes for specific symbols
   */
  subscribeToQuotes(
    symbols: string[], 
    callback: (quote: RealtimeQuote) => void
  ): RealtimeSubscription {
    // Sort symbols to create consistent channel name
    const sortedSymbols = [...symbols].sort();
    const channelName = `quotes:${sortedSymbols.join(',')}`;
    
    console.log(`📡 Subscribing to real-time quotes for: ${symbols.join(', ')}`);
    
    // Check if channel already exists
    if (!this.channels.has(channelName)) {
      this.createChannel(channelName, sortedSymbols);
    }

    // Add listener for each symbol
    symbols.forEach(symbol => {
      if (!this.listeners.has(symbol)) {
        this.listeners.set(symbol, new Set());
      }
      this.listeners.get(symbol)!.add(callback);
    });

    // Return unsubscribe function
    return {
      unsubscribe: () => {
        symbols.forEach(symbol => {
          this.listeners.get(symbol)?.delete(callback);
          
          // If no more listeners for this symbol, clean up
          if (this.listeners.get(symbol)?.size === 0) {
            this.listeners.delete(symbol);
          }
        });

        // If no more listeners for any symbol in this channel, unsubscribe
        const hasListeners = sortedSymbols.some(s => this.listeners.has(s));
        if (!hasListeners) {
          this.removeChannel(channelName);
        }
      }
    };
  }

  /**
   * Subscribe to all quotes (for dashboard)
   */
  subscribeToAllQuotes(callback: (quote: RealtimeQuote) => void): RealtimeSubscription {
    const channelName = 'all-quotes';
    
    console.log('📡 Subscribing to all real-time quotes');
    
    if (!this.channels.has(channelName)) {
      const channel = this.supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'realtime_quotes'
          },
          (payload) => {
            const quote = payload.new as RealtimeQuote;
            console.log('✨ Realtime quote received:', quote.symbol, quote.price);
            callback(quote);
          }
        )
        .subscribe((status) => {
          console.log(`📡 Realtime channel status: ${status}`);
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to all quotes');
            this.reconnectAttempts.set(channelName, 0);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Channel error, attempting reconnect...');
            this.handleReconnect(channelName);
          } else if (status === 'TIMED_OUT') {
            console.error('⏱️ Channel timed out, attempting reconnect...');
            this.handleReconnect(channelName);
          }
        });

      this.channels.set(channelName, channel);
    }

    return {
      unsubscribe: () => {
        this.removeChannel(channelName);
      }
    };
  }

  /**
   * Publish a quote update (for testing or manual updates)
   */
  async publishQuote(quote: RealtimeQuote): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('realtime_quotes')
        .insert({
          symbol: quote.symbol,
          price: quote.price,
          change: quote.change,
          change_percent: quote.change_percent,
          volume: quote.volume,
          timestamp: quote.timestamp || new Date().toISOString()
        });

      if (error) {
        console.error('❌ Failed to publish quote:', error);
        throw error;
      }

      console.log('✅ Quote published:', quote.symbol);
    } catch (error) {
      console.error('❌ Error publishing quote:', error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    connected: boolean;
    channels: string[];
    listeners: number;
  } {
    const activeChannels = Array.from(this.channels.keys());
    const totalListeners = Array.from(this.listeners.values()).reduce(
      (sum, set) => sum + set.size, 
      0
    );

    return {
      connected: activeChannels.length > 0,
      channels: activeChannels,
      listeners: totalListeners
    };
  }

  /**
   * Clean up all subscriptions
   */
  cleanup() {
    console.log('🧹 Cleaning up realtime subscriptions...');
    
    this.channels.forEach((channel, name) => {
      this.supabase.removeChannel(channel);
      console.log(`❌ Removed channel: ${name}`);
    });
    
    this.channels.clear();
    this.listeners.clear();
    this.reconnectAttempts.clear();
  }

  // Private methods

  private createChannel(channelName: string, symbols: string[]) {
    console.log(`🔧 Creating channel: ${channelName}`);
    
    const channel = this.supabase.channel(channelName);

    // Subscribe to changes for specific symbols
    if (symbols.length === 1) {
      // Single symbol - use filter
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'realtime_quotes',
          filter: `symbol=eq.${symbols[0]}`
        },
        (payload) => this.handleQuoteUpdate(payload.new as RealtimeQuote)
      );
    } else {
      // Multiple symbols - filter in handler
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'realtime_quotes'
        },
        (payload) => {
          const quote = payload.new as RealtimeQuote;
          if (symbols.includes(quote.symbol)) {
            this.handleQuoteUpdate(quote);
          }
        }
      );
    }

    // Subscribe with status handling
    channel.subscribe((status) => {
      console.log(`📡 Channel ${channelName} status: ${status}`);
      
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Successfully subscribed to ${channelName}`);
        this.reconnectAttempts.set(channelName, 0);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error(`❌ Channel error for ${channelName}, attempting reconnect...`);
        this.handleReconnect(channelName);
      }
    });

    this.channels.set(channelName, channel);
  }

  private removeChannel(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      console.log(`🔌 Removing channel: ${channelName}`);
      this.supabase.removeChannel(channel);
      this.channels.delete(channelName);
      this.reconnectAttempts.delete(channelName);
    }
  }

  private handleQuoteUpdate(quote: RealtimeQuote) {
    console.log('📈 Quote update received:', quote.symbol, quote.price);
    
    // Notify all listeners for this symbol
    const listeners = this.listeners.get(quote.symbol);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(quote);
        } catch (error) {
          console.error('Error in quote listener:', error);
        }
      });
    }
  }

  private async handleReconnect(channelName: string) {
    const attempts = this.reconnectAttempts.get(channelName) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnect attempts reached for ${channelName}`);
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, attempts); // Exponential backoff
    console.log(`🔄 Reconnecting ${channelName} in ${delay}ms (attempt ${attempts + 1}/${this.maxReconnectAttempts})`);
    
    this.reconnectAttempts.set(channelName, attempts + 1);
    
    setTimeout(() => {
      const channel = this.channels.get(channelName);
      if (channel) {
        // Remove old channel and recreate
        this.supabase.removeChannel(channel);
        this.channels.delete(channelName);
        
        // Recreate based on channel type
        if (channelName === 'all-quotes') {
          // Find a listener to resubscribe
          const firstListener = Array.from(this.listeners.values())[0]?.values().next().value;
          if (firstListener) {
            this.subscribeToAllQuotes(firstListener);
          }
        } else if (channelName.startsWith('quotes:')) {
          // Extract symbols and resubscribe
          const symbols = channelName.replace('quotes:', '').split(',');
          const listeners = new Set<(quote: RealtimeQuote) => void>();
          
          symbols.forEach(symbol => {
            const symbolListeners = this.listeners.get(symbol);
            if (symbolListeners) {
              symbolListeners.forEach(listener => listeners.add(listener));
            }
          });
          
          if (listeners.size > 0) {
            this.createChannel(channelName, symbols);
          }
        }
      }
    }, delay);
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService();

// Helper hook for React components
export function useRealtimeQuotes(
  symbols: string[],
  onQuoteUpdate: (quote: RealtimeQuote) => void
): void {
  import('react').then(({ useEffect }) => {
    useEffect(() => {
      if (symbols.length === 0) return;

      const subscription = realtimeService.subscribeToQuotes(symbols, onQuoteUpdate);
      
      return () => {
        subscription.unsubscribe();
      };
    }, [symbols.join(','), onQuoteUpdate]);
  });
}