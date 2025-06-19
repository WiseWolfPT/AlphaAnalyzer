// Comprehensive TypeScript Type Definitions for Finnhub API
// For use in the Alfalyzer project

export namespace FinnhubAPI {
  // ========================================
  // BASIC DATA TYPES
  // ========================================

  export interface CompanyProfile {
    country: string;
    currency: string;
    exchange: string;
    finnhubIndustry: string;
    ipo: string;
    logo: string;
    marketCapitalization: number;
    name: string;
    phone: string;
    shareOutstanding: number;
    ticker: string;
    weburl: string;
  }

  export interface Quote {
    c: number;  // Current price
    d: number;  // Change
    dp: number; // Percent change
    h: number;  // High price of the day
    l: number;  // Low price of the day
    o: number;  // Open price of the day
    pc: number; // Previous close price
    t: number;  // Timestamp
  }

  export interface Candle {
    c: number[];  // Close prices
    h: number[];  // High prices
    l: number[];  // Low prices
    o: number[];  // Open prices
    s: string;    // Status
    t: number[];  // Timestamps
    v: number[];  // Volumes
  }

  // ========================================
  // NEWS AND SENTIMENT
  // ========================================

  export interface NewsArticle {
    category: string;
    datetime: number;
    headline: string;
    id: number;
    image: string;
    related: string;
    source: string;
    summary: string;
    url: string;
  }

  export interface NewsSentiment {
    buzz: {
      articlesInLastWeek: number;
      buzz: number;
      weeklyAverage: number;
    };
    companyNewsStatistics: {
      articlesInLastWeek: number;
      buzz: number;
      weeklyAverage: number;
    };
    sectorAverageBullishPercent: number;
    sectorAverageNewsScore: number;
    sentiment: {
      bearishPercent: number;
      bullishPercent: number;
    };
    symbol: string;
  }

  // ========================================
  // FINANCIALS
  // ========================================

  export interface FinancialStatement {
    accessNumber: string;
    symbol: string;
    cik: string;
    year: number;
    quarter: number;
    form: string;
    startDate: string;
    endDate: string;
    filedDate: string;
    acceptedDate: string;
    data: FinancialData[];
  }

  export interface FinancialData {
    concept: string;
    label: string;
    unit: string;
    value: number;
  }

  export interface BasicFinancials {
    symbol: string;
    metricType: string;
    metric: {
      '10DayAverageTradingVolume': number;
      '13WeekPriceReturnDaily': number;
      '26WeekPriceReturnDaily': number;
      '3MonthAverageTradingVolume': number;
      '52WeekHigh': number;
      '52WeekHighDate': string;
      '52WeekLow': number;
      '52WeekLowDate': string;
      '52WeekPriceReturnDaily': number;
      '5DayPriceReturnDaily': number;
      beta: number;
      marketCapitalization: number;
      peBasicExclExtraTTM: number;
      peCashFlowTTM: number;
      peNormalizedAnnual: number;
      psTTM: number;
      ptbv: number;
      quickRatio: number;
      roaRfy: number;
      roeTTM: number;
      salesPerShare: number;
      tangibleBookValuePerShare: number;
      totalDebtToEquity: number;
      totalDebtToTotalAsset: number;
      totalDebtToTotalCapital: number;
      totalRatio: number;
    };
    series: {
      annual: FinancialMetric[];
      quarterly: FinancialMetric[];
    };
  }

  export interface FinancialMetric {
    period: string;
    v: number;
  }

  // ========================================
  // EARNINGS AND ESTIMATES
  // ========================================

  export interface EarningsCalendarEvent {
    date: string;
    epsActual: number | null;
    epsEstimate: number | null;
    hour: string;
    quarter: number;
    revenueActual: number | null;
    revenueEstimate: number | null;
    symbol: string;
    year: number;
  }

  export interface EarningsEstimate {
    earningsAvg: number;
    earningsHigh: number;
    earningsLow: number;
    numberAnalysts: number;
    period: string;
    revenueAvg: number;
    revenueHigh: number;
    revenueLow: number;
  }

  export interface EarningsSurprise {
    actual: number;
    estimate: number;
    period: string;
    quarter: number;
    surprise: number;
    surprisePercent: number;
    symbol: string;
    year: number;
  }

  // ========================================
  // TECHNICAL ANALYSIS
  // ========================================

  export interface TechnicalIndicator {
    [indicatorName: string]: number[];
  }

  export interface SupportResistance {
    levels: number[];
  }

  export interface PatternRecognition {
    points: PatternPoint[];
  }

  export interface PatternPoint {
    aprice: number;
    atime: number;
    bprice: number;
    btime: number;
    cprice: number;
    ctime: number;
    dprice: number;
    dtime: number;
    mature: boolean;
    patternname: string;
    patterntype: string;
    sortTime: number;
    symbol: string;
  }

  // ========================================
  // WEBSOCKET DATA TYPES
  // ========================================

  export interface WebSocketTrade {
    s: string;  // Symbol
    p: number;  // Price
    t: number;  // Timestamp
    v: number;  // Volume
    c?: string[]; // Conditions
  }

  export interface WebSocketNews {
    category: string;
    datetime: number;
    headline: string;
    id: number;
    image: string;
    related: string;
    source: string;
    summary: string;
    url: string;
  }

  export interface WebSocketMessage {
    type: 'trade' | 'news' | 'ping';
    data?: WebSocketTrade[] | WebSocketNews[];
  }

  // ========================================
  // OWNERSHIP AND INSTITUTIONAL DATA
  // ========================================

  export interface Ownership {
    symbol: string;
    cusip: string;
    reportDate: string;
    ownership: OwnershipData[];
  }

  export interface OwnershipData {
    name: string;
    share: number;
    change: number;
    filingDate: string;
  }

  export interface InsiderTransaction {
    symbol: string;
    personName: string;
    share: number;
    change: number;
    filingDate: string;
    transactionDate: string;
    transactionCode: string;
    transactionPrice: number;
  }

  export interface InsiderSentiment {
    data: InsiderSentimentData[];
    symbol: string;
  }

  export interface InsiderSentimentData {
    symbol: string;
    year: number;
    month: number;
    change: number;
    mspr: number; // Monthly share purchase ratio
  }

  // ========================================
  // RECOMMENDATIONS AND TARGETS
  // ========================================

  export interface Recommendation {
    buy: number;
    hold: number;
    period: string;
    sell: number;
    strongBuy: number;
    strongSell: number;
    symbol: string;
  }

  export interface PriceTarget {
    lastUpdated: string;
    symbol: string;
    targetHigh: number;
    targetLow: number;
    targetMean: number;
    targetMedian: number;
  }

  export interface UpgradeDowngrade {
    symbol: string;
    gradeTime: number;
    company: string;
    fromGrade: string;
    toGrade: string;
    action: string;
  }

  // ========================================
  // MARKET DATA
  // ========================================

  export interface MarketNews {
    category: string;
    datetime: number;
    headline: string;
    id: number;
    image: string;
    related: string;
    source: string;
    summary: string;
    url: string;
  }

  export interface EconomicData {
    code: string;
    value: number[];
    timestamp: number[];
  }

  export interface StockSplit {
    symbol: string;
    date: string;
    fromFactor: number;
    toFactor: number;
  }

  export interface Dividend {
    symbol: string;
    date: string;
    amount: number;
    adjustedAmount: number;
    payDate: string;
    recordDate: string;
    declarationDate: string;
    currency: string;
    frequency: number;
  }

  // ========================================
  // CRYPTO DATA TYPES
  // ========================================

  export interface CryptoSymbol {
    description: string;
    displaySymbol: string;
    symbol: string;
  }

  export interface CryptoProfile {
    name: string;
    description: string;
    website: string;
    logo: string;
  }

  export interface CryptoCandle {
    c: number[];  // Close prices
    h: number[];  // High prices
    l: number[];  // Low prices
    o: number[];  // Open prices
    s: string;    // Status
    t: number[];  // Timestamps
    v: number[];  // Volumes
  }

  // ========================================
  // FOREX DATA TYPES
  // ========================================

  export interface ForexSymbol {
    description: string;
    displaySymbol: string;
    symbol: string;
  }

  export interface ForexCandle {
    c: number[];  // Close prices
    h: number[];  // High prices
    l: number[];  // Low prices
    o: number[];  // Open prices
    s: string;    // Status
    t: number[];  // Timestamps
  }

  export interface ForexRate {
    [currency: string]: number;
  }

  // ========================================
  // ETF DATA TYPES
  // ========================================

  export interface ETFProfile {
    symbol: string;
    name: string;
    description: string;
    totalAssets: number;
    nav: number;
    navCurrency: string;
    expenseRatio: number;
    trackingIndex: string;
    inceptionDate: string;
    launchDate: string;
    website: string;
  }

  export interface ETFHolding {
    symbol: string;
    name: string;
    isin: string;
    share: number;
    value: number;
  }

  export interface ETFSectorExposure {
    sector: string;
    exposure: number;
  }

  // ========================================
  // API RESPONSE WRAPPERS
  // ========================================

  export interface APIResponse<T> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
  }

  export interface APIError {
    error: string;
    message: string;
    statusCode: number;
  }

  // ========================================
  // CLIENT CONFIGURATION
  // ========================================

  export interface ClientConfig {
    apiKey: string;
    apiKeyPrefix?: string;
    timeout?: number;
    retries?: number;
    cacheEnabled?: boolean;
    cacheTTL?: number;
  }

  export interface RateLimitConfig {
    tokensPerInterval: number;
    interval: 'second' | 'minute' | 'hour';
  }

  export interface WebSocketConfig {
    apiKey: string;
    autoReconnect?: boolean;
    maxReconnectAttempts?: number;
    reconnectDelay?: number;
    pingInterval?: number;
  }

  // ========================================
  // UTILITY TYPES
  // ========================================

  export type Resolution = '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M';
  export type Exchange = 'US' | 'TO' | 'V' | 'L' | 'HK' | 'SS' | 'SZ' | 'T';
  export type SecurityType = 'CS' | 'ET' | 'CE' | 'RT' | 'UNIT' | 'WARRANT';
  export type StatementType = 'bs' | 'ic' | 'cf'; // Balance Sheet, Income Statement, Cash Flow
  export type Frequency = 'annual' | 'quarterly' | 'ttm' | 'ytd';
  
  export type TechnicalIndicatorType = 
    | 'sma' | 'ema' | 'rsi' | 'macd' | 'bb' | 'stoch' | 'adx' 
    | 'cci' | 'williams_r' | 'mfi' | 'roc' | 'trix' | 'dx' 
    | 'minus_di' | 'plus_di' | 'obv' | 'ad' | 'atr';

  // ========================================
  // SEARCH AND FILTERING
  // ========================================

  export interface SymbolSearch {
    count: number;
    result: SymbolSearchResult[];
  }

  export interface SymbolSearchResult {
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }

  export interface SymbolFilter {
    exchange?: string;
    mic?: string;
    securityType?: SecurityType;
    currency?: string;
  }

  // ========================================
  // AGGREGATED DATA TYPES
  // ========================================

  export interface StockAnalysis {
    profile: CompanyProfile;
    quote: Quote;
    financials: BasicFinancials;
    recommendations: Recommendation[];
    priceTarget: PriceTarget;
    newsSentiment: NewsSentiment;
    earnings: EarningsEstimate[];
    ownership: Ownership;
    technicals: {
      supportResistance: SupportResistance;
      indicators: Map<string, TechnicalIndicator>;
    };
  }

  export interface MarketOverview {
    indices: Map<string, Quote>;
    topGainers: Quote[];
    topLosers: Quote[];
    mostActive: Quote[];
    economicEvents: EconomicData[];
    marketNews: MarketNews[];
  }
}

// ========================================
// TYPE GUARDS AND VALIDATION
// ========================================

export namespace FinnhubTypeGuards {
  export function isCompanyProfile(obj: any): obj is FinnhubAPI.CompanyProfile {
    return obj &&
      typeof obj.ticker === 'string' &&
      typeof obj.name === 'string' &&
      typeof obj.marketCapitalization === 'number';
  }

  export function isQuote(obj: any): obj is FinnhubAPI.Quote {
    return obj &&
      typeof obj.c === 'number' &&
      typeof obj.pc === 'number' &&
      typeof obj.t === 'number';
  }

  export function isCandle(obj: any): obj is FinnhubAPI.Candle {
    return obj &&
      Array.isArray(obj.c) &&
      Array.isArray(obj.h) &&
      Array.isArray(obj.l) &&
      Array.isArray(obj.o) &&
      Array.isArray(obj.t) &&
      typeof obj.s === 'string';
  }

  export function isWebSocketTrade(obj: any): obj is FinnhubAPI.WebSocketTrade {
    return obj &&
      typeof obj.s === 'string' &&
      typeof obj.p === 'number' &&
      typeof obj.t === 'number' &&
      typeof obj.v === 'number';
  }

  export function isAPIError(obj: any): obj is FinnhubAPI.APIError {
    return obj &&
      typeof obj.error === 'string' &&
      typeof obj.statusCode === 'number';
  }
}

// ========================================
// CONSTANTS
// ========================================

export const FINNHUB_CONSTANTS = {
  BASE_URL: 'https://finnhub.io/api/v1',
  WEBSOCKET_URL: 'wss://ws.finnhub.io',
  
  RESOLUTIONS: ['1', '5', '15', '30', '60', 'D', 'W', 'M'] as const,
  
  EXCHANGES: {
    US: 'US',
    TORONTO: 'TO',
    VANCOUVER: 'V',
    LONDON: 'L',
    HONG_KONG: 'HK',
    SHANGHAI: 'SS',
    SHENZHEN: 'SZ',
    TOKYO: 'T'
  },
  
  TECHNICAL_INDICATORS: {
    SMA: 'sma',
    EMA: 'ema',
    RSI: 'rsi',
    MACD: 'macd',
    BOLLINGER_BANDS: 'bb',
    STOCHASTIC: 'stoch',
    ADX: 'adx',
    CCI: 'cci',
    WILLIAMS_R: 'williams_r',
    MFI: 'mfi',
    ROC: 'roc',
    TRIX: 'trix',
    OBV: 'obv',
    ATR: 'atr'
  },
  
  RATE_LIMITS: {
    FREE: {
      CALLS_PER_MINUTE: 60,
      CALLS_PER_MONTH: 50000
    },
    STARTER: {
      CALLS_PER_MINUTE: 300,
      CALLS_PER_MONTH: 1000000
    }
  }
} as const;