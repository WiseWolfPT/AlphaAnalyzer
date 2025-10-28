import { r as reactExports, Z as createClient } from "./index-DF734YkB.js";
const __vite_import_meta_env__ = { "BASE_URL": "/", "DEV": false, "MODE": "production", "PROD": true, "SSR": false, "VITE_API_URL": "https://crucial-ivonne-alfalyzer-90666a9e.coolify.app", "VITE_STRIPE_PUBLISHABLE_KEY": "pk_test_51Rk4X709S131S3SekOeSHiCXa1GGcnKqBtW9czmrggHqj7yinv8rupIbOMYmmfGGNdisSU62QW14GGDgllI9k6qy00TyIffmuw", "VITE_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2am5mZXNzZWZ4dGZ1cmF5eWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMzA0MzUsImV4cCI6MjA2NzkwNjQzNX0.Y5PnmWmemcXroIKBcycgTiUceINMOuVe34aQUcygl9Q", "VITE_SUPABASE_URL": "https://avjnfessefxtfurayybp.supabase.co" };
const REQUIRED_ENV_VARS = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];
function validateEnv() {
  const missing = [];
  for (const varName of REQUIRED_ENV_VARS) {
    if (!__vite_import_meta_env__[varName]) {
      missing.push(varName);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}
Please check your .env file and ensure all required variables are set.`);
  }
}
function getAppUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}
let _env = null;
function getEnv() {
  if (_env) {
    return _env;
  }
  validateEnv();
  _env = {
    supabase: {
      url: "https://avjnfessefxtfurayybp.supabase.co",
      anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2am5mZXNzZWZ4dGZ1cmF5eWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMzA0MzUsImV4cCI6MjA2NzkwNjQzNX0.Y5PnmWmemcXroIKBcycgTiUceINMOuVe34aQUcygl9Q"
    },
    app: {
      url: getAppUrl(),
      isDev: false,
      isProd: true
    }
  };
  return Object.freeze(_env);
}
const env = {
  /**
   * Get the full Supabase configuration
   */
  getSupabaseConfig() {
    const {
      supabase: supabase2
    } = getEnv();
    return supabase2;
  },
  /**
   * Get the application URL
   */
  getAppUrl() {
    const {
      app
    } = getEnv();
    return app.url;
  },
  /**
   * Check if running in development mode
   */
  isDev() {
    const {
      app
    } = getEnv();
    return app.isDev;
  },
  /**
   * Check if running in production mode
   */
  isProd() {
    const {
      app
    } = getEnv();
    return app.isProd;
  },
  /**
   * Build a full URL from a path
   */
  buildUrl(path) {
    const appUrl = env.getAppUrl();
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${appUrl}${normalizedPath}`;
  }
};
const supabase = createClient(env.getSupabaseConfig().url, env.getSupabaseConfig().anonKey);
function useRealtimeQuotes({
  symbols,
  onUpdate,
  enabled = true
}) {
  const [quotes, setQuotes] = reactExports.useState({});
  const [isConnected, setIsConnected] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (!enabled || symbols.length === 0) return;
    console.log("🔌 Connecting to Supabase Realtime for symbols:", symbols);
    const channel = supabase.channel("quotes-updates").on("postgres_changes", {
      event: "*",
      // INSERT and UPDATE
      schema: "public",
      table: "cache_quotes",
      filter: symbols.length > 0 ? `key=in.(${symbols.map((s) => `quote_${s}`).join(",")})` : void 0
    }, (payload) => {
      if (payload.new && payload.new.data) {
        const data = payload.new.data;
        const quote = {
          symbol: data.symbol,
          price: data.price,
          change: data.change,
          change_percent: data.change_percent,
          volume: data.volume || 0,
          timestamp: data.timestamp
        };
        setQuotes((prev) => ({
          ...prev,
          [quote.symbol]: quote
        }));
        if (typeof onUpdate === "function") {
          try {
            onUpdate(quote);
          } catch (err) {
            console.warn("onUpdate callback threw an error:", err);
          }
        }
      }
    }).on("presence", {
      event: "sync"
    }, () => {
      setIsConnected(true);
      console.log("✅ Connected to Supabase Realtime");
    }).subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        setError(null);
      } else if (status === "CHANNEL_ERROR") {
        setError("Failed to connect to realtime updates");
        setIsConnected(false);
      }
    });
    return () => {
      console.log("🔌 Disconnecting from Supabase Realtime");
      supabase.removeChannel(channel);
    };
  }, [symbols.join(","), enabled, onUpdate]);
  return {
    quotes,
    isConnected,
    error
  };
}
function useRealtimeQuote(symbol, options) {
  const enabled = typeof options === "object" && options !== null && "enabled" in options ? Boolean(options.enabled) : true;
  const onUpdate = typeof options === "function" ? options : typeof options === "object" && options?.onUpdate ? options.onUpdate : void 0;
  const {
    quotes,
    isConnected,
    error
  } = useRealtimeQuotes({
    symbols: [symbol],
    onUpdate,
    enabled
  });
  return {
    quote: quotes[symbol],
    isConnected,
    error
  };
}
export {
  useRealtimeQuote as u
};
