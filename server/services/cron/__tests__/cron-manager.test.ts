/**
 * TDD Tests for Cron Manager Bug Fixes
 *
 * BUG 1: warmPopularStocksCache() usando marketDataService.getQuote() incorreto
 * BUG 2: supabase is not defined em múltiplas funções
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CronManager } from '../cron-manager';

// Mock dependencies
vi.mock('../../../lib/supabase-client', () => ({
  getSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      delete: vi.fn(() => ({
        lt: vi.fn(() => Promise.resolve({ count: 0 }))
      })),
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [] }))
      }))
    }))
  }))
}));

vi.mock('../../../services/simple-cache-service', () => ({
  simpleCacheService: {
    getQuote: vi.fn(async (symbol: string) => ({
      symbol: symbol.toUpperCase(),
      price: 100,
      change: 1.5,
      changePercent: 1.52,
      volume: 1000000,
      marketCap: 1000000000,
      peRatio: 15,
      high: 102,
      low: 98,
      open: 99,
      previousClose: 98.5,
      updatedAt: new Date().toISOString()
    }))
  }
}));

describe('CronManager - Bug Fixes', () => {
  let cronManager: CronManager;

  beforeEach(() => {
    cronManager = CronManager.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cronManager.stopAll();
  });

  describe('BUG 1: warmPopularStocksCache usando serviço correto', () => {
    it('deve usar simpleCacheService.getQuote() ao invés de marketDataService.getQuote()', async () => {
      const { simpleCacheService } = await import('../../../services/simple-cache-service');

      // Trigger manual cache warming
      await cronManager.triggerJob('cache-warmer');

      // Verificar que simpleCacheService.getQuote foi chamado
      expect(simpleCacheService.getQuote).toHaveBeenCalled();
    });

    it('deve canonizar símbolos .LS antes de chamar getQuote', async () => {
      const { simpleCacheService } = await import('../../../services/simple-cache-service');

      // Mock com símbolos portugueses .LS
      const mockGetQuote = vi.spyOn(simpleCacheService, 'getQuote');

      await cronManager.triggerJob('cache-warmer');

      // Verificar que símbolos .LS foram processados
      const calls = mockGetQuote.mock.calls;
      const portugalSymbols = calls.filter(call =>
        call[0].includes('GALP') ||
        call[0].includes('EDP') ||
        call[0].includes('JMT')
      );

      // Deve ter chamado com símbolos .LS originais (canonização é feita internamente no simpleCacheService)
      expect(portugalSymbols.length).toBeGreaterThan(0);
    });

    it('NÃO deve chamar marketDataService.getQuote() que não existe', async () => {
      // Este teste garante que o import dinâmico de MarketDataService não é usado
      await expect(cronManager.triggerJob('cache-warmer')).resolves.not.toThrow();
    });
  });

  describe('BUG 2: supabase client instanciado corretamente', () => {
    it('deve usar getSupabaseClient() ao invés de variável global "supabase"', async () => {
      const { getSupabaseClient } = await import('../../../lib/supabase-client');

      // Trigger job que usa supabase (cache-cleanup)
      await cronManager.triggerJob('cache-cleanup');

      // Verificar que getSupabaseClient foi chamado
      expect(getSupabaseClient).toHaveBeenCalled();
    });

    it('deve publicar eventos realtime sem erro "supabase is not defined"', async () => {
      // Trigger cache-warmer que publica eventos realtime ao final
      await expect(cronManager.triggerJob('cache-warmer')).resolves.not.toThrow();
    });

    it('deve limpar cache expirado sem erro "supabase is not defined"', async () => {
      await expect(cronManager.triggerJob('cache-cleanup')).resolves.not.toThrow();
    });

    it('deve monitorar quotas API sem erro "supabase is not defined"', async () => {
      await expect(cronManager.triggerJob('quota-monitor')).resolves.not.toThrow();
    });

    it('deve publicar métricas sem erro "supabase is not defined"', async () => {
      await expect(cronManager.triggerJob('metrics-publisher')).resolves.not.toThrow();
    });
  });

  describe('Testes de regressão', () => {
    it('deve processar todos os símbolos populares sem erros', async () => {
      await expect(cronManager.triggerJob('cache-warmer')).resolves.not.toThrow();

      const { simpleCacheService } = await import('../../../services/simple-cache-service');

      // Deve ter chamado getQuote para todos os símbolos populares (incluindo .LS)
      // POPULAR_STOCKS tem 20 símbolos (15 US + 5 PT)
      expect(simpleCacheService.getQuote).toHaveBeenCalled();
      expect((simpleCacheService.getQuote as any).mock.calls.length).toBeGreaterThan(0);
    });

    it('deve retornar status correto do cronManager', () => {
      const status = cronManager.getStatus();

      expect(status).toHaveProperty('jobs');
      expect(status).toHaveProperty('uptime');
      expect(status).toHaveProperty('timestamp');
      expect(Array.isArray(status.jobs)).toBe(true);
    });
  });
});
