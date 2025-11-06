/**
 * AGENT 15: Yahoo Finance Financial Data Provider
 *
 * Priority: 4 (emergency fallback - last resort)
 * Rate limits: No official limit (use responsibly - 2 req/s recommended)
 *
 * Yahoo Finance is excellent for:
 * - Free, unlimited (within reason) API access
 * - Comprehensive fundamental data
 * - Global market coverage
 *
 * NOTE: Uses yahoo-finance2 npm package for reliable scraping
 */

import yahooFinance from 'yahoo-finance2';
import {
  BaseFinancialProvider,
  Quote,
  IncomeStatement,
  BalanceSheet,
  CashFlow,
  Ratios,
  CompanyProfile,
  RateLimitInfo
} from './base-financial-provider';

export class YahooFinanceProvider extends BaseFinancialProvider {
  name = 'Yahoo Finance';
  priority = 4;

  private maxPerSecond = 2; // Self-imposed limit to be respectful
  private callTimestamps: number[] = [];

  constructor() {
    // Yahoo Finance doesn't require API key
    super('', 'https://finance.yahoo.com');
    console.log('[Yahoo Finance] Initialized (no API key required)');
  }

  /**
   * Self-imposed rate limiting to be respectful
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    this.callTimestamps = this.callTimestamps.filter(ts => ts > oneSecondAgo);

    if (this.callTimestamps.length >= this.maxPerSecond) {
      const waitTime = 1000 - (now - this.callTimestamps[0]);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    this.callTimestamps.push(now);
    this.incrementCallCount();
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    await this.checkRateLimit();

    try {
      const quote = await yahooFinance.quote(symbol, {
        return: 'object'
      });

      if (!quote || !quote.regularMarketPrice) {
        return null;
      }

      return {
        symbol: quote.symbol,
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        volume: quote.regularMarketVolume || 0,
        marketCap: quote.marketCap,
        timestamp: new Date().toISOString(),
        provider: this.name
      };
    } catch (error: any) {
      return this.handleError(error, `getQuote(${symbol})`);
    }
  }

  async getIncomeStatement(symbol: string): Promise<IncomeStatement | null> {
    await this.checkRateLimit();

    try {
      const financials = await yahooFinance.quoteSummary(symbol, {
        modules: ['incomeStatementHistory', 'incomeStatementHistoryQuarterly']
      });

      if (!financials.incomeStatementHistory?.incomeStatementHistory) {
        return null;
      }

      // Get latest annual income statement
      const latest = financials.incomeStatementHistory.incomeStatementHistory[0];

      if (!latest) {
        return null;
      }

      return {
        symbol: symbol.toUpperCase(),
        date: latest.endDate?.raw ? new Date(latest.endDate.raw * 1000).toISOString().split('T')[0] : '',
        period: 'FY',
        revenue: latest.totalRevenue?.raw || 0,
        costOfRevenue: latest.costOfRevenue?.raw,
        grossProfit: latest.grossProfit?.raw,
        operatingIncome: latest.operatingIncome?.raw,
        netIncome: latest.netIncome?.raw || 0,
        eps: undefined, // Yahoo Finance doesn't include EPS in income statement
        ebitda: latest.ebitda?.raw,
        provider: this.name
      };
    } catch (error: any) {
      return this.handleError(error, `getIncomeStatement(${symbol})`);
    }
  }

  async getBalanceSheet(symbol: string): Promise<BalanceSheet | null> {
    await this.checkRateLimit();

    try {
      const financials = await yahooFinance.quoteSummary(symbol, {
        modules: ['balanceSheetHistory', 'balanceSheetHistoryQuarterly']
      });

      if (!financials.balanceSheetHistory?.balanceSheetStatements) {
        return null;
      }

      // Get latest annual balance sheet
      const latest = financials.balanceSheetHistory.balanceSheetStatements[0];

      if (!latest) {
        return null;
      }

      return {
        symbol: symbol.toUpperCase(),
        date: latest.endDate?.raw ? new Date(latest.endDate.raw * 1000).toISOString().split('T')[0] : '',
        period: 'FY',
        totalAssets: latest.totalAssets?.raw || 0,
        totalLiabilities: latest.totalLiab?.raw || 0,
        totalEquity: latest.totalStockholderEquity?.raw || 0,
        cash: latest.cash?.raw || 0,
        shortTermInvestments: latest.shortTermInvestments?.raw,
        currentAssets: latest.totalCurrentAssets?.raw,
        currentLiabilities: latest.totalCurrentLiabilities?.raw,
        longTermDebt: latest.longTermDebt?.raw,
        shortTermDebt: latest.shortTermDebt?.raw,
        provider: this.name
      };
    } catch (error: any) {
      return this.handleError(error, `getBalanceSheet(${symbol})`);
    }
  }

  async getCashFlow(symbol: string): Promise<CashFlow | null> {
    await this.checkRateLimit();

    try {
      const financials = await yahooFinance.quoteSummary(symbol, {
        modules: ['cashflowStatementHistory', 'cashflowStatementHistoryQuarterly']
      });

      if (!financials.cashflowStatementHistory?.cashflowStatements) {
        return null;
      }

      // Get latest annual cash flow statement
      const latest = financials.cashflowStatementHistory.cashflowStatements[0];

      if (!latest) {
        return null;
      }

      const operatingCashFlow = latest.totalCashFromOperatingActivities?.raw || 0;
      const capitalExpenditures = Math.abs(latest.capitalExpenditures?.raw || 0);
      const freeCashFlow = operatingCashFlow - capitalExpenditures;

      return {
        symbol: symbol.toUpperCase(),
        date: latest.endDate?.raw ? new Date(latest.endDate.raw * 1000).toISOString().split('T')[0] : '',
        period: 'FY',
        operatingCashFlow,
        capitalExpenditures,
        freeCashFlow,
        dividendsPaid: latest.dividendsPaid?.raw,
        provider: this.name
      };
    } catch (error: any) {
      return this.handleError(error, `getCashFlow(${symbol})`);
    }
  }

  async getRatios(symbol: string): Promise<Ratios | null> {
    await this.checkRateLimit();

    try {
      const summary = await yahooFinance.quoteSummary(symbol, {
        modules: ['defaultKeyStatistics', 'financialData']
      });

      const stats = summary.defaultKeyStatistics;
      const financial = summary.financialData;

      if (!stats && !financial) {
        return null;
      }

      return {
        symbol: symbol.toUpperCase(),
        date: new Date().toISOString().split('T')[0],
        period: 'TTM',
        pe: stats?.forwardPE?.raw || stats?.trailingPE?.raw,
        pb: stats?.priceToBook?.raw,
        ps: stats?.priceToSalesTrailing12Months?.raw,
        pegRatio: stats?.pegRatio?.raw,
        debtToEquity: financial?.debtToEquity?.raw,
        currentRatio: financial?.currentRatio?.raw,
        returnOnEquity: financial?.returnOnEquity?.raw,
        returnOnAssets: financial?.returnOnAssets?.raw,
        provider: this.name
      };
    } catch (error: any) {
      return this.handleError(error, `getRatios(${symbol})`);
    }
  }

  async getProfile(symbol: string): Promise<CompanyProfile | null> {
    await this.checkRateLimit();

    try {
      const summary = await yahooFinance.quoteSummary(symbol, {
        modules: ['summaryProfile', 'price']
      });

      const profile = summary.summaryProfile;
      const price = summary.price;

      if (!profile && !price) {
        return null;
      }

      return {
        symbol: symbol.toUpperCase(),
        companyName: price?.longName || price?.shortName || symbol,
        sector: profile?.sector || '',
        industry: profile?.industry || '',
        marketCap: price?.marketCap?.raw,
        beta: summary.summaryDetail?.beta?.raw,
        country: profile?.country,
        exchange: price?.exchangeName,
        provider: this.name
      };
    } catch (error: any) {
      return this.handleError(error, `getProfile(${symbol})`);
    }
  }

  getRateLimit(): RateLimitInfo {
    return {
      maxPerSecond: this.maxPerSecond,
      maxPerDay: Infinity, // No official limit
      currentUsage: this.callsToday,
      resetAt: undefined
    };
  }

  async isAvailable(): Promise<boolean> {
    // Yahoo Finance is always available (no API key required)
    const health = this.getHealthStatus();
    return health.healthy;
  }
}
