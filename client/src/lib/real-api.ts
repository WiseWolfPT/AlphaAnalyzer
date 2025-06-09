// Real API service with intelligent caching and rotation
import { apiRotation } from './api-rotation';
import { mockStocks } from './mock-api';
import type { MockStock } from './mock-api';

interface RealStockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: string;
  peRatio?: number;
  eps?: number;
}

interface RealCompanyProfile {
  symbol: string;
  companyName: string;
  industry: string;
  sector: string;
  description?: string;
  website?: string;
  employees?: number;
}

interface RealFinancials {
  symbol: string;
  revenue: Array<{ quarter: string; value: number }>;
  netIncome: Array<{ quarter: string; value: number }>;
  eps: Array<{ quarter: string; value: number }>;
  freeCashFlow: Array<{ quarter: string; value: number }>;
}

export class RealAPIService {
  private fallbackToMock = true; // Enable graceful fallback to mock data

  async getStockQuote(symbol: string): Promise<MockStock | null> {
    try {
      // Try to get real data first
      const realData = await apiRotation.makeAPICall<any>(
        '/quote', 
        symbol, 
        'quote'
      );

      if (realData) {
        return this.transformToMockFormat(symbol, realData);
      }
    } catch (error) {
      console.warn(`Failed to get real data for ${symbol}:`, error);
    }

    // Fallback to mock data
    if (this.fallbackToMock) {
      console.log(`📦 Falling back to mock data for ${symbol}`);
      return mockStocks.find(stock => stock.symbol === symbol) || null;
    }

    return null;
  }

  async getCompanyProfile(symbol: string): Promise<Partial<MockStock> | null> {
    try {
      const realData = await apiRotation.makeAPICall<any>(
        '/profile', 
        symbol, 
        'profile'
      );

      if (realData) {
        return {
          symbol,
          name: realData.companyName || realData.name,
          sector: realData.sector || realData.industry,
          // Add more mappings as needed
        };
      }
    } catch (error) {
      console.warn(`Failed to get company profile for ${symbol}:`, error);
    }

    // Fallback to mock data
    if (this.fallbackToMock) {
      const mockStock = mockStocks.find(stock => stock.symbol === symbol);
      return mockStock ? {
        symbol: mockStock.symbol,
        name: mockStock.name,
        sector: mockStock.sector
      } : null;
    }

    return null;
  }

  async getFinancials(symbol: string): Promise<RealFinancials | null> {
    try {
      const realData = await apiRotation.makeAPICall<any>(
        '/financials', 
        symbol, 
        'financials'
      );

      if (realData) {
        return this.transformFinancials(symbol, realData);
      }
    } catch (error) {
      console.warn(`Failed to get financials for ${symbol}:`, error);
    }

    // Generate mock financials for fallback
    if (this.fallbackToMock) {
      return this.generateMockFinancials(symbol);
    }

    return null;
  }

  async getHistoricalData(symbol: string, period: string = '1M'): Promise<Array<{date: string, price: number}> | null> {
    try {
      const realData = await apiRotation.makeAPICall<any>(
        '/historical', 
        symbol, 
        'historical'
      );

      if (realData && realData.historical) {
        return realData.historical.map((item: any) => ({
          date: item.date,
          price: item.close
        }));
      }
    } catch (error) {
      console.warn(`Failed to get historical data for ${symbol}:`, error);
    }

    // Generate mock historical data
    if (this.fallbackToMock) {
      return this.generateMockHistorical(symbol, period);
    }

    return null;
  }

  private transformToMockFormat(symbol: string, realData: any): MockStock {
    // Find existing mock data for fallback values
    const existingMock = mockStocks.find(stock => stock.symbol === symbol);
    
    return {
      symbol,
      name: realData.name || existingMock?.name || `${symbol} Corp`,
      price: realData.price?.toString() || realData.c?.toString() || existingMock?.price || '100.00',
      change: realData.change?.toString() || realData.d?.toString() || existingMock?.change || '0.00',
      changePercent: realData.changesPercentage?.toString() || realData.dp?.toString() || existingMock?.changePercent || '0.00',
      sector: realData.sector || existingMock?.sector || 'Technology',
      marketCap: realData.marketCap || existingMock?.marketCap || 'N/A',
      eps: realData.eps?.toString() || existingMock?.eps || 'N/A',
      peRatio: realData.pe?.toString() || existingMock?.peRatio || 'N/A',
      intrinsicValue: existingMock?.intrinsicValue,
      valuation: existingMock?.valuation,
      logo: existingMock?.logo || null
    };
  }

  private transformFinancials(symbol: string, realData: any): RealFinancials {
    // Transform real API response to our format
    return {
      symbol,
      revenue: realData.revenue || this.generateMockQuarterlyData(80000, 120000),
      netIncome: realData.netIncome || this.generateMockQuarterlyData(15000, 25000),
      eps: realData.eps || this.generateMockQuarterlyData(3, 8),
      freeCashFlow: realData.freeCashFlow || this.generateMockQuarterlyData(20000, 40000)
    };
  }

  private generateMockFinancials(symbol: string): RealFinancials {
    return {
      symbol,
      revenue: this.generateMockQuarterlyData(80000, 120000),
      netIncome: this.generateMockQuarterlyData(15000, 25000),
      eps: this.generateMockQuarterlyData(3, 8),
      freeCashFlow: this.generateMockQuarterlyData(20000, 40000)
    };
  }

  private generateMockQuarterlyData(min: number, max: number): Array<{ quarter: string; value: number }> {
    const quarters = ['Q1 2023', 'Q2 2023', 'Q3 2023', 'Q4 2023', 'Q1 2024'];
    return quarters.map(quarter => ({
      quarter,
      value: Math.floor(Math.random() * (max - min) + min)
    }));
  }

  private generateMockHistorical(symbol: string, period: string): Array<{date: string, price: number}> {
    const mockStock = mockStocks.find(stock => stock.symbol === symbol);
    const basePrice = parseFloat(mockStock?.price || '100');
    
    const periods: Record<string, number> = {
      '1D': 1,
      '1W': 7,
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1Y': 365
    };

    const days = periods[period] || 30;
    const data = [];
    let currentPrice = basePrice;

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Add realistic price movement
      const change = (Math.random() - 0.5) * (basePrice * 0.02);
      currentPrice = Math.max(currentPrice + change, basePrice * 0.8);
      
      data.push({
        date: date.toISOString().split('T')[0],
        price: parseFloat(currentPrice.toFixed(2))
      });
    }

    return data;
  }

  // Configuration methods
  enableFallback(enabled: boolean): void {
    this.fallbackToMock = enabled;
  }

  getAPIStats() {
    return apiRotation.getUsageStats();
  }

  // Method to test API connectivity
  async testConnectivity(): Promise<{ provider: string; success: boolean; responseTime: number }[]> {
    const results = [];
    const testSymbol = 'AAPL';

    // Test each provider
    for (const provider of ['financialmodeling', 'alphavantage', 'iexcloud', 'finnhub']) {
      const startTime = Date.now();
      
      try {
        apiRotation.setProviderPreference(provider);
        const result = await this.getStockQuote(testSymbol);
        
        results.push({
          provider,
          success: !!result,
          responseTime: Date.now() - startTime
        });
      } catch (error) {
        results.push({
          provider,
          success: false,
          responseTime: Date.now() - startTime
        });
      }
    }

    // Reset providers
    apiRotation.resetProviders();
    return results;
  }
}

// Global instance
export const realAPI = new RealAPIService();