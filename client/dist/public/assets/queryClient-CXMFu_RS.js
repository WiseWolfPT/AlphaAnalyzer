import { a as apiConfig } from "./api-config-Zh6ttKls.js";
import { aU as QueryClient } from "./index-DF734YkB.js";
function getAuthHeaders() {
  const headers = {};
  const token = localStorage.getItem("alfalyzer-token") || localStorage.getItem("auth-token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}
async function throwIfResNotOk(res) {
  if (!res.ok) {
    const text = await res.text() || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}
async function apiRequest(method, url, data) {
  try {
    let fullURL;
    if (url.startsWith("http")) {
      fullURL = url;
    } else if (url.startsWith("/api")) {
      fullURL = url;
    } else {
      fullURL = `${apiConfig.baseURL}${url}`;
    }
    const res = await fetch(fullURL, {
      method,
      headers: {
        ...data ? {
          "Content-Type": "application/json"
        } : {},
        ...getAuthHeaders()
      },
      body: data ? JSON.stringify(data) : void 0,
      credentials: "include"
    });
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`🔴 API Request failed: ${method} ${url}`, error);
    throw error;
  }
}
const getQueryFn = ({
  on401: unauthorizedBehavior
}) => async ({
  queryKey
}) => {
  const url = queryKey[0];
  try {
    console.log("🔄 Query for:", url);
    try {
      const fullURL = url.startsWith("http") ? url : url.startsWith("/api") ? url : `${apiConfig.baseURL}${url}`;
      const res = await fetch(fullURL, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        }
      });
      if (unauthorizedBehavior === "returnNull" && res.status === 401) ;
      if (res.ok) {
        const data = await res.json();
        console.log("✅ Backend API success for:", url);
        return data;
      } else {
        console.warn("⚠️ Backend API failed:", res.status, res.statusText);
        throw new Error(`API request failed: ${res.status} ${res.statusText}`);
      }
    } catch (fetchError) {
      console.warn("⚠️ Backend fetch failed:", fetchError);
      throw fetchError;
    }
  } catch (error) {
    console.error("❌ Query function error:", error);
    throw error;
  }
};
new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({
        on401: "throw"
      }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      // CRITICAL: Use cache if data is fresh (within staleTime)
      staleTime: 5 * 60 * 1e3,
      // 5 minutes - data stays fresh
      gcTime: 10 * 60 * 1e3,
      // 10 minutes - cache persists in memory (TanStack Query v5)
      retry: 2,
      // Retry failed requests
      retryDelay: (attemptIndex) => Math.min(1e3 * 2 ** attemptIndex, 3e4)
    },
    mutations: {
      retry: false
    }
  }
});
export {
  apiRequest as a
};
