import { apiRequest } from "./queryClient";
import type { Stock, Watchlist, IntrinsicValue, Earnings } from "@shared/schema";

// Stock API functions
export const stocksApi = {
  getAll: async (limit?: number, offset?: number): Promise<Stock[]> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    
    const response = await apiRequest("GET", `/api/stocks?${params}`);
    return response.json();
  },

  search: async (query: string, limit?: number): Promise<Stock[]> => {
    const params = new URLSearchParams({ q: query });
    if (limit) params.append('limit', limit.toString());
    
    const response = await apiRequest("GET", `/api/stocks/search?${params}`);
    return response.json();
  },

  getBySymbol: async (symbol: string): Promise<Stock> => {
    const response = await apiRequest("GET", `/api/stocks/${symbol}`);
    return response.json();
  },

  create: async (stock: Partial<Stock>): Promise<Stock> => {
    const response = await apiRequest("POST", "/api/stocks", stock);
    return response.json();
  }
};

// Watchlist API functions
export const watchlistsApi = {
  getAll: async (userId?: string): Promise<Watchlist[]> => {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    
    const response = await apiRequest("GET", `/api/watchlists?${params}`);
    return response.json();
  },

  create: async (name: string, userId?: string): Promise<Watchlist> => {
    const response = await apiRequest("POST", "/api/watchlists", { name, userId });
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    await apiRequest("DELETE", `/api/watchlists/${id}`);
  },

  getStocks: async (watchlistId: number): Promise<any[]> => {
    const response = await apiRequest("GET", `/api/watchlists/${watchlistId}/stocks`);
    return response.json();
  },

  addStock: async (watchlistId: number, stockSymbol: string): Promise<any> => {
    const response = await apiRequest("POST", `/api/watchlists/${watchlistId}/stocks`, {
      stockSymbol
    });
    return response.json();
  },

  removeStock: async (watchlistId: number, stockSymbol: string): Promise<void> => {
    await apiRequest("DELETE", `/api/watchlists/${watchlistId}/stocks/${stockSymbol}`);
  }
};

// Intrinsic Value API functions
export const intrinsicValueApi = {
  getAll: async (limit?: number): Promise<IntrinsicValue[]> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    
    const response = await apiRequest("GET", `/api/intrinsic-values?${params}`);
    return response.json();
  },

  getBySymbol: async (symbol: string): Promise<IntrinsicValue> => {
    const response = await apiRequest("GET", `/api/intrinsic-values/${symbol}`);
    return response.json();
  },

  calculate: async (params: {
    stockSymbol: string;
    eps: number;
    growthRate?: number;
    horizon?: number;
    peMultiple?: number;
    requiredReturn?: number;
    marginOfSafety?: number;
  }): Promise<any> => {
    const response = await apiRequest("POST", "/api/intrinsic-values/calculate", params);
    return response.json();
  },

  create: async (intrinsicValue: Partial<IntrinsicValue>): Promise<IntrinsicValue> => {
    const response = await apiRequest("POST", "/api/intrinsic-values", intrinsicValue);
    return response.json();
  }
};

// Earnings API functions
export const earningsApi = {
  getAll: async (limit?: number): Promise<Earnings[]> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    
    const response = await apiRequest("GET", `/api/earnings?${params}`);
    return response.json();
  },

  getBySymbol: async (symbol: string): Promise<Earnings[]> => {
    const response = await apiRequest("GET", `/api/earnings/${symbol}`);
    return response.json();
  }
};

// Recent Searches API functions
export const recentSearchesApi = {
  getAll: async (userId?: string, limit?: number): Promise<any[]> => {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (limit) params.append('limit', limit.toString());
    
    const response = await apiRequest("GET", `/api/recent-searches?${params}`);
    return response.json();
  },

  add: async (symbol: string, name: string, userId?: string): Promise<any> => {
    const response = await apiRequest("POST", "/api/recent-searches", {
      symbol,
      name,
      userId
    });
    return response.json();
  }
};

// Market Indices API functions
export const marketApi = {
  getIndices: async (): Promise<{
    dow: { value: number; change: number };
    sp500: { value: number; change: number };
    nasdaq: { value: number; change: number };
  }> => {
    const response = await apiRequest("GET", "/api/market-indices");
    return response.json();
  }
};
