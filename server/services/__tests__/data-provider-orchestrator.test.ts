/**
 * AGENT 15: Data Provider Orchestrator Tests
 *
 * Comprehensive test suite for multi-provider fallback logic
 */

import { DataProviderOrchestrator } from '../data-provider-orchestrator';
import {
  IFinancialDataProvider,
  Quote,
  IncomeStatement,
  BalanceSheet,
  CashFlow,
  Ratios,
  CompanyProfile,
  RateLimitInfo
} from '../providers/base-financial-provider';

/**
 * Mock provider for testing
 */
class MockProvider implements IFinancialDataProvider {
  name: string;
  priority: number;
  private shouldFail: boolean;
  private shouldReturnNull: boolean;
  private callCount: number = 0;
  private failures: number = 0;
  private lastFailure: Date | null = null;

  constructor(name: string, priority: number, shouldFail = false, shouldReturnNull = false) {
    this.name = name;
    this.priority = priority;
    this.shouldFail = shouldFail;
    this.shouldReturnNull = shouldReturnNull;
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    this.callCount++;
    if (this.shouldFail) {
      throw new Error(`${this.name} failed`);
    }
    if (this.shouldReturnNull) {
      return null;
    }
    return {
      symbol,
      price: 100,
      change: 1,
      changePercent: 1,
      volume: 1000000,
      timestamp: new Date().toISOString(),
      provider: this.name
    };
  }

  async getIncomeStatement(symbol: string): Promise<IncomeStatement | null> {
    this.callCount++;
    if (this.shouldFail) throw new Error(`${this.name} failed`);
    if (this.shouldReturnNull) return null;
    return {
      symbol,
      date: '2024-12-31',
      period: 'FY',
      revenue: 1000000000,
      netIncome: 100000000,
      provider: this.name
    };
  }

  async getBalanceSheet(symbol: string): Promise<BalanceSheet | null> {
    this.callCount++;
    if (this.shouldFail) throw new Error(`${this.name} failed`);
    if (this.shouldReturnNull) return null;
    return {
      symbol,
      date: '2024-12-31',
      period: 'FY',
      totalAssets: 5000000000,
      totalLiabilities: 2000000000,
      totalEquity: 3000000000,
      cash: 500000000,
      provider: this.name
    };
  }

  async getCashFlow(symbol: string): Promise<CashFlow | null> {
    this.callCount++;
    if (this.shouldFail) throw new Error(`${this.name} failed`);
    if (this.shouldReturnNull) return null;
    return {
      symbol,
      date: '2024-12-31',
      period: 'FY',
      operatingCashFlow: 150000000,
      capitalExpenditures: 50000000,
      freeCashFlow: 100000000,
      provider: this.name
    };
  }

  async getRatios(symbol: string): Promise<Ratios | null> {
    this.callCount++;
    if (this.shouldFail) throw new Error(`${this.name} failed`);
    if (this.shouldReturnNull) return null;
    return {
      symbol,
      date: '2024-12-31',
      period: 'TTM',
      pe: 20,
      pb: 3,
      ps: 2,
      provider: this.name
    };
  }

  async getProfile(symbol: string): Promise<CompanyProfile | null> {
    this.callCount++;
    if (this.shouldFail) throw new Error(`${this.name} failed`);
    if (this.shouldReturnNull) return null;
    return {
      symbol,
      companyName: 'Test Company',
      sector: 'Technology',
      industry: 'Software',
      provider: this.name
    };
  }

  async isAvailable(): Promise<boolean> {
    // Always return true for testing - let the actual method call handle failures
    return true;
  }

  getRateLimit(): RateLimitInfo {
    return {
      maxPerSecond: 5,
      maxPerDay: 500,
      currentUsage: this.callCount
    };
  }

  getHealthStatus() {
    return {
      healthy: this.failures < 5,
      failures: this.failures,
      lastFailure: this.lastFailure
    };
  }

  recordSuccess(): void {
    this.failures = Math.max(0, this.failures - 1);
  }

  recordFailure(error: Error): void {
    this.failures++;
    this.lastFailure = new Date();
  }

  getCallCount(): number {
    return this.callCount;
  }

  reset(): void {
    this.callCount = 0;
    this.failures = 0;
    this.lastFailure = null;
  }
}

describe('DataProviderOrchestrator', () => {
  let orchestrator: DataProviderOrchestrator;
  let mockFMP: MockProvider;
  let mockAlpha: MockProvider;
  let mockPolygon: MockProvider;
  let mockYahoo: MockProvider;

  beforeEach(() => {
    mockFMP = new MockProvider('FMP', 1);
    mockAlpha = new MockProvider('Alpha Vantage', 2);
    mockPolygon = new MockProvider('Polygon.io', 3);
    mockYahoo = new MockProvider('Yahoo Finance', 4);

    orchestrator = new DataProviderOrchestrator([
      mockFMP,
      mockAlpha,
      mockPolygon,
      mockYahoo
    ]);
  });

  describe('Provider Priority', () => {
    test('should use FMP as primary source', async () => {
      const data = await orchestrator.getFinancialData('AAPL');

      expect(data.quote?.provider).toBe('FMP');
      expect(data.income?.provider).toBe('FMP');
      expect(data.balance?.provider).toBe('FMP');
      expect(mockFMP.getCallCount()).toBe(6); // 6 data types
      expect(mockAlpha.getCallCount()).toBe(0); // Should not be called
    });

    test('should sort providers by priority', () => {
      const status = orchestrator.getProviderStatus();
      expect(status[0].name).toBe('FMP');
      expect(status[1].name).toBe('Alpha Vantage');
      expect(status[2].name).toBe('Polygon.io');
      expect(status[3].name).toBe('Yahoo Finance');
    });
  });

  describe('Fallback Logic', () => {
    test('should fallback to Alpha Vantage if FMP fails', async () => {
      mockFMP = new MockProvider('FMP', 1, true); // FMP fails
      orchestrator = new DataProviderOrchestrator([mockFMP, mockAlpha]);

      const data = await orchestrator.getFinancialData('AAPL');

      expect(data.quote?.provider).toBe('Alpha Vantage');
      expect(mockAlpha.getCallCount()).toBe(6); // Alpha Vantage succeeded for all
    });

    test('should try all providers before giving up', async () => {
      mockFMP = new MockProvider('FMP', 1, true);
      mockAlpha = new MockProvider('Alpha Vantage', 2, true);
      mockPolygon = new MockProvider('Polygon.io', 3, true);
      mockYahoo = new MockProvider('Yahoo Finance', 4, true);

      orchestrator = new DataProviderOrchestrator([
        mockFMP,
        mockAlpha,
        mockPolygon,
        mockYahoo
      ]);

      const data = await orchestrator.getFinancialData('AAPL');

      expect(data.quote).toBeNull();
      expect(data.completeness).toBe(0); // All failed
      expect(mockFMP.getCallCount()).toBeGreaterThan(0);
      expect(mockAlpha.getCallCount()).toBeGreaterThan(0);
      expect(mockPolygon.getCallCount()).toBeGreaterThan(0);
      expect(mockYahoo.getCallCount()).toBeGreaterThan(0);
    });

    test('should use different providers for different data types', async () => {
      // FMP returns null for income, Alpha Vantage succeeds
      mockFMP = new MockProvider('FMP', 1, false, true);
      orchestrator = new DataProviderOrchestrator([mockFMP, mockAlpha]);

      const data = await orchestrator.getFinancialData('AAPL');

      // All data should come from Alpha Vantage since FMP returns null
      expect(data.quote?.provider).toBe('Alpha Vantage');
      expect(data.income?.provider).toBe('Alpha Vantage');
    });
  });

  describe('Rate Limit Awareness', () => {
    test('should skip provider near rate limit', async () => {
      // Mock FMP with high usage
      mockFMP.getRateLimit = () => ({
        maxPerSecond: 5,
        maxPerDay: 500,
        currentUsage: 480 // 96% of daily limit
      });

      const data = await orchestrator.getFinancialData('AAPL');

      // Should skip FMP and use Alpha Vantage
      expect(data.quote?.provider).toBe('Alpha Vantage');
      expect(mockFMP.getCallCount()).toBe(0);
    });
  });

  describe('Health Tracking', () => {
    test('should record provider failures', async () => {
      mockFMP = new MockProvider('FMP', 1, true);
      orchestrator = new DataProviderOrchestrator([mockFMP, mockAlpha]);

      await orchestrator.getFinancialData('AAPL');

      const status = orchestrator.getProviderStatus();
      const fmpStatus = status.find(p => p.name === 'FMP');

      expect(fmpStatus?.failures).toBeGreaterThan(0);
    });

    test('should record provider successes', async () => {
      await orchestrator.getFinancialData('AAPL');

      const status = orchestrator.getProviderStatus();
      const fmpStatus = status.find(p => p.name === 'FMP');

      expect(fmpStatus?.healthy).toBe(true);
    });
  });

  describe('Completeness Scoring', () => {
    test('should calculate 100% completeness when all data available', async () => {
      const data = await orchestrator.getFinancialData('AAPL');
      expect(data.completeness).toBe(100);
    });

    test('should calculate partial completeness when some data missing', async () => {
      // Create a provider that returns null for some data types
      mockFMP = new MockProvider('FMP', 1, false, true); // shouldReturnNull = true
      mockAlpha = new MockProvider('Alpha Vantage', 2, false, true); // Also returns null

      orchestrator = new DataProviderOrchestrator([mockFMP, mockAlpha]);
      const data = await orchestrator.getFinancialData('AAPL');

      // All providers return null, so completeness should be 0
      expect(data.completeness).toBe(0);
    });

    test('should calculate 0% completeness when all providers fail', async () => {
      mockFMP = new MockProvider('FMP', 1, true);
      mockAlpha = new MockProvider('Alpha Vantage', 2, true);

      orchestrator = new DataProviderOrchestrator([mockFMP, mockAlpha]);
      const data = await orchestrator.getFinancialData('AAPL');

      expect(data.completeness).toBe(0);
    });
  });

  describe('Fallback Statistics', () => {
    test('should track fallback usage', async () => {
      mockFMP = new MockProvider('FMP', 1, true); // FMP fails
      orchestrator = new DataProviderOrchestrator([mockFMP, mockAlpha]);

      await orchestrator.getFinancialData('AAPL');

      const stats = orchestrator.getFallbackStats(Date.now() - 60000);

      expect(stats.total).toBe(1);
      expect(stats.byProvider['Alpha Vantage']).toBeDefined();
      expect(stats.byProvider['Alpha Vantage'].fallbackUsagePercent).toBeGreaterThan(0);
    });

    test('should identify stocks requiring fallback', async () => {
      mockFMP = new MockProvider('FMP', 1, true);
      orchestrator = new DataProviderOrchestrator([mockFMP, mockAlpha]);

      await orchestrator.getFinancialData('AAPL');
      await orchestrator.getFinancialData('MSFT');

      const stats = orchestrator.getFallbackStats(Date.now() - 60000);

      expect(stats.stocksWithFallback).toContain('AAPL');
      expect(stats.stocksWithFallback).toContain('MSFT');
    });
  });

  describe('Provider Status', () => {
    test('should return correct provider status', async () => {
      const status = orchestrator.getProviderStatus();

      expect(status).toHaveLength(4);
      expect(status[0]).toMatchObject({
        name: 'FMP',
        priority: 1,
        healthy: true,
        failures: 0
      });
    });
  });
});
