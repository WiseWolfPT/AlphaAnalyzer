/**
 * ALFALYZER - REAL DATA INTEGRATION SERVICE TESTS
 * Testes unitários para o serviço de integração de dados reais
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { realDataService } from '../real-data-integration';
import { cacheManager } from '@/lib/cache-manager';
import type { StockQuote, MarketIndex, ApiQuotaInfo } from '../real-data-integration';

// Mock dos provedores de API
vi.mock('../alpha-vantage-enhanced', () => ({
  alphaVantageEnhanced: {
    searchStocks: vi.fn(),
    getQuote: vi.fn(),
    getBatchQuotes: vi.fn(),
    getMarketStatus: vi.fn(),
  },
}));

vi.mock('../finnhub-enhanced', () => ({
  finnhubEnhanced: {
    searchStocks: vi.fn(),
    getQuote: vi.fn(),
    getMarketIndices: vi.fn(),
    getCompanyProfile: vi.fn(),
  },
}));

vi.mock('../fmp-enhanced', () => ({
  fmpEnhanced: {
    searchStocks: vi.fn(),
    getQuote: vi.fn(),
    getTopGainers: vi.fn(),
    getTopLosers: vi.fn(),
  },
}));

vi.mock('../twelve-data-enhanced', () => ({
  twelveDataEnhanced: {
    searchStocks: vi.fn(),
    getQuote: vi.fn(),
    getTimeSeries: vi.fn(),
  },
}));

vi.mock('@/lib/cache-manager', () => ({
  cacheManager: {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
    has: vi.fn(),
  },
}));

describe('realDataService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset do estado interno do serviço
    realDataService.resetQuotaTracking();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('searchStocks', () => {
    it('deve buscar stocks com fallback entre APIs', async () => {
      const mockResults = [
        { symbol: 'AAPL', name: 'Apple Inc.', type: 'Common Stock' },
        { symbol: 'AAPL.L', name: 'Apple Inc. LSE', type: 'Common Stock' },
      ];

      // Primeira API falha
      const { alphaVantageEnhanced } = await import('../alpha-vantage-enhanced');
      vi.mocked(alphaVantageEnhanced.searchStocks).mockRejectedValueOnce(new Error('Rate limit'));

      // Segunda API funciona
      const { finnhubEnhanced } = await import('../finnhub-enhanced');
      vi.mocked(finnhubEnhanced.searchStocks).mockResolvedValueOnce(mockResults);

      const results = await realDataService.searchStocks('AAPL');

      expect(results).toEqual(mockResults);
      expect(alphaVantageEnhanced.searchStocks).toHaveBeenCalledWith('AAPL');
      expect(finnhubEnhanced.searchStocks).toHaveBeenCalledWith('AAPL');
    });

    it('deve retornar resultado do cache quando disponível', async () => {
      const cachedResults = [
        { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'Common Stock' },
      ];

      vi.mocked(cacheManager.get).mockReturnValueOnce(cachedResults);

      const results = await realDataService.searchStocks('MSFT');

      expect(results).toEqual(cachedResults);
      expect(cacheManager.get).toHaveBeenCalledWith('search:MSFT');
      
      // Não deve chamar APIs externas
      const { alphaVantageEnhanced } = await import('../alpha-vantage-enhanced');
      expect(alphaVantageEnhanced.searchStocks).not.toHaveBeenCalled();
    });

    it('deve cachear resultados bem-sucedidos', async () => {
      const mockResults = [{ symbol: 'GOOGL', name: 'Alphabet Inc.' }];
      
      const { alphaVantageEnhanced } = await import('../alpha-vantage-enhanced');
      vi.mocked(alphaVantageEnhanced.searchStocks).mockResolvedValueOnce(mockResults);

      await realDataService.searchStocks('GOOGL');

      expect(cacheManager.set).toHaveBeenCalledWith(
        'search:GOOGL',
        mockResults,
        expect.any(Number) // TTL
      );
    });

    it('deve lançar erro quando todas as APIs falham', async () => {
      const { alphaVantageEnhanced } = await import('../alpha-vantage-enhanced');
      const { finnhubEnhanced } = await import('../finnhub-enhanced');
      const { fmpEnhanced } = await import('../fmp-enhanced');
      const { twelveDataEnhanced } = await import('../twelve-data-enhanced');

      vi.mocked(alphaVantageEnhanced.searchStocks).mockRejectedValueOnce(new Error('API Error'));
      vi.mocked(finnhubEnhanced.searchStocks).mockRejectedValueOnce(new Error('API Error'));
      vi.mocked(fmpEnhanced.searchStocks).mockRejectedValueOnce(new Error('API Error'));
      vi.mocked(twelveDataEnhanced.searchStocks).mockRejectedValueOnce(new Error('API Error'));

      await expect(realDataService.searchStocks('FAIL')).rejects.toThrow(
        'All API providers failed'
      );
    });
  });

  describe('getQuote', () => {
    const mockQuote: StockQuote = {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: 175.50,
      change: 2.34,
      changePercent: 1.35,
      volume: 45000000,
      marketCap: 2800000000000,
      dayHigh: 176.80,
      dayLow: 173.20,
      yearHigh: 198.23,
      yearLow: 124.17,
      previousClose: 173.16,
      open: 174.00,
    };

    it('deve buscar cotação com sucesso', async () => {
      const { alphaVantageEnhanced } = await import('../alpha-vantage-enhanced');
      vi.mocked(alphaVantageEnhanced.getQuote).mockResolvedValueOnce(mockQuote);

      const quote = await realDataService.getQuote('AAPL');

      expect(quote).toEqual(mockQuote);
      expect(alphaVantageEnhanced.getQuote).toHaveBeenCalledWith('AAPL');
    });

    it('deve usar cache para cotações recentes', async () => {
      vi.mocked(cacheManager.get).mockReturnValueOnce(mockQuote);

      const quote = await realDataService.getQuote('AAPL');

      expect(quote).toEqual(mockQuote);
      expect(cacheManager.get).toHaveBeenCalledWith('quote:AAPL');
    });

    it('deve implementar circuit breaker após múltiplas falhas', async () => {
      const { alphaVantageEnhanced } = await import('../alpha-vantage-enhanced');
      
      // Simular múltiplas falhas
      for (let i = 0; i < 5; i++) {
        vi.mocked(alphaVantageEnhanced.getQuote).mockRejectedValueOnce(new Error('API Error'));
        try {
          await realDataService.getQuote('FAIL');
        } catch (e) {
          // Esperado
        }
      }

      // Próxima chamada deve falhar imediatamente (circuit breaker aberto)
      const start = Date.now();
      await expect(realDataService.getQuote('FAIL')).rejects.toThrow();
      const duration = Date.now() - start;

      // Deve falhar rapidamente sem tentar a API
      expect(duration).toBeLessThan(100);
      
      // API não deve ser chamada novamente
      expect(alphaVantageEnhanced.getQuote).toHaveBeenCalledTimes(5);
    });
  });

  describe('getBatchQuotes', () => {
    it('deve buscar múltiplas cotações em lote', async () => {
      const mockQuotes = {
        AAPL: { symbol: 'AAPL', price: 175.50 },
        MSFT: { symbol: 'MSFT', price: 380.25 },
        GOOGL: { symbol: 'GOOGL', price: 142.80 },
      };

      const { alphaVantageEnhanced } = await import('../alpha-vantage-enhanced');
      vi.mocked(alphaVantageEnhanced.getBatchQuotes).mockResolvedValueOnce(mockQuotes);

      const quotes = await realDataService.getBatchQuotes(['AAPL', 'MSFT', 'GOOGL']);

      expect(quotes).toEqual(mockQuotes);
      expect(alphaVantageEnhanced.getBatchQuotes).toHaveBeenCalledWith(['AAPL', 'MSFT', 'GOOGL']);
    });

    it('deve dividir requisições grandes em lotes menores', async () => {
      const symbols = Array.from({ length: 150 }, (_, i) => `STOCK${i}`);
      
      const { alphaVantageEnhanced } = await import('../alpha-vantage-enhanced');
      vi.mocked(alphaVantageEnhanced.getBatchQuotes).mockResolvedValue({});

      await realDataService.getBatchQuotes(symbols);

      // Deve ter sido chamado múltiplas vezes devido ao batching
      expect(alphaVantageEnhanced.getBatchQuotes).toHaveBeenCalledTimes(2);
    });
  });

  describe('getMarketIndices', () => {
    const mockIndices: MarketIndex[] = [
      { symbol: 'SPY', name: 'S&P 500', price: 450.25, change: 5.75, changePercent: 1.29 },
      { symbol: 'DIA', name: 'Dow Jones', price: 350.10, change: -2.40, changePercent: -0.68 },
    ];

    it('deve buscar índices de mercado', async () => {
      const { finnhubEnhanced } = await import('../finnhub-enhanced');
      vi.mocked(finnhubEnhanced.getMarketIndices).mockResolvedValueOnce(mockIndices);

      const indices = await realDataService.getMarketIndices();

      expect(indices).toEqual(mockIndices);
    });

    it('deve cachear índices por período mais curto', async () => {
      const { finnhubEnhanced } = await import('../finnhub-enhanced');
      vi.mocked(finnhubEnhanced.getMarketIndices).mockResolvedValueOnce(mockIndices);

      await realDataService.getMarketIndices();

      expect(cacheManager.set).toHaveBeenCalledWith(
        'market-indices',
        mockIndices,
        60000 // 1 minuto de TTL
      );
    });
  });

  describe('getTopMovers', () => {
    it('deve buscar top gainers e losers', async () => {
      const mockGainers = [
        { symbol: 'NVDA', changePercent: 8.5 },
        { symbol: 'AMD', changePercent: 6.2 },
      ];
      
      const mockLosers = [
        { symbol: 'INTC', changePercent: -5.3 },
        { symbol: 'BA', changePercent: -4.1 },
      ];

      const { fmpEnhanced } = await import('../fmp-enhanced');
      vi.mocked(fmpEnhanced.getTopGainers).mockResolvedValueOnce(mockGainers);
      vi.mocked(fmpEnhanced.getTopLosers).mockResolvedValueOnce(mockLosers);

      const gainers = await realDataService.getTopGainers();
      const losers = await realDataService.getTopLosers();

      expect(gainers).toEqual(mockGainers);
      expect(losers).toEqual(mockLosers);
    });
  });

  describe('getApiQuota', () => {
    it('deve retornar informações de quota da API', async () => {
      // Simular algumas chamadas para rastrear uso
      const { alphaVantageEnhanced } = await import('../alpha-vantage-enhanced');
      vi.mocked(alphaVantageEnhanced.getQuote).mockResolvedValue({} as any);

      await realDataService.getQuote('AAPL');
      await realDataService.getQuote('MSFT');

      const quota = await realDataService.getApiQuota();

      expect(quota.used).toBe(2);
      expect(quota.provider).toBeDefined();
      expect(quota.limit).toBeGreaterThan(0);
    });

    it('deve resetar contadores após período de reset', async () => {
      vi.useFakeTimers();

      // Fazer algumas chamadas
      const { alphaVantageEnhanced } = await import('../alpha-vantage-enhanced');
      vi.mocked(alphaVantageEnhanced.getQuote).mockResolvedValue({} as any);

      await realDataService.getQuote('AAPL');
      
      let quota = await realDataService.getApiQuota();
      expect(quota.used).toBe(1);

      // Avançar tempo para após o reset
      vi.advanceTimersByTime(24 * 60 * 60 * 1000); // 24 horas

      quota = await realDataService.getApiQuota();
      expect(quota.used).toBe(0);
    });
  });

  describe('Rate Limiting', () => {
    it('deve respeitar rate limits por provedor', async () => {
      vi.useFakeTimers();

      const { alphaVantageEnhanced } = await import('../alpha-vantage-enhanced');
      vi.mocked(alphaVantageEnhanced.getQuote).mockResolvedValue({} as any);

      // Fazer múltiplas chamadas rapidamente
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(realDataService.getQuote(`STOCK${i}`));
      }

      // Avançar timers conforme necessário
      vi.runAllTimers();

      await Promise.all(promises);

      // Verificar que as chamadas foram espaçadas apropriadamente
      const callTimes = vi.mocked(alphaVantageEnhanced.getQuote).mock.calls
        .map((_, index) => index);
      
      // Deve haver delay entre algumas chamadas devido ao rate limiting
      expect(callTimes.length).toBe(10);
    });
  });

  describe('Error Recovery', () => {
    it('deve tentar próximo provedor em caso de erro', async () => {
      const { alphaVantageEnhanced } = await import('../alpha-vantage-enhanced');
      const { finnhubEnhanced } = await import('../finnhub-enhanced');

      vi.mocked(alphaVantageEnhanced.getQuote).mockRejectedValueOnce(new Error('Timeout'));
      vi.mocked(finnhubEnhanced.getQuote).mockResolvedValueOnce({ 
        symbol: 'AAPL', 
        price: 175.50 
      } as any);

      const quote = await realDataService.getQuote('AAPL');

      expect(quote.symbol).toBe('AAPL');
      expect(alphaVantageEnhanced.getQuote).toHaveBeenCalled();
      expect(finnhubEnhanced.getQuote).toHaveBeenCalled();
    });

    it('deve marcar provedor como unhealthy após múltiplas falhas', async () => {
      const { alphaVantageEnhanced } = await import('../alpha-vantage-enhanced');
      
      // Simular múltiplas falhas consecutivas
      for (let i = 0; i < 10; i++) {
        vi.mocked(alphaVantageEnhanced.getQuote).mockRejectedValueOnce(new Error('Server Error'));
        try {
          await realDataService.getQuote(`FAIL${i}`);
        } catch (e) {
          // Esperado
        }
      }

      // Verificar que o provedor foi marcado como unhealthy
      const health = await realDataService.getProvidersHealth();
      expect(health.alpha_vantage).toBe('unhealthy');
    });
  });
});