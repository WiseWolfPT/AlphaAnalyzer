import type { Stock } from "@shared/schema";

// Extended stock type for mock data with additional properties
export interface MockStock extends Omit<Stock, 'id' | 'lastUpdated'> {
  intrinsicValue?: string;
  valuation?: string;
}

// Mock API data for demo purposes
export const mockStocks: MockStock[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: '175.43',
    change: '2.34',
    changePercent: '1.35',
    sector: 'Technology',
    marketCap: '$2.8T',
    eps: '6.13',
    peRatio: '28.6',
    intrinsicValue: '159.74',
    valuation: 'overvalued',
    logo: null
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    price: '378.85',
    change: '-1.23',
    changePercent: '-0.32',
    sector: 'Technology',
    marketCap: '$2.8T',
    eps: '9.65',
    peRatio: '39.2',
    intrinsicValue: '420.15',
    valuation: 'undervalued',
    logo: null
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    price: '142.56',
    change: '4.12',
    changePercent: '2.98',
    sector: 'Technology',
    marketCap: '$1.8T',
    eps: '5.80',
    peRatio: '24.6',
    intrinsicValue: '165.30',
    valuation: 'undervalued',
    logo: null
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    price: '151.94',
    change: '-0.88',
    changePercent: '-0.58',
    sector: 'Consumer Discretionary',
    marketCap: '$1.5T',
    eps: '2.90',
    peRatio: '52.4',
    intrinsicValue: '145.20',
    valuation: 'overvalued',
    logo: null
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    price: '248.42',
    change: '12.67',
    changePercent: '5.37',
    sector: 'Automotive',
    marketCap: '$789B',
    eps: '3.62',
    peRatio: '68.6',
    intrinsicValue: '195.80',
    valuation: 'overvalued',
    logo: null
  },
  {
    symbol: 'META',
    name: 'Meta Platforms Inc.',
    price: '484.20',
    change: '8.93',
    changePercent: '1.88',
    sector: 'Technology',
    marketCap: '$1.2T',
    eps: '14.87',
    peRatio: '32.6',
    intrinsicValue: '510.45',
    valuation: 'undervalued',
    logo: null
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    price: '875.30',
    change: '45.20',
    changePercent: '5.44',
    sector: 'Technology',
    marketCap: '$2.1T',
    eps: '22.45',
    peRatio: '39.0',
    intrinsicValue: '780.90',
    valuation: 'overvalued',
    logo: null
  },
  {
    symbol: 'NFLX',
    name: 'Netflix Inc.',
    price: '641.05',
    change: '-8.45',
    changePercent: '-1.30',
    sector: 'Communication Services',
    marketCap: '$285B',
    eps: '12.55',
    peRatio: '51.1',
    intrinsicValue: '590.25',
    valuation: 'overvalued',
    logo: null
  }
];

export const mockWatchlists = [
  {
    id: 1,
    name: 'My Portfolio',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Tech Stocks',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const mockWatchlistStocks = [
  {
    id: 1,
    watchlistId: 1,
    stockSymbol: 'AAPL',
    addedAt: new Date().toISOString()
  },
  {
    id: 2,
    watchlistId: 1,
    stockSymbol: 'MSFT',
    addedAt: new Date().toISOString()
  },
  {
    id: 3,
    watchlistId: 2,
    stockSymbol: 'GOOGL',
    addedAt: new Date().toISOString()
  }
];

export const mockEarnings = [];

export const mockMarketIndices = {
  dow: { value: 39543.12, change: 0.23 },
  sp500: { value: 5486.34, change: -0.15 },
  nasdaq: { value: 17863.45, change: 0.67 }
};

// Helper function to get mock data based on URL
export function getMockApiData(url: string) {
  console.log('getMockApiData called with URL:', url);
  
  if (url === '/api/stocks') {
    console.log('Returning all stocks:', mockStocks.length);
    return mockStocks;
  }
  
  if (url.startsWith('/api/stocks/search?q=')) {
    const queryParam = url.split('q=')[1];
    if (!queryParam) return [];
    
    const searchTerm = decodeURIComponent(queryParam).toLowerCase();
    const results = mockStocks.filter(stock => 
      stock.symbol.toLowerCase().includes(searchTerm) ||
      stock.name.toLowerCase().includes(searchTerm)
    );
    console.log('Search results for', searchTerm, ':', results.length);
    return results;
  }
  
  if (url.startsWith('/api/stocks/') && !url.includes('search')) {
    const pathParts = url.split('/');
    const symbol = pathParts[pathParts.length - 1]?.toUpperCase();
    console.log('Looking for stock symbol:', symbol);
    console.log('Available symbols:', mockStocks.map(s => s.symbol));
    
    // Handle query parameters (remove them for symbol lookup)
    const cleanSymbol = symbol?.split('?')[0];
    console.log('Clean symbol:', cleanSymbol);
    
    const stock = mockStocks.find(s => s.symbol === cleanSymbol);
    console.log('Found stock:', stock ? stock.symbol : 'NOT FOUND');
    
    if (!stock) {
      console.log('Stock not found, returning first stock as fallback');
      return mockStocks[0];
    }
    
    return stock;
  }
  
  if (url === '/api/watchlists') {
    return mockWatchlists;
  }
  
  if (url.includes('/api/watchlists/') && url.includes('/stocks')) {
    const watchlistId = parseInt(url.split('/')[3]);
    return mockWatchlistStocks.filter(ws => ws.watchlistId === watchlistId);
  }
  
  if (url === '/api/earnings') {
    return mockEarnings;
  }
  
  if (url === '/api/market-indices') {
    return mockMarketIndices;
  }
  
  console.log('No match found for URL:', url);
  return [];
}