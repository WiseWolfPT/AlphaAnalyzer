import axios from 'axios';

interface FinnhubConfig {
  apiKey: string;
}

interface CompanyProfile {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  marketCap: number;
  country: string;
  currency: string;
  website: string;
  logo?: string;
}

interface BasicFinancials {
  pe: number;
  ps: number;
  pb: number;
  evToEbitda: number;
  roe: number;
  roa: number;
  currentRatio: number;
  debtToEquity: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
}

class FinnhubService {
  private apiKey: string;
  private baseUrl = 'https://finnhub.io/api/v1';

  constructor(config: FinnhubConfig) {
    this.apiKey = config.apiKey || process.env.FINNHUB_API_KEY || 'demo';
  }

  async getCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/stock/profile2`, {
        params: {
          symbol: symbol,
          token: this.apiKey
        }
      });

      const data = response.data;
      
      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      return {
        symbol: symbol,
        name: data.name,
        sector: data.finnhubIndustry || '',
        industry: data.finnhubIndustry || '',
        marketCap: data.marketCapitalization * 1000000, // Convert to actual value
        country: data.country,
        currency: data.currency,
        website: data.weburl || '',
        logo: data.logo
      };
    } catch (error) {
      console.error('Error fetching company profile from Finnhub:', error);
      return null;
    }
  }

  async getBasicFinancials(symbol: string): Promise<BasicFinancials | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/stock/metric`, {
        params: {
          symbol: symbol,
          metric: 'all',
          token: this.apiKey
        }
      });

      const data = response.data;
      
      if (!data || !data.metric) {
        return null;
      }

      const metric = data.metric;

      return {
        pe: metric.peBasicExclExtraTTM || 0,
        ps: metric.psTTM || 0,
        pb: metric.pbQuarterly || 0,
        evToEbitda: metric['ev/ebitdaTTM'] || 0,
        roe: metric.roeTTM || 0,
        roa: metric.roaTTM || 0,
        currentRatio: metric.currentRatioQuarterly || 0,
        debtToEquity: metric['totalDebt/totalEquityQuarterly'] || 0,
        grossMargin: metric.grossMarginTTM || 0,
        operatingMargin: metric.operatingMarginTTM || 0,
        netMargin: metric.netProfitMarginTTM || 0
      };
    } catch (error) {
      console.error('Error fetching basic financials from Finnhub:', error);
      return null;
    }
  }

  async getQuote(symbol: string): Promise<any | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/quote`, {
        params: {
          symbol: symbol,
          token: this.apiKey
        }
      });

      const data = response.data;
      
      if (!data || data.c === 0) {
        return null;
      }

      return {
        c: data.c, // Current price
        d: data.d, // Change
        dp: data.dp, // Percent change
        h: data.h, // High price of the day
        l: data.l, // Low price of the day
        o: data.o, // Open price of the day
        pc: data.pc, // Previous close price
        t: data.t // Timestamp
      };
    } catch (error) {
      console.error('Error fetching quote from Finnhub:', error);
      return null;
    }
  }

  async searchSymbols(query: string): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          q: query,
          token: this.apiKey
        }
      });

      return response.data.result || [];
    } catch (error) {
      console.error('Error searching symbols:', error);
      return [];
    }
  }
}

export const finnhubService = new FinnhubService({
  apiKey: process.env.FINNHUB_API_KEY || 'demo'
});