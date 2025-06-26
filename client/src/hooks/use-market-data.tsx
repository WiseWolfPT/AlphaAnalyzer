/**
 * Hook para consumir dados de mercado de forma segura
 * 
 * Este hook demonstra como buscar dados reais de mercado
 * através dos endpoints seguros do backend.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/simple-auth-offline';

// Tipos
interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number;
  timestamp: number;
  provider: string;
  marketCap?: number;
  eps?: number;
  pe?: number;
  _cached: boolean;
  _timestamp: number;
}

interface BatchQuotesResponse {
  quotes: MarketQuote[];
  errors?: Record<string, string>;
  _timestamp: number;
}

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

// Cliente API
class MarketDataClient {
  private baseUrl = '/api/market-data';
  private authToken?: string;

  setAuthToken(token: string) {
    this.authToken = token;
  }

  private async fetchWithAuth(url: string, options?: RequestInit) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
      ...options?.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getQuote(symbol: string): Promise<MarketQuote> {
    return this.fetchWithAuth(`${this.baseUrl}/quote/${symbol}`);
  }

  async getBatchQuotes(symbols: string[]): Promise<BatchQuotesResponse> {
    return this.fetchWithAuth(`${this.baseUrl}/quotes/batch`, {
      method: 'POST',
      body: JSON.stringify({ symbols }),
    });
  }

  async searchSymbols(query: string): Promise<{ results: SearchResult[]; count: number }> {
    const params = new URLSearchParams({ query });
    return this.fetchWithAuth(`${this.baseUrl}/search?${params}`);
  }

  async getStatus() {
    return this.fetchWithAuth(`${this.baseUrl}/status`);
  }
}

// Instância do cliente
const marketDataClient = new MarketDataClient();

/**
 * Hook para buscar cotação de uma ação
 */
export function useStockQuote(symbol: string, options?: { enabled?: boolean; refetchInterval?: number }) {
  const { user } = useAuth();

  // Configurar token se usuário autenticado
  useEffect(() => {
    if (user) {
      // Assumindo que o token está armazenado em algum lugar
      // marketDataClient.setAuthToken(token);
    }
  }, [user]);

  return useQuery({
    queryKey: ['stock-quote', symbol],
    queryFn: () => marketDataClient.getQuote(symbol),
    enabled: !!symbol && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval || 60000, // Atualizar a cada minuto
    staleTime: 30000, // Considerar dados frescos por 30 segundos
    gcTime: 5 * 60 * 1000, // Manter em cache por 5 minutos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook para buscar múltiplas cotações
 */
export function useBatchQuotes(symbols: string[], options?: { enabled?: boolean }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['batch-quotes', symbols],
    queryFn: () => marketDataClient.getBatchQuotes(symbols),
    enabled: symbols.length > 0 && (options?.enabled ?? true),
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook para buscar símbolos
 */
export function useSymbolSearch(query: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['symbol-search', query],
    queryFn: () => marketDataClient.searchSymbols(query),
    enabled: query.length >= 1 && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook para monitorar status dos providers
 */
export function useMarketDataStatus() {
  return useQuery({
    queryKey: ['market-data-status'],
    queryFn: () => marketDataClient.getStatus(),
    refetchInterval: 5 * 60 * 1000, // Verificar a cada 5 minutos
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para streaming de cotações em tempo real
 */
export function useRealtimeQuotes(symbols: string[]) {
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (symbols.length === 0) return;

    // SECURITY FIX: Include authentication token in WebSocket connection
    // Get the access token from auth context or localStorage
    const accessToken = localStorage.getItem('accessToken') || '';
    
    // WebSocket para atualizações em tempo real com autenticação
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws/market-data?token=${encodeURIComponent(accessToken)}`);

    ws.onopen = () => {
      setIsConnected(true);
      ws.send(JSON.stringify({
        action: 'subscribe',
        symbols: symbols,
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Atualizar estado local
      setQuotes(prev => ({
        ...prev,
        [data.symbol]: data,
      }));

      // Atualizar cache do React Query
      queryClient.setQueryData(['stock-quote', data.symbol], data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [symbols, queryClient]);

  return { quotes, isConnected };
}

/**
 * Exemplo de uso em componente
 */
export function StockPriceExample({ symbol }: { symbol: string }) {
  const { data: quote, isLoading, error } = useStockQuote(symbol);

  if (isLoading) return <div>Carregando cotação...</div>;
  if (error) return <div>Erro ao carregar cotação: {error.message}</div>;
  if (!quote) return null;

  return (
    <div className="stock-quote">
      <h3>{symbol}</h3>
      <div className="price">
        ${quote.price.toFixed(2)}
        <span className={quote.change >= 0 ? 'text-green-500' : 'text-red-500'}>
          {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
        </span>
      </div>
      <div className="details text-sm text-gray-500">
        High: ${quote.high.toFixed(2)} | Low: ${quote.low.toFixed(2)}
        {quote._cached && <span className="ml-2">(cached)</span>}
      </div>
      <div className="provider text-xs text-gray-400">
        Dados de: {quote.provider}
      </div>
    </div>
  );
}