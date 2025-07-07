// Alpha Vantage API Service - Wave 4 Reactivation
// Using secure server-side proxy endpoints
const ALPHA_VANTAGE_PROXY_URL = '/api/proxy/alphavantage';

export interface CompanyOverview {
  Symbol: string;
  AssetType: string;
  Name: string;
  Description: string;
  CIK: string;
  Exchange: string;
  Currency: string;
  Country: string;
  Sector: string;
  Industry: string;
  Address: string;
  OfficialSite: string;
  FiscalYearEnd: string;
  LatestQuarter: string;
  MarketCapitalization: string;
  EBITDA: string;
  PERatio: string;
  PEGRatio: string;
  BookValue: string;
  DividendPerShare: string;
  DividendYield: string;
  EPS: string;
  RevenuePerShareTTM: string;
  ProfitMargin: string;
  OperatingMarginTTM: string;
  ReturnOnAssetsTTM: string;
  ReturnOnEquityTTM: string;
  RevenueTTM: string;
  GrossProfitTTM: string;
  DilutedEPSTTM: string;
  QuarterlyEarningsGrowthYOY: string;
  QuarterlyRevenueGrowthYOY: string;
  AnalystTargetPrice: string;
  TrailingPE: string;
  ForwardPE: string;
  PriceToSalesRatioTTM: string;
  PriceToBookRatio: string;
  EVToRevenue: string;
  EVToEBITDA: string;
  Beta: string;
  "52WeekHigh": string;
  "52WeekLow": string;
  "50DayMovingAverage": string;
  "200DayMovingAverage": string;
  SharesOutstanding: string;
  DividendDate: string;
  ExDividendDate: string;
}

export interface EarningsData {
  symbol: string;
  annualEarnings: Array<{
    fiscalDateEnding: string;
    reportedEPS: string;
  }>;
  quarterlyEarnings: Array<{
    fiscalDateEnding: string;
    reportedDate: string;
    reportedEPS: string;
    estimatedEPS: string;
    surprise: string;
    surprisePercentage: string;
  }>;
}

export interface IncomeStatement {
  symbol: string;
  annualReports: Array<{
    fiscalDateEnding: string;
    reportedCurrency: string;
    grossProfit: string;
    totalRevenue: string;
    costOfRevenue: string;
    costofGoodsAndServicesSold: string;
    operatingIncome: string;
    sellingGeneralAndAdministrative: string;
    researchAndDevelopment: string;
    operatingExpenses: string;
    investmentIncomeNet: string;
    netInterestIncome: string;
    interestIncome: string;
    interestExpense: string;
    nonInterestIncome: string;
    otherNonOperatingIncome: string;
    depreciation: string;
    depreciationAndAmortization: string;
    incomeBeforeTax: string;
    incomeTaxExpense: string;
    interestAndDebtExpense: string;
    netIncomeFromContinuingOperations: string;
    comprehensiveIncomeNetOfTax: string;
    ebit: string;
    ebitda: string;
    netIncome: string;
  }>;
  quarterlyReports: Array<{
    fiscalDateEnding: string;
    reportedCurrency: string;
    grossProfit: string;
    totalRevenue: string;
    costOfRevenue: string;
    costofGoodsAndServicesSold: string;
    operatingIncome: string;
    sellingGeneralAndAdministrative: string;
    researchAndDevelopment: string;
    operatingExpenses: string;
    investmentIncomeNet: string;
    netInterestIncome: string;
    interestIncome: string;
    interestExpense: string;
    nonInterestIncome: string;
    otherNonOperatingIncome: string;
    depreciation: string;
    depreciationAndAmortization: string;
    incomeBeforeTax: string;
    incomeTaxExpense: string;
    interestAndDebtExpense: string;
    netIncomeFromContinuingOperations: string;
    comprehensiveIncomeNetOfTax: string;
    ebit: string;
    ebitda: string;
    netIncome: string;
  }>;
}

class AlphaVantageService {
  private proxyURL = ALPHA_VANTAGE_PROXY_URL;

  private async makeRequest<T>(endpoint: string): Promise<T> {
    const url = `${this.proxyURL}${endpoint}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Alpha Vantage proxy error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Handle proxy response format
      if (!result.success) {
        throw new Error(result.message || 'Alpha Vantage API request failed');
      }
      
      const data = result.data;
      
      // Check for API error messages
      if (data['Error Message']) {
        throw new Error(`Alpha Vantage API error: ${data['Error Message']}`);
      }
      
      if (data['Information']) {
        throw new Error(`Alpha Vantage API limit: ${data['Information']}`);
      }
      
      return data;
    } catch (error) {
      console.error('Alpha Vantage API request failed:', error);
      throw error;
    }
  }

  // Get company overview (includes EPS, revenue segments info)
  async getCompanyOverview(symbol: string): Promise<CompanyOverview> {
    return this.makeRequest<CompanyOverview>(`/overview/${symbol.toUpperCase()}`);
  }

  // Get earnings data (quarterly and annual EPS)
  async getEarnings(symbol: string): Promise<EarningsData> {
    return this.makeRequest<EarningsData>(`/earnings/${symbol.toUpperCase()}`);
  }

  // Get income statement (detailed expenses breakdown)
  async getIncomeStatement(symbol: string): Promise<IncomeStatement> {
    return this.makeRequest<IncomeStatement>(`/income-statement/${symbol.toUpperCase()}`);
  }

  // Get historical stock prices (fallback for Finnhub)
  async getHistoricalPrices(symbol: string, outputsize: 'compact' | 'full' = 'compact'): Promise<any> {
    return this.makeRequest(`/time-series-daily/${symbol.toUpperCase()}?outputsize=${outputsize}`);
  }
}

export const alphaVantageService = new AlphaVantageService();