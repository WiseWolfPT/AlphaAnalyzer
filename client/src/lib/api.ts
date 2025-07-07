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

// AI Chat API functions
export const aiApi = {
  countTokens: async (text: string, model?: string): Promise<{
    tokens: number;
    model: string;
  }> => {
    const response = await apiRequest("POST", "/api/ai/count-tokens", {
      text,
      model
    });
    return response.json();
  },

  estimateTokens: async (text: string): Promise<{
    tokens: number;
    isEstimate: boolean;
  }> => {
    const response = await apiRequest("POST", "/api/ai/estimate-tokens", {
      text
    });
    return response.json();
  },

  generateTranscriptSummary: async (params: {
    transcript: string;
    ticker: string;
    quarter: string;
    year: number;
  }): Promise<{
    summary: string;
    inputTokens: number;
  }> => {
    const response = await apiRequest("POST", "/api/ai/generate-transcript-summary", params);
    return response.json();
  },

  chatWithAssistant: async (message: string, context?: {
    symbol?: string;
    conversation?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }): Promise<{
    response: string;
    tokens?: number;
  }> => {
    const response = await apiRequest("POST", "/api/ai/chat", {
      message,
      context
    });
    const data = await response.json();
    return {
      response: data.response,
      tokens: data.inputTokens + (data.outputTokens || 0)
    };
  }
};

// Portfolio API functions
export const portfolioApi = {
  getAll: async (userId?: string): Promise<any[]> => {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    
    const response = await apiRequest("GET", `/api/portfolios?${params}`);
    return response.json();
  },

  getById: async (id: string): Promise<any> => {
    const response = await apiRequest("GET", `/api/portfolios/${id}`);
    return response.json();
  },

  create: async (portfolio: any): Promise<any> => {
    const response = await apiRequest("POST", "/api/portfolios", portfolio);
    return response.json();
  },

  update: async (id: string, portfolio: any): Promise<any> => {
    const response = await apiRequest("PUT", `/api/portfolios/${id}`, portfolio);
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    await apiRequest("DELETE", `/api/portfolios/${id}`);
  }
};

// Unified API object for backward compatibility
export const api = {
  get: async (url: string) => {
    const response = await apiRequest("GET", url);
    const data = await response.json();
    return { data };
  },
  post: async (url: string, data?: any) => {
    const response = await apiRequest("POST", url, data);
    const responseData = await response.json();
    return { data: responseData };
  },
  put: async (url: string, data?: any) => {
    const response = await apiRequest("PUT", url, data);
    const responseData = await response.json();
    return { data: responseData };
  },
  delete: async (url: string) => {
    await apiRequest("DELETE", url);
    return {};
  }
};
