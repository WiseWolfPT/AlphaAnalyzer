import { a as apiRequest } from "./queryClient-CXMFu_RS.js";
import "./api-config-Zh6ttKls.js";
import "./index-DF734YkB.js";
const stocksApi = {
  getAll: async (limit, offset) => {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    if (offset) params.append("offset", offset.toString());
    const response = await apiRequest("GET", `/stocks?${params}`);
    return response.json();
  },
  search: async (query, limit) => {
    const params = new URLSearchParams({
      q: query
    });
    if (limit) params.append("limit", limit.toString());
    const response = await apiRequest("GET", `/stocks/search?${params}`);
    return response.json();
  },
  getBySymbol: async (symbol) => {
    const response = await apiRequest("GET", `/stocks/${symbol}`);
    return response.json();
  },
  create: async (stock) => {
    const response = await apiRequest("POST", "/stocks", stock);
    return response.json();
  }
};
const watchlistsApi = {
  getAll: async (userId) => {
    const params = new URLSearchParams();
    if (userId) params.append("userId", userId);
    const response = await apiRequest("GET", `/watchlists?${params}`);
    return response.json();
  },
  create: async (name, userId) => {
    const response = await apiRequest("POST", "/watchlists", {
      name,
      userId
    });
    return response.json();
  },
  delete: async (id) => {
    await apiRequest("DELETE", `/watchlists/${id}`);
  },
  getStocks: async (watchlistId) => {
    const response = await apiRequest("GET", `/watchlists/${watchlistId}/stocks`);
    return response.json();
  },
  addStock: async (watchlistId, stockSymbol) => {
    const response = await apiRequest("POST", `/watchlists/${watchlistId}/stocks`, {
      stockSymbol
    });
    return response.json();
  },
  removeStock: async (watchlistId, stockSymbol) => {
    await apiRequest("DELETE", `/watchlists/${watchlistId}/stocks/${stockSymbol}`);
  }
};
const intrinsicValueApi = {
  getAll: async (limit) => {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    const response = await apiRequest("GET", `/intrinsic-values?${params}`);
    return response.json();
  },
  getBySymbol: async (symbol) => {
    const response = await apiRequest("GET", `/cache/intrinsic-values/${symbol}`);
    return response.json();
  },
  calculate: async (params) => {
    const response = await apiRequest("POST", "/intrinsic-values/calculate", params);
    return response.json();
  },
  create: async (intrinsicValue) => {
    const response = await apiRequest("POST", "/intrinsic-values", intrinsicValue);
    return response.json();
  }
};
const earningsApi = {
  getAll: async (limit) => {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    const response = await apiRequest("GET", `/earnings?${params}`);
    return response.json();
  },
  getBySymbol: async (symbol) => {
    const response = await apiRequest("GET", `/earnings/${symbol}`);
    return response.json();
  }
};
const recentSearchesApi = {
  getAll: async (userId, limit) => {
    const params = new URLSearchParams();
    if (userId) params.append("userId", userId);
    if (limit) params.append("limit", limit.toString());
    const response = await apiRequest("GET", `/recent-searches?${params}`);
    return response.json();
  },
  add: async (symbol, name, userId) => {
    const response = await apiRequest("POST", "/recent-searches", {
      symbol,
      name,
      userId
    });
    return response.json();
  }
};
const marketApi = {
  getIndices: async () => {
    const response = await apiRequest("GET", "/api/market-indices");
    return response.json();
  }
};
export {
  earningsApi,
  intrinsicValueApi,
  marketApi,
  recentSearchesApi,
  stocksApi,
  watchlistsApi
};
