// Data Aggregator - Combines Finnhub + Alpha Vantage data for comprehensive stock analysis
import { finnhubService } from './finnhub';
import { alphaVantageService } from './alpha-vantage';

export interface AggregatedStockData {
  symbol: string;
  name: string;
  logo: string;
  currentPrice: {
    price: number;
    change: number;
    changePercent: number;
    high: number;
    low: number;
    open: number;
    previousClose: number;
  };
  profile: {
    sector: string;
    industry: string;
    marketCap: number;
    sharesOutstanding: number;
    country: string;
    currency: string;
    website: string;
  };
  charts: {
    price: Array<{ date: string; price: number }>;
    revenue: Array<{ quarter: string; value: number }>;
    revenueBySegment: Array<{ quarter: string; segments: Record<string, number> }>;
    ebitda: Array<{ quarter: string; value: number }>;
    freeCashFlow: Array<{ quarter: string; value: number }>;
    netIncome: Array<{ quarter: string; value: number }>;
    eps: Array<{ quarter: string; value: number }>;
    cashAndDebt: Array<{ quarter: string; cash: number; debt: number }>;
    dividends: Array<{ date: string; amount: number }>;
    returnOfCapital: Array<{ quarter: string; value: number }>;
    sharesOutstanding: Array<{ quarter: string; value: number }>;
    ratios: Array<{ quarter: string; pe: number; roe: number; roa: number; grossMargin: number }>;
    valuation: Array<{ date: string; value: number }>;
    expenses: Array<{ quarter: string; operating: number; rd: number; sga: number; other: number }>;
  };
  keyMetrics: {
    pe: number;
    eps: number;
    dividendYield: number;
    marketCap: number;
    freeCashFlow: number;
    netIncome: number;
    ebitda: number;
    totalCash: number;
    totalDebt: number;
    roe: number;
    roa: number;
    grossMargin: number;
    operatingMargin: number;
    netMargin: number;
  };
}

class DataAggregatorService {
  private cache = new Map<string, { data: AggregatedStockData; timestamp: number }>();
  private readonly CACHE_DURATION = 1000 * 60 * 60; // 1 hour cache

  private getCachedData(symbol: string): AggregatedStockData | null {
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    this.cache.delete(symbol);
    return null;
  }

  private setCachedData(symbol: string, data: AggregatedStockData): void {
    this.cache.set(symbol, { data, timestamp: Date.now() });
  }

  async getCompleteStockData(symbol: string): Promise<AggregatedStockData> {
    // Check cache first
    const cached = this.getCachedData(symbol);
    if (cached) {
      return cached;
    }

    try {
      // Fetch data from both APIs in parallel
      const [
        stockPrice,
        companyProfile,
        basicFinancials,
        incomeStatement,
        balanceSheet,
        cashFlowStatement,
        dividends,
        alphaOverview,
        alphaEarnings,
        alphaIncomeStatement
      ] = await Promise.allSettled([
        finnhubService.getStockPrice(symbol),
        finnhubService.getCompanyProfile(symbol),
        finnhubService.getBasicFinancials(symbol),
        finnhubService.getIncomeStatement(symbol),
        finnhubService.getBalanceSheet(symbol),
        finnhubService.getCashFlowStatement(symbol),
        this.getDividendsData(symbol),
        alphaVantageService.getCompanyOverview(symbol),
        alphaVantageService.getEarnings(symbol),
        alphaVantageService.getIncomeStatement(symbol)
      ]);

      // Process and combine the data
      const aggregatedData = this.processAndCombineData(
        symbol,
        stockPrice,
        companyProfile,
        basicFinancials,
        incomeStatement,
        balanceSheet,
        cashFlowStatement,
        dividends,
        alphaOverview,
        alphaEarnings,
        alphaIncomeStatement
      );

      // Cache the result
      this.setCachedData(symbol, aggregatedData);

      return aggregatedData;
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error);
      throw new Error(`Failed to fetch complete stock data for ${symbol}`);
    }
  }

  private async getDividendsData(symbol: string) {
    const currentDate = new Date();
    const oneYearAgo = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), currentDate.getDate());
    
    const from = Math.floor(oneYearAgo.getTime() / 1000).toString();
    const to = Math.floor(currentDate.getTime() / 1000).toString();
    
    return finnhubService.getDividends(symbol, from, to);
  }

  private processAndCombineData(
    symbol: string,
    stockPrice: any,
    companyProfile: any,
    basicFinancials: any,
    incomeStatement: any,
    balanceSheet: any,
    cashFlowStatement: any,
    dividends: any,
    alphaOverview: any,
    alphaEarnings: any,
    alphaIncomeStatement: any
  ): AggregatedStockData {
    
    // Helper function to safely get fulfilled value
    const getValue = (result: any) => result.status === 'fulfilled' ? result.value : null;

    const priceData = getValue(stockPrice);
    const profileData = getValue(companyProfile);
    const financialsData = getValue(basicFinancials);
    const incomeData = getValue(incomeStatement);
    const balanceData = getValue(balanceSheet);
    const cashFlowData = getValue(cashFlowStatement);
    const dividendsData = getValue(dividends);
    const alphaOverviewData = getValue(alphaOverview);
    const alphaEarningsData = getValue(alphaEarnings);
    const alphaIncomeData = getValue(alphaIncomeStatement);

    return {
      symbol: symbol.toUpperCase(),
      name: profileData?.name || alphaOverviewData?.Name || symbol,
      logo: profileData?.logo || '',
      
      currentPrice: {
        price: priceData?.c || 0,
        change: priceData?.d || 0,
        changePercent: priceData?.dp || 0,
        high: priceData?.h || 0,
        low: priceData?.l || 0,
        open: priceData?.o || 0,
        previousClose: priceData?.pc || 0,
      },

      profile: {
        sector: alphaOverviewData?.Sector || profileData?.finnhubIndustry || '',
        industry: alphaOverviewData?.Industry || '',
        marketCap: financialsData?.metric?.marketCapitalization || parseFloat(alphaOverviewData?.MarketCapitalization || '0'),
        sharesOutstanding: financialsData?.metric?.totalSharesOutstanding || parseFloat(alphaOverviewData?.SharesOutstanding || '0'),
        country: profileData?.country || alphaOverviewData?.Country || '',
        currency: profileData?.currency || alphaOverviewData?.Currency || '',
        website: profileData?.weburl || alphaOverviewData?.OfficialSite || '',
      },

      charts: {
        price: this.processHistoricalPrices([]), // Will be implemented with real data
        revenue: this.processRevenueData(incomeData, alphaIncomeData),
        revenueBySegment: this.processRevenueSegments(alphaOverviewData), // Limited data available
        ebitda: this.processEbitdaData(incomeData, alphaIncomeData),
        freeCashFlow: this.processFreeCashFlowData(cashFlowData),
        netIncome: this.processNetIncomeData(incomeData, alphaIncomeData),
        eps: this.processEpsData(alphaEarningsData),
        cashAndDebt: this.processCashAndDebtData(balanceData),
        dividends: this.processDividendsData(dividendsData),
        returnOfCapital: this.processReturnOfCapitalData(cashFlowData),
        sharesOutstanding: this.processSharesData(incomeData),
        ratios: this.processRatiosData(financialsData, alphaOverviewData),
        valuation: this.processValuationData(financialsData, alphaOverviewData),
        expenses: this.processExpensesData(alphaIncomeData),
      },

      keyMetrics: {
        pe: financialsData?.metric?.peBasicExclExtraTTM || parseFloat(alphaOverviewData?.PERatio || '0'),
        eps: financialsData?.metric?.epsBasicExclExtraTTM || parseFloat(alphaOverviewData?.EPS || '0'),
        dividendYield: financialsData?.metric?.dividendYieldIndicatedAnnual || parseFloat(alphaOverviewData?.DividendYield || '0'),
        marketCap: financialsData?.metric?.marketCapitalization || parseFloat(alphaOverviewData?.MarketCapitalization || '0'),
        freeCashFlow: financialsData?.metric?.freeCashFlowTTM || 0,
        netIncome: financialsData?.metric?.netIncomeCommonShareholdersTTM || 0,
        ebitda: financialsData?.metric?.ebitdaTTM || parseFloat(alphaOverviewData?.EBITDA || '0'),
        totalCash: financialsData?.metric?.totalCash || 0,
        totalDebt: financialsData?.metric?.totalDebt || 0,
        roe: financialsData?.metric?.roeTTM || parseFloat(alphaOverviewData?.ReturnOnEquityTTM || '0'),
        roa: financialsData?.metric?.roaTTM || parseFloat(alphaOverviewData?.ReturnOnAssetsTTM || '0'),
        grossMargin: financialsData?.metric?.grossMarginTTM || parseFloat(alphaOverviewData?.GrossProfitTTM || '0'),
        operatingMargin: financialsData?.metric?.operatingMarginTTM || parseFloat(alphaOverviewData?.OperatingMarginTTM || '0'),
        netMargin: financialsData?.metric?.netProfitMarginTTM || parseFloat(alphaOverviewData?.ProfitMargin || '0'),
      }
    };
  }

  // Chart data processing methods
  private processHistoricalPrices(data: any): Array<{ date: string; price: number }> {
    // Mock data for now - will implement real historical prices
    const mockData = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      mockData.push({
        date: date.toISOString().split('T')[0],
        price: 150 + Math.random() * 50
      });
    }
    return mockData;
  }

  private processRevenueData(finnhubData: any, alphaData: any): Array<{ quarter: string; value: number }> {
    const data: Array<{ quarter: string; value: number }> = [];
    
    // Try Finnhub data first
    if (finnhubData?.data) {
      finnhubData.data.slice(0, 8).forEach((item: any) => {
        if (item.totalRevenue) {
          data.push({
            quarter: `Q${item.quarter} ${item.year}`,
            value: item.totalRevenue / 1000000 // Convert to millions
          });
        }
      });
    }
    
    // Fallback to Alpha Vantage
    if (data.length === 0 && alphaData?.quarterlyReports) {
      alphaData.quarterlyReports.slice(0, 8).forEach((item: any) => {
        if (item.totalRevenue && item.totalRevenue !== 'None') {
          data.push({
            quarter: item.fiscalDateEnding,
            value: parseFloat(item.totalRevenue) / 1000000
          });
        }
      });
    }
    
    return data.reverse();
  }

  private processRevenueSegments(alphaData: any): Array<{ quarter: string; segments: Record<string, number> }> {
    // This would require more detailed segment data - using mock for now
    const mockData = [];
    for (let i = 8; i >= 1; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - (i * 3));
      mockData.push({
        quarter: `Q${Math.ceil((date.getMonth() + 1) / 3)} ${date.getFullYear()}`,
        segments: {
          'iPhone': 120000 + Math.random() * 50000,
          'iPad': 20000 + Math.random() * 10000,
          'Mac': 15000 + Math.random() * 8000,
          'Services': 25000 + Math.random() * 15000,
          'Wearables': 12000 + Math.random() * 5000
        }
      });
    }
    return mockData;
  }

  private processEbitdaData(finnhubData: any, alphaData: any): Array<{ quarter: string; value: number }> {
    const data: Array<{ quarter: string; value: number }> = [];
    
    if (finnhubData?.data) {
      finnhubData.data.slice(0, 8).forEach((item: any) => {
        if (item.ebitda) {
          data.push({
            quarter: `Q${item.quarter} ${item.year}`,
            value: item.ebitda / 1000000
          });
        }
      });
    }
    
    if (data.length === 0 && alphaData?.quarterlyReports) {
      alphaData.quarterlyReports.slice(0, 8).forEach((item: any) => {
        if (item.ebitda && item.ebitda !== 'None') {
          data.push({
            quarter: item.fiscalDateEnding,
            value: parseFloat(item.ebitda) / 1000000
          });
        }
      });
    }
    
    return data.reverse();
  }

  private processFreeCashFlowData(cashFlowData: any): Array<{ quarter: string; value: number }> {
    const data: Array<{ quarter: string; value: number }> = [];
    
    if (cashFlowData?.data) {
      cashFlowData.data.slice(0, 8).forEach((item: any) => {
        if (item.freeCashFlow) {
          data.push({
            quarter: `Q${item.quarter} ${item.year}`,
            value: item.freeCashFlow / 1000000
          });
        }
      });
    }
    
    return data.reverse();
  }

  private processNetIncomeData(finnhubData: any, alphaData: any): Array<{ quarter: string; value: number }> {
    const data: Array<{ quarter: string; value: number }> = [];
    
    if (finnhubData?.data) {
      finnhubData.data.slice(0, 8).forEach((item: any) => {
        if (item.netIncome) {
          data.push({
            quarter: `Q${item.quarter} ${item.year}`,
            value: item.netIncome / 1000000
          });
        }
      });
    }
    
    if (data.length === 0 && alphaData?.quarterlyReports) {
      alphaData.quarterlyReports.slice(0, 8).forEach((item: any) => {
        if (item.netIncome && item.netIncome !== 'None') {
          data.push({
            quarter: item.fiscalDateEnding,
            value: parseFloat(item.netIncome) / 1000000
          });
        }
      });
    }
    
    return data.reverse();
  }

  private processEpsData(alphaEarningsData: any): Array<{ quarter: string; value: number }> {
    const data: Array<{ quarter: string; value: number }> = [];
    
    if (alphaEarningsData?.quarterlyEarnings) {
      alphaEarningsData.quarterlyEarnings.slice(0, 8).forEach((item: any) => {
        if (item.reportedEPS && item.reportedEPS !== 'None') {
          data.push({
            quarter: item.fiscalDateEnding,
            value: parseFloat(item.reportedEPS)
          });
        }
      });
    }
    
    return data.reverse();
  }

  private processCashAndDebtData(balanceData: any): Array<{ quarter: string; cash: number; debt: number }> {
    const data: Array<{ quarter: string; cash: number; debt: number }> = [];
    
    if (balanceData?.data) {
      balanceData.data.slice(0, 8).forEach((item: any) => {
        data.push({
          quarter: `Q${item.quarter} ${item.year}`,
          cash: (item.totalCash || 0) / 1000000,
          debt: (item.totalDebt || 0) / 1000000
        });
      });
    }
    
    return data.reverse();
  }

  private processDividendsData(dividendsData: any): Array<{ date: string; amount: number }> {
    if (!dividendsData || !Array.isArray(dividendsData)) return [];
    
    return dividendsData.map((dividend: any) => ({
      date: dividend.date,
      amount: dividend.amount
    })).slice(0, 12);
  }

  private processReturnOfCapitalData(cashFlowData: any): Array<{ quarter: string; value: number }> {
    // Mock data - would need more specific financial calculations
    const data = [];
    for (let i = 8; i >= 1; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - (i * 3));
      data.push({
        quarter: `Q${Math.ceil((date.getMonth() + 1) / 3)} ${date.getFullYear()}`,
        value: 15 + Math.random() * 10
      });
    }
    return data;
  }

  private processSharesData(incomeData: any): Array<{ quarter: string; value: number }> {
    const data: Array<{ quarter: string; value: number }> = [];
    
    if (incomeData?.data) {
      incomeData.data.slice(0, 8).forEach((item: any) => {
        if (item.sharesOutstanding) {
          data.push({
            quarter: `Q${item.quarter} ${item.year}`,
            value: item.sharesOutstanding / 1000000 // Convert to millions
          });
        }
      });
    }
    
    return data.reverse();
  }

  private processRatiosData(financialsData: any, alphaData: any): Array<{ quarter: string; pe: number; roe: number; roa: number; grossMargin: number }> {
    // Mock quarterly ratios - real implementation would need historical ratio data
    const data = [];
    for (let i = 8; i >= 1; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - (i * 3));
      data.push({
        quarter: `Q${Math.ceil((date.getMonth() + 1) / 3)} ${date.getFullYear()}`,
        pe: 25 + Math.random() * 10,
        roe: 0.15 + Math.random() * 0.1,
        roa: 0.08 + Math.random() * 0.05,
        grossMargin: 0.35 + Math.random() * 0.1
      });
    }
    return data;
  }

  private processValuationData(financialsData: any, alphaData: any): Array<{ date: string; value: number }> {
    // Mock valuation data - would need historical P/E, P/B ratios
    const data = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        value: 35 + Math.random() * 15
      });
    }
    return data;
  }

  private processExpensesData(alphaIncomeData: any): Array<{ quarter: string; operating: number; rd: number; sga: number; other: number }> {
    const data: Array<{ quarter: string; operating: number; rd: number; sga: number; other: number }> = [];
    
    if (alphaIncomeData?.quarterlyReports) {
      alphaIncomeData.quarterlyReports.slice(0, 8).forEach((item: any) => {
        data.push({
          quarter: item.fiscalDateEnding,
          operating: parseFloat(item.operatingExpenses || '0') / 1000000,
          rd: parseFloat(item.researchAndDevelopment || '0') / 1000000,
          sga: parseFloat(item.sellingGeneralAndAdministrative || '0') / 1000000,
          other: parseFloat(item.otherNonOperatingIncome || '0') / 1000000
        });
      });
    }
    
    return data.reverse();
  }
}

export const dataAggregatorService = new DataAggregatorService();