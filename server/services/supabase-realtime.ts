import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getRealtimeClient } from './cache/supabase-client';
import { RealtimeQuote } from '../types/cache.types';

export interface RealtimeConfig {
  channel: string;
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
}

export class SupabaseRealtimeService {
  private static instance: SupabaseRealtimeService;
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscriptions: Map<string, Set<(payload: any) => void>> = new Map();

  private constructor() {}

  static getInstance(): SupabaseRealtimeService {
    if (!SupabaseRealtimeService.instance) {
      SupabaseRealtimeService.instance = new SupabaseRealtimeService();
    }
    return SupabaseRealtimeService.instance;
  }

  /**
   * Subscribe to realtime updates for a specific configuration
   */
  subscribe(
    config: RealtimeConfig,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void
  ): () => void {
    const channelKey = this.getChannelKey(config);

    // Check if channel already exists
    if (!this.channels.has(channelKey)) {
      const client = getRealtimeClient();
      const channel = client.channel(config.channel);

      // Set up the subscription
      const subscription = channel.on(
        'postgres_changes',
        {
          event: config.event || '*',
          schema: 'public',
          table: config.table,
          filter: config.filter,
        },
        (payload) => {
          // Notify all subscribers for this channel
          this.notifySubscribers(channelKey, payload);
        }
      );

      // Subscribe to the channel
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to realtime channel: ${config.channel}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error subscribing to channel: ${config.channel}`);
        } else if (status === 'TIMED_OUT') {
          console.error(`⏱️ Subscription timed out for channel: ${config.channel}`);
        }
      });

      this.channels.set(channelKey, channel);
    }

    // Add the callback to subscribers
    if (!this.subscriptions.has(channelKey)) {
      this.subscriptions.set(channelKey, new Set());
    }
    this.subscriptions.get(channelKey)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(channelKey, callback);
    };
  }

  /**
   * Subscribe to quote updates for specific symbols
   */
  subscribeToQuotes(
    symbols: string[],
    callback: (quote: RealtimeQuote) => void
  ): () => void {
    const config: RealtimeConfig = {
      channel: `quotes:${symbols.join(',')}`,
      table: 'realtime_quotes',
      event: 'INSERT',
    };

    // If subscribing to a single symbol, add filter
    if (symbols.length === 1) {
      config.filter = `symbol=eq.${symbols[0]}`;
    }

    return this.subscribe(config, (payload) => {
      const quote = payload.new as RealtimeQuote;
      // Only notify if it's a symbol we're interested in
      if (symbols.includes(quote.symbol)) {
        callback(quote);
      }
    });
  }

  /**
   * Subscribe to all quote updates
   */
  subscribeToAllQuotes(callback: (quote: RealtimeQuote) => void): () => void {
    const config: RealtimeConfig = {
      channel: 'all-quotes',
      table: 'realtime_quotes',
      event: 'INSERT',
    };

    return this.subscribe(config, (payload) => {
      callback(payload.new as RealtimeQuote);
    });
  }

  /**
   * Unsubscribe from a channel
   */
  private unsubscribe(channelKey: string, callback: (payload: any) => void): void {
    const subscribers = this.subscriptions.get(channelKey);
    if (subscribers) {
      subscribers.delete(callback);

      // If no more subscribers, close the channel
      if (subscribers.size === 0) {
        const channel = this.channels.get(channelKey);
        if (channel) {
          channel.unsubscribe();
          this.channels.delete(channelKey);
          this.subscriptions.delete(channelKey);
          console.log(`🔌 Unsubscribed from channel: ${channelKey}`);
        }
      }
    }
  }

  /**
   * Notify all subscribers for a channel
   */
  private notifySubscribers(channelKey: string, payload: any): void {
    const subscribers = this.subscriptions.get(channelKey);
    if (subscribers) {
      subscribers.forEach((callback) => {
        try {
          callback(payload);
        } catch (error) {
          console.error('Error in realtime subscriber callback:', error);
        }
      });
    }
  }

  /**
   * Get unique channel key
   */
  private getChannelKey(config: RealtimeConfig): string {
    return `${config.channel}:${config.table}:${config.event || '*'}:${
      config.filter || 'no-filter'
    }`;
  }

  /**
   * Publish a quote update (for testing or manual updates)
   */
  async publishQuoteUpdate(quote: RealtimeQuote): Promise<void> {
    try {
      const client = getRealtimeClient();
      await client.from('realtime_quotes').insert(quote);
      console.log(`📤 Published quote update for ${quote.symbol}`);
    } catch (error) {
      console.error('Failed to publish quote update:', error);
      throw error;
    }
  }

  /**
   * Get active channel count
   */
  getActiveChannelCount(): number {
    return this.channels.size;
  }

  /**
   * Get total subscriber count
   */
  getTotalSubscriberCount(): number {
    let total = 0;
    this.subscriptions.forEach((subscribers) => {
      total += subscribers.size;
    });
    return total;
  }

  /**
   * Clean up all subscriptions
   */
  cleanup(): void {
    console.log('🧹 Cleaning up all realtime subscriptions...');
    this.channels.forEach((channel, key) => {
      channel.unsubscribe();
      console.log(`Unsubscribed from channel: ${key}`);
    });
    this.channels.clear();
    this.subscriptions.clear();
  }
}

// Export singleton instance
export const realtimeService = SupabaseRealtimeService.getInstance();