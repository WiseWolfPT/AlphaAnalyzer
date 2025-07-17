/**
 * Testes básicos para Earnings Service - Fase 3.7
 * 
 * Testa integração real com APIs e sistema de cache
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { earningsService, EarningsService } from '../earnings-service';

// Mock fetch global
global.fetch = vi.fn();

describe('EarningsService', () => {
  let service: EarningsService;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    service = new EarningsService();
    service.clearCache(); // Limpar cache entre testes
  });

  describe('getEarningsForWeek', () => {
    it('deve buscar earnings para uma semana específica', async () => {
      // Mock da resposta da API
      const mockResponse = {
        success: true,
        data: {
          events: [
            {
              symbol: 'AAPL',
              companyName: 'Apple Inc.',
              reportDate: '2025-07-15',
              time: 'after_close',
              estimatedEPS: 2.11,
              source: 'alpha_vantage',
              lastUpdated: '2025-07-13T10:00:00Z'
            }
          ],
          totalCount: 1,
          fromCache: false,
          source: 'alpha_vantage',
          lastUpdated: '2025-07-13T10:00:00Z'
        }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const startDate = new Date('2025-07-14');
      const endDate = new Date('2025-07-20');
      
      const result = await service.getEarningsForWeek(startDate, endDate);

      // Verificar se a API foi chamada corretamente
      expect(fetch).toHaveBeenCalledWith(
        '/api/earnings/calendar?from=2025-07-14&to=2025-07-20'
      );

      // Verificar resposta
      expect(result.events).toHaveLength(1);
      expect(result.events[0].symbol).toBe('AAPL');
      expect(result.source).toBe('alpha_vantage');
      expect(result.fromCache).toBe(false);
    });

    it('deve usar cache quando dados estão disponíveis', async () => {
      const startDate = new Date('2025-07-14');
      const endDate = new Date('2025-07-20');

      // Primeira chamada - mock da API
      const mockResponse = {
        success: true,
        data: {
          events: [{ symbol: 'MSFT', companyName: 'Microsoft' }],
          totalCount: 1,
          fromCache: false,
          source: 'alpha_vantage'
        }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      // Primeira chamada
      const firstResult = await service.getEarningsForWeek(startDate, endDate);
      
      // Segunda chamada (deve usar cache)
      const secondResult = await service.getEarningsForWeek(startDate, endDate);

      // Verificar que fetch foi chamado apenas uma vez
      expect(fetch).toHaveBeenCalledTimes(1);
      
      // Segunda resposta deve indicar cache
      expect(secondResult.fromCache).toBe(true);
      expect(secondResult.events).toEqual(firstResult.events);
    });

    it('deve usar dados mock quando API falha', async () => {
      // Mock de falha na API
      (fetch as any).mockRejectedValueOnce(new Error('API Error'));

      const startDate = new Date('2025-07-14');
      const endDate = new Date('2025-07-20');
      
      const result = await service.getEarningsForWeek(startDate, endDate);

      // Deve retornar dados mock
      expect(result.source).toBe('mock');
      expect(result.events.length).toBeGreaterThan(0);
      expect(result.events[0].symbol).toBeDefined();
    });
  });

  describe('getEarningsForSymbol', () => {
    it('deve buscar earnings para símbolo específico', async () => {
      const mockResponse = {
        success: true,
        data: {
          events: [
            {
              symbol: 'AAPL',
              companyName: 'Apple Inc.',
              reportDate: '2025-07-15',
              actualEPS: 2.15,
              estimatedEPS: 2.11
            }
          ]
        }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.getEarningsForSymbol('AAPL', 4);

      expect(fetch).toHaveBeenCalledWith('/api/earnings/symbol/AAPL?limit=4');
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('AAPL');
    });

    it('deve retornar array vazio quando API falha', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('API Error'));

      const result = await service.getEarningsForSymbol('INVALID');

      expect(result).toEqual([]);
    });
  });

  describe('cache management', () => {
    it('deve limpar cache corretamente', async () => {
      // Adicionar item ao cache primeiro
      const startDate = new Date('2025-07-14');
      const endDate = new Date('2025-07-20');

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { events: [], totalCount: 0, fromCache: false, source: 'alpha_vantage' }
        })
      });

      await service.getEarningsForWeek(startDate, endDate);
      
      // Limpar cache
      service.clearCache();
      
      // Próxima chamada deve fazer nova requisição
      await service.getEarningsForWeek(startDate, endDate);
      
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getConnectionStatus', () => {
    it('deve verificar status da conexão', async () => {
      const mockStatus = {
        alphaVantage: true,
        fmp: false,
        lastCheck: '2025-07-13T10:00:00Z'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus
      });

      const result = await service.getConnectionStatus();

      expect(fetch).toHaveBeenCalledWith('/api/earnings/status');
      expect(result.alphaVantage).toBe(true);
      expect(result.fmp).toBe(false);
    });
  });

  describe('getUpcomingEarnings', () => {
    it('deve buscar próximos earnings corretamente', async () => {
      const mockResponse = {
        success: true,
        data: {
          events: [
            {
              symbol: 'AAPL',
              reportDate: '2025-07-15',
              time: 'after_close'
            },
            {
              symbol: 'MSFT', 
              reportDate: '2025-07-16',
              time: 'before_open'
            }
          ],
          totalCount: 2,
          fromCache: false,
          source: 'alpha_vantage'
        }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.getUpcomingEarnings(7);

      // Deve estar ordenado por data
      expect(result).toHaveLength(2);
      expect(new Date(result[0].reportDate) <= new Date(result[1].reportDate)).toBe(true);
    });
  });
});

// Teste de integração com singleton
describe('earningsService singleton', () => {
  it('deve exportar instância singleton funcional', () => {
    expect(earningsService).toBeInstanceOf(EarningsService);
    expect(typeof earningsService.getEarningsForWeek).toBe('function');
    expect(typeof earningsService.clearCache).toBe('function');
  });
});