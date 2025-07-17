import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface RealTimePrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  updatedAt: string;
}

export interface PriceSubscriptionCallback {
  (prices: RealTimePrice[]): void;
}

class RealTimePriceService {
  private channel: RealtimeChannel | null = null;
  private subscribers: Set<PriceSubscriptionCallback> = new Set();
  private priceCache: Map<string, RealTimePrice> = new Map();
  private isConnected = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // Conectar ao canal de preços em tempo real
      this.channel = supabase.channel('price-updates', {
        config: {
          broadcast: { self: true },
          presence: { key: 'user-id' }
        }
      });

      // Escutar atualizações de preços
      this.channel
        .on('broadcast', { event: 'price-update' }, (payload) => {
          console.log('📊 Atualização de preços recebida:', payload);
          this.handlePriceUpdate(payload.payload);
        })
        .subscribe((status) => {
          console.log('🔗 Status do canal de preços:', status);
          this.isConnected = status === 'SUBSCRIBED';
        });

      // Carregar preços iniciais do cache
      await this.loadInitialPrices();

    } catch (error) {
      console.error('❌ Erro ao inicializar serviço de preços:', error);
    }
  }

  private async loadInitialPrices() {
    try {
      // Buscar preços do cache do Supabase
      const { data: cachedPrices, error } = await supabase
        .from('real_time_prices')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar preços iniciais:', error);
        return;
      }

      if (cachedPrices) {
        const prices: RealTimePrice[] = cachedPrices.map(price => ({
          symbol: price.symbol,
          price: price.price,
          change: price.change,
          changePercent: price.change_percent,
          volume: price.volume,
          updatedAt: price.updated_at
        }));

        // Atualizar cache local
        prices.forEach(price => {
          this.priceCache.set(price.symbol, price);
        });

        // Notificar subscribers
        this.notifySubscribers(prices);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar preços iniciais:', error);
    }
  }

  private async handlePriceUpdate(payload: any) {
    if (!payload.symbols || !Array.isArray(payload.symbols)) return;

    try {
      // Buscar preços atualizados do banco
      const { data: updatedPrices, error } = await supabase
        .from('real_time_prices')
        .select('*')
        .in('symbol', payload.symbols);

      if (error) {
        console.error('❌ Erro ao buscar preços atualizados:', error);
        return;
      }

      if (updatedPrices) {
        const prices: RealTimePrice[] = updatedPrices.map(price => ({
          symbol: price.symbol,
          price: price.price,
          change: price.change,
          changePercent: price.change_percent,
          volume: price.volume,
          updatedAt: price.updated_at
        }));

        // Atualizar cache local
        prices.forEach(price => {
          this.priceCache.set(price.symbol, price);
        });

        // Notificar subscribers
        this.notifySubscribers(prices);
      }
    } catch (error) {
      console.error('❌ Erro ao processar atualização de preços:', error);
    }
  }

  private notifySubscribers(prices: RealTimePrice[]) {
    this.subscribers.forEach(callback => {
      try {
        callback(prices);
      } catch (error) {
        console.error('❌ Erro ao notificar subscriber:', error);
      }
    });
  }

  // Subscrever atualizações de preços
  subscribe(callback: PriceSubscriptionCallback): () => void {
    this.subscribers.add(callback);

    // Enviar preços em cache imediatamente
    const cachedPrices = Array.from(this.priceCache.values());
    if (cachedPrices.length > 0) {
      setTimeout(() => callback(cachedPrices), 0);
    }

    // Retornar função de unsubscribe
    return () => {
      this.subscribers.delete(callback);
    };
  }

  // Obter preço de um símbolo específico
  getPrice(symbol: string): RealTimePrice | null {
    return this.priceCache.get(symbol.toUpperCase()) || null;
  }

  // Obter preços de múltiplos símbolos
  getPrices(symbols: string[]): RealTimePrice[] {
    return symbols
      .map(symbol => this.priceCache.get(symbol.toUpperCase()))
      .filter(price => price !== undefined) as RealTimePrice[];
  }

  // Verificar se o serviço está conectado
  isServiceConnected(): boolean {
    return this.isConnected;
  }

  // Forçar atualização de preços (chamar edge function)
  async forceUpdate(): Promise<boolean> {
    try {
      console.log('🔄 Forçando atualização de preços...');
      
      const { data, error } = await supabase.functions.invoke('update-prices', {
        headers: {
          'Authorization': `Bearer ${supabase.auth.session()?.access_token}`
        }
      });

      if (error) {
        console.error('❌ Erro ao forçar atualização:', error);
        return false;
      }

      console.log('✅ Atualização forçada com sucesso:', data);
      return true;
    } catch (error) {
      console.error('❌ Erro ao forçar atualização:', error);
      return false;
    }
  }

  // Limpar recursos
  cleanup() {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    this.subscribers.clear();
    this.priceCache.clear();
    this.isConnected = false;
  }
}

// Singleton instance
export const realTimePriceService = new RealTimePriceService();

// Export para uso em componentes React
export default realTimePriceService;