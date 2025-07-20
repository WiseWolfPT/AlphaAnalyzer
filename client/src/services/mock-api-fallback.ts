// Mock API Fallback - Temporary solution while backend is down
export const mockStockData = {
  'TSLA': {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    price: 248.50,
    change: -11.37,
    changePercent: -4.37,
    previousClose: 259.87,
    marketCap: 791.2e9,
    volume: 121234567,
    high: 252.75,
    low: 245.50,
    open: 251.25,
    fiftyTwoWeekHigh: 384.29,
    fiftyTwoWeekLow: 101.81,
    pe: 54.32,
    eps: 4.58,
    beta: 2.08,
    sector: 'Technology',
    industry: 'Auto Manufacturers'
  },
  'AAPL': {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 189.45,
    change: 2.13,
    changePercent: 1.14,
    previousClose: 187.32,
    marketCap: 2.95e12,
    volume: 54234567,
    high: 190.23,
    low: 187.45,
    open: 188.00,
    fiftyTwoWeekHigh: 199.62,
    fiftyTwoWeekLow: 164.08,
    pe: 29.45,
    eps: 6.43,
    beta: 1.25,
    sector: 'Technology',
    industry: 'Consumer Electronics'
  },
  'MSFT': {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    price: 415.67,
    change: 3.45,
    changePercent: 0.84,
    previousClose: 412.22,
    marketCap: 3.09e12,
    volume: 23456789,
    high: 417.89,
    low: 412.34,
    open: 413.50,
    fiftyTwoWeekHigh: 464.17,
    fiftyTwoWeekLow: 309.42,
    pe: 35.67,
    eps: 11.65,
    beta: 0.91,
    sector: 'Technology',
    industry: 'Software'
  },
  'AMZN': {
    symbol: 'AMZN',
    name: 'Amazon.com, Inc.',
    price: 177.89,
    change: -1.23,
    changePercent: -0.69,
    previousClose: 179.12,
    marketCap: 1.84e12,
    volume: 45678901,
    high: 179.45,
    low: 176.23,
    open: 178.50,
    fiftyTwoWeekHigh: 189.84,
    fiftyTwoWeekLow: 118.35,
    pe: 45.23,
    eps: 3.93,
    beta: 1.15,
    sector: 'Consumer Cyclical',
    industry: 'Internet Retail'
  },
  'GOOGL': {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    price: 139.45,
    change: 0.87,
    changePercent: 0.63,
    previousClose: 138.58,
    marketCap: 1.77e12,
    volume: 34567890,
    high: 140.23,
    low: 138.12,
    open: 138.90,
    fiftyTwoWeekHigh: 154.93,
    fiftyTwoWeekLow: 115.83,
    pe: 24.56,
    eps: 5.68,
    beta: 1.03,
    sector: 'Technology',
    industry: 'Internet Services'
  }
};

export const mockMarketNews = [
  {
    id: '1',
    headline: 'Tesla atinge nova máxima após resultados trimestrais',
    summary: 'As ações da Tesla subiram 5% após a empresa reportar lucros acima das expectativas.',
    source: 'MarketWatch',
    url: '#',
    datetime: new Date().toISOString(),
    image: 'https://images.unsplash.com/photo-1611016186353-9af58c69a533?w=400'
  },
  {
    id: '2',
    headline: 'Apple anuncia novo produto revolucionário',
    summary: 'A Apple revelou seu mais recente dispositivo de realidade aumentada.',
    source: 'TechCrunch',
    url: '#',
    datetime: new Date(Date.now() - 3600000).toISOString(),
    image: 'https://images.unsplash.com/photo-1621768216002-5ac171876625?w=400'
  }
];

export const mockEarningsCalendar = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    reportDate: '2024-01-25',
    fiscalDateEnding: '2023-12-31',
    estimate: 2.10,
    currency: 'USD'
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    reportDate: '2024-01-24',
    fiscalDateEnding: '2023-12-31',
    estimate: 2.65,
    currency: 'USD'
  }
];

// Mock API response wrapper
export async function mockApiResponse<T>(data: T, delay = 300): Promise<T> {
  await new Promise(resolve => setTimeout(resolve, delay));
  return data;
}

// Intercept failed API calls and return mock data
export async function withMockFallback<T>(
  apiCall: () => Promise<T>,
  mockData: T
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    console.warn('API call failed, using mock data:', error);
    return mockApiResponse(mockData);
  }
}