// Finnhub API Service
// SECURITY: API key moved to server-side - use proxy endpoints instead
const FINNHUB_API_KEY = 'DEPRECATED_USE_SERVER_PROXY';
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

export interface StockPrice {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
}

export interface BasicFinancials {
  metric: {
    '10DayAverageTradingVolume': number;
    '52WeekHigh': number;
    '52WeekLow': number;
    marketCapitalization: number;
    peBasicExclExtraTTM: number;
    dividendYieldIndicatedAnnual: number;
    epsBasicExclExtraTTM: number;
    totalSharesOutstanding: number;
    freeCashFlowTTM: number;
    netIncomeCommonShareholdersTTM: number;
    ebitdaTTM: number;
    totalDebt: number;
    totalCash: number;
    roeTTM: number;
    roaTTM: number;
    grossMarginTTM: number;
    operatingMarginTTM: number;
    netProfitMarginTTM: number;
  };
}

export interface FinancialStatement {
  data: Array<{
    year: number;
    quarter: number;
    period: string;
    totalRevenue: number;
    costOfRevenue: number;
    grossProfit: number;
    operatingExpense: number;
    operatingIncome: number;
    netIncome: number;
    eps: number;
    ebitda: number;
    freeCashFlow: number;
    totalCash: number;
    totalDebt: number;
    totalAssets: number;
    totalEquity: number;
    sharesOutstanding: number;
  }>;
}

export interface DividendData {
  symbol: string;
  date: string;
  amount: number;
  adjustedAmount: number;
  payDate: string;
  recordDate: string;
  declarationDate: string;
  currency: string;
}

export interface CompanyProfile {
  country: string;
  currency: string;
  exchange: string;
  ipo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
  logo: string;
  finnhubIndustry: string;
}

class FinnhubService {
  private baseURL = FINNHUB_BASE_URL;
  private apiKey = FINNHUB_API_KEY;

  private async makeRequest<T>(endpoint: string): Promise<T> {
    const url = `${this.baseURL}${endpoint}&token=${this.apiKey}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Finnhub API request failed:', error);
      throw error;
    }
  }

  // Get real-time stock price
  async getStockPrice(symbol: string): Promise<StockPrice> {
    return this.makeRequest<StockPrice>(`/quote?symbol=${symbol.toUpperCase()}`);
  }

  // Get company profile
  async getCompanyProfile(symbol: string): Promise<CompanyProfile> {
    return this.makeRequest<CompanyProfile>(`/stock/profile2?symbol=${symbol.toUpperCase()}`);
  }

  // Get basic financials (ratios, metrics)
  async getBasicFinancials(symbol: string): Promise<BasicFinancials> {
    return this.makeRequest<BasicFinancials>(`/stock/metric?symbol=${symbol.toUpperCase()}&metric=all`);
  }

  // Get income statements
  async getIncomeStatement(symbol: string, frequency: 'annual' | 'quarterly' = 'quarterly'): Promise<FinancialStatement> {
    return this.makeRequest<FinancialStatement>(`/stock/financials?symbol=${symbol.toUpperCase()}&statement=income&freq=${frequency}`);
  }

  // Get balance sheet
  async getBalanceSheet(symbol: string, frequency: 'annual' | 'quarterly' = 'quarterly'): Promise<FinancialStatement> {
    return this.makeRequest<FinancialStatement>(`/stock/financials?symbol=${symbol.toUpperCase()}&statement=balance-sheet&freq=${frequency}`);
  }

  // Get cash flow statement
  async getCashFlowStatement(symbol: string, frequency: 'annual' | 'quarterly' = 'quarterly'): Promise<FinancialStatement> {
    return this.makeRequest<FinancialStatement>(`/stock/financials?symbol=${symbol.toUpperCase()}&statement=cash-flow&freq=${frequency}`);
  }

  // Get dividends data
  async getDividends(symbol: string, from: string, to: string): Promise<DividendData[]> {
    return this.makeRequest<DividendData[]>(`/stock/dividend?symbol=${symbol.toUpperCase()}&from=${from}&to=${to}`);
  }

  // Get historical stock prices
  async getHistoricalPrices(symbol: string, resolution: string, from: number, to: number): Promise<any> {
    return this.makeRequest(`/stock/candle?symbol=${symbol.toUpperCase()}&resolution=${resolution}&from=${from}&to=${to}`);
  }
}

export const finnhubService = new FinnhubService();