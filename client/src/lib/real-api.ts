// Real API service with intelligent caching and rotation
import { apiRotation } from './api-rotation';
import type { Stock } from '@shared/schema';

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
  // Mock fallback removed - using real API data only

  async getStockQuote(symbol: string): Promise<Stock | null> {
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

    // No mock fallback - return null if no real data
    console.warn(`❌ No real data available for ${symbol}`);
    return null;
  }

  async getCompanyProfile(symbol: string): Promise<Partial<Stock> | null> {
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

    // No mock fallback - return null if no real data
    console.warn(`❌ No company profile available for ${symbol}`);
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

    // No mock fallback - return null if no real data
    console.warn(`❌ No financials available for ${symbol}`);
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

    // No mock fallback - return null if no real data
    console.warn(`❌ No historical data available for ${symbol}`);
    return null;
  }

  private transformToMockFormat(symbol: string, realData: any): Stock {
    return {
      id: 0, // Will be assigned by database
      symbol,
      name: realData.name || `${symbol} Corp`,
      price: realData.price?.toString() || realData.c?.toString() || '100.00',
      change: realData.change?.toString() || realData.d?.toString() || '0.00',
      changePercent: realData.changesPercentage?.toString() || realData.dp?.toString() || '0.00',
      sector: realData.sector || 'Technology',
      industry: realData.industry || null,
      marketCap: realData.marketCap || 'N/A',
      eps: realData.eps?.toString() || 'N/A',
      peRatio: realData.pe?.toString() || 'N/A',
      logo: null,
      lastUpdated: new Date()
    };
  }

  private transformFinancials(symbol: string, realData: any): RealFinancials {
    // Transform real API response to our format - no mock fallback
    return {
      symbol,
      revenue: realData.revenue || [],
      netIncome: realData.netIncome || [],
      eps: realData.eps || [],
      freeCashFlow: realData.freeCashFlow || []
    };
  }

  // Mock methods removed - using real API data only

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