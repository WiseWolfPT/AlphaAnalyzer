function detectEnvironment() {
  if (typeof window === "undefined") {
    return {
      name: "development",
      apiBase: "/api",
      wsBase: "/ws",
      debug: true
    };
  }
  const hostname = window.location.hostname;
  if (hostname === "128.140.45.28.sslip.io" || hostname === "128.140.45.28" || hostname.includes("sslip.io")) {
    return {
      name: "production",
      apiBase: "/api",
      // Same server, use relative paths
      wsBase: "/ws",
      debug: false
    };
  }
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0") {
    return {
      name: "development",
      apiBase: "/api",
      // Uses Vite proxy
      wsBase: "/ws",
      // Uses Vite proxy
      debug: true
    };
  }
  return {
    name: "production",
    apiBase: "/api",
    wsBase: "/ws",
    debug: false
  };
}
const environment = detectEnvironment();
const apiConfig = {
  baseURL: environment.apiBase,
  timeout: 3e4,
  // 30 seconds
  retries: 3,
  retryDelay: 1e3,
  // 1 second
  wsURL: environment.wsBase
};
function getAPIURL(endpoint) {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  if (apiConfig.baseURL.endsWith("/api")) {
    return `${apiConfig.baseURL}/${cleanEndpoint}`;
  }
  return `${apiConfig.baseURL}/api/${cleanEndpoint}`;
}
if (environment.debug && typeof window !== "undefined") {
  console.log("🔧 API Configuration:", {
    environment: environment.name,
    apiBase: environment.apiBase,
    wsBase: environment.wsBase,
    baseURL: apiConfig.baseURL,
    timeout: apiConfig.timeout
  });
}
export {
  apiConfig as a,
  getAPIURL as g
};
