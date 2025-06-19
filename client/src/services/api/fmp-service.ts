import { API_CONFIG } from '@/config/api-keys';
import { CacheManager } from '@/lib/cache-manager';
import type { Stock, IntrinsicValue } from '@shared/schema';

export interface FMPFundamentals {
  symbol: string;
  marketCap: number;
  peRatio: number;
  priceToBookRatio: number;
  debtToEquity: number;
  currentRatio: number;
  quickRatio: number;
  grossProfitMargin: number;
  operatingProfitMargin: number;
  netProfitMargin: number;
  returnOnAssets: number;
  returnOnEquity: number;
  revenuePerShare: number;
  netIncomePerShare: number;
  operatingCashFlowPerShare: number;
  freeCashFlowPerShare: number;
  cashPerShare: number;
  bookValuePerShare: number;
  tangibleBookValuePerShare: number;
  shareholdersEquityPerShare: number;
  interestDebtPerShare: number;
  marketCapitalization: number;
  enterpriseValue: number;
  priceToSalesRatio: number;
  pocfratio: number;
  pfcfRatio: number;
  pbRatio: number;
  ptbRatio: number;
  evToSales: number;
  enterpriseValueOverEBITDA: number;
  evToOperatingCashFlow: number;
  evToFreeCashFlow: number;
  earningsYield: number;
  freeCashFlowYield: number;
  debtToAssets: number;
  netDebtToEBITDA: number;
  dividendYield: number;
  dividendPerShare: number;
  dividendPayoutRatio: number;
}

export interface FMPIncomeStatement {
  symbol: string;
  date: string;
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
  symbol: string;
  date: string;
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
  symbol: string;
  date: string;
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

export class FMPService {
  private cache: CacheManager;
  private apiKey: string;
  private baseUrl: string;

  constructor(cache?: CacheManager) {
    this.cache = cache || new CacheManager();
    this.apiKey = API_CONFIG.FMP.apiKey;
    this.baseUrl = API_CONFIG.FMP.baseUrl;
  }

  async getKeyMetrics(symbol: string): Promise<FMPFundamentals | null> {
    const cacheKey = `fmp:key-metrics:${symbol}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached as FMPFundamentals;

    try {
      const response = await fetch(
        `${this.baseUrl}/key-metrics/${symbol}?apikey=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`FMP API error: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data || data.length === 0) return null;

      const fundamentals = data[0] as FMPFundamentals;
      
      // Cache for 24 hours
      await this.cache.set(cacheKey, fundamentals, 24 * 60 * 60 * 1000);
      
      return fundamentals;
    } catch (error) {
      console.error('FMP getKeyMetrics error:', error);
      return null;
    }
  }

  async getIncomeStatement(symbol: string, period: 'annual' | 'quarter' = 'annual'): Promise<FMPIncomeStatement[]> {
    const cacheKey = `fmp:income-statement:${symbol}:${period}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached as FMPIncomeStatement[];

    try {
      const response = await fetch(
        `${this.baseUrl}/income-statement/${symbol}?period=${period}&apikey=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`FMP API error: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data || data.length === 0) return [];

      // Cache for 24 hours
      await this.cache.set(cacheKey, data, 24 * 60 * 60 * 1000);
      
      return data as FMPIncomeStatement[];
    } catch (error) {
      console.error('FMP getIncomeStatement error:', error);
      return [];
    }
  }

  async getBalanceSheet(symbol: string, period: 'annual' | 'quarter' = 'annual'): Promise<FMPBalanceSheet[]> {
    const cacheKey = `fmp:balance-sheet:${symbol}:${period}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached as FMPBalanceSheet[];

    try {
      const response = await fetch(
        `${this.baseUrl}/balance-sheet-statement/${symbol}?period=${period}&apikey=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`FMP API error: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data || data.length === 0) return [];

      // Cache for 24 hours
      await this.cache.set(cacheKey, data, 24 * 60 * 60 * 1000);
      
      return data as FMPBalanceSheet[];
    } catch (error) {
      console.error('FMP getBalanceSheet error:', error);
      return [];
    }
  }

  async getCashFlow(symbol: string, period: 'annual' | 'quarter' = 'annual'): Promise<FMPCashFlow[]> {
    const cacheKey = `fmp:cash-flow:${symbol}:${period}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached as FMPCashFlow[];

    try {
      const response = await fetch(
        `${this.baseUrl}/cash-flow-statement/${symbol}?period=${period}&apikey=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`FMP API error: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data || data.length === 0) return [];

      // Cache for 24 hours
      await this.cache.set(cacheKey, data, 24 * 60 * 60 * 1000);
      
      return data as FMPCashFlow[];
    } catch (error) {
      console.error('FMP getCashFlow error:', error);
      return [];
    }
  }

  async getCompanyProfile(symbol: string): Promise<any> {
    const cacheKey = `fmp:profile:${symbol}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${this.baseUrl}/profile/${symbol}?apikey=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`FMP API error: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data || data.length === 0) return null;

      const profile = data[0];
      
      // Cache for 24 hours
      await this.cache.set(cacheKey, profile, 24 * 60 * 60 * 1000);
      
      return profile;
    } catch (error) {
      console.error('FMP getCompanyProfile error:', error);
      return null;
    }
  }

  async getRealTimePrice(symbol: string): Promise<number | null> {
    const cacheKey = `fmp:price:${symbol}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached as number;

    try {
      const response = await fetch(
        `${this.baseUrl}/quote-short/${symbol}?apikey=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`FMP API error: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data || data.length === 0) return null;

      const price = data[0].price;
      
      // Cache for 1 minute
      await this.cache.set(cacheKey, price, 60 * 1000);
      
      return price;
    } catch (error) {
      console.error('FMP getRealTimePrice error:', error);
      return null;
    }
  }

  async getIntrinsicValueData(symbol: string): Promise<Partial<IntrinsicValue> | null> {
    try {
      const [keyMetrics, incomeStatements, balanceSheets, cashFlows, profile] = await Promise.all([
        this.getKeyMetrics(symbol),
        this.getIncomeStatement(symbol, 'annual'),
        this.getBalanceSheet(symbol, 'annual'),
        this.getCashFlow(symbol, 'annual'),
        this.getCompanyProfile(symbol)
      ]);

      if (!keyMetrics || incomeStatements.length === 0) return null;

      const latestIncome = incomeStatements[0];
      const latestBalance = balanceSheets[0];
      const latestCashFlow = cashFlows[0];

      // Calculate growth rates
      const revenueGrowth = incomeStatements.length > 1
        ? ((latestIncome.revenue - incomeStatements[1].revenue) / incomeStatements[1].revenue) * 100
        : 0;

      const epsGrowth = incomeStatements.length > 1 && incomeStatements[1].eps !== 0
        ? ((latestIncome.eps - incomeStatements[1].eps) / Math.abs(incomeStatements[1].eps)) * 100
        : 0;

      const intrinsicData: Partial<IntrinsicValue> = {
        stockSymbol: symbol,
        currentPrice: profile?.price || 0,
        eps: latestIncome.eps,
        growthRate: epsGrowth,
        peMultiple: keyMetrics.peRatio,
        bookValue: keyMetrics.bookValuePerShare,
        roe: keyMetrics.returnOnEquity * 100, // Convert to percentage
        payoutRatio: keyMetrics.dividendPayoutRatio || 0,
        requiredReturn: 10, // Default required return
        marginOfSafety: 25, // Default margin of safety
        debtToEquity: keyMetrics.debtToEquity,
        freeCashFlow: latestCashFlow?.freeCashFlow || 0,
        revenue: latestIncome.revenue,
        netIncome: latestIncome.netIncome,
        totalDebt: latestBalance?.totalDebt || 0,
        cash: latestBalance?.cashAndCashEquivalents || 0,
        sharesOutstanding: latestIncome.weightedAverageShsOut,
      };

      return intrinsicData;
    } catch (error) {
      console.error('FMP getIntrinsicValueData error:', error);
      return null;
    }
  }
}