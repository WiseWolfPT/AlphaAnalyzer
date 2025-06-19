// Enhanced Financial Modeling Prep (FMP) API Service
// Optimized for 250 calls/day with 2025 best practices
import { cacheManager } from '../lib/cache-manager';

export interface FMPConfig {
  apiKey: string;
  baseUrl?: string;
  dailyLimit?: number;
  retryAttempts?: number;
  timeout?: number;
}

export interface FMPStockQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  exchange: string;
  volume: number;
  avgVolume: number;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  earningsAnnouncement?: string;
  sharesOutstanding: number;
  timestamp: number;
}

export interface FMPCompanyProfile {
  symbol: string;
  price: number;
  beta: number;
  volAvg: number;
  mktCap: number;
  lastDiv: number;
  range: string;
  changes: number;
  companyName: string;
  currency: string;
  cik: string;
  isin: string;
  cusip: string;
  exchange: string;
  exchangeShortName: string;
  industry: string;
  website: string;
  description: string;
  ceo: string;
  sector: string;
  country: string;
  fullTimeEmployees: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  dcfDiff: number;
  dcf: number;
  image: string;
  ipoDate: string;
  defaultImage: boolean;
  isEtf: boolean;
  isActivelyTrading: boolean;
  isAdr: boolean;
  isFund: boolean;
}

export interface FMPIncomeStatement {
  date: string;
  symbol: string;
  reportedCurrency: string;
  cik: string;
  fillingDate: string;
  acceptedDate: string;
  calendarYear: string;
  period: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  grossProfitRatio: number;
  researchAndDevelopmentExpenses: number;
  generalAndAdministrativeExpenses: number;
  sellingAndMarketingExpenses: number;
  sellingGeneralAndAdministrativeExpenses: number;
  otherExpenses: number;
  operatingExpenses: number;
  costAndExpenses: number;
  interestIncome: number;
  interestExpense: number;
  depreciationAndAmortization: number;
  ebitda: number;
  ebitdaratio: number;
  operatingIncome: number;
  operatingIncomeRatio: number;
  totalOtherIncomeExpensesNet: number;
  incomeBeforeTax: number;
  incomeBeforeTaxRatio: number;
  incomeTaxExpense: number;
  netIncome: number;
  netIncomeRatio: number;
  eps: number;
  epsdiluted: number;
  weightedAverageShsOut: number;
  weightedAverageShsOutDil: number;
}

export interface FMPBalanceSheet {
  date: string;
  symbol: string;
  reportedCurrency: string;
  cik: string;
  fillingDate: string;
  acceptedDate: string;
  calendarYear: string;
  period: string;
  cashAndCashEquivalents: number;
  shortTermInvestments: number;
  cashAndShortTermInvestments: number;
  netReceivables: number;
  inventory: number;
  otherCurrentAssets: number;
  totalCurrentAssets: number;
  propertyPlantEquipmentNet: number;
  goodwill: number;
  intangibleAssets: number;
  goodwillAndIntangibleAssets: number;
  longTermInvestments: number;
  taxAssets: number;
  otherNonCurrentAssets: number;
  totalNonCurrentAssets: number;
  otherAssets: number;
  totalAssets: number;
  accountPayables: number;
  shortTermDebt: number;
  taxPayables: number;
  deferredRevenue: number;
  otherCurrentLiabilities: number;
  totalCurrentLiabilities: number;
  longTermDebt: number;
  deferredRevenueNonCurrent: number;
  deferredTaxLiabilitiesNonCurrent: number;
  otherNonCurrentLiabilities: number;
  totalNonCurrentLiabilities: number;
  otherLiabilities: number;
  capitalLeaseObligations: number;
  totalLiabilities: number;
  preferredStock: number;
  commonStock: number;
  retainedEarnings: number;
  accumulatedOtherComprehensiveIncomeLoss: number;
  othertotalStockholdersEquity: number;
  totalStockholdersEquity: number;
  totalEquity: number;
  totalLiabilitiesAndStockholdersEquity: number;
  minorityInterest: number;
  totalLiabilitiesAndTotalEquity: number;
  totalInvestments: number;
  totalDebt: number;
  netDebt: number;
}

export interface FMPCashFlow {
  date: string;
  symbol: string;
  reportedCurrency: string;
  cik: string;
  fillingDate: string;
  acceptedDate: string;
  calendarYear: string;
  period: string;
  netIncome: number;
  depreciationAndAmortization: number;
  deferredIncomeTax: number;
  stockBasedCompensation: number;
  changeInWorkingCapital: number;
  accountsReceivables: number;
  inventory: number;
  accountsPayables: number;
  otherWorkingCapital: number;
  otherNonCashItems: number;
  netCashProvidedByOperatingActivities: number;
  investmentsInPropertyPlantAndEquipment: number;
  acquisitionsNet: number;
  purchasesOfInvestments: number;
  salesMaturitiesOfInvestments: number;
  otherInvestingActivites: number;
  netCashUsedForInvestingActivites: number;
  debtRepayment: number;
  commonStockIssued: number;
  commonStockRepurchased: number;
  dividendsPaid: number;
  otherFinancingActivites: number;
  netCashUsedProvidedByFinancingActivities: number;
  effectOfForexChangesOnCash: number;
  netChangeInCash: number;
  cashAtEndOfPeriod: number;
  cashAtBeginningOfPeriod: number;
  operatingCashFlow: number;
  capitalExpenditure: number;
  freeCashFlow: number;
}

export interface FMPEarningsCalendar {
  date: string;
  symbol: string;
  eps: number;
  epsEstimated: number;
  time: string;
  revenue: number;
  revenueEstimated: number;
  updatedFromDate: string;
  fiscalDateEnding: string;
}

export interface FMPWebSocketMessage {
  symbol: string;
  price: number;
  change: number;
  changesPercentage: number;
  volume: number;
  timestamp: number;
}

export interface FMPRateLimitInfo {
  used: number;
  remaining: number;
  limit: number;
  resetTime: Date;
  requestsThisMinute: number;
}

export class FMPEnhancedService {
  private config: Required<FMPConfig>;
  private requestCount: number = 0;
  private dailyRequestCount: number = 0;
  private lastResetDate: string = '';
  private requestsThisMinute: Array<{ timestamp: number }> = [];
  private readonly MAX_REQUESTS_PER_MINUTE = 10; // Conservative rate limiting

  constructor(config: FMPConfig) {
    this.config = {
      baseUrl: 'https://financialmodelingprep.com/api/v3',
      dailyLimit: 250,
      retryAttempts: 3,
      timeout: 10000,
      ...config
    };
    this.initializeDailyTracking();
  }

  private initializeDailyTracking(): void {
    const today = new Date().toISOString().split('T')[0];
    if (this.lastResetDate !== today) {
      this.dailyRequestCount = 0;
      this.lastResetDate = today;
    }
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    this.initializeDailyTracking();
    
    // Check daily limit
    if (this.dailyRequestCount >= this.config.dailyLimit) {
      throw new Error(`Daily API limit reached (${this.config.dailyLimit} requests)`);
    }

    // Rate limiting check
    const now = Date.now();
    this.requestsThisMinute = this.requestsThisMinute.filter(req => now - req.timestamp < 60000);
    
    if (this.requestsThisMinute.length >= this.MAX_REQUESTS_PER_MINUTE) {
      const waitTime = 60000 - (now - this.requestsThisMinute[0].timestamp);
      console.warn(`Rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    const url = new URL(`${this.config.baseUrl}${endpoint}`);
    url.searchParams.append('apikey', this.config.apiKey);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    let lastError: Error;
    
    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Alfalyzer/1.0'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 429) {
            // Rate limited - wait and retry
            const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
            console.warn(`Rate limited, waiting ${retryAfter}s`);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            continue;
          }
          
          if (response.status === 403) {
            throw new Error('API key invalid or limit exceeded');
          }

          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Track successful request
        this.requestCount++;
        this.dailyRequestCount++;
        this.requestsThisMinute.push({ timestamp: now });

        // Check for API error in response
        if (data.error) {
          throw new Error(data.error);
        }

        return data;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retryAttempts - 1) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.warn(`Request failed, retrying in ${delay}ms: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  // Stock Quote with caching
  async getStockQuote(symbol: string): Promise<FMPStockQuote> {
    const cacheKey = `fmp-quote-${symbol}`;
    const cached = cacheManager.get<FMPStockQuote>(cacheKey, 'stock-quote');
    
    if (cached) {
      console.log(`📦 FMP Cache hit for quote ${symbol}`);
      return cached;
    }

    console.log(`🔄 FMP Fetching quote for ${symbol}`);
    const data = await this.makeRequest<FMPStockQuote[]>(`/quote/${symbol}`);
    
    if (!data || data.length === 0) {
      throw new Error(`No quote data found for symbol: ${symbol}`);
    }

    const quote = data[0];
    cacheManager.set(cacheKey, quote, 'stock-quote');
    return quote;
  }

  // Batch quotes (more efficient)
  async getBatchQuotes(symbols: string[]): Promise<Record<string, FMPStockQuote>> {
    if (symbols.length === 0) return {};
    
    const symbolsParam = symbols.join(',');
    const cacheKey = `fmp-batch-quotes-${symbolsParam}`;
    const cached = cacheManager.get<Record<string, FMPStockQuote>>(cacheKey, 'stock-quote');
    
    if (cached) {
      console.log(`📦 FMP Cache hit for batch quotes: ${symbols.length} symbols`);
      return cached;
    }

    console.log(`🔄 FMP Fetching batch quotes for ${symbols.length} symbols`);
    const data = await this.makeRequest<FMPStockQuote[]>(`/quote/${symbolsParam}`);
    
    const result: Record<string, FMPStockQuote> = {};
    data.forEach(quote => {
      result[quote.symbol] = quote;
    });

    cacheManager.set(cacheKey, result, 'stock-quote');
    return result;
  }

  // Company Profile
  async getCompanyProfile(symbol: string): Promise<FMPCompanyProfile> {
    const cacheKey = `fmp-profile-${symbol}`;
    const cached = cacheManager.get<FMPCompanyProfile>(cacheKey, 'profile');
    
    if (cached) {
      console.log(`📦 FMP Cache hit for profile ${symbol}`);
      return cached;
    }

    console.log(`🔄 FMP Fetching profile for ${symbol}`);
    const data = await this.makeRequest<FMPCompanyProfile[]>(`/profile/${symbol}`);
    
    if (!data || data.length === 0) {
      throw new Error(`No profile data found for symbol: ${symbol}`);
    }

    const profile = data[0];
    cacheManager.set(cacheKey, profile, 'profile');
    return profile;
  }

  // Income Statement
  async getIncomeStatement(symbol: string, period: 'annual' | 'quarter' = 'quarter', limit: number = 4): Promise<FMPIncomeStatement[]> {
    const cacheKey = `fmp-income-${symbol}-${period}-${limit}`;
    const cached = cacheManager.get<FMPIncomeStatement[]>(cacheKey, 'financials');
    
    if (cached) {
      console.log(`📦 FMP Cache hit for income statement ${symbol}`);
      return cached;
    }

    console.log(`🔄 FMP Fetching income statement for ${symbol}`);
    const data = await this.makeRequest<FMPIncomeStatement[]>(`/income-statement/${symbol}`, {
      period,
      limit
    });

    cacheManager.set(cacheKey, data, 'financials');
    return data;
  }

  // Balance Sheet
  async getBalanceSheet(symbol: string, period: 'annual' | 'quarter' = 'quarter', limit: number = 4): Promise<FMPBalanceSheet[]> {
    const cacheKey = `fmp-balance-${symbol}-${period}-${limit}`;
    const cached = cacheManager.get<FMPBalanceSheet[]>(cacheKey, 'financials');
    
    if (cached) {
      console.log(`📦 FMP Cache hit for balance sheet ${symbol}`);
      return cached;
    }

    console.log(`🔄 FMP Fetching balance sheet for ${symbol}`);
    const data = await this.makeRequest<FMPBalanceSheet[]>(`/balance-sheet-statement/${symbol}`, {
      period,
      limit
    });

    cacheManager.set(cacheKey, data, 'financials');
    return data;
  }

  // Cash Flow Statement
  async getCashFlowStatement(symbol: string, period: 'annual' | 'quarter' = 'quarter', limit: number = 4): Promise<FMPCashFlow[]> {
    const cacheKey = `fmp-cashflow-${symbol}-${period}-${limit}`;
    const cached = cacheManager.get<FMPCashFlow[]>(cacheKey, 'financials');
    
    if (cached) {
      console.log(`📦 FMP Cache hit for cash flow ${symbol}`);
      return cached;
    }

    console.log(`🔄 FMP Fetching cash flow for ${symbol}`);
    const data = await this.makeRequest<FMPCashFlow[]>(`/cash-flow-statement/${symbol}`, {
      period,
      limit
    });

    cacheManager.set(cacheKey, data, 'financials');
    return data;
  }

  // Earnings Calendar
  async getEarningsCalendar(from?: string, to?: string): Promise<FMPEarningsCalendar[]> {
    const cacheKey = `fmp-earnings-${from || 'today'}-${to || 'today'}`;
    const cached = cacheManager.get<FMPEarningsCalendar[]>(cacheKey, 'earnings');
    
    if (cached) {
      console.log(`📦 FMP Cache hit for earnings calendar`);
      return cached;
    }

    console.log(`🔄 FMP Fetching earnings calendar`);
    const params: Record<string, any> = {};
    if (from) params.from = from;
    if (to) params.to = to;

    const data = await this.makeRequest<FMPEarningsCalendar[]>('/earning_calendar', params);
    cacheManager.set(cacheKey, data, 'earnings');
    return data;
  }

  // Historical Stock Prices
  async getHistoricalPrices(symbol: string, from?: string, to?: string): Promise<any[]> {
    const cacheKey = `fmp-historical-${symbol}-${from || ''}-${to || ''}`;
    const cached = cacheManager.get<any[]>(cacheKey, 'historical');
    
    if (cached) {
      console.log(`📦 FMP Cache hit for historical ${symbol}`);
      return cached;
    }

    console.log(`🔄 FMP Fetching historical prices for ${symbol}`);
    const params: Record<string, any> = {};
    if (from) params.from = from;
    if (to) params.to = to;

    const data = await this.makeRequest<{ historical: any[] }>(`/historical-price-full/${symbol}`, params);
    const historical = data.historical || [];
    
    cacheManager.set(cacheKey, historical, 'historical');
    return historical;
  }

  // Rate Limit Information
  getRateLimitInfo(): FMPRateLimitInfo {
    return {
      used: this.dailyRequestCount,
      remaining: this.config.dailyLimit - this.dailyRequestCount,
      limit: this.config.dailyLimit,
      resetTime: new Date(Date.now() + (24 * 60 * 60 * 1000)), // Next day
      requestsThisMinute: this.requestsThisMinute.length
    };
  }

  // Optimize symbol requests based on remaining quota
  optimizeSymbolRequests(symbols: string[], maxRequests?: number): {
    batches: string[][];
    estimatedRequests: number;
    strategy: string;
  } {
    const remainingRequests = maxRequests || (this.config.dailyLimit - this.dailyRequestCount);
    const maxSymbolsPerBatch = 100; // FMP supports batch requests
    
    if (symbols.length <= remainingRequests * maxSymbolsPerBatch) {
      // We can process all symbols
      const batches: string[][] = [];
      for (let i = 0; i < symbols.length; i += maxSymbolsPerBatch) {
        batches.push(symbols.slice(i, i + maxSymbolsPerBatch));
      }
      
      return {
        batches,
        estimatedRequests: batches.length,
        strategy: `Processing all ${symbols.length} symbols in ${batches.length} batch(es)`
      };
    }
    
    // Limited by remaining requests
    const affordableSymbols = remainingRequests * maxSymbolsPerBatch;
    const limitedSymbols = symbols.slice(0, affordableSymbols);
    const batches: string[][] = [];
    
    for (let i = 0; i < limitedSymbols.length; i += maxSymbolsPerBatch) {
      batches.push(limitedSymbols.slice(i, i + maxSymbolsPerBatch));
    }
    
    return {
      batches,
      estimatedRequests: batches.length,
      strategy: `Limited to ${affordableSymbols} symbols due to quota constraints`
    };
  }

  // Get optimization recommendations
  getOptimizationRecommendations(): string[] {
    const rateLimitInfo = this.getRateLimitInfo();
    const usagePercentage = (rateLimitInfo.used / rateLimitInfo.limit) * 100;
    const recommendations: string[] = [];

    if (usagePercentage < 20) {
      recommendations.push('✅ Great! You have plenty of API quota remaining');
      recommendations.push('💡 Consider using batch requests for multiple symbols');
    } else if (usagePercentage < 50) {
      recommendations.push('📊 Moderate API usage - monitor carefully');
      recommendations.push('🔄 Implement caching for frequently requested data');
    } else if (usagePercentage < 80) {
      recommendations.push('⚠️ High API usage detected');
      recommendations.push('📦 Enable aggressive caching to reduce requests');
      recommendations.push('🎯 Prioritize most important symbols');
    } else {
      recommendations.push('🚨 Critical: Very high API usage!');
      recommendations.push('⬆️ Consider upgrading your FMP plan');
      recommendations.push('🔒 Implement strict request prioritization');
    }

    recommendations.push(`📊 Daily usage: ${rateLimitInfo.used}/${rateLimitInfo.limit} requests`);
    recommendations.push(`⏱️ Current minute usage: ${rateLimitInfo.requestsThisMinute}/${this.MAX_REQUESTS_PER_MINUTE} requests`);

    return recommendations;
  }
}

// Global FMP service instance (to be initialized with API key)
let fmpService: FMPEnhancedService | null = null;

export const initializeFMPService = (apiKey: string): FMPEnhancedService => {
  fmpService = new FMPEnhancedService({ apiKey });
  return fmpService;
};

export const getFMPService = (): FMPEnhancedService => {
  if (!fmpService) {
    throw new Error('FMP Service not initialized. Call initializeFMPService() first.');
  }
  return fmpService;
};

export { fmpService };