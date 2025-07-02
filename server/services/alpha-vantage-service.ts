import axios from 'axios';

interface AlphaVantageConfig {
  apiKey: string;
}

interface CompanyOverview {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  marketCap: number;
  country: string;
  currency: string;
  website: string;
}

interface IncomeStatement {
  date: string;
  revenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  eps: number;
  ebitda: number;
  freeCashFlow?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  totalEquity?: number;
  cash?: number;
  debt?: number;
  sharesOutstanding: number;
}

interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

class AlphaVantageService {
  private apiKey: string;
  private baseUrl = 'https://www.alphavantage.co/query';

  constructor(config: AlphaVantageConfig) {
    this.apiKey = config.apiKey || process.env.ALPHA_VANTAGE_API_KEY || 'demo';
  }

  async getCompanyOverview(symbol: string): Promise<CompanyOverview | null> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'OVERVIEW',
          symbol: symbol,
          apikey: this.apiKey
        }
      });

      const data = response.data;
      
      if (!data || data['Error Message'] || data['Note']) {
        console.warn('Alpha Vantage API limit reached or error:', data);
        return null;
      }

      return {
        symbol: data.Symbol,
        name: data.Name,
        sector: data.Sector,
        industry: data.Industry,
        marketCap: parseInt(data.MarketCapitalization) || 0,
        country: data.Country,
        currency: data.Currency,
        website: data.WebSite || ''
      };
    } catch (error) {
      console.error('Error fetching company overview:', error);
      return null;
    }
  }

  async getIncomeStatement(symbol: string, period: 'quarterly' | 'annual'): Promise<IncomeStatement[]> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'INCOME_STATEMENT',
          symbol: symbol,
          apikey: this.apiKey
        }
      });

      const data = response.data;
      
      if (!data || data['Error Message'] || data['Note']) {
        console.warn('Alpha Vantage API limit reached or error:', data);
        return [];
      }

      const statements = period === 'quarterly' 
        ? data.quarterlyReports 
        : data.annualReports;

      if (!statements || !Array.isArray(statements)) {
        return [];
      }

      return statements.slice(0, 8).map((statement: any) => ({
        date: statement.fiscalDateEnding,
        revenue: parseFloat(statement.totalRevenue) || 0,
        grossProfit: parseFloat(statement.grossProfit) || 0,
        operatingIncome: parseFloat(statement.operatingIncome) || 0,
        netIncome: parseFloat(statement.netIncome) || 0,
        eps: parseFloat(statement.reportedEPS) || 0,
        ebitda: parseFloat(statement.ebitda) || 0,
        sharesOutstanding: parseFloat(statement.commonStockSharesOutstanding) || 0
      }));
    } catch (error) {
      console.error('Error fetching income statement:', error);
      return [];
    }
  }

  async getDailyPrices(symbol: string, startDate: Date, endDate: Date): Promise<PriceData[]> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'TIME_SERIES_DAILY',
          symbol: symbol,
          outputsize: 'compact',
          apikey: this.apiKey
        }
      });

      const data = response.data;
      
      if (!data || data['Error Message'] || data['Note']) {
        console.warn('Alpha Vantage API limit reached or error:', data);
        return [];
      }

      const timeSeries = data['Time Series (Daily)'];
      
      if (!timeSeries) {
        return [];
      }

      const prices: PriceData[] = [];
      
      for (const [date, values] of Object.entries(timeSeries)) {
        const dateObj = new Date(date);
        
        if (dateObj >= startDate && dateObj <= endDate) {
          prices.push({
            date: date,
            open: parseFloat(values['1. open']),
            high: parseFloat(values['2. high']),
            low: parseFloat(values['3. low']),
            close: parseFloat(values['4. close']),
            volume: parseInt(values['5. volume'])
          });
        }
      }

      return prices.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error('Error fetching daily prices:', error);
      return [];
    }
  }

  async getQuote(symbol: string): Promise<any | null> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol,
          apikey: this.apiKey
        }
      });

      const data = response.data;
      
      if (!data || data['Error Message'] || data['Note']) {
        console.warn('Alpha Vantage API limit reached or error:', data);
        return null;
      }

      const quote = data['Global Quote'];
      
      if (!quote) {
        return null;
      }

      return {
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        volume: parseInt(quote['06. volume']),
        latestTradingDay: quote['07. latest trading day'],
        previousClose: parseFloat(quote['08. previous close']),
        open: parseFloat(quote['02. open']),
        high: parseFloat(quote['03. high']),
        low: parseFloat(quote['04. low'])
      };
    } catch (error) {
      console.error('Error fetching quote:', error);
      return null;
    }
  }
}

export const alphaVantageService = new AlphaVantageService({
  apiKey: process.env.ALPHA_VANTAGE_API_KEY || 'demo'
});