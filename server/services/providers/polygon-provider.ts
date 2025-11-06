/**
 * AGENT 15: Polygon.io Financial Data Provider
 *
 * Priority: 3 (secondary fallback after FMP and Alpha Vantage)
 * Free tier: 5 API calls/minute, 500 calls/day
 * Paid tier: Unlimited (if POLYGON_API_KEY is premium)
 *
 * Polygon is excellent for:
 * - Real-time quotes (WebSocket available on paid tier)
 * - Financial statements (via vX/reference/financials)
 * - Company profiles
 */

import axios from 'axios';
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

export class PolygonProvider extends BaseFinancialProvider {
  name = 'Polygon.io';
  priority = 3;

  private quotaPerMinute = 5; // Free tier
  private quotaPerDay = 500; // Free tier
  private callTimestamps: number[] = [];

  constructor(apiKey: string) {
    super(apiKey, 'https://api.polygon.io');
    console.log('[Polygon] Initialized with free tier limits (5/min, 500/day)');
  }

  /**
   * Check and enforce rate limits
   */
  private async checkRateLimit(): Promise<void> {
    this.resetDailyCounter();

    // Check daily limit
    if (this.callsToday >= this.quotaPerDay) {
      throw new Error('Polygon daily quota exceeded');
    }

    // Check per-minute limit
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    this.callTimestamps = this.callTimestamps.filter(ts => ts > oneMinuteAgo);

    if (this.callTimestamps.length >= this.quotaPerMinute) {
      const oldestCall = this.callTimestamps[0];
      const waitTime = 60000 - (now - oldestCall);

      if (waitTime > 0) {
        console.log(`[Polygon] Rate limit reached, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    this.callTimestamps.push(now);
    this.incrementCallCount();
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    await this.checkRateLimit();

    try {
      // Get previous day's aggregated bar (most reliable for quotes)
      const response = await axios.get(
        `${this.baseUrl}/v2/aggs/ticker/${symbol}/prev`,
        {
          params: { apiKey: this.apiKey },
          timeout: 10000
        }
      );

      if (!response.data.results || response.data.results.length === 0) {
        return null;
      }

      const data = response.data.results[0];
      const change = data.c - data.o;
      const changePercent = (change / data.o) * 100;

      return {
        symbol: symbol.toUpperCase(),
        price: data.c,
        change,
        changePercent,
        volume: data.v,
        marketCap: undefined,
        timestamp: new Date(data.t).toISOString(),
        provider: this.name
      };
    } catch (error: any) {
      return this.handleError(error, `getQuote(${symbol})`);
    }
  }

  async getIncomeStatement(symbol: string): Promise<IncomeStatement | null> {
    await this.checkRateLimit();

    try {
      const response = await axios.get(
        `${this.baseUrl}/vX/reference/financials`,
        {
          params: {
            ticker: symbol,
            timeframe: 'annual',
            limit: 1,
            sort: 'filing_date',
            order: 'desc',
            apiKey: this.apiKey
          },
          timeout: 15000
        }
      );

      if (!response.data.results || response.data.results.length === 0) {
        return null;
      }

      const financials = response.data.results[0];
      const incomeStatement = financials.financials.income_statement;

      if (!incomeStatement) {
        return null;
      }

      return {
        symbol: symbol.toUpperCase(),
        date: financials.end_date,
        period: financials.fiscal_period,
        revenue: incomeStatement.revenues?.value || 0,
        costOfRevenue: incomeStatement.cost_of_revenue?.value,
        grossProfit: incomeStatement.gross_profit?.value,
        operatingIncome: incomeStatement.operating_income_loss?.value,
        netIncome: incomeStatement.net_income_loss?.value || 0,
        eps: incomeStatement.basic_earnings_per_share?.value,
        ebitda: undefined, // Polygon doesn't provide EBITDA directly
        provider: this.name
      };
    } catch (error: any) {
      return this.handleError(error, `getIncomeStatement(${symbol})`);
    }
  }

  async getBalanceSheet(symbol: string): Promise<BalanceSheet | null> {
    await this.checkRateLimit();

    try {
      const response = await axios.get(
        `${this.baseUrl}/vX/reference/financials`,
        {
          params: {
            ticker: symbol,
            timeframe: 'annual',
            limit: 1,
            sort: 'filing_date',
            order: 'desc',
            apiKey: this.apiKey
          },
          timeout: 15000
        }
      );

      if (!response.data.results || response.data.results.length === 0) {
        return null;
      }

      const financials = response.data.results[0];
      const balanceSheet = financials.financials.balance_sheet;

      if (!balanceSheet) {
        return null;
      }

      return {
        symbol: symbol.toUpperCase(),
        date: financials.end_date,
        period: financials.fiscal_period,
        totalAssets: balanceSheet.assets?.value || 0,
        totalLiabilities: balanceSheet.liabilities?.value || 0,
        totalEquity: balanceSheet.equity?.value || 0,
        cash: balanceSheet.cash_and_cash_equivalents?.value || 0,
        shortTermInvestments: undefined,
        currentAssets: balanceSheet.current_assets?.value,
        currentLiabilities: balanceSheet.current_liabilities?.value,
        longTermDebt: balanceSheet.long_term_debt?.value,
        shortTermDebt: balanceSheet.current_debt?.value,
        provider: this.name
      };
    } catch (error: any) {
      return this.handleError(error, `getBalanceSheet(${symbol})`);
    }
  }

  async getCashFlow(symbol: string): Promise<CashFlow | null> {
    await this.checkRateLimit();

    try {
      const response = await axios.get(
        `${this.baseUrl}/vX/reference/financials`,
        {
          params: {
            ticker: symbol,
            timeframe: 'annual',
            limit: 1,
            sort: 'filing_date',
            order: 'desc',
            apiKey: this.apiKey
          },
          timeout: 15000
        }
      );

      if (!response.data.results || response.data.results.length === 0) {
        return null;
      }

      const financials = response.data.results[0];
      const cashFlowStatement = financials.financials.cash_flow_statement;

      if (!cashFlowStatement) {
        return null;
      }

      const operatingCashFlow = cashFlowStatement.net_cash_flow_from_operating_activities?.value || 0;
      const capitalExpenditures = Math.abs(cashFlowStatement.net_cash_flow_from_investing_activities?.value || 0);
      const freeCashFlow = operatingCashFlow - capitalExpenditures;

      return {
        symbol: symbol.toUpperCase(),
        date: financials.end_date,
        period: financials.fiscal_period,
        operatingCashFlow,
        capitalExpenditures,
        freeCashFlow,
        dividendsPaid: cashFlowStatement.payments_of_dividends?.value,
        provider: this.name
      };
    } catch (error: any) {
      return this.handleError(error, `getCashFlow(${symbol})`);
    }
  }

  async getRatios(symbol: string): Promise<Ratios | null> {
    // Polygon doesn't provide pre-calculated ratios
    // We would need to calculate them from financials
    // For now, return null to trigger fallback to other providers
    return null;
  }

  async getProfile(symbol: string): Promise<CompanyProfile | null> {
    await this.checkRateLimit();

    try {
      const response = await axios.get(
        `${this.baseUrl}/v3/reference/tickers/${symbol}`,
        {
          params: { apiKey: this.apiKey },
          timeout: 10000
        }
      );

      if (!response.data.results) {
        return null;
      }

      const data = response.data.results;

      return {
        symbol: symbol.toUpperCase(),
        companyName: data.name,
        sector: data.sic_description || '',
        industry: data.industry || '',
        marketCap: data.market_cap,
        beta: undefined, // Polygon doesn't provide beta in ticker details
        country: data.locale === 'us' ? 'United States' : data.locale,
        exchange: data.primary_exchange,
        provider: this.name
      };
    } catch (error: any) {
      return this.handleError(error, `getProfile(${symbol})`);
    }
  }

  getRateLimit(): RateLimitInfo {
    this.resetDailyCounter();

    return {
      maxPerSecond: this.quotaPerMinute / 60,
      maxPerDay: this.quotaPerDay,
      currentUsage: this.callsToday,
      resetAt: new Date(new Date().setHours(24, 0, 0, 0))
    };
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    const health = this.getHealthStatus();
    const rateLimit = this.getRateLimit();

    return health.healthy && rateLimit.currentUsage < rateLimit.maxPerDay * 0.95;
  }
}
