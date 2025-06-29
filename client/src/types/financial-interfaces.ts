// Standardized TypeScript interfaces for financial data and components
// Based on successful patterns from admin-dashboard.tsx and other working components

// ============================================================================
// CORE FINANCIAL DATA INTERFACES
// ============================================================================

export interface StockData {
  symbol: string;
  name: string;
  price: string;
  change: string;
  changePercent: string;
  marketCap: string;
  volume?: string;
  sector?: string;
  industry?: string;
  eps?: string;
  peRatio?: string;
  logo?: string;
  intrinsicValue?: string;
  lastUpdated: Date;
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
}

export interface StockProfile {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  marketCap: number;
  employees?: number;
  description?: string;
  website?: string;
  logo?: string;
  ceo?: string;
  headquarters?: string;
  founded?: number;
}

export interface StockNews {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: Date;
  sentiment?: 'positive' | 'negative' | 'neutral';
  relevanceScore?: number;
  symbols?: string[];
}

export interface IntrinsicValue {
  symbol: string;
  intrinsicValue: number;
  currentPrice: number;
  valuation: 'undervalued' | 'neutral' | 'overvalued';
  deltaPercent: number;
  eps: number;
  growthRate: number;
  peMultiple: number;
  requiredReturn: number;
  marginOfSafety: number;
  calculatedAt: Date;
  methodology: string;
}

// ============================================================================
// API RESPONSE INTERFACES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: number;
  cached?: boolean;
  source?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    category?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  };
  timestamp: number;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// ============================================================================
// PORTFOLIO INTERFACES
// ============================================================================

export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  totalValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  dayChange: number;
  dayChangePercent: number;
  holdings: PortfolioHolding[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioHolding {
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  totalValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  dayChange: number;
  dayChangePercent: number;
  weight: number; // Percentage of portfolio
}

export interface Transaction {
  id: string;
  symbol: string;
  type: 'buy' | 'sell' | 'dividend';
  quantity: number;
  price: number;
  fees: number;
  total: number;
  executedAt: Date;
  notes?: string;
}

// ============================================================================
// WATCHLIST INTERFACES
// ============================================================================

export interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: string;
  addedAt: Date;
  alerts?: PriceAlert[];
}

export interface PriceAlert {
  id: string;
  symbol: string;
  type: 'price_above' | 'price_below' | 'percent_change';
  threshold: number;
  isActive: boolean;
  createdAt: Date;
  triggeredAt?: Date;
}

// ============================================================================
// CHART INTERFACES
// ============================================================================

export interface ChartData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartConfig {
  symbol: string;
  timeframe: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y';
  chartType: 'line' | 'candlestick' | 'bar' | 'area';
  indicators?: TechnicalIndicator[];
  showVolume?: boolean;
  showGrid?: boolean;
  theme?: 'light' | 'dark';
}

export interface TechnicalIndicator {
  type: 'SMA' | 'EMA' | 'RSI' | 'MACD' | 'BB' | 'VWAP';
  period?: number;
  color?: string;
  visible?: boolean;
  parameters?: Record<string, any>;
}

// ============================================================================
// COMPONENT PROP INTERFACES
// ============================================================================

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface StockComponentProps extends BaseComponentProps {
  symbol: string;
  onError?: (error: FinancialError) => void;
  onLoading?: (loading: boolean) => void;
}

export interface ChartComponentProps extends StockComponentProps {
  height?: number;
  timeframe?: ChartConfig['timeframe'];
  chartType?: ChartConfig['chartType'];
  showControls?: boolean;
  showVolume?: boolean;
  indicators?: TechnicalIndicator[];
}

export interface CardComponentProps extends BaseComponentProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  error?: FinancialError | null;
  onClick?: () => void;
}

// ============================================================================
// ERROR HANDLING INTERFACES
// ============================================================================

export interface FinancialError {
  id: string;
  category: 'API_ERROR' | 'CALCULATION_ERROR' | 'DATA_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  userMessage: string;
  originalError?: Error;
  timestamp: Date;
  context?: Record<string, any>;
  retryable: boolean;
  retryCount?: number;
  maxRetries?: number;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: FinancialError | null;
  errorInfo?: React.ErrorInfo | null;
  retryCount: number;
}

// ============================================================================
// LOADING STATE INTERFACES
// ============================================================================

export interface LoadingState {
  loading: boolean;
  error: FinancialError | null;
  data: any;
  lastUpdated?: Date;
}

export interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'skeleton' | 'pulse';
  className?: string;
}

// ============================================================================
// METRICS & ANALYTICS INTERFACES
// ============================================================================

export interface SystemMetrics {
  apiMetrics: APIMetricsSnapshot;
  quotaStatus: ProviderQuota[];
  cacheMetrics: CacheMetrics;
  errorAnalysis: ErrorAnalysis;
  systemHealth: SystemHealth;
}

export interface APIMetricsSnapshot {
  totalCalls: number;
  successfulCalls: number;
  errorCalls: number;
  rateLimitedCalls: number;
  timeoutCalls: number;
  avgResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  cacheHitRate: number;
  topErrors: Array<{ error: string; count: number }>;
  topSlowEndpoints: Array<{ endpoint: string; avgTime: number }>;
  providerStats: Record<string, ProviderStats>;
  endpointStats: Record<string, EndpointStats>;
}

export interface ProviderQuota {
  provider: string;
  dailyLimit: number;
  minuteLimit?: number;
  currentDailyUsage: number;
  currentMinuteUsage: number;
  lastDailyReset: number;
  lastMinuteReset: number;
  quotaResetTime?: number;
  remainingQuota?: number;
  apiKeyId?: string;
}

export interface ProviderStats {
  calls: number;
  errors: number;
  avgResponseTime: number;
  quotaUsage: number;
  quotaRemaining: number;
}

export interface EndpointStats {
  calls: number;
  errors: number;
  avgResponseTime: number;
  cacheHitRate: number;
}

export interface CacheMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  avgResponseTimeWithCache: number;
  avgResponseTimeWithoutCache: number;
}

export interface ErrorAnalysis {
  errorsByType: Record<string, number>;
  errorsByProvider: Record<string, number>;
  errorsByEndpoint: Record<string, number>;
  errorTrends: Array<{ timestamp: number; errorCount: number }>;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  issues: string[];
  metrics: {
    totalMetrics: number;
    oldestMetric: number;
    newestMetric: number;
    storageUsed: number;
  };
}

// ============================================================================
// SEARCH & FILTER INTERFACES
// ============================================================================

export interface SearchResult {
  symbol: string;
  name: string;
  type: 'stock' | 'etf' | 'mutual_fund' | 'crypto';
  exchange: string;
  currency: string;
  relevanceScore?: number;
}

export interface SearchFilters {
  query: string;
  type?: 'stock' | 'etf' | 'mutual_fund' | 'crypto';
  exchange?: string;
  sector?: string;
  marketCap?: 'small' | 'mid' | 'large';
  sortBy?: 'relevance' | 'alphabetical' | 'market_cap';
  limit?: number;
}

// ============================================================================
// SUBSCRIPTION & BILLING INTERFACES
// ============================================================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
  limits: {
    apiCalls: number;
    watchlists: number;
    portfolios: number;
    alerts: number;
  };
  isPopular?: boolean;
}

export interface UserSubscription {
  id: string;
  planId: string;
  status: 'active' | 'cancelled' | 'past_due' | 'unpaid';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  usage: {
    apiCalls: number;
    watchlists: number;
    portfolios: number;
    alerts: number;
  };
}

// ============================================================================
// USER PREFERENCES INTERFACES
// ============================================================================

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  currency: string;
  timezone: string;
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    priceAlerts: boolean;
    newsAlerts: boolean;
    portfolioUpdates: boolean;
  };
  dashboard: {
    defaultView: 'overview' | 'watchlist' | 'portfolio';
    refreshInterval: number;
    showPremarket: boolean;
    showAfterHours: boolean;
  };
  charts: {
    defaultTimeframe: ChartConfig['timeframe'];
    defaultChartType: ChartConfig['chartType'];
    showVolume: boolean;
    showGrid: boolean;
    defaultIndicators: string[];
  };
}

// ============================================================================
// UTILITY TYPE HELPERS
// ============================================================================

// Type guards for API responses
export function isApiError<T>(response: ApiResult<T>): response is ApiError {
  return !response.success && 'error' in response;
}

export function isApiSuccess<T>(response: ApiResult<T>): response is ApiResponse<T> {
  return response.success && 'data' in response;
}

// Utility types for component state
export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: FinancialError | null;
};

export type FormState<T> = {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
};

// Event handler types
export type StockEventHandler = (symbol: string) => void;
export type ErrorEventHandler = (error: FinancialError) => void;
export type LoadingEventHandler = (loading: boolean) => void;

// ============================================================================
// CONSTANTS & ENUMS
// ============================================================================

export const TIMEFRAMES = ['1D', '1W', '1M', '3M', '6M', '1Y', '2Y', '5Y'] as const;
export const CHART_TYPES = ['line', 'candlestick', 'bar', 'area'] as const;
export const VALUATION_TYPES = ['undervalued', 'neutral', 'overvalued'] as const;
export const ALERT_TYPES = ['price_above', 'price_below', 'percent_change'] as const;

export type Timeframe = typeof TIMEFRAMES[number];
export type ChartType = typeof CHART_TYPES[number];
export type ValuationType = typeof VALUATION_TYPES[number];
export type AlertType = typeof ALERT_TYPES[number];

// Default values for common interfaces
export const DEFAULT_CHART_CONFIG: ChartConfig = {
  symbol: '',
  timeframe: '1M',
  chartType: 'line',
  showVolume: true,
  showGrid: true,
  theme: 'light'
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'system',
  currency: 'USD',
  timezone: 'America/New_York',
  language: 'en',
  notifications: {
    email: true,
    push: false,
    priceAlerts: true,
    newsAlerts: false,
    portfolioUpdates: true
  },
  dashboard: {
    defaultView: 'overview',
    refreshInterval: 30000,
    showPremarket: false,
    showAfterHours: false
  },
  charts: {
    defaultTimeframe: '1M',
    defaultChartType: 'line',
    showVolume: true,
    showGrid: true,
    defaultIndicators: ['SMA']
  }
};