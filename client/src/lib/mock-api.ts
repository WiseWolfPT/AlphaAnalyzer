// Mock API data for when backend is unavailable
const mockStocks = [
  { 
    symbol: "AAPL", 
    name: "Apple Inc.", 
    price: "175.43", 
    change: "2.34", 
    changePercent: "1.35", 
    marketCap: "$2.7T", 
    sector: "Technology", 
    eps: "6.13", 
    peRatio: "28.6", 
    logo: "https://logo.clearbit.com/apple.com" 
  },
  { 
    symbol: "MSFT", 
    name: "Microsoft Corporation", 
    price: "378.85", 
    change: "-1.23", 
    changePercent: "-0.32", 
    marketCap: "$2.8T", 
    sector: "Technology", 
    eps: "9.65", 
    peRatio: "39.2", 
    logo: "https://logo.clearbit.com/microsoft.com" 
  },
  { 
    symbol: "GOOGL", 
    name: "Alphabet Inc.", 
    price: "141.28", 
    change: "0.89", 
    changePercent: "0.63", 
    marketCap: "$1.8T", 
    sector: "Technology", 
    eps: "5.61", 
    peRatio: "25.2", 
    logo: "https://logo.clearbit.com/google.com" 
  },
  { 
    symbol: "AMZN", 
    name: "Amazon.com Inc.", 
    price: "142.56", 
    change: "3.45", 
    changePercent: "2.48", 
    marketCap: "$1.5T", 
    sector: "Consumer Discretionary", 
    eps: "0.98", 
    peRatio: "145.5", 
    logo: "https://logo.clearbit.com/amazon.com" 
  },
  { 
    symbol: "TSLA", 
    name: "Tesla Inc.", 
    price: "248.79", 
    change: "-5.67", 
    changePercent: "-2.23", 
    marketCap: "$792B", 
    sector: "Automotive", 
    eps: "4.73", 
    peRatio: "52.6", 
    logo: "https://logo.clearbit.com/tesla.com" 
  },
  { 
    symbol: "NVDA", 
    name: "NVIDIA Corporation", 
    price: "875.28", 
    change: "12.34", 
    changePercent: "1.43", 
    marketCap: "$2.2T", 
    sector: "Technology", 
    eps: "12.96", 
    peRatio: "67.5", 
    logo: "https://logo.clearbit.com/nvidia.com" 
  },
  { 
    symbol: "META", 
    name: "Meta Platforms Inc.", 
    price: "494.32", 
    change: "10.42", 
    changePercent: "2.15", 
    marketCap: "$1.3T", 
    sector: "Technology", 
    eps: "14.87", 
    peRatio: "33.2", 
    logo: "https://logo.clearbit.com/meta.com" 
  },
  { 
    symbol: "BRK-B", 
    name: "Berkshire Hathaway Inc.", 
    price: "432.18", 
    change: "3.58", 
    changePercent: "0.84", 
    marketCap: "$954B", 
    sector: "Financial Services", 
    eps: "22.55", 
    peRatio: "19.2", 
    logo: "https://logo.clearbit.com/berkshirehathaway.com" 
  }
];

export const enableMockAPI = () => {
  console.log('Mock API enabled as fallback');
};

export const getMockApiData = (endpoint: string) => {
  console.log('Getting mock data for:', endpoint);
  
  // Return mock stocks data
  if (endpoint === '/api/stocks') {
    return mockStocks;
  }
  
  // Handle individual stock lookup
  if (endpoint.startsWith('/api/stocks/') && !endpoint.includes('search')) {
    const symbol = endpoint.split('/').pop()?.toUpperCase();
    return mockStocks.find(s => s.symbol === symbol) || null;
  }
  
  // Handle search endpoint
  if (endpoint.includes('/api/stocks/search')) {
    const url = new URL(endpoint, 'http://localhost');
    const query = url.searchParams.get('q')?.toLowerCase() || '';
    
    if (!query) return [];
    
    return mockStocks.filter(stock => 
      stock.symbol.toLowerCase().includes(query) ||
      stock.name.toLowerCase().includes(query)
    );
  }
  
  return null;
};

export default { enableMockAPI, getMockApiData };
