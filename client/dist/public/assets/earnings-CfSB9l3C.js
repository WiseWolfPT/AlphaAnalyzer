import { V as prefetchConfigs, W as queryKeys, Y as handleError, r as reactExports, j as jsxRuntimeExports, B as Button, n as TrendingUp, C as Card, a as CardHeader, c as CardContent, b as CardTitle, u as useLocation } from "./index-DF734YkB.js";
import { d as useQuery } from "./useQuery-C9HFImIm.js";
import { M as MainLayout, e as ChevronLeft, C as ChevronRight } from "./main-layout-iPfLAwEH.js";
import { B as Badge } from "./badge-Bax4ZZX3.js";
import { I as Input } from "./input-vX2xFcRS.js";
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from "./select-Bm8Ccf9j.js";
import { marketApi, recentSearchesApi, earningsApi, intrinsicValueApi, watchlistsApi, stocksApi } from "./api-BKV66h_w.js";
import { s as startOfWeek, f as format } from "./format-KW2jPi8X.js";
import { t as toDate, c as constructFrom } from "./en-US-CFe7Dxf-.js";
import { W as WifiOff } from "./wifi-off-BwUXtVIE.js";
import { W as Wifi } from "./wifi-Cr-Lls-T.js";
import { C as Calendar } from "./tabs-CPUG2mtF.js";
import { E as ExternalLink } from "./external-link-BNxepo82.js";
import "./dialog-B0u0SV5P.js";
import "./index-DXvlFXpR.js";
import "./use-auth-monitoring-Ca9Wv08z.js";
import "./mail-D5HopcQP.js";
import "./lock-C5qTkNPd.js";
import "./eye-DQw-lb5A.js";
import "./user-C46AQImy.js";
import "./menu-CG6pfADK.js";
import "./chart-column-DNzw3S_G.js";
import "./search-CySG90ju.js";
import "./file-text-BCjG82i7.js";
import "./log-in-CA1V17qY.js";
import "./index-Dx7UitrF.js";
import "./scroll-area-BRs9U-pP.js";
import "./index-IXOTxK3N.js";
import "./chevron-down-BYhiF8im.js";
import "./queryClient-CXMFu_RS.js";
import "./api-config-Zh6ttKls.js";
function addDays(date, amount, options) {
  const _date = toDate(date, options?.in);
  if (isNaN(amount)) return constructFrom(date, NaN);
  if (!amount) return _date;
  _date.setDate(_date.getDate() + amount);
  return _date;
}
function addWeeks(date, amount, options) {
  return addDays(date, amount * 7, options);
}
function endOfWeek(date, options) {
  const weekStartsOn = options?.weekStartsOn;
  const _date = toDate(date, options?.in);
  const day = _date.getDay();
  const diff = (day < weekStartsOn ? -7 : 0) + 6 - (day - weekStartsOn);
  _date.setDate(_date.getDate() + diff);
  _date.setHours(23, 59, 59, 999);
  return _date;
}
function subWeeks(date, amount, options) {
  return addWeeks(date, -1, options);
}
const API_CONFIG = {
  // Financial Modeling Prep
  FMP: {
    proxyUrl: "/api/market-data/fmp"
    // API key is handled securely by backend
  },
  // Twelve Data
  TWELVE_DATA: {
    proxyUrl: "/api/market-data/twelve-data"
    // API key is handled securely by backend
  }
};
class CacheManager {
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
    this.configs = {
      // Stock quotes - cache for 1 minute (real-time feel)
      "stock-quote": {
        ttl: 60 * 1e3,
        maxSize: 100
      },
      // Financial data - cache for 1 hour (changes less frequently)
      "financials": {
        ttl: 60 * 60 * 1e3,
        maxSize: 50
      },
      // Company profile - cache for 1 day (rarely changes)
      "profile": {
        ttl: 24 * 60 * 60 * 1e3,
        maxSize: 100
      },
      // Historical data - cache for 30 minutes
      "historical": {
        ttl: 30 * 60 * 1e3,
        maxSize: 30
      },
      // Earnings data - cache for 6 hours
      "earnings": {
        ttl: 6 * 60 * 60 * 1e3,
        maxSize: 50
      },
      // News - cache for 15 minutes
      "news": {
        ttl: 15 * 60 * 1e3,
        maxSize: 200
      }
    };
  }
  get(key, category = "stock-quote") {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    entry.timestamp = Date.now();
    return entry.data;
  }
  set(key, data, categoryOrTtl = "stock-quote") {
    let expiry;
    if (typeof categoryOrTtl === "number") {
      expiry = Date.now() + categoryOrTtl;
    } else {
      const config = this.configs[categoryOrTtl];
      expiry = Date.now() + config.ttl;
      if (this.cache.size >= config.maxSize) {
        this.evictOldest(categoryOrTtl);
      }
    }
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry
    });
  }
  // Async versions for service layer compatibility
  async setAsync(key, data, ttl) {
    this.set(key, data, ttl);
  }
  async getAsync(key) {
    return this.get(key);
  }
  async deleteAsync(key) {
    this.cache.delete(key);
  }
  evictOldest(category) {
    let oldestKey = "";
    let oldestTime = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(category) && entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
  clear(category) {
    if (category) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(category)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
  // Get cache statistics
  getStats() {
    const stats = {
      totalEntries: this.cache.size,
      categories: {}
    };
    for (const key of this.cache.keys()) {
      const category = key.split("-")[0];
      stats.categories[category] = (stats.categories[category] || 0) + 1;
    }
    return stats;
  }
}
const cacheManager = new CacheManager();
class FMPService {
  constructor(cache) {
    this.cache = cache || new CacheManager();
    this.proxyUrl = API_CONFIG.FMP.proxyUrl;
  }
  async getKeyMetrics(symbol) {
    const cacheKey = `fmp:key-metrics:${symbol}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;
    try {
      const response = await fetch(`${this.proxyUrl}/key-metrics/${symbol}`);
      if (!response.ok) {
        throw new Error(`FMP API error: ${response.statusText}`);
      }
      const data = await response.json();
      if (!data || data.length === 0) return null;
      const fundamentals = data[0];
      await this.cache.set(cacheKey, fundamentals, 24 * 60 * 60 * 1e3);
      return fundamentals;
    } catch (error) {
      console.error("FMP getKeyMetrics error:", error);
      return null;
    }
  }
  async getIncomeStatement(symbol, period = "annual") {
    const cacheKey = `fmp:income-statement:${symbol}:${period}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;
    try {
      const response = await fetch(`${this.proxyUrl}/income-statement/${symbol}?period=${period}`);
      if (!response.ok) {
        throw new Error(`FMP API error: ${response.statusText}`);
      }
      const data = await response.json();
      if (!data || data.length === 0) return [];
      await this.cache.set(cacheKey, data, 24 * 60 * 60 * 1e3);
      return data;
    } catch (error) {
      console.error("FMP getIncomeStatement error:", error);
      return [];
    }
  }
  async getBalanceSheet(symbol, period = "annual") {
    const cacheKey = `fmp:balance-sheet:${symbol}:${period}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;
    try {
      const response = await fetch(`${this.proxyUrl}/balance-sheet-statement/${symbol}?period=${period}`);
      if (!response.ok) {
        throw new Error(`FMP API error: ${response.statusText}`);
      }
      const data = await response.json();
      if (!data || data.length === 0) return [];
      await this.cache.set(cacheKey, data, 24 * 60 * 60 * 1e3);
      return data;
    } catch (error) {
      console.error("FMP getBalanceSheet error:", error);
      return [];
    }
  }
  async getCashFlow(symbol, period = "annual") {
    const cacheKey = `fmp:cash-flow:${symbol}:${period}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;
    try {
      const response = await fetch(`${this.proxyUrl}/cash-flow-statement/${symbol}?period=${period}`);
      if (!response.ok) {
        throw new Error(`FMP API error: ${response.statusText}`);
      }
      const data = await response.json();
      if (!data || data.length === 0) return [];
      await this.cache.set(cacheKey, data, 24 * 60 * 60 * 1e3);
      return data;
    } catch (error) {
      console.error("FMP getCashFlow error:", error);
      return [];
    }
  }
  async getCompanyProfile(symbol) {
    const cacheKey = `fmp:profile:${symbol}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;
    try {
      const response = await fetch(`${this.proxyUrl}/profile/${symbol}`);
      if (!response.ok) {
        throw new Error(`FMP API error: ${response.statusText}`);
      }
      const data = await response.json();
      if (!data || data.length === 0) return null;
      const profile = data[0];
      await this.cache.set(cacheKey, profile, 24 * 60 * 60 * 1e3);
      return profile;
    } catch (error) {
      console.error("FMP getCompanyProfile error:", error);
      return null;
    }
  }
  async getRealTimePrice(symbol) {
    const cacheKey = `fmp:price:${symbol}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;
    try {
      const response = await fetch(`${this.proxyUrl}/quote-short/${symbol}`);
      if (!response.ok) {
        throw new Error(`FMP API error: ${response.statusText}`);
      }
      const data = await response.json();
      if (!data || data.length === 0) return null;
      const price = data[0].price;
      await this.cache.set(cacheKey, price, 60 * 1e3);
      return price;
    } catch (error) {
      console.error("FMP getRealTimePrice error:", error);
      return null;
    }
  }
  async getIntrinsicValueData(symbol) {
    try {
      const [keyMetrics, incomeStatements, balanceSheets, cashFlows, profile] = await Promise.all([this.getKeyMetrics(symbol), this.getIncomeStatement(symbol, "annual"), this.getBalanceSheet(symbol, "annual"), this.getCashFlow(symbol, "annual"), this.getCompanyProfile(symbol)]);
      if (!keyMetrics || incomeStatements.length === 0) return null;
      const latestIncome = incomeStatements[0];
      const latestBalance = balanceSheets[0];
      const latestCashFlow = cashFlows[0];
      const revenueGrowth = incomeStatements.length > 1 ? (latestIncome.revenue - incomeStatements[1].revenue) / incomeStatements[1].revenue * 100 : 0;
      const epsGrowth = incomeStatements.length > 1 && incomeStatements[1].eps !== 0 ? (latestIncome.eps - incomeStatements[1].eps) / Math.abs(incomeStatements[1].eps) * 100 : 0;
      const intrinsicData = {
        stockSymbol: symbol,
        currentPrice: profile?.price || 0,
        eps: latestIncome.eps,
        growthRate: epsGrowth,
        peMultiple: keyMetrics.peRatio,
        bookValue: keyMetrics.bookValuePerShare,
        roe: keyMetrics.returnOnEquity * 100,
        // Convert to percentage
        payoutRatio: keyMetrics.dividendPayoutRatio || 0,
        requiredReturn: 10,
        // Default required return
        marginOfSafety: 25,
        // Default margin of safety
        debtToEquity: keyMetrics.debtToEquity,
        freeCashFlow: latestCashFlow?.freeCashFlow || 0,
        revenue: latestIncome.revenue,
        netIncome: latestIncome.netIncome,
        totalDebt: latestBalance?.totalDebt || 0,
        cash: latestBalance?.cashAndCashEquivalents || 0,
        sharesOutstanding: latestIncome.weightedAverageShsOut
      };
      return intrinsicData;
    } catch (error) {
      console.error("FMP getIntrinsicValueData error:", error);
      return null;
    }
  }
}
class TwelveDataService {
  constructor(cache) {
    this.ws = null;
    this.subscriptions = /* @__PURE__ */ new Set();
    this.reconnectTimeout = null;
    this.heartbeatInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.baseReconnectDelay = 1e3;
    this.isConnecting = false;
    this.cache = cache || new CacheManager();
    this.apiKey = "";
    this.baseUrl = API_CONFIG.TWELVE_DATA.proxyUrl;
    this.wsUrl = "";
  }
  async getQuote(symbol) {
    const cacheKey = `twelve:quote:${symbol}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;
    try {
      const response = await fetch(`${this.baseUrl}/quote?symbol=${symbol}`);
      if (!response.ok) {
        throw new Error(`Twelve Data API error: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.code === 400 || !data.symbol) return null;
      await this.cache.set(cacheKey, data, 60 * 1e3);
      return data;
    } catch (error) {
      console.error("Twelve Data getQuote error:", error);
      return null;
    }
  }
  async getTimeSeries(symbol, interval = "1day", outputsize = 30) {
    const cacheKey = `twelve:timeseries:${symbol}:${interval}:${outputsize}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;
    try {
      const response = await fetch(`${this.baseUrl}/time_series?symbol=${symbol}&interval=${interval}&outputsize=${outputsize}`);
      if (!response.ok) {
        throw new Error(`Twelve Data API error: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.code === 400 || data.status === "error") return null;
      const cacheTime = interval === "1min" ? 60 * 1e3 : (
        // 1 minute
        interval === "5min" ? 5 * 60 * 1e3 : (
          // 5 minutes
          interval === "15min" ? 15 * 60 * 1e3 : (
            // 15 minutes
            interval === "30min" ? 30 * 60 * 1e3 : (
              // 30 minutes
              interval === "1h" ? 60 * 60 * 1e3 : (
                // 1 hour
                24 * 60 * 60 * 1e3
              )
            )
          )
        )
      );
      await this.cache.set(cacheKey, data, cacheTime);
      return data;
    } catch (error) {
      console.error("Twelve Data getTimeSeries error:", error);
      return null;
    }
  }
  async getBatchQuotes(symbols) {
    const symbolsStr = symbols.join(",");
    const cacheKey = `twelve:batch:${symbolsStr}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;
    try {
      const response = await fetch(`${this.baseUrl}/quote?symbol=${symbolsStr}`);
      if (!response.ok) {
        throw new Error(`Twelve Data API error: ${response.statusText}`);
      }
      const data = await response.json();
      const result = {};
      if (data.symbol) {
        result[data.symbol] = data;
      } else {
        Object.entries(data).forEach(([symbol, quote]) => {
          if (typeof quote === "object" && quote !== null && "symbol" in quote) {
            result[symbol] = quote;
          }
        });
      }
      await this.cache.set(cacheKey, result, 60 * 1e3);
      return result;
    } catch (error) {
      console.error("Twelve Data getBatchQuotes error:", error);
      return {};
    }
  }
  // Enhanced WebSocket methods with exponential backoff reconnection
  connectWebSocket(onMessage) {
    console.log("⚠️ WebSocket connections are disabled. Real-time updates need backend implementation.");
    return;
  }
  setupHeartbeat() {
    return;
  }
  scheduleReconnectWithBackoff(onMessage) {
    return;
  }
  // Legacy method for backward compatibility
  scheduleReconnect(onMessage) {
    this.scheduleReconnectWithBackoff(onMessage);
  }
  subscribe(symbols) {
    console.log("⚠️ WebSocket subscriptions are disabled. Real-time updates need backend implementation.");
    return;
  }
  unsubscribe(symbols) {
    return;
  }
  disconnect() {
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
  // Convert Twelve Data quote to our Stock type
  async convertToStock(quote) {
    return {
      symbol: quote.symbol,
      name: quote.name,
      currentPrice: parseFloat(quote.close),
      previousClose: parseFloat(quote.previous_close),
      change: parseFloat(quote.change),
      changePercent: parseFloat(quote.percent_change),
      volume: parseInt(quote.volume),
      high: parseFloat(quote.high),
      low: parseFloat(quote.low),
      open: parseFloat(quote.open),
      marketCap: 0,
      // Not provided by Twelve Data quote
      week52High: parseFloat(quote.fifty_two_week.high),
      week52Low: parseFloat(quote.fifty_two_week.low)
    };
  }
}
const FINNHUB_PROXY_URL = "/api/proxy/finnhub";
class FinnhubService {
  constructor() {
    this.proxyURL = FINNHUB_PROXY_URL;
  }
  async makeRequest(endpoint) {
    const url = `${this.proxyURL}${endpoint}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Finnhub proxy error: ${response.status} ${response.statusText}`);
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Finnhub API request failed");
      }
      const data = result.data;
      return data;
    } catch (error) {
      console.error("Finnhub API request failed:", error);
      throw error;
    }
  }
  // Get real-time stock price
  async getStockPrice(symbol) {
    return this.makeRequest(`/quote?symbol=${symbol.toUpperCase()}`);
  }
  // Get company profile
  async getCompanyProfile(symbol) {
    return this.makeRequest(`/stock/profile2?symbol=${symbol.toUpperCase()}`);
  }
  // Get basic financials (ratios, metrics)
  async getBasicFinancials(symbol) {
    return this.makeRequest(`/stock/metric?symbol=${symbol.toUpperCase()}&metric=all`);
  }
  // Get income statements
  async getIncomeStatement(symbol, frequency = "quarterly") {
    return this.makeRequest(`/stock/financials?symbol=${symbol.toUpperCase()}&statement=income&freq=${frequency}`);
  }
  // Get balance sheet
  async getBalanceSheet(symbol, frequency = "quarterly") {
    return this.makeRequest(`/stock/financials?symbol=${symbol.toUpperCase()}&statement=balance-sheet&freq=${frequency}`);
  }
  // Get cash flow statement
  async getCashFlowStatement(symbol, frequency = "quarterly") {
    return this.makeRequest(`/stock/financials?symbol=${symbol.toUpperCase()}&statement=cash-flow&freq=${frequency}`);
  }
  // Get dividends data
  async getDividends(symbol, from, to) {
    return this.makeRequest(`/stock/dividend?symbol=${symbol.toUpperCase()}&from=${from}&to=${to}`);
  }
  // Get historical stock prices
  async getHistoricalPrices(symbol, resolution, from, to) {
    return this.makeRequest(`/stock/candle?symbol=${symbol.toUpperCase()}&resolution=${resolution}&from=${from}&to=${to}`);
  }
}
const finnhubService = new FinnhubService();
class FinnhubEnhancedService {
  // SECURITY: API key moved to server-side - use proxy endpoints instead
  constructor(apiKey = "DEPRECATED_USE_SERVER_PROXY") {
    this.apiKey = apiKey;
    this.ws = null;
    this.subscriptions = /* @__PURE__ */ new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1e3;
    this.isConnecting = false;
    this.apiCallCount = 0;
    this.apiCallWindow = 6e4;
    this.lastResetTime = Date.now();
    this.maxCallsPerMinute = 55;
    this.onTradeHandlers = [];
    this.onErrorHandlers = [];
    this.onConnectionHandlers = [];
  }
  // Rate limiting management
  checkRateLimit() {
    const now = Date.now();
    if (now - this.lastResetTime > this.apiCallWindow) {
      this.apiCallCount = 0;
      this.lastResetTime = now;
    }
    return this.apiCallCount < this.maxCallsPerMinute;
  }
  incrementApiCall() {
    this.apiCallCount++;
  }
  getRateLimitStatus() {
    const now = Date.now();
    this.apiCallWindow - (now - this.lastResetTime);
    return {
      requests: this.apiCallCount,
      resetTime: this.lastResetTime + this.apiCallWindow,
      remaining: Math.max(0, this.maxCallsPerMinute - this.apiCallCount)
    };
  }
  // Enhanced API methods with rate limiting and caching
  async getStockQuoteWithRateLimit(symbol) {
    if (!this.checkRateLimit()) {
      const status = this.getRateLimitStatus();
      const waitTime = status.resetTime - Date.now();
      console.warn(`🚫 Finnhub rate limit reached. Wait ${Math.ceil(waitTime / 1e3)}s`);
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1e3)} seconds`);
    }
    const cacheKey = `finnhub-quote-${symbol}`;
    const cached = cacheManager.get(cacheKey, "quote");
    if (cached) {
      console.log(`📦 Finnhub cache hit for ${symbol}`);
      return cached;
    }
    try {
      this.incrementApiCall();
      const data = await finnhubService.getStockPrice(symbol);
      cacheManager.set(cacheKey, data, "quote", 3e4);
      return data;
    } catch (error) {
      console.error(`❌ Finnhub API error for ${symbol}:`, error);
      throw error;
    }
  }
  async getCompanyProfileWithRateLimit(symbol) {
    if (!this.checkRateLimit()) {
      throw new Error("Rate limit exceeded");
    }
    const cacheKey = `finnhub-profile-${symbol}`;
    const cached = cacheManager.get(cacheKey, "profile");
    if (cached) return cached;
    try {
      this.incrementApiCall();
      const data = await finnhubService.getCompanyProfile(symbol);
      cacheManager.set(cacheKey, data, "profile", 36e5);
      return data;
    } catch (error) {
      console.error(`❌ Finnhub profile error for ${symbol}:`, error);
      throw error;
    }
  }
  async getBasicFinancialsWithRateLimit(symbol) {
    if (!this.checkRateLimit()) {
      throw new Error("Rate limit exceeded");
    }
    const cacheKey = `finnhub-financials-${symbol}`;
    const cached = cacheManager.get(cacheKey, "financials");
    if (cached) return cached;
    try {
      this.incrementApiCall();
      const data = await finnhubService.getBasicFinancials(symbol);
      cacheManager.set(cacheKey, data, "financials", 18e5);
      return data;
    } catch (error) {
      console.error(`❌ Finnhub financials error for ${symbol}:`, error);
      throw error;
    }
  }
  // WebSocket Implementation for Real-time Data
  connectWebSocket() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      console.log("🔄 Finnhub WebSocket already connected or connecting");
      return;
    }
    this.isConnecting = true;
    const wsUrl = `wss://ws.finnhub.io?token=${this.apiKey}`;
    console.log("🔗 Connecting to Finnhub WebSocket...");
    this.ws = new WebSocket(wsUrl);
    this.ws.onopen = () => {
      console.log("✅ Finnhub WebSocket connected");
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.onConnectionHandlers.forEach((handler) => handler(true));
      this.subscriptions.forEach((symbol) => {
        this.subscribeToSymbol(symbol);
      });
    };
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "trade" && data.data) {
          this.onTradeHandlers.forEach((handler) => handler(data.data));
        } else if (data.type === "ping") {
          this.ws?.send(JSON.stringify({
            type: "pong"
          }));
        } else if (data.type === "error") {
          console.error("❌ Finnhub WebSocket error:", data.msg);
          this.onErrorHandlers.forEach((handler) => handler(data.msg || "Unknown error"));
        }
      } catch (error) {
        console.error("❌ Error parsing Finnhub WebSocket message:", error);
      }
    };
    this.ws.onclose = (event) => {
      console.log("🔌 Finnhub WebSocket disconnected:", event.code, event.reason);
      this.isConnecting = false;
      this.onConnectionHandlers.forEach((handler) => handler(false));
      if (event.code !== 1e3 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };
    this.ws.onerror = (error) => {
      console.error("❌ Finnhub WebSocket error:", error);
      this.isConnecting = false;
      this.onErrorHandlers.forEach((handler) => handler("WebSocket connection error"));
    };
  }
  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`⏱️ Reconnecting to Finnhub WebSocket in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  }
  subscribeToSymbol(symbol) {
    this.subscriptions.add(symbol);
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: "subscribe",
        symbol: symbol.toUpperCase()
      });
      this.ws.send(message);
      console.log(`📈 Subscribed to Finnhub real-time data for ${symbol}`);
    }
  }
  unsubscribeFromSymbol(symbol) {
    this.subscriptions.delete(symbol);
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: "unsubscribe",
        symbol: symbol.toUpperCase()
      });
      this.ws.send(message);
      console.log(`📉 Unsubscribed from Finnhub real-time data for ${symbol}`);
    }
  }
  // Event handlers
  onTrade(handler) {
    this.onTradeHandlers.push(handler);
  }
  onError(handler) {
    this.onErrorHandlers.push(handler);
  }
  onConnection(handler) {
    this.onConnectionHandlers.push(handler);
  }
  // Cleanup
  disconnect() {
    if (this.ws) {
      this.ws.close(1e3, "Manual disconnect");
      this.ws = null;
    }
    this.subscriptions.clear();
    this.onTradeHandlers = [];
    this.onErrorHandlers = [];
    this.onConnectionHandlers = [];
  }
  // Health check
  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
  getSubscriptions() {
    return Array.from(this.subscriptions);
  }
  // Batch operations to optimize API usage
  async batchGetQuotes(symbols) {
    const results = {};
    const batchSize = 5;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const promises = batch.map(async (symbol, index) => {
        if (index > 0) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        try {
          const data = await this.getStockQuoteWithRateLimit(symbol);
          return {
            symbol,
            data
          };
        } catch (error) {
          console.warn(`⚠️ Failed to fetch quote for ${symbol}:`, error);
          return {
            symbol,
            data: null,
            error
          };
        }
      });
      const batchResults = await Promise.all(promises);
      batchResults.forEach(({
        symbol,
        data
      }) => {
        results[symbol] = data;
      });
      if (i + batchSize < symbols.length) {
        await new Promise((resolve) => setTimeout(resolve, 1e3));
      }
    }
    return results;
  }
}
const finnhubEnhanced = new FinnhubEnhancedService();
const ALPHA_VANTAGE_PROXY_URL = "/api/proxy/alphavantage";
class AlphaVantageService {
  constructor() {
    this.proxyURL = ALPHA_VANTAGE_PROXY_URL;
  }
  async makeRequest(endpoint) {
    const url = `${this.proxyURL}${endpoint}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Alpha Vantage proxy error: ${response.status} ${response.statusText}`);
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Alpha Vantage API request failed");
      }
      const data = result.data;
      if (data["Error Message"]) {
        throw new Error(`Alpha Vantage API error: ${data["Error Message"]}`);
      }
      if (data["Information"]) {
        throw new Error(`Alpha Vantage API limit: ${data["Information"]}`);
      }
      return data;
    } catch (error) {
      console.error("Alpha Vantage API request failed:", error);
      throw error;
    }
  }
  // Get company overview (includes EPS, revenue segments info)
  async getCompanyOverview(symbol) {
    return this.makeRequest(`/overview/${symbol.toUpperCase()}`);
  }
  // Get earnings data (quarterly and annual EPS)
  async getEarnings(symbol) {
    return this.makeRequest(`/earnings/${symbol.toUpperCase()}`);
  }
  // Get income statement (detailed expenses breakdown)
  async getIncomeStatement(symbol) {
    return this.makeRequest(`/income-statement/${symbol.toUpperCase()}`);
  }
  // Get historical stock prices (fallback for Finnhub)
  async getHistoricalPrices(symbol, outputsize = "compact") {
    return this.makeRequest(`/time-series-daily/${symbol.toUpperCase()}?outputsize=${outputsize}`);
  }
}
const alphaVantageService = new AlphaVantageService();
class AlphaVantageEnhancedService {
  // SECURITY: API key moved to server-side - use proxy endpoints instead
  constructor(apiKey = "DEPRECATED_USE_SERVER_PROXY") {
    this.apiKey = apiKey;
    this.minuteCallCount = 0;
    this.dailyCallCount = 0;
    this.lastMinuteReset = Date.now();
    this.lastDayReset = Date.now();
    this.maxCallsPerMinute = 4;
    this.maxCallsPerDay = 20;
    this.CACHE_DURATIONS = {
      overview: 24 * 60 * 60 * 1e3,
      // 24 hours - company fundamentals change rarely
      earnings: 4 * 60 * 60 * 1e3,
      // 4 hours - earnings data is quarterly
      incomeStatement: 12 * 60 * 60 * 1e3,
      // 12 hours - financial statements
      balanceSheet: 12 * 60 * 60 * 1e3,
      cashFlow: 12 * 60 * 60 * 1e3,
      historicalPrices: 60 * 60 * 1e3
      // 1 hour - price data
    };
    this.symbolQueue = [];
    this.isProcessingQueue = false;
  }
  // Rate limiting management
  checkRateLimit() {
    const now = Date.now();
    if (now - this.lastMinuteReset > 6e4) {
      this.minuteCallCount = 0;
      this.lastMinuteReset = now;
    }
    if (now - this.lastDayReset > 24 * 60 * 60 * 1e3) {
      this.dailyCallCount = 0;
      this.lastDayReset = now;
    }
    if (this.minuteCallCount >= this.maxCallsPerMinute) {
      const waitTime = 6e4 - (now - this.lastMinuteReset);
      return {
        canMakeRequest: false,
        reason: "minute_limit",
        waitTime
      };
    }
    if (this.dailyCallCount >= this.maxCallsPerDay) {
      const waitTime = 24 * 60 * 60 * 1e3 - (now - this.lastDayReset);
      return {
        canMakeRequest: false,
        reason: "daily_limit",
        waitTime
      };
    }
    return {
      canMakeRequest: true
    };
  }
  incrementApiCall() {
    this.minuteCallCount++;
    this.dailyCallCount++;
    try {
      const data = {
        count: this.dailyCallCount,
        resetTime: this.lastDayReset
      };
      localStorage.setItem("alphavantage-daily-usage", JSON.stringify(data));
    } catch (error) {
      console.warn("Failed to persist Alpha Vantage usage data:", error);
    }
  }
  loadDailyUsageFromStorage() {
    try {
      const stored = localStorage.getItem("alphavantage-daily-usage");
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();
        if (now - data.resetTime < 24 * 60 * 60 * 1e3) {
          this.dailyCallCount = data.count;
          this.lastDayReset = data.resetTime;
        }
      }
    } catch (error) {
      console.warn("Failed to load Alpha Vantage usage data:", error);
    }
  }
  getRateLimitStatus() {
    return {
      requests: this.minuteCallCount,
      resetTime: this.lastMinuteReset + 6e4,
      remaining: Math.max(0, this.maxCallsPerMinute - this.minuteCallCount),
      dailyRequests: this.dailyCallCount,
      dailyRemaining: Math.max(0, this.maxCallsPerDay - this.dailyCallCount)
    };
  }
  // Enhanced API methods with intelligent caching and rate limiting
  async getCompanyOverviewOptimized(symbol) {
    const rateLimitCheck = this.checkRateLimit();
    if (!rateLimitCheck.canMakeRequest) {
      const waitTimeSeconds = Math.ceil((rateLimitCheck.waitTime || 0) / 1e3);
      console.warn(`🚫 Alpha Vantage ${rateLimitCheck.reason} reached. Wait ${waitTimeSeconds}s`);
      throw new Error(`Rate limit exceeded (${rateLimitCheck.reason}). Try again in ${waitTimeSeconds} seconds`);
    }
    const cacheKey = `alphavantage-overview-${symbol}`;
    const cached = cacheManager.get(cacheKey, "overview");
    if (cached) {
      console.log(`📦 Alpha Vantage overview cache hit for ${symbol}`);
      return cached;
    }
    try {
      this.incrementApiCall();
      const data = await alphaVantageService.getCompanyOverview(symbol);
      cacheManager.set(cacheKey, data, "overview", this.CACHE_DURATIONS.overview);
      return data;
    } catch (error) {
      console.error(`❌ Alpha Vantage overview error for ${symbol}:`, error);
      throw error;
    }
  }
  async getEarningsOptimized(symbol) {
    const rateLimitCheck = this.checkRateLimit();
    if (!rateLimitCheck.canMakeRequest) {
      throw new Error(`Rate limit exceeded (${rateLimitCheck.reason})`);
    }
    const cacheKey = `alphavantage-earnings-${symbol}`;
    const cached = cacheManager.get(cacheKey, "earnings");
    if (cached) return cached;
    try {
      this.incrementApiCall();
      const data = await alphaVantageService.getEarnings(symbol);
      cacheManager.set(cacheKey, data, "earnings", this.CACHE_DURATIONS.earnings);
      return data;
    } catch (error) {
      console.error(`❌ Alpha Vantage earnings error for ${symbol}:`, error);
      throw error;
    }
  }
  async getIncomeStatementOptimized(symbol) {
    const rateLimitCheck = this.checkRateLimit();
    if (!rateLimitCheck.canMakeRequest) {
      throw new Error(`Rate limit exceeded (${rateLimitCheck.reason})`);
    }
    const cacheKey = `alphavantage-income-${symbol}`;
    const cached = cacheManager.get(cacheKey, "financials");
    if (cached) return cached;
    try {
      this.incrementApiCall();
      const data = await alphaVantageService.getIncomeStatement(symbol);
      cacheManager.set(cacheKey, data, "financials", this.CACHE_DURATIONS.incomeStatement);
      return data;
    } catch (error) {
      console.error(`❌ Alpha Vantage income statement error for ${symbol}:`, error);
      throw error;
    }
  }
  // Optimized bundle fetching for fundamentals
  async getFundamentalsBundle(symbol) {
    const bundleCacheKey = `alphavantage-bundle-${symbol}`;
    const cached = cacheManager.get(bundleCacheKey, "financials");
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATIONS.overview) {
      console.log(`📦 Alpha Vantage fundamentals bundle cache hit for ${symbol}`);
      return cached;
    }
    const status = this.getRateLimitStatus();
    const requiredCalls = 3;
    if (status.dailyRemaining < requiredCalls) {
      console.warn(`⚠️ Insufficient Alpha Vantage API calls remaining (${status.dailyRemaining}/${requiredCalls} needed)`);
      return null;
    }
    try {
      console.log(`🔄 Fetching Alpha Vantage fundamentals bundle for ${symbol}`);
      const overview = await this.getCompanyOverviewOptimized(symbol);
      await new Promise((resolve) => setTimeout(resolve, 15e3));
      const earnings = await this.getEarningsOptimized(symbol);
      await new Promise((resolve) => setTimeout(resolve, 15e3));
      const incomeStatement = await this.getIncomeStatementOptimized(symbol);
      const bundle = {
        overview,
        earnings,
        incomeStatement,
        timestamp: Date.now()
      };
      cacheManager.set(bundleCacheKey, bundle, "financials", this.CACHE_DURATIONS.overview);
      console.log(`✅ Alpha Vantage fundamentals bundle cached for ${symbol}`);
      return bundle;
    } catch (error) {
      console.error(`❌ Failed to fetch Alpha Vantage fundamentals bundle for ${symbol}:`, error);
      return null;
    }
  }
  async requestSymbolData(symbol, priority = 1) {
    return new Promise((resolve, reject) => {
      this.symbolQueue.push({
        symbol,
        priority,
        resolve,
        reject
      });
      this.symbolQueue.sort((a, b) => b.priority - a.priority);
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }
  async processQueue() {
    if (this.isProcessingQueue || this.symbolQueue.length === 0) {
      return;
    }
    this.isProcessingQueue = true;
    while (this.symbolQueue.length > 0) {
      const {
        symbol,
        resolve,
        reject
      } = this.symbolQueue.shift();
      try {
        const data = await this.getFundamentalsBundle(symbol);
        resolve(data);
      } catch (error) {
        reject(error);
      }
      if (this.symbolQueue.length > 0) {
        await new Promise((resolve2) => setTimeout(resolve2, 6e4));
      }
    }
    this.isProcessingQueue = false;
  }
  // Bulk operations optimized for limited API calls
  async getMultipleOverviews(symbols) {
    const results = {};
    for (const symbol of symbols) {
      const status = this.getRateLimitStatus();
      if (status.dailyRemaining <= 0) {
        console.warn(`⚠️ Alpha Vantage daily limit reached. Skipping remaining symbols.`);
        break;
      }
      try {
        const data = await this.getCompanyOverviewOptimized(symbol);
        results[symbol] = data;
        if (symbols.indexOf(symbol) < symbols.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 15e3));
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch Alpha Vantage overview for ${symbol}:`, error);
        results[symbol] = null;
      }
    }
    return results;
  }
  // Smart data prioritization based on user activity
  async prioritizeSymbolData(symbols, userWatchlist = []) {
    const prioritizedSymbols = symbols.map((symbol) => ({
      symbol,
      priority: userWatchlist.includes(symbol) ? 10 : 1
    }));
    prioritizedSymbols.forEach(({
      symbol,
      priority
    }) => {
      this.requestSymbolData(symbol, priority);
    });
  }
  // Health check and usage monitoring
  getUsageReport() {
    const now = Date.now();
    return {
      minute: {
        used: this.minuteCallCount,
        limit: this.maxCallsPerMinute,
        resetIn: Math.max(0, 6e4 - (now - this.lastMinuteReset))
      },
      daily: {
        used: this.dailyCallCount,
        limit: this.maxCallsPerDay,
        resetIn: Math.max(0, 24 * 60 * 60 * 1e3 - (now - this.lastDayReset))
      },
      cacheHitRate: cacheManager.getStats().hitRate
    };
  }
  // Initialize the service
  init() {
    this.loadDailyUsageFromStorage();
    console.log("🔧 Alpha Vantage Enhanced Service initialized");
    console.log("📊 Usage status:", this.getUsageReport());
  }
  // Emergency cache clear if needed
  clearCache() {
    cacheManager.clear();
    console.log("🗑️ Alpha Vantage cache cleared");
  }
}
const alphaVantageEnhanced = new AlphaVantageEnhancedService();
alphaVantageEnhanced.init();
class MarketDataOrchestrator {
  constructor(cache) {
    this.quotaTracker = /* @__PURE__ */ new Map();
    this.cache = cache || new CacheManager();
    this.providers = {
      realtime: new TwelveDataService(this.cache),
      fundamentals: new FMPService(this.cache),
      backup: finnhubEnhanced,
      deep: alphaVantageEnhanced
    };
    this.initializeQuotaTracking();
  }
  initializeQuotaTracking() {
    this.quotaTracker.set("twelvedata", {
      provider: "twelvedata",
      used: 0,
      limit: 800,
      remaining: 800,
      resetAt: this.getNextMidnight()
    });
    this.quotaTracker.set("fmp", {
      provider: "fmp",
      used: 0,
      limit: 250,
      remaining: 250,
      resetAt: this.getNextMidnight()
    });
    this.quotaTracker.set("finnhub", {
      provider: "finnhub",
      used: 0,
      limit: 60 * 60 * 24,
      // 60 per minute = ~86,400 per day
      remaining: 60 * 60 * 24,
      resetAt: this.getNextMidnight()
    });
    this.quotaTracker.set("alphavantage", {
      provider: "alphavantage",
      used: 0,
      limit: 25,
      remaining: 25,
      resetAt: this.getNextMidnight()
    });
  }
  getNextMidnight() {
    const tomorrow = /* @__PURE__ */ new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
  incrementQuota(provider) {
    const quota = this.quotaTracker.get(provider);
    if (quota) {
      quota.used++;
      quota.remaining = Math.max(0, quota.limit - quota.used);
      if (/* @__PURE__ */ new Date() > quota.resetAt) {
        quota.used = 1;
        quota.remaining = quota.limit - 1;
        quota.resetAt = this.getNextMidnight();
      }
    }
  }
  async getRealTimeQuote(symbol) {
    const cacheKey = `orchestrator:quote:${symbol}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;
    try {
      const twelveQuota = this.quotaTracker.get("twelvedata");
      if (twelveQuota && twelveQuota.remaining > 0) {
        const quote = await this.providers.realtime.getQuote(symbol);
        if (quote) {
          this.incrementQuota("twelvedata");
          const stock = await this.providers.realtime.convertToStock(quote);
          await this.cache.set(cacheKey, stock, 60 * 1e3);
          return stock;
        }
      }
      const finnhubQuota = this.quotaTracker.get("finnhub");
      if (finnhubQuota && finnhubQuota.remaining > 0) {
        const quote = await this.providers.backup.getStockQuoteWithRateLimit(symbol);
        if (quote) {
          this.incrementQuota("finnhub");
          const stock = {
            symbol,
            price: quote.c || quote.price || 0,
            change: quote.d || 0,
            changePercent: quote.dp || 0,
            currency: "USD"
          };
          await this.cache.set(cacheKey, stock, 60 * 1e3);
          return stock;
        }
      }
      const alphaQuota = this.quotaTracker.get("alphavantage");
      if (alphaQuota && alphaQuota.remaining > 0) {
        const overview = await this.providers.deep.getCompanyOverviewOptimized(symbol);
        if (overview) {
          this.incrementQuota("alphavantage");
          const stock = {
            symbol,
            price: parseFloat(overview["50DayMovingAverage"] || "0"),
            change: 0,
            // Overview doesn't have change data
            changePercent: 0,
            currency: "USD"
          };
          await this.cache.set(cacheKey, stock, 60 * 1e3);
          return stock;
        }
      }
      return null;
    } catch (error) {
      console.error("MarketDataOrchestrator getRealTimeQuote error:", error);
      return null;
    }
  }
  async getFundamentals(symbol) {
    const cacheKey = `orchestrator:fundamentals:${symbol}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;
    try {
      const fmpQuota = this.quotaTracker.get("fmp");
      if (fmpQuota && fmpQuota.remaining > 0) {
        const fundamentals = await this.providers.fundamentals.getIntrinsicValueData(symbol);
        if (fundamentals) {
          this.incrementQuota("fmp");
          await this.cache.set(cacheKey, fundamentals, 24 * 60 * 60 * 1e3);
          return fundamentals;
        }
      }
      const alphaQuota = this.quotaTracker.get("alphavantage");
      if (alphaQuota && alphaQuota.remaining > 0) {
        const overview = await this.providers.deep.getCompanyOverviewOptimized(symbol);
        if (overview) {
          this.incrementQuota("alphavantage");
          const fundamentals = {
            stockSymbol: symbol,
            currentPrice: parseFloat(overview["50DayMovingAverage"] || "0"),
            eps: parseFloat(overview.EPS || "0"),
            peMultiple: parseFloat(overview.PERatio || "0"),
            bookValue: parseFloat(overview.BookValue || "0"),
            roe: parseFloat(overview.ReturnOnEquityTTM || "0") * 100,
            debtToEquity: parseFloat(overview.DebtToEquityRatio || "0"),
            revenue: parseFloat(overview.RevenueTTM || "0"),
            marketCap: parseFloat(overview.MarketCapitalization || "0")
          };
          await this.cache.set(cacheKey, fundamentals, 24 * 60 * 60 * 1e3);
          return fundamentals;
        }
      }
      const finnhubQuota = this.quotaTracker.get("finnhub");
      if (finnhubQuota && finnhubQuota.remaining > 0) {
        const metrics = await this.providers.backup.getBasicFinancialsWithRateLimit(symbol);
        if (metrics) {
          this.incrementQuota("finnhub");
          await this.cache.set(cacheKey, metrics, 24 * 60 * 60 * 1e3);
          return metrics;
        }
      }
      return null;
    } catch (error) {
      console.error("MarketDataOrchestrator getFundamentals error:", error);
      return null;
    }
  }
  async getBatchQuotes(symbols) {
    const result = {};
    const uncachedSymbols = [];
    for (const symbol of symbols) {
      const cached = await this.cache.get(`orchestrator:quote:${symbol}`);
      if (cached) {
        result[symbol] = cached;
      } else {
        uncachedSymbols.push(symbol);
      }
    }
    if (uncachedSymbols.length === 0) return result;
    try {
      const twelveQuota = this.quotaTracker.get("twelvedata");
      if (twelveQuota && twelveQuota.remaining >= uncachedSymbols.length) {
        const batchSize = 120;
        for (let i = 0; i < uncachedSymbols.length; i += batchSize) {
          const batch = uncachedSymbols.slice(i, i + batchSize);
          const quotes = await this.providers.realtime.getBatchQuotes(batch);
          for (const [symbol, quote] of Object.entries(quotes)) {
            const stock = await this.providers.realtime.convertToStock(quote);
            result[symbol] = stock;
            await this.cache.set(`orchestrator:quote:${symbol}`, stock, 60 * 1e3);
            this.incrementQuota("twelvedata");
          }
        }
      } else {
        for (const symbol of uncachedSymbols) {
          const quote = await this.getRealTimeQuote(symbol);
          if (quote) {
            result[symbol] = quote;
          }
        }
      }
    } catch (error) {
      console.error("MarketDataOrchestrator getBatchQuotes error:", error);
    }
    return result;
  }
  async getHistoricalData(symbol, interval = "1day", outputsize = 30) {
    const cacheKey = `orchestrator:historical:${symbol}:${interval}:${outputsize}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;
    try {
      const twelveQuota = this.quotaTracker.get("twelvedata");
      if (twelveQuota && twelveQuota.remaining > 0) {
        const data = await this.providers.realtime.getTimeSeries(symbol, interval, outputsize);
        if (data) {
          this.incrementQuota("twelvedata");
          const cacheTime = this.getCacheTimeForInterval(interval);
          await this.cache.set(cacheKey, data, cacheTime);
          return data;
        }
      }
      return null;
    } catch (error) {
      console.error("MarketDataOrchestrator getHistoricalData error:", error);
      return null;
    }
  }
  getCacheTimeForInterval(interval) {
    switch (interval) {
      case "1min":
        return 60 * 1e3;
      // 1 minute
      case "5min":
        return 5 * 60 * 1e3;
      // 5 minutes
      case "15min":
        return 15 * 60 * 1e3;
      // 15 minutes
      case "30min":
        return 30 * 60 * 1e3;
      // 30 minutes
      case "1h":
        return 60 * 60 * 1e3;
      // 1 hour
      case "1day":
        return 24 * 60 * 60 * 1e3;
      // 1 day
      default:
        return 60 * 1e3;
    }
  }
  getQuotaStatus() {
    return this.quotaTracker;
  }
  async warmCache(symbols) {
    console.log(`Warming cache for ${symbols.length} symbols...`);
    await this.getBatchQuotes(symbols);
    const topSymbols = symbols.slice(0, 10);
    for (const symbol of topSymbols) {
      await this.getFundamentals(symbol);
    }
  }
  // WebSocket connection for real-time updates
  connectRealTimeUpdates(symbols, onUpdate) {
    try {
      this.providers.realtime.connectWebSocket((message) => {
        if (message.event === "price" && message.symbol && message.price) {
          onUpdate(message.symbol, message.price);
        }
      });
      this.providers.realtime.subscribe(symbols);
    } catch (error) {
      console.error("WebSocket connection error:", error);
    }
  }
  disconnectRealTimeUpdates() {
    try {
      this.providers.realtime.disconnect();
    } catch (error) {
      console.error("WebSocket disconnect error:", error);
    }
  }
}
const orchestrator = new MarketDataOrchestrator();
const enhancedStocksApi = {
  ...stocksApi,
  // Override getBySymbol to use real API data with enhanced fallback
  getBySymbol: async (symbol) => {
    const normalizedSymbol = symbol.toUpperCase();
    try {
      const cacheKey = `stock:${normalizedSymbol}`;
      const cachedStock = orchestrator.getCacheManager().get(cacheKey);
      if (cachedStock && Date.now() - cachedStock.timestamp < 6e4) {
        return cachedStock.data;
      }
      const realtimeData = await Promise.race([orchestrator.getRealTimeQuote(normalizedSymbol), new Promise((_, reject) => setTimeout(() => reject(new Error("API timeout")), 5e3))]);
      if (realtimeData) {
        orchestrator.getCacheManager().set(cacheKey, {
          data: realtimeData,
          timestamp: Date.now()
        });
        stocksApi.create({
          ...realtimeData,
          symbol: normalizedSymbol
        }).catch(console.error);
        return {
          ...realtimeData,
          symbol: normalizedSymbol,
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      const dbStock = await stocksApi.getBySymbol(normalizedSymbol).catch(() => null);
      if (dbStock) {
        console.info(`Using database fallback for ${normalizedSymbol}`);
        return dbStock;
      }
      throw new Error(`No data available for ${normalizedSymbol}`);
    } catch (error) {
      console.warn(`All APIs failed for ${normalizedSymbol}, generating mock data:`, error);
      const basePrice = Math.random() * 500 + 50;
      const changeAmount = (Math.random() - 0.5) * 10;
      const intrinsicValue = basePrice * (0.8 + Math.random() * 0.4);
      return {
        id: Math.random() * 1e3,
        symbol: symbol.toUpperCase(),
        name: `${symbol} Inc.`,
        price: basePrice,
        currentPrice: basePrice,
        // Add currentPrice
        change: changeAmount,
        changePercent: changeAmount / basePrice * 100,
        volume: Math.floor(Math.random() * 1e7),
        marketCap: `$${(Math.random() * 1e3).toFixed(1)}B`,
        eps: Math.random() * 10 + 1,
        pe: Math.random() * 30 + 10,
        peRatio: Math.random() * 30 + 10,
        intrinsicValue,
        valuation: intrinsicValue > basePrice ? "undervalued" : "overvalued",
        sector: "Technology",
        industry: "Software",
        high52Week: Math.random() * 600 + 100,
        low52Week: Math.random() * 400 + 20,
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  },
  // Get multiple stocks with real-time data
  getBatch: async (symbols) => {
    try {
      const stocks = await Promise.all(symbols.map((symbol) => enhancedStocksApi.getBySymbol(symbol)));
      return stocks.filter(Boolean);
    } catch (error) {
      console.warn("Failed to fetch batch stocks, using mock data:", error);
      return symbols.map((symbol) => {
        const basePrice = Math.random() * 500 + 50;
        const changeAmount = (Math.random() - 0.5) * 10;
        const intrinsicValue = basePrice * (0.8 + Math.random() * 0.4);
        return {
          id: Math.random() * 1e3,
          symbol: symbol.toUpperCase(),
          name: `${symbol} Inc.`,
          price: basePrice,
          currentPrice: basePrice,
          // Add currentPrice
          change: changeAmount,
          changePercent: changeAmount / basePrice * 100,
          volume: Math.floor(Math.random() * 1e7),
          marketCap: `$${(Math.random() * 1e3).toFixed(1)}B`,
          eps: Math.random() * 10 + 1,
          pe: Math.random() * 30 + 10,
          peRatio: Math.random() * 30 + 10,
          intrinsicValue,
          valuation: intrinsicValue > basePrice ? "undervalued" : "overvalued",
          sector: "Technology",
          industry: "Software",
          high52Week: Math.random() * 600 + 100,
          low52Week: Math.random() * 400 + 20,
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
        };
      });
    }
  },
  // Original getBatch with real API
  getBatchReal: async (symbols) => {
    const quotes = await orchestrator.getBatchQuotes(symbols);
    return Object.values(quotes);
  },
  // Get historical data
  getHistoricalData: async (symbol, interval = "1day", outputsize = 30) => {
    return orchestrator.getHistoricalData(symbol, interval, outputsize);
  },
  // Search with real API data
  search: async (query, limit) => {
    try {
      const dbResults = await stocksApi.search(query, limit);
      if (dbResults.length > 0) {
        const symbols = dbResults.map((s) => s.symbol);
        const realtimeQuotes = await orchestrator.getBatchQuotes(symbols);
        return dbResults.map((stock) => ({
          ...stock,
          ...realtimeQuotes[stock.symbol] || {},
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
        }));
      }
      return dbResults;
    } catch (error) {
      console.error("Enhanced search error:", error);
      return stocksApi.search(query, limit);
    }
  }
};
const enhancedIntrinsicValueApi = {
  ...intrinsicValueApi,
  // Calculate with real fundamentals data
  calculateWithRealData: async (symbol) => {
    try {
      const fundamentals = await orchestrator.getFundamentals(symbol);
      if (!fundamentals || !fundamentals.eps) {
        throw new Error("Insufficient fundamentals data");
      }
      const quote = await orchestrator.getRealTimeQuote(symbol);
      const currentPrice = quote?.currentPrice || fundamentals.currentPrice || 0;
      const calculationParams = {
        stockSymbol: symbol,
        eps: fundamentals.eps || 0,
        growthRate: fundamentals.growthRate || 10,
        peMultiple: fundamentals.peMultiple || 15,
        requiredReturn: fundamentals.requiredReturn || 10,
        marginOfSafety: fundamentals.marginOfSafety || 25,
        horizon: 5
      };
      const result = await intrinsicValueApi.calculate(calculationParams);
      const enhanced = {
        ...result,
        ...fundamentals,
        currentPrice,
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      };
      await intrinsicValueApi.create(enhanced).catch(console.error);
      return enhanced;
    } catch (error) {
      console.error("Enhanced calculateWithRealData error:", error);
      return null;
    }
  },
  // Get by symbol with fresh fundamentals
  getBySymbol: async (symbol) => {
    try {
      const cached = await intrinsicValueApi.getBySymbol(symbol).catch(() => null);
      if (cached && cached.lastUpdated) {
        const lastUpdate = new Date(cached.lastUpdated);
        const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1e3 * 60 * 60);
        if (hoursSinceUpdate < 24) {
          return cached;
        }
      }
      const fresh = await enhancedIntrinsicValueApi.calculateWithRealData(symbol);
      return fresh || cached || {
        stockSymbol: symbol
      };
    } catch (error) {
      console.error("Enhanced getBySymbol error:", error);
      return intrinsicValueApi.getBySymbol(symbol);
    }
  }
};
const enhancedMarketApi = {
  ...marketApi,
  getIndices: async () => {
    try {
      const [spy, dia, qqq] = await Promise.all([
        orchestrator.getRealTimeQuote("SPY"),
        // S&P 500 ETF
        orchestrator.getRealTimeQuote("DIA"),
        // Dow Jones ETF
        orchestrator.getRealTimeQuote("QQQ")
        // Nasdaq ETF
      ]);
      return {
        sp500: {
          value: spy?.currentPrice || 0,
          change: spy?.changePercent || 0
        },
        dow: {
          value: dia?.currentPrice || 0,
          change: dia?.changePercent || 0
        },
        nasdaq: {
          value: qqq?.currentPrice || 0,
          change: qqq?.changePercent || 0
        }
      };
    } catch (error) {
      console.error("Enhanced getIndices error:", error);
      try {
        return await marketApi.getIndices();
      } catch (apiError) {
        console.warn("Market API failed, returning mock indices");
        return {
          sp500: {
            value: 4500 + Math.random() * 200,
            change: (Math.random() - 0.5) * 3
          },
          dow: {
            value: 35e3 + Math.random() * 1e3,
            change: (Math.random() - 0.5) * 3
          },
          nasdaq: {
            value: 15e3 + Math.random() * 500,
            change: (Math.random() - 0.5) * 3
          }
        };
      }
    }
  }
};
const realTimeApi = {
  connect: (symbols, onUpdate) => {
    orchestrator.connectRealTimeUpdates(symbols, onUpdate);
  },
  disconnect: () => {
    orchestrator.disconnectRealTimeUpdates();
  },
  subscribe: (symbols) => {
  },
  unsubscribe: (symbols) => {
  }
};
const quotaApi = {
  getStatus: () => {
    return orchestrator.getQuotaStatus();
  }
};
const cacheApi = {
  warmPopularStocks: async () => {
    const popularSymbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "JPM", "V", "JNJ", "WMT", "PG", "UNH", "DIS", "MA", "HD", "PYPL", "BAC", "NFLX", "ADBE"];
    await orchestrator.warmCache(popularSymbols);
  }
};
const enhancedApi = {
  stocks: enhancedStocksApi,
  watchlists: watchlistsApi,
  intrinsicValue: enhancedIntrinsicValueApi,
  earnings: earningsApi,
  recentSearches: recentSearchesApi,
  market: enhancedMarketApi,
  realTime: realTimeApi,
  quota: quotaApi,
  cache: cacheApi
};
class LocalCacheService {
  constructor() {
    this.prefix = "alfalyzer_cache_";
    this.maxSize = 5 * 1024 * 1024;
    this.defaultTTLs = {
      stock_price: 1 * 60 * 1e3,
      // 1 minute
      stock_profile: 24 * 60 * 60 * 1e3,
      // 24 hours
      stock_chart: 5 * 60 * 1e3,
      // 5 minutes
      market_data: 1 * 60 * 1e3,
      // 1 minute
      user_data: 30 * 60 * 1e3,
      // 30 minutes
      search_results: 10 * 60 * 1e3,
      // 10 minutes
      news: 15 * 60 * 1e3,
      // 15 minutes
      transcripts: 60 * 60 * 1e3,
      // 1 hour
      default: 5 * 60 * 1e3
      // 5 minutes
    };
  }
  /**
   * Store data in localStorage with TTL
   */
  set(key, data, options = {}) {
    try {
      const ttl = options.ttl || this.defaultTTLs.default;
      const cacheItem = {
        data,
        timestamp: Date.now(),
        ttl
      };
      const serialized = JSON.stringify(cacheItem);
      const fullKey = this.prefix + key;
      if (serialized.length > this.maxSize / 10) {
        console.warn(`Cache item ${key} is very large, skipping cache`);
        return false;
      }
      this.cleanup();
      localStorage.setItem(fullKey, serialized);
      return true;
    } catch (error) {
      console.warn("Failed to cache data:", error);
      if (error instanceof DOMException && error.code === 22) {
        this.clearExpired();
        try {
          localStorage.setItem(this.prefix + key, JSON.stringify({
            data,
            timestamp: Date.now(),
            ttl: options.ttl || this.defaultTTLs.default
          }));
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  }
  /**
   * Retrieve data from localStorage, checking TTL
   */
  get(key) {
    try {
      const fullKey = this.prefix + key;
      const item = localStorage.getItem(fullKey);
      if (!item) {
        return null;
      }
      const cacheItem = JSON.parse(item);
      if (Date.now() - cacheItem.timestamp > cacheItem.ttl) {
        this.delete(key);
        return null;
      }
      return cacheItem.data;
    } catch (error) {
      console.warn(`Failed to retrieve cached data for ${key}:`, error);
      this.delete(key);
      return null;
    }
  }
  /**
   * Check if a key exists and is not expired
   */
  has(key) {
    return this.get(key) !== null;
  }
  /**
   * Delete specific cache entry
   */
  delete(key) {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.warn(`Failed to delete cache key ${key}:`, error);
    }
  }
  /**
   * Clear all expired cache entries
   */
  clearExpired() {
    let clearedCount = 0;
    try {
      const keys = Object.keys(localStorage).filter((key) => key.startsWith(this.prefix));
      for (const fullKey of keys) {
        try {
          const item = localStorage.getItem(fullKey);
          if (item) {
            const cacheItem = JSON.parse(item);
            if (Date.now() - cacheItem.timestamp > cacheItem.ttl) {
              localStorage.removeItem(fullKey);
              clearedCount++;
            }
          }
        } catch {
          localStorage.removeItem(fullKey);
          clearedCount++;
        }
      }
    } catch (error) {
      console.warn("Failed to clear expired cache:", error);
    }
    return clearedCount;
  }
  /**
   * Clear all cache entries
   */
  clearAll() {
    try {
      const keys = Object.keys(localStorage).filter((key) => key.startsWith(this.prefix));
      keys.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.warn("Failed to clear all cache:", error);
    }
  }
  /**
   * Get cache statistics
   */
  getStats() {
    let totalEntries = 0;
    let totalSize = 0;
    let expiredEntries = 0;
    let oldestEntry = null;
    let newestEntry = null;
    try {
      const keys = Object.keys(localStorage).filter((key) => key.startsWith(this.prefix));
      for (const fullKey of keys) {
        try {
          const item = localStorage.getItem(fullKey);
          if (item) {
            totalEntries++;
            totalSize += item.length;
            const cacheItem = JSON.parse(item);
            const timestamp = cacheItem.timestamp;
            if (Date.now() - timestamp > cacheItem.ttl) {
              expiredEntries++;
            }
            if (oldestEntry === null || timestamp < oldestEntry) {
              oldestEntry = timestamp;
            }
            if (newestEntry === null || timestamp > newestEntry) {
              newestEntry = timestamp;
            }
          }
        } catch {
          expiredEntries++;
          totalEntries++;
        }
      }
    } catch (error) {
      console.warn("Failed to get cache stats:", error);
    }
    return {
      totalEntries,
      totalSize,
      expiredEntries,
      oldestEntry,
      newestEntry
    };
  }
  /**
   * Automatic cleanup - call periodically
   */
  cleanup() {
    const stats = this.getStats();
    if (stats.expiredEntries > 10) {
      this.clearExpired();
    }
    if (stats.totalSize > this.maxSize * 0.8) {
      this.clearExpired();
      if (this.getStats().totalSize > this.maxSize * 0.8) {
        this.clearOldest(Math.floor(stats.totalEntries * 0.2));
      }
    }
  }
  /**
   * Remove oldest cache entries
   */
  clearOldest(count) {
    try {
      const entries = [];
      const keys = Object.keys(localStorage).filter((key) => key.startsWith(this.prefix));
      for (const fullKey of keys) {
        try {
          const item = localStorage.getItem(fullKey);
          if (item) {
            const cacheItem = JSON.parse(item);
            entries.push({
              key: fullKey,
              timestamp: cacheItem.timestamp
            });
          }
        } catch {
          localStorage.removeItem(fullKey);
        }
      }
      entries.sort((a, b) => a.timestamp - b.timestamp).slice(0, count).forEach((entry) => localStorage.removeItem(entry.key));
    } catch (error) {
      console.warn("Failed to clear oldest cache entries:", error);
    }
  }
  /**
   * Cache stock-specific data with appropriate TTL
   */
  setStockData(symbol, dataType, data) {
    const key = `stock_${symbol}_${dataType}`;
    const ttl = this.defaultTTLs[dataType] || this.defaultTTLs.default;
    return this.set(key, data, {
      ttl
    });
  }
  /**
   * Get stock-specific data
   */
  getStockData(symbol, dataType) {
    const key = `stock_${symbol}_${dataType}`;
    return this.get(key);
  }
  /**
   * Cache market data
   */
  setMarketData(dataType, data) {
    const key = `market_${dataType}`;
    return this.set(key, data, {
      ttl: this.defaultTTLs.market_data
    });
  }
  /**
   * Get market data
   */
  getMarketData(dataType) {
    const key = `market_${dataType}`;
    return this.get(key);
  }
  /**
   * Cache user data
   */
  setUserData(userId, dataType, data) {
    const key = `user_${userId}_${dataType}`;
    return this.set(key, data, {
      ttl: this.defaultTTLs.user_data
    });
  }
  /**
   * Get user data
   */
  getUserData(userId, dataType) {
    const key = `user_${userId}_${dataType}`;
    return this.get(key);
  }
}
const localCache = new LocalCacheService();
setInterval(() => {
  localCache.clearExpired();
}, 5 * 60 * 1e3);
function useStock(symbol, enabled = true) {
  return useQuery({
    queryKey: queryKeys.stock(symbol),
    queryFn: async () => {
      try {
        const cached = localCache.getStockData(symbol, "stock_profile");
        if (cached) {
          return cached;
        }
        const data = await enhancedApi.stocks.getBySymbol(symbol);
        localCache.setStockData(symbol, "stock_profile", data);
        return data;
      } catch (error) {
        await handleError(error, {
          context: `Fetching stock data for ${symbol}`,
          category: "api",
          severity: "medium",
          showNotification: true,
          retry: true
        });
        throw error;
      }
    },
    enabled: enabled && !!symbol,
    ...prefetchConfigs.stock,
    retry: (failureCount, error) => {
      if (error?.message?.includes("404")) return false;
      if (error?.message?.includes("quota")) return false;
      return failureCount < 3;
    },
    onError: (error) => {
      console.error(`Error fetching stock ${symbol}:`, error);
    }
  });
}
class EarningsService {
  constructor() {
    this.API_BASE = "/api";
    this.CACHE_DURATION = 24 * 60 * 60 * 1e3;
    this.cache = /* @__PURE__ */ new Map();
  }
  /**
   * Busca earnings para uma semana específica
   */
  async getEarningsForWeek(startDate, endDate) {
    const cacheKey = `earnings_${startDate.toISOString().split("T")[0]}_${endDate.toISOString().split("T")[0]}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log("📊 Earnings cache hit para semana:", startDate.toDateString());
      return {
        ...cached.data,
        fromCache: true
      };
    }
    try {
      console.log("🔄 Buscando earnings reais para:", startDate.toDateString(), "até", endDate.toDateString());
      const response = await fetch(`${this.API_BASE}/earnings/calendar?` + new URLSearchParams({
        from: startDate.toISOString().split("T")[0],
        to: endDate.toISOString().split("T")[0]
      }));
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      const data = await response.json();
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      console.log(`✅ Earnings obtidos: ${data.events.length} eventos (fonte: ${data.source})`);
      return data;
    } catch (error) {
      console.error("🚨 Erro ao buscar earnings reais:", error);
      return this.getMockEarnings(startDate, endDate);
    }
  }
  /**
   * Busca earnings para um símbolo específico
   */
  async getEarningsForSymbol(symbol, limit = 4) {
    try {
      const response = await fetch(`${this.API_BASE}/earnings/symbol/${symbol.toUpperCase()}?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      const data = await response.json();
      return data.events || [];
    } catch (error) {
      console.error(`🚨 Erro ao buscar earnings para ${symbol}:`, error);
      return [];
    }
  }
  /**
   * Dados mock para fallback quando APIs falham
   */
  getMockEarnings(startDate, endDate) {
    console.log("⚠️ Usando dados mock para earnings calendar");
    const mockEvents = [{
      symbol: "AAPL",
      companyName: "Apple Inc.",
      reportDate: this.getDateInRange(startDate, endDate, 1),
      time: "after_close",
      estimatedEPS: 2.11,
      estimatedRevenue: 125e9,
      fiscalQuarter: "Q1",
      fiscalYear: 2024,
      source: "alpha_vantage",
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    }, {
      symbol: "MSFT",
      companyName: "Microsoft Corporation",
      reportDate: this.getDateInRange(startDate, endDate, 2),
      time: "after_close",
      estimatedEPS: 2.78,
      estimatedRevenue: 58e9,
      fiscalQuarter: "Q1",
      fiscalYear: 2024,
      source: "alpha_vantage",
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    }, {
      symbol: "GOOGL",
      companyName: "Alphabet Inc.",
      reportDate: this.getDateInRange(startDate, endDate, 2),
      time: "before_open",
      estimatedEPS: 1.45,
      estimatedRevenue: 86e9,
      fiscalQuarter: "Q1",
      fiscalYear: 2024,
      source: "alpha_vantage",
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    }, {
      symbol: "AMZN",
      companyName: "Amazon.com Inc.",
      reportDate: this.getDateInRange(startDate, endDate, 3),
      time: "after_close",
      estimatedEPS: 0.85,
      estimatedRevenue: 149e9,
      fiscalQuarter: "Q1",
      fiscalYear: 2024,
      source: "alpha_vantage",
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    }, {
      symbol: "TSLA",
      companyName: "Tesla Inc.",
      reportDate: this.getDateInRange(startDate, endDate, 4),
      time: "after_close",
      estimatedEPS: 0.75,
      estimatedRevenue: 24e9,
      fiscalQuarter: "Q1",
      fiscalYear: 2024,
      source: "alpha_vantage",
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    }, {
      symbol: "META",
      companyName: "Meta Platforms Inc.",
      reportDate: this.getDateInRange(startDate, endDate, 4),
      time: "before_open",
      estimatedEPS: 3.2,
      estimatedRevenue: 4e10,
      fiscalQuarter: "Q1",
      fiscalYear: 2024,
      source: "alpha_vantage",
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    }];
    return {
      events: mockEvents,
      totalCount: mockEvents.length,
      fromCache: false,
      source: "mock",
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
   * Helper para gerar datas dentro do range especificado
   */
  getDateInRange(startDate, endDate, dayOffset) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + (dayOffset - 1));
    if (date > endDate) {
      date.setTime(endDate.getTime());
    }
    return date.toISOString().split("T")[0];
  }
  /**
   * Limpa cache (útil para forçar refresh)
   */
  clearCache() {
    this.cache.clear();
    console.log("🗑️ Cache de earnings limpo");
  }
  /**
   * Verifica status da integração
   */
  async getConnectionStatus() {
    try {
      const response = await fetch(`${this.API_BASE}/earnings/status`);
      if (!response.ok) {
        throw new Error("Status check failed");
      }
      return await response.json();
    } catch (error) {
      console.error("🚨 Erro ao verificar status da conexão:", error);
      return {
        alphaVantage: false,
        fmp: false,
        lastCheck: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  }
  /**
   * Busca próximos earnings (próximos 7 dias)
   */
  async getUpcomingEarnings(days = 7) {
    const startDate = /* @__PURE__ */ new Date();
    const endDate = /* @__PURE__ */ new Date();
    endDate.setDate(startDate.getDate() + days);
    const response = await this.getEarningsForWeek(startDate, endDate);
    return response.events.sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime());
  }
}
const earningsService = new EarningsService();
function EarningsItem({
  earning
}) {
  const [, setLocation] = useLocation();
  const {
    data: stock,
    isLoading
  } = useStock(earning.symbol);
  const handleClick = () => {
    setLocation(`/stock/${earning.symbol}`);
  };
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center justify-between p-2 hover:bg-secondary/50 rounded-lg animate-pulse",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center space-x-2",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "w-8 h-8 bg-gray-300 rounded"
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "h-3 bg-gray-300 rounded w-12 mb-1"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "h-2 bg-gray-300 rounded w-16"
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, {
        className: "h-3 w-3 text-muted-foreground"
      })]
    });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "flex items-center justify-between p-2 hover:bg-secondary/50 rounded-lg cursor-pointer transition-colors group",
    onClick: handleClick,
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center space-x-2",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "w-8 h-8 bg-primary/10 rounded flex items-center justify-center",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
          className: "text-xs font-medium text-primary",
          children: earning.symbol.charAt(0)
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "text-xs font-medium group-hover:text-primary transition-colors",
          children: earning.symbol
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "text-xs text-muted-foreground truncate max-w-20",
          children: earning.companyName || earning.symbol
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "text-xs text-muted-foreground",
          children: ["EPS: $", earning.estimatedEPS?.toFixed(2) || "N/A"]
        })]
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, {
      className: "h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors"
    })]
  });
}
function EarningsCalendar() {
  const [currentWeek, setCurrentWeek] = reactExports.useState(/* @__PURE__ */ new Date());
  const [searchQuery, setSearchQuery] = reactExports.useState("");
  const [marketCapFilter, setMarketCapFilter] = reactExports.useState("all");
  const [selectedStock, setSelectedStock] = reactExports.useState(null);
  const weekStart = startOfWeek(currentWeek, {
    weekStartsOn: 1
  });
  const weekEnd = endOfWeek(currentWeek, {
    weekStartsOn: 1
  });
  const {
    data: earningsData,
    isLoading: earningsLoading,
    error: earningsError
  } = useQuery({
    queryKey: ["cache", "earnings-calendar", weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: async () => {
      try {
        return await earningsService.getEarningsForWeek(weekStart, weekEnd);
      } catch (error) {
        console.error("Failed to fetch earnings:", error);
        return {
          events: [],
          source: "error",
          fromCache: false
        };
      }
    },
    staleTime: 24 * 60 * 60 * 1e3,
    // 24 hours
    cacheTime: 24 * 60 * 60 * 1e3,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1e3 * 2 ** attemptIndex, 3e4)
  });
  const goToPreviousWeek = () => {
    setCurrentWeek((prev) => subWeeks(prev));
  };
  const goToNextWeek = () => {
    setCurrentWeek((prev) => addWeeks(prev, 1));
  };
  const goToCurrentWeek = () => {
    setCurrentWeek(/* @__PURE__ */ new Date());
  };
  const getEarningsForDay = (day, time) => {
    if (!earningsData?.events) return [];
    const dayString = format(day, "yyyy-MM-dd");
    return earningsData.events.filter((earning) => earning.reportDate === dayString && earning.time === time);
  };
  const weekDays = Array.from({
    length: 5
  }, (_, i) => addDays(weekStart, i));
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "container mx-auto px-6 py-8 max-w-7xl",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "flex items-center justify-between mb-6",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center space-x-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            variant: "outline",
            size: "sm",
            onClick: goToPreviousWeek,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, {
              className: "h-4 w-4"
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            variant: "outline",
            size: "sm",
            onClick: goToNextWeek,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, {
              className: "h-4 w-4"
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            variant: "outline",
            size: "sm",
            onClick: goToCurrentWeek,
            children: "Today"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", {
            className: "text-xl font-bold",
            children: ["Earnings This Week – ", format(weekStart, "MMM dd"), " → ", format(weekEnd, "MMM dd")]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center space-x-2",
            children: [earningsLoading ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
              variant: "secondary",
              className: "text-xs",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
                className: "h-3 w-3 mr-1"
              }), "Loading..."]
            }) : earningsData?.fromCache ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
              variant: "outline",
              className: "text-xs",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(WifiOff, {
                className: "h-3 w-3 mr-1"
              }), "Cached"]
            }) : earningsData?.source === "mock" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
              variant: "destructive",
              className: "text-xs",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(WifiOff, {
                className: "h-3 w-3 mr-1"
              }), "Demo"]
            }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
              variant: "default",
              className: "text-xs bg-green-600",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Wifi, {
                className: "h-3 w-3 mr-1"
              }), "Live"]
            }), earningsData && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
              className: "text-xs text-muted-foreground",
              children: [earningsData?.events?.length || 0, " events"]
            })]
          })]
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center space-x-4 mb-6",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
          placeholder: "Search ticker or company...",
          value: searchQuery,
          onChange: (e) => setSearchQuery(e.target.value),
          className: "max-w-xs"
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
          value: marketCapFilter,
          onValueChange: setMarketCapFilter,
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
            className: "w-40",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {
              placeholder: "Market Cap"
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
              value: "all",
              children: "All"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
              value: "100b+",
              children: "100B+"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
              value: "10b+",
              children: "10B+"
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
            className: "w-48",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {
              placeholder: "Filter by Watchlist"
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
              value: "none",
              children: "No Filter"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
              value: "watchlist1",
              children: "My Watchlist"
            })]
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex gap-6",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "flex-1",
          children: earningsLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "grid grid-cols-5 gap-4",
            children: Array.from({
              length: 5
            }, (_, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "space-y-4",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "text-center animate-pulse",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "text-sm text-muted-foreground",
                  children: "Loading..."
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "w-8 h-8 mx-auto rounded-full bg-gray-300"
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
                className: "min-h-[120px] animate-pulse",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                  className: "pb-2",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                    className: "h-4 bg-gray-300 rounded w-20"
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "space-y-2",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "h-8 bg-gray-300 rounded"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "h-8 bg-gray-300 rounded"
                    })]
                  })
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
                className: "min-h-[120px] animate-pulse",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                  className: "pb-2",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                    className: "h-4 bg-gray-300 rounded w-20"
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "space-y-2",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "h-8 bg-gray-300 rounded"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "h-8 bg-gray-300 rounded"
                    })]
                  })
                })]
              })]
            }, i))
          }) : earningsError ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "text-center py-8",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "text-red-500 mb-2",
              children: "⚠️ Erro ao carregar earnings"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "text-sm text-muted-foreground",
              children: "Usando dados de demonstração"
            })]
          }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "grid grid-cols-5 gap-4",
            children: weekDays.map((day) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "space-y-4",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "text-center",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "text-sm text-muted-foreground",
                  children: format(day, "EEE")
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "w-8 h-8 mx-auto rounded-full bg-teya-green text-rich-black flex items-center justify-center text-sm font-medium",
                  children: format(day, "d")
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
                className: "min-h-[120px]",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                  className: "pb-2",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
                    className: "text-xs text-muted-foreground",
                    children: "Before Open"
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                  className: "space-y-2",
                  children: getEarningsForDay(day, "before_open").map((earning, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(EarningsItem, {
                    earning
                  }, idx))
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
                className: "min-h-[120px]",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                  className: "pb-2",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
                    className: "text-xs text-muted-foreground",
                    children: "After Close"
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                  className: "space-y-2",
                  children: getEarningsForDay(day, "after_close").map((earning, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(EarningsItem, {
                    earning
                  }, idx))
                })]
              })]
            }, day.toISOString()))
          })
        }), selectedStock && /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "w-80",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex items-center space-x-3",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "w-10 h-10 rounded-lg bg-teya-green/20 flex items-center justify-center",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "font-medium",
                    children: selectedStock.charAt(0)
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
                    children: selectedStock
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                    className: "text-sm text-muted-foreground",
                    children: "Company Name"
                  })]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex items-center justify-between pt-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "text-2xl font-bold",
                  children: "$175.43"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                  className: "bg-positive text-white",
                  children: "+2.34%"
                })]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
              className: "space-y-4",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                  className: "font-medium mb-2",
                  children: "Next Earnings"
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center space-x-2 text-sm text-muted-foreground",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, {
                    className: "h-4"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    children: "Jan 25, 2024 - After Close"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "text-sm text-muted-foreground mt-1",
                  children: "Countdown: 5 days"
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                  className: "font-medium mb-2",
                  children: "Revenue vs EPS Estimates"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "h-32 bg-muted rounded-lg flex items-center justify-center",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-sm text-muted-foreground",
                    children: "Chart will be displayed here"
                  })
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                  className: "font-medium mb-2",
                  children: "Historical Earnings (Last 4 Quarters)"
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between items-center text-sm",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      children: "Q4 2023"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex space-x-2",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        className: "text-muted-foreground",
                        children: "Est: $2.05"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        className: "text-positive",
                        children: "Act: $2.11"
                      })]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between items-center text-sm",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      children: "Q3 2023"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex space-x-2",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        className: "text-muted-foreground",
                        children: "Est: $1.89"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        className: "text-positive",
                        children: "Act: $1.95"
                      })]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between items-center text-sm",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      children: "Q2 2023"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex space-x-2",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        className: "text-muted-foreground",
                        children: "Est: $1.82"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        className: "text-negative",
                        children: "Act: $1.78"
                      })]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between items-center text-sm",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      children: "Q1 2023"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex space-x-2",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        className: "text-muted-foreground",
                        children: "Est: $1.95"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        className: "text-positive",
                        children: "Act: $2.02"
                      })]
                    })]
                  })]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                className: "w-full",
                variant: "outline",
                children: "Show Estimates"
              })]
            })]
          })
        })]
      })]
    })
  });
}
export {
  EarningsCalendar as default
};
