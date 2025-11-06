/**
 * AGENT 15: Data Provider Orchestrator
 *
 * Implements intelligent fallback chain for financial data:
 * Priority 1: FMP (primary)
 * Priority 2: Alpha Vantage (fallback)
 * Priority 3: Polygon.io (secondary fallback)
 * Priority 4: Yahoo Finance (emergency fallback)
 *
 * KEY FEATURES:
 * - Per-data-type fallback (if FMP missing income, try Alpha Vantage just for income)
 * - Rate limit aware (skips providers near daily limit)
 * - Health tracking (skips unhealthy providers)
 * - Completeness scoring (0-100% data availability)
 * - Fallback metrics logging for monitoring
 */

import {
  IFinancialDataProvider,
  FinancialData,
  ProviderAttempt,
  Quote,
  IncomeStatement,
  BalanceSheet,
  CashFlow,
  Ratios,
  CompanyProfile
} from './providers/base-financial-provider';

/**
 * Fallback statistics for a specific data type
 */
interface FallbackStats {
  dataType: string;
  provider: string; // Which provider succeeded (or 'NONE')
  attempts: number;
  failures: number;
  duration: number;
}

/**
 * Summary of fallback usage for a symbol
 */
interface FallbackSummary {
  symbol: string;
  timestamp: string;
  dataTypes: Record<string, FallbackStats>;
  totalAttempts: number;
  totalFailures: number;
  completeness: number; // 0-100
}

/**
 * Provider usage statistics (for monitoring endpoint)
 */
export interface ProviderStats {
  provider: string;
  requests: number;
  successes: number;
  failures: number;
  successRate: number;
  avgDuration: number;
  fallbackUsagePercent: number;
}

/**
 * Orchestrates financial data fetching with multi-provider fallback
 */
export class DataProviderOrchestrator {
  private providers: IFinancialDataProvider[] = [];
  private fallbackHistory: FallbackSummary[] = [];
  private maxHistorySize: number = 1000; // Keep last 1000 fetches

  constructor(providers: IFinancialDataProvider[]) {
    // Sort by priority (1 = highest)
    this.providers = providers.sort((a, b) => a.priority - b.priority);
    console.log('[DataOrchestrator] Initialized with providers:', this.providers.map(p => `${p.name} (priority ${p.priority})`).join(', '));
  }

  /**
   * Add a provider to the fallback chain
   */
  addProvider(provider: IFinancialDataProvider): void {
    this.providers.push(provider);
    this.providers.sort((a, b) => a.priority - b.priority);
    console.log(`[DataOrchestrator] Added provider: ${provider.name} (priority ${provider.priority})`);
  }

  /**
   * Fetch complete financial data for a symbol with fallback chain
   *
   * @param symbol Stock ticker symbol
   * @returns Complete financial data with all available fields
   */
  async getFinancialData(symbol: string): Promise<FinancialData> {
    console.log(`[DataOrchestrator] Fetching financial data for ${symbol}...`);

    const data: Partial<FinancialData> = {
      symbol,
      fetchedAt: new Date().toISOString()
    };

    const attempts: Map<string, ProviderAttempt[]> = new Map();

    // Try each data type with fallback chain
    const dataTypes = ['quote', 'income', 'balance', 'cashFlow', 'ratios', 'profile'];

    for (const dataType of dataTypes) {
      data[dataType] = await this.fetchWithFallback(
        symbol,
        dataType,
        attempts
      );
    }

    // Calculate completeness
    const nonNullCount = dataTypes.filter(dt => data[dt] !== null).length;
    data.completeness = Math.round((nonNullCount / dataTypes.length) * 100);

    // Log fallback usage
    this.logFallbackUsage(symbol, attempts);

    return data as FinancialData;
  }

  /**
   * Fetch a specific data type with fallback chain
   */
  private async fetchWithFallback(
    symbol: string,
    dataType: string,
    attempts: Map<string, ProviderAttempt[]>
  ): Promise<any | null> {
    const attemptList: ProviderAttempt[] = [];

    for (const provider of this.providers) {
      // Check if provider is available
      const isAvailable = await provider.isAvailable();
      if (!isAvailable) {
        console.log(`[DataOrchestrator] Skipping unavailable provider: ${provider.name}`);
        continue;
      }

      // Check rate limit (skip if near limit)
      const rateLimit = provider.getRateLimit();
      if (rateLimit.currentUsage >= rateLimit.maxPerDay * 0.95) {
        console.warn(`[DataOrchestrator] ${provider.name} near rate limit (${rateLimit.currentUsage}/${rateLimit.maxPerDay}), skipping`);
        continue;
      }

      try {
        const startTime = Date.now();

        // Call the appropriate method based on data type
        let result: any = null;
        switch (dataType) {
          case 'quote':
            result = await provider.getQuote(symbol);
            break;
          case 'income':
            result = await provider.getIncomeStatement(symbol);
            break;
          case 'balance':
            result = await provider.getBalanceSheet(symbol);
            break;
          case 'cashFlow':
            result = await provider.getCashFlow(symbol);
            break;
          case 'ratios':
            result = await provider.getRatios(symbol);
            break;
          case 'profile':
            result = await provider.getProfile(symbol);
            break;
        }

        const duration = Date.now() - startTime;

        attemptList.push({
          provider: provider.name,
          success: !!result,
          duration,
          error: null
        });

        if (result) {
          console.log(`[DataOrchestrator] ${dataType} for ${symbol}: SUCCESS via ${provider.name} (${duration}ms)`);
          provider.recordSuccess();
          attempts.set(dataType, attemptList);
          return result;
        }
      } catch (error: any) {
        attemptList.push({
          provider: provider.name,
          success: false,
          duration: 0,
          error: error.message
        });
        console.warn(`[DataOrchestrator] ${provider.name} failed for ${symbol}.${dataType}: ${error.message}`);
        provider.recordFailure(error);
      }
    }

    // All providers failed
    attempts.set(dataType, attemptList);
    console.error(`[DataOrchestrator] All providers failed for ${symbol}.${dataType}`);
    return null;
  }

  /**
   * Log fallback usage summary
   */
  private logFallbackUsage(symbol: string, attempts: Map<string, ProviderAttempt[]>): void {
    const summary: FallbackSummary = {
      symbol,
      timestamp: new Date().toISOString(),
      dataTypes: {},
      totalAttempts: 0,
      totalFailures: 0,
      completeness: 0
    };

    let successCount = 0;

    for (const [dataType, attemptList] of attempts.entries()) {
      const successful = attemptList.find(a => a.success);
      const failures = attemptList.filter(a => !a.success).length;

      summary.dataTypes[dataType] = {
        dataType,
        provider: successful?.provider || 'NONE',
        attempts: attemptList.length,
        failures,
        duration: successful?.duration || 0
      };

      summary.totalAttempts += attemptList.length;
      summary.totalFailures += failures;

      if (successful) {
        successCount++;
      }
    }

    summary.completeness = Math.round((successCount / attempts.size) * 100);

    // Add to history
    this.fallbackHistory.push(summary);
    if (this.fallbackHistory.length > this.maxHistorySize) {
      this.fallbackHistory.shift();
    }

    console.log('[DataOrchestrator] Fallback Summary:', JSON.stringify(summary, null, 2));
  }

  /**
   * Get fallback statistics for a time period
   */
  getFallbackStats(sinceTimestamp: number): {
    total: number;
    completeness: number;
    byProvider: Record<string, ProviderStats>;
    stocksWithFallback: string[];
  } {
    const relevantSummaries = this.fallbackHistory.filter(
      s => new Date(s.timestamp).getTime() >= sinceTimestamp
    );

    if (relevantSummaries.length === 0) {
      return {
        total: 0,
        completeness: 0,
        byProvider: {},
        stocksWithFallback: []
      };
    }

    // Calculate aggregate stats
    const total = relevantSummaries.length;
    const avgCompleteness = relevantSummaries.reduce((sum, s) => sum + s.completeness, 0) / total;

    // Provider-level stats
    const providerStats: Record<string, {
      attempts: number;
      successes: number;
      failures: number;
      durations: number[];
    }> = {};

    const stocksWithFallback = new Set<string>();

    for (const summary of relevantSummaries) {
      let usedFallback = false;

      for (const [dataType, stats] of Object.entries(summary.dataTypes)) {
        const providerName = stats.provider;

        if (!providerStats[providerName]) {
          providerStats[providerName] = {
            attempts: 0,
            successes: 0,
            failures: 0,
            durations: []
          };
        }

        providerStats[providerName].attempts += stats.attempts;
        providerStats[providerName].failures += stats.failures;

        if (stats.provider !== 'NONE') {
          providerStats[providerName].successes++;
          providerStats[providerName].durations.push(stats.duration);

          // Check if this was a fallback (not the primary provider)
          if (this.providers[0]?.name !== providerName) {
            usedFallback = true;
          }
        }
      }

      if (usedFallback) {
        stocksWithFallback.add(summary.symbol);
      }
    }

    // Calculate provider stats
    const byProvider: Record<string, ProviderStats> = {};

    for (const [providerName, stats] of Object.entries(providerStats)) {
      const successRate = stats.attempts > 0 ? stats.successes / stats.attempts : 0;
      const avgDuration = stats.durations.length > 0
        ? stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length
        : 0;

      byProvider[providerName] = {
        provider: providerName,
        requests: stats.attempts,
        successes: stats.successes,
        failures: stats.failures,
        successRate: Math.round(successRate * 100) / 100,
        avgDuration: Math.round(avgDuration),
        fallbackUsagePercent: providerName === this.providers[0]?.name ? 0 : Math.round((stats.successes / total) * 100)
      };
    }

    return {
      total,
      completeness: Math.round(avgCompleteness),
      byProvider,
      stocksWithFallback: Array.from(stocksWithFallback)
    };
  }

  /**
   * Get provider status for monitoring
   */
  getProviderStatus(): Array<{
    name: string;
    priority: number;
    healthy: boolean;
    failures: number;
    rateLimit: {
      usage: number;
      limit: number;
      percent: number;
    };
  }> {
    return this.providers.map(provider => {
      const health = provider.getHealthStatus();
      const rateLimit = provider.getRateLimit();

      return {
        name: provider.name,
        priority: provider.priority,
        healthy: health.healthy,
        failures: health.failures,
        rateLimit: {
          usage: rateLimit.currentUsage,
          limit: rateLimit.maxPerDay,
          percent: Math.round((rateLimit.currentUsage / rateLimit.maxPerDay) * 100)
        }
      };
    });
  }

  /**
   * Clear fallback history (for testing/debugging)
   */
  clearHistory(): void {
    this.fallbackHistory = [];
    console.log('[DataOrchestrator] Fallback history cleared');
  }
}
