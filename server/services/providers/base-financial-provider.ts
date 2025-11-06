/**
 * AGENT 15: Base Financial Data Provider Interface
 *
 * Defines the contract for all financial data providers (FMP, Alpha Vantage, Polygon, Yahoo Finance)
 * Enables multi-provider fallback chain for maximum data availability
 */

/**
 * Rate limit information for a provider
 */
export interface RateLimitInfo {
  /** Maximum calls per second */
  maxPerSecond: number;
  /** Maximum calls per day */
  maxPerDay: number;
  /** Current usage count for today */
  currentUsage: number;
  /** Timestamp when rate limits reset */
  resetAt?: Date;
}

/**
 * Stock quote data
 */
export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  timestamp: string;
  provider: string;
}

/**
 * Income statement data (TTM or latest period)
 */
export interface IncomeStatement {
  symbol: string;
  date: string;
  period: string;
  revenue: number;
  costOfRevenue?: number;
  grossProfit?: number;
  operatingIncome?: number;
  netIncome: number;
  eps?: number;
  ebitda?: number;
  provider: string;
}

/**
 * Balance sheet data (latest period)
 */
export interface BalanceSheet {
  symbol: string;
  date: string;
  period: string;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  cash: number;
  shortTermInvestments?: number;
  currentAssets?: number;
  currentLiabilities?: number;
  longTermDebt?: number;
  shortTermDebt?: number;
  provider: string;
}

/**
 * Cash flow statement data (TTM or latest period)
 */
export interface CashFlow {
  symbol: string;
  date: string;
  period: string;
  operatingCashFlow: number;
  capitalExpenditures: number;
  freeCashFlow: number;
  dividendsPaid?: number;
  provider: string;
}

/**
 * Financial ratios data
 */
export interface Ratios {
  symbol: string;
  date: string;
  period: string;
  pe?: number;
  pb?: number;
  ps?: number;
  pegRatio?: number;
  debtToEquity?: number;
  currentRatio?: number;
  returnOnEquity?: number;
  returnOnAssets?: number;
  provider: string;
}

/**
 * Company profile data
 */
export interface CompanyProfile {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  marketCap?: number;
  beta?: number;
  country?: string;
  exchange?: string;
  provider: string;
}

/**
 * Complete financial data for a single stock
 */
export interface FinancialData {
  symbol: string;
  quote: Quote | null;
  income: IncomeStatement | null;
  balance: BalanceSheet | null;
  cashFlow: CashFlow | null;
  ratios: Ratios | null;
  profile: CompanyProfile | null;
  fetchedAt: string;
  completeness: number; // 0-100 percentage
}

/**
 * Provider attempt result for logging
 */
export interface ProviderAttempt {
  provider: string;
  success: boolean;
  duration: number;
  error: string | null;
}

/**
 * Base interface that all financial data providers must implement
 */
export interface IFinancialDataProvider {
  /** Provider name (e.g., "FMP", "Alpha Vantage") */
  name: string;

  /** Priority level (1 = highest, 4 = lowest) */
  priority: number;

  /**
   * Get real-time quote for a symbol
   */
  getQuote(symbol: string): Promise<Quote | null>;

  /**
   * Get income statement (latest or TTM)
   */
  getIncomeStatement(symbol: string): Promise<IncomeStatement | null>;

  /**
   * Get balance sheet (latest)
   */
  getBalanceSheet(symbol: string): Promise<BalanceSheet | null>;

  /**
   * Get cash flow statement (latest or TTM)
   */
  getCashFlow(symbol: string): Promise<CashFlow | null>;

  /**
   * Get financial ratios
   */
  getRatios(symbol: string): Promise<Ratios | null>;

  /**
   * Get company profile
   */
  getProfile(symbol: string): Promise<CompanyProfile | null>;

  /**
   * Check if provider is available (API key configured, etc.)
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get current rate limit status
   */
  getRateLimit(): RateLimitInfo;

  /**
   * Get provider health status
   */
  getHealthStatus(): {
    healthy: boolean;
    failures: number;
    lastFailure: Date | null;
  };

  /**
   * Record a successful API call
   */
  recordSuccess(): void;

  /**
   * Record a failed API call
   */
  recordFailure(error: Error): void;
}

/**
 * Abstract base class implementing common provider functionality
 */
export abstract class BaseFinancialProvider implements IFinancialDataProvider {
  abstract name: string;
  abstract priority: number;

  protected apiKey: string;
  protected baseUrl: string;

  // Health tracking
  protected failures: number = 0;
  protected lastFailure: Date | null = null;
  protected maxFailures: number = 5;
  protected healthResetTime: number = 5 * 60 * 1000; // 5 minutes

  // Rate limit tracking
  protected callsToday: number = 0;
  protected lastResetDate: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.lastResetDate = new Date().toDateString();
  }

  abstract getQuote(symbol: string): Promise<Quote | null>;
  abstract getIncomeStatement(symbol: string): Promise<IncomeStatement | null>;
  abstract getBalanceSheet(symbol: string): Promise<BalanceSheet | null>;
  abstract getCashFlow(symbol: string): Promise<CashFlow | null>;
  abstract getRatios(symbol: string): Promise<Ratios | null>;
  abstract getProfile(symbol: string): Promise<CompanyProfile | null>;
  abstract getRateLimit(): RateLimitInfo;

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey && this.getHealthStatus().healthy;
  }

  getHealthStatus() {
    // Reset health if enough time has passed
    if (this.lastFailure && Date.now() - this.lastFailure.getTime() > this.healthResetTime) {
      this.failures = 0;
      this.lastFailure = null;
    }

    return {
      healthy: this.failures < this.maxFailures,
      failures: this.failures,
      lastFailure: this.lastFailure
    };
  }

  recordSuccess(): void {
    if (this.failures > 0) {
      this.failures = Math.max(0, this.failures - 1);
    }
  }

  recordFailure(error: Error): void {
    this.failures++;
    this.lastFailure = new Date();
    console.warn(`[${this.name}] Failure recorded (${this.failures}/${this.maxFailures}): ${error.message}`);
  }

  /**
   * Reset daily rate limit counter
   */
  protected resetDailyCounter(): void {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.callsToday = 0;
      this.lastResetDate = today;
    }
  }

  /**
   * Increment API call counter
   */
  protected incrementCallCount(): void {
    this.resetDailyCounter();
    this.callsToday++;
  }

  /**
   * Capitalize first letter of string
   */
  protected capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Safe API error handler
   */
  protected handleError(error: any, operation: string): null {
    console.error(`[${this.name}] ${operation} error:`, error.message);
    this.recordFailure(error);
    return null;
  }
}
