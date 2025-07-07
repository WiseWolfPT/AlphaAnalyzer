/**
 * ALFALYZER - STOCKS ROUTES TESTS
 * Testes de integração para endpoints de dados de mercado
 */

import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import { stocksRouter } from '../stocks';
import { marketDataService } from '../../services/market-data';
import { cacheManager } from '../../lib/cache-manager';
import { rateLimiter } from '../../middleware/rate-limit';

// Mock dos serviços
vi.mock('../../services/market-data', () => ({
  marketDataService: {
    searchStocks: vi.fn(),
    getQuote: vi.fn(),
    getBatchQuotes: vi.fn(),
    getHistoricalData: vi.fn(),
    getCompanyProfile: vi.fn(),
    getMarketIndices: vi.fn(),
    getTopMovers: vi.fn(),
  },
}));

vi.mock('../../lib/cache-manager', () => ({
  cacheManager: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(),
  },
}));

// Configurar Express app para testes
const app = express();
app.use(express.json());
app.use('/api/stocks', stocksRouter);

describe('Stocks Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/stocks/search', () => {
    it('deve buscar stocks por query', async () => {
      const mockResults = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          type: 'Common Stock',
          exchange: 'NASDAQ',
        },
        {
          symbol: 'APPL',
          name: 'Applied Materials Inc.',
          type: 'Common Stock',
          exchange: 'NASDAQ',
        },
      ];

      vi.mocked(marketDataService.searchStocks).mockResolvedValueOnce(mockResults);

      const response = await request(app)
        .get('/api/stocks/search')
        .query({ q: 'AAPL' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('symbol', 'AAPL');
      expect(marketDataService.searchStocks).toHaveBeenCalledWith('AAPL');
    });

    it('deve retornar resultado do cache quando disponível', async () => {
      const cachedResults = [
        { symbol: 'MSFT', name: 'Microsoft Corporation' },
      ];

      vi.mocked(cacheManager.get).mockReturnValueOnce(cachedResults);

      const response = await request(app)
        .get('/api/stocks/search')
        .query({ q: 'MSFT' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(cachedResults);
      expect(marketDataService.searchStocks).not.toHaveBeenCalled();
    });

    it('deve validar query parameter', async () => {
      const response = await request(app)
        .get('/api/stocks/search');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('query parameter');
    });

    it('deve limitar tamanho da query', async () => {
      const longQuery = 'A'.repeat(100);
      
      const response = await request(app)
        .get('/api/stocks/search')
        .query({ q: longQuery });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('too long');
    });

    it('deve cachear resultados bem-sucedidos', async () => {
      const mockResults = [{ symbol: 'GOOGL', name: 'Alphabet Inc.' }];
      vi.mocked(marketDataService.searchStocks).mockResolvedValueOnce(mockResults);

      await request(app)
        .get('/api/stocks/search')
        .query({ q: 'GOOGL' });

      expect(cacheManager.set).toHaveBeenCalledWith(
        'search:GOOGL',
        mockResults,
        300 // 5 minutos TTL
      );
    });
  });

  describe('GET /api/stocks/:symbol', () => {
    it('deve retornar detalhes do stock', async () => {
      const mockDetails = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
        sector: 'Technology',
        industry: 'Consumer Electronics',
        marketCap: 2800000000000,
        pe: 28.5,
        dividendYield: 0.52,
        description: 'Apple Inc. designs, manufactures...',
      };

      vi.mocked(marketDataService.getCompanyProfile).mockResolvedValueOnce(mockDetails);

      const response = await request(app)
        .get('/api/stocks/AAPL');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockDetails);
      expect(marketDataService.getCompanyProfile).toHaveBeenCalledWith('AAPL');
    });

    it('deve validar símbolo do stock', async () => {
      const response = await request(app)
        .get('/api/stocks/INVALID_SYMBOL_123');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid stock symbol');
    });

    it('deve retornar 404 para stock não encontrado', async () => {
      vi.mocked(marketDataService.getCompanyProfile).mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/stocks/NOTFOUND');

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Stock not found');
    });

    it('deve normalizar símbolo para uppercase', async () => {
      vi.mocked(marketDataService.getCompanyProfile).mockResolvedValueOnce({
        symbol: 'AAPL',
        name: 'Apple Inc.',
      });

      await request(app).get('/api/stocks/aapl');

      expect(marketDataService.getCompanyProfile).toHaveBeenCalledWith('AAPL');
    });
  });

  describe('GET /api/stocks/:symbol/quote', () => {
    it('deve retornar cotação em tempo real', async () => {
      const mockQuote = {
        symbol: 'AAPL',
        price: 175.50,
        change: 2.34,
        changePercent: 1.35,
        volume: 45234567,
        dayHigh: 176.80,
        dayLow: 173.20,
        open: 174.00,
        previousClose: 173.16,
        timestamp: new Date().toISOString(),
      };

      vi.mocked(marketDataService.getQuote).mockResolvedValueOnce(mockQuote);

      const response = await request(app)
        .get('/api/stocks/AAPL/quote');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockQuote);
      expect(response.body).toHaveProperty('price', 175.50);
      expect(response.body).toHaveProperty('changePercent', 1.35);
    });

    it('deve incluir header de cache control', async () => {
      vi.mocked(marketDataService.getQuote).mockResolvedValueOnce({
        symbol: 'AAPL',
        price: 175.50,
      });

      const response = await request(app)
        .get('/api/stocks/AAPL/quote');

      expect(response.headers['cache-control']).toContain('max-age=30');
    });

    it('deve lidar com erro de rate limit da API', async () => {
      vi.mocked(marketDataService.getQuote).mockRejectedValueOnce(
        new Error('API rate limit exceeded')
      );

      const response = await request(app)
        .get('/api/stocks/TSLA/quote');

      expect(response.status).toBe(429);
      expect(response.body.error).toContain('rate limit');
    });
  });

  describe('POST /api/stocks/batch-quotes', () => {
    it('deve retornar cotações em lote', async () => {
      const mockQuotes = {
        AAPL: { symbol: 'AAPL', price: 175.50, change: 2.34 },
        MSFT: { symbol: 'MSFT', price: 380.25, change: -1.25 },
        GOOGL: { symbol: 'GOOGL', price: 142.80, change: 0.85 },
      };

      vi.mocked(marketDataService.getBatchQuotes).mockResolvedValueOnce(mockQuotes);

      const response = await request(app)
        .post('/api/stocks/batch-quotes')
        .send({ symbols: ['AAPL', 'MSFT', 'GOOGL'] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockQuotes);
      expect(Object.keys(response.body)).toHaveLength(3);
    });

    it('deve limitar número de símbolos', async () => {
      const tooManySymbols = Array(101).fill('AAPL');

      const response = await request(app)
        .post('/api/stocks/batch-quotes')
        .send({ symbols: tooManySymbols });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Too many symbols');
    });

    it('deve validar formato dos símbolos', async () => {
      const response = await request(app)
        .post('/api/stocks/batch-quotes')
        .send({ symbols: ['AAPL', '123INVALID', 'MSFT'] });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid symbol');
    });

    it('deve remover duplicados', async () => {
      vi.mocked(marketDataService.getBatchQuotes).mockResolvedValueOnce({});

      await request(app)
        .post('/api/stocks/batch-quotes')
        .send({ symbols: ['AAPL', 'AAPL', 'MSFT', 'MSFT'] });

      expect(marketDataService.getBatchQuotes).toHaveBeenCalledWith(['AAPL', 'MSFT']);
    });
  });

  describe('GET /api/stocks/:symbol/history', () => {
    it('deve retornar dados históricos', async () => {
      const mockHistory = [
        { date: '2024-03-15', open: 174.00, close: 175.50, volume: 45234567 },
        { date: '2024-03-14', open: 172.50, close: 174.00, volume: 42156789 },
      ];

      vi.mocked(marketDataService.getHistoricalData).mockResolvedValueOnce(mockHistory);

      const response = await request(app)
        .get('/api/stocks/AAPL/history')
        .query({ interval: '1mo', period: 'daily' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('symbol', 'AAPL');
      expect(response.body).toHaveProperty('history');
      expect(response.body.history).toEqual(mockHistory);
    });

    it('deve validar intervalo', async () => {
      const response = await request(app)
        .get('/api/stocks/AAPL/history')
        .query({ interval: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid interval');
    });

    it('deve usar valores padrão', async () => {
      vi.mocked(marketDataService.getHistoricalData).mockResolvedValueOnce([]);

      await request(app)
        .get('/api/stocks/AAPL/history');

      expect(marketDataService.getHistoricalData).toHaveBeenCalledWith(
        'AAPL',
        '1mo',
        'daily'
      );
    });
  });

  describe('GET /api/stocks/market/indices', () => {
    it('deve retornar índices de mercado', async () => {
      const mockIndices = [
        { symbol: 'SPY', name: 'S&P 500', price: 450.25, change: 5.75, changePercent: 1.29 },
        { symbol: 'DIA', name: 'Dow Jones', price: 350.10, change: -2.40, changePercent: -0.68 },
        { symbol: 'QQQ', name: 'NASDAQ', price: 380.50, change: 3.20, changePercent: 0.85 },
      ];

      vi.mocked(marketDataService.getMarketIndices).mockResolvedValueOnce(mockIndices);

      const response = await request(app)
        .get('/api/stocks/market/indices');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockIndices);
      expect(response.body).toHaveLength(3);
    });

    it('deve cachear por período mais curto', async () => {
      vi.mocked(marketDataService.getMarketIndices).mockResolvedValueOnce([]);

      await request(app)
        .get('/api/stocks/market/indices');

      expect(cacheManager.set).toHaveBeenCalledWith(
        'market-indices',
        [],
        60 // 1 minuto TTL
      );
    });
  });

  describe('GET /api/stocks/market/movers', () => {
    it('deve retornar top gainers e losers', async () => {
      const mockMovers = {
        gainers: [
          { symbol: 'NVDA', changePercent: 8.5 },
          { symbol: 'AMD', changePercent: 6.2 },
        ],
        losers: [
          { symbol: 'INTC', changePercent: -5.3 },
          { symbol: 'BA', changePercent: -4.1 },
        ],
      };

      vi.mocked(marketDataService.getTopMovers).mockResolvedValueOnce(mockMovers);

      const response = await request(app)
        .get('/api/stocks/market/movers');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('gainers');
      expect(response.body).toHaveProperty('losers');
      expect(response.body.gainers).toHaveLength(2);
      expect(response.body.losers).toHaveLength(2);
    });
  });

  describe('Rate Limiting', () => {
    it('deve aplicar rate limiting específico para endpoints financeiros', async () => {
      // Fazer múltiplas requisições rapidamente
      const promises = Array(15).fill(null).map(() =>
        request(app).get('/api/stocks/AAPL/quote')
      );

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('deve lidar com erro genérico do serviço', async () => {
      vi.mocked(marketDataService.getQuote).mockRejectedValueOnce(
        new Error('Service temporarily unavailable')
      );

      const response = await request(app)
        .get('/api/stocks/AAPL/quote');

      expect(response.status).toBe(503);
      expect(response.body.error).toContain('temporarily unavailable');
    });

    it('deve logar erros críticos', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      vi.mocked(marketDataService.getQuote).mockRejectedValueOnce(
        new Error('Critical error')
      );

      await request(app).get('/api/stocks/AAPL/quote');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});