import { config } from 'dotenv';
import { resolve } from 'path';

// Simple logger for worker
const logger = {
  info: (msg: string, ...args: any[]) => console.log(`[${new Date().toISOString()}] INFO:`, msg, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[${new Date().toISOString()}] ERROR:`, msg, ...args),
  warn: (msg: string, ...args: any[]) => console.warn(`[${new Date().toISOString()}] WARN:`, msg, ...args),
  debug: (msg: string, ...args: any[]) => console.log(`[${new Date().toISOString()}] DEBUG:`, msg, ...args),
};

// Load environment variables
const envPath = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : '.env'; // Use .env for development (where our FMP_API_KEY is)
// Ensure environment is loaded BEFORE any dynamic imports that depend on it
config({ path: resolve(process.cwd(), envPath) });

// IMPORTANT: Load Redis cache service only AFTER dotenv, so REDIS_* are available
let redisCacheService: any;
async function ensureRedis() {
  if (!redisCacheService) {
    const mod = await import('../cache/redis-cache-service.js');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    redisCacheService = (mod as any).redisCacheService;
  }
  return redisCacheService;
}

// Verify FMP API key is loaded
if (!process.env.FMP_API_KEY) {
  console.error('❌ FMP_API_KEY not found in environment variables!');
  console.log('Loading from:', envPath);
}

// --- Simple token bucket for pacing API calls (moved above to avoid TDZ issues) ---
class TokenBucket {
  private capacity: number;
  private tokens: number;
  private refillIntervalMs: number;
  private lastRefill: number;

  constructor(capacity: number, refillIntervalMs: number) {
    this.capacity = Math.max(1, capacity);
    this.tokens = this.capacity;
    this.refillIntervalMs = refillIntervalMs;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    if (now - this.lastRefill >= this.refillIntervalMs) {
      this.tokens = this.capacity;
      this.lastRefill = now;
    }
  }

  async take(n = 1): Promise<void> {
    while (true) {
      this.refill();
      if (this.tokens >= n) {
        this.tokens -= n;
        return;
      }
      const waitMs = Math.max(50, this.refillIntervalMs - (Date.now() - this.lastRefill));
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
}

/**
 * Proactive Worker for updating stock prices in cache
 * Updates 300 popular stocks every 30 seconds for instant response times
 */
type UniverseSource = 'env' | 'pg';

class ProactiveWorker {
  private stocks: string[] = [
    // Magnificent 7
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
    
    // Top S&P 500 by market cap
    'BRK-B', 'JPM', 'JNJ', 'V', 'PG', 'UNH', 'HD', 'MA',
    'DIS', 'BAC', 'ADBE', 'NFLX', 'CRM', 'CMCSA', 'XOM', 'CVX',
    'PFE', 'ABBV', 'KO', 'TMO', 'CSCO', 'PEP', 'WMT', 'MRK',
    'AVGO', 'LLY', 'VZ', 'INTC', 'DHR', 'ABT', 'ACN', 'NKE',
    
    // Tech giants
    'ORCL', 'IBM', 'QCOM', 'TXN', 'AMD', 'NOW', 'INTU', 'PYPL',
    'SNE', 'UBER', 'SQ', 'SHOP', 'SNAP', 'PINS', 'ROKU', 'ZM',
    'DOCU', 'OKTA', 'TWLO', 'CRWD', 'PANW', 'NET', 'DDOG', 'SNOW',
    
    // Finance
    'GS', 'MS', 'WFC', 'C', 'USB', 'BLK', 'SCHW', 'AXP',
    'SPGI', 'CME', 'ICE', 'COF', 'PNC', 'TFC', 'FISV', 'PYPL',
    
    // Healthcare
    'JNJ', 'UNH', 'PFE', 'TMO', 'ABBV', 'LLY', 'MRK', 'ABT',
    'DHR', 'CVS', 'MDT', 'BMY', 'AMGN', 'GILD', 'ISRG', 'SYK',
    
    // Consumer
    'WMT', 'HD', 'MCD', 'NKE', 'SBUX', 'TGT', 'COST', 'LOW',
    'TJX', 'BKNG', 'MAR', 'HLT', 'YUM', 'CMG', 'DPZ', 'LULU',
    
    // Energy & Materials
    'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'PXD', 'VLO', 'MPC',
    'FCX', 'NEM', 'APD', 'LIN', 'ECL', 'SHW', 'DD', 'DOW',
    
    // Industrial
    'BA', 'CAT', 'HON', 'UPS', 'RTX', 'LMT', 'GE', 'MMM',
    'DE', 'FDX', 'NSC', 'UNP', 'WM', 'EMR', 'ETN', 'ITW',
    
    // REITs
    'AMT', 'PLD', 'CCI', 'EQIX', 'PSA', 'O', 'SPG', 'WELL',
    'AVB', 'EQR', 'DLR', 'SUI', 'VTR', 'PEAK', 'ARE', 'MAA',
    
    // ETFs
    'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'EFA', 'EEM',
    'GLD', 'SLV', 'USO', 'TLT', 'HYG', 'LQD', 'XLF', 'XLK',
    
    // Crypto-related
    'COIN', 'MARA', 'RIOT', 'MSTR', 'SQ', 'PYPL', 'HOOD', 'SI',
    
    // Meme stocks & Popular retail
    'GME', 'AMC', 'BB', 'NOK', 'PLTR', 'SOFI', 'WISH', 'CLOV',
    'NIO', 'XPEV', 'LI', 'RIVN', 'LCID', 'FSR', 'RIDE', 'NKLA',
    
    // International ADRs
    'TSM', 'BABA', 'NVO', 'ASML', 'SAP', 'TM', 'SONY', 'TCEHY',
    'JD', 'BIDU', 'PDD', 'NIO', 'XPEV', 'LI', 'VALE', 'RIO',
    
    // Growth stocks
    'MRNA', 'SE', 'RBLX', 'U', 'DASH', 'ABNB', 'PATH', 'AFRM',
    'UPST', 'HOOD', 'CPNG', 'NU', 'GRAB', 'TOST', 'DOCS', 'ZI',
    
    // Dividend aristocrats
    'T', 'MO', 'XOM', 'CVX', 'ABBV', 'PM', 'BTI', 'KMI',
    'ENB', 'EPD', 'MMP', 'ET', 'OKE', 'KMI', 'WMB', 'LNG',
    
    // Gaming & Entertainment
    'ATVI', 'EA', 'TTWO', 'NTDOY', 'RBLX', 'DKNG', 'PENN', 'MGM',
    'LVS', 'WYNN', 'CZR', 'MAR', 'HLT', 'RCL', 'CCL', 'NCLH',
    
    // Cannabis
    'TLRY', 'CGC', 'ACB', 'CRON', 'SNDL', 'HEXO', 'OGI', 'VFF',
    
    // Space & Defense
    'SPCE', 'LMT', 'NOC', 'RTX', 'BA', 'GD', 'HII', 'TXT',
    
    // EV & Battery
    'TSLA', 'RIVN', 'LCID', 'NIO', 'XPEV', 'LI', 'FSR', 'NKLA',
    'GM', 'F', 'STLA', 'TM', 'HMC', 'VWAGY', 'LAC', 'ALB',
    
    // Biotech
    'BIIB', 'REGN', 'VRTX', 'ILMN', 'ALXN', 'SGEN', 'INCY', 'BMRN',
    
    // Airlines
    'DAL', 'UAL', 'AAL', 'LUV', 'ALK', 'JBLU', 'SAVE', 'HA',
    
    // Banks Regional
    'SIVB', 'PACW', 'WAL', 'ZION', 'KEY', 'RF', 'CFG', 'HBAN',
    
    // Insurance
    'BRK-B', 'UNH', 'AIG', 'PRU', 'MET', 'ALL', 'TRV', 'CB',
    
    // Utilities
    'NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'SRE', 'XEL'
  ];
  
  // Refresh intervals and sizes (ENV parametrization)
  private hotSetSize = Math.max(0, parseInt(process.env.HOT_SET_SIZE || '0', 10)); // 0 => use all
  private hotRefreshSeconds = Math.max(1, parseInt(process.env.HOT_SET_REFRESH_SECONDS || '30', 10));
  private updateInterval = Math.max(1000, this.hotRefreshSeconds * 1000);
  private warmSetSize = Math.max(0, parseInt(process.env.WARM_SET_SIZE || '0', 10));
  private warmRefreshSeconds = Math.max(0, parseInt(process.env.WARM_SET_REFRESH_SECONDS || '0', 10));
  private warmCursor = 0;
  
  // TTLs per set (hot vs warm)
  private ttlHotSeconds = Math.max(1, parseInt(process.env.TTL_HOT_SECONDS || process.env.TTL_QUOTE_SECONDS || '60', 10));
  private ttlWarmSeconds = Math.max(1, parseInt(process.env.TTL_WARM_SECONDS || '300', 10));
  
  // Token bucket for API pacing (calls/minute), opt-in via ENV
  private quotesCallsPerMinBudget = Math.max(0, parseInt(process.env.QUOTES_CALLS_PER_MIN_BUDGET || '0', 10));
  private bucket: TokenBucket | null = null; // lazy init to avoid TDZ issues
  private batchSize = 50; // FMP supports up to 50 symbols per request
  private isRunning = false;
  private updateTimer: NodeJS.Timeout | null = null;
  private startTime = Date.now();
  private totalUpdates = 0;
  private totalApiCalls = 0;
  private failedUpdates = 0;
  
  constructor() {
    // Remove duplicates from stock list
    this.stocks = [...new Set(this.stocks)];
    logger.info(`🚀 ProactiveWorker initialized with ${this.stocks.length} unique stocks`);
  }
  
  private async refreshUniverse(): Promise<void> {
    try {
      const source = ((process.env.SYMBOLS_UNIVERSE_SOURCE as UniverseSource) || (process.env.SYMBOLS_UNIVERSE === 'PG' ? 'pg' : 'env'));
      if (source === 'pg' && process.env.PGHOST) {
        try {
          const { Client } = await import('pg');
          const c = new Client({
            host: process.env.PGHOST,
            port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
            user: process.env.PGUSER,
            password: process.env.PGPASSWORD,
            database: process.env.PGDATABASE,
            application_name: 'alfalyzer-price-universe'
          });
          await c.connect();
          const limit = Math.max(100, parseInt(process.env.SYMBOLS_UNIVERSE_LIMIT_PER_CYCLE || '1500', 10));
          const res = await c.query(`SELECT DISTINCT UPPER(symbol) AS symbol FROM stocks WHERE symbol IS NOT NULL AND TRIM(symbol) <> '' ORDER BY symbol LIMIT $1`, [limit]);
          await c.end();
          const symbols = (res.rows || []).map(r => String(r.symbol).toUpperCase());
          if (symbols.length) {
            this.stocks = [...new Set(symbols)];
            logger.info(`🔄 Universe loaded from PG`, { count: this.stocks.length });
            return;
          }
          logger.warn('Universe from PG returned empty, keeping built-in list');
        } catch (e: any) {
          logger.warn('Failed to load universe from PG; using built-in list', e?.message);
        }
      }
      // ENV fallback
      const envList = (process.env.SYMBOLS_UNIVERSE || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (envList.length) {
        this.stocks = [...new Set(envList)];
        logger.info('Universe loaded from ENV list', { count: this.stocks.length });
      }
    } catch (e: any) {
      logger.warn('refreshUniverse error', e?.message);
    }
  }

  async start() {
    if (this.isRunning) {
      logger.warn('ProactiveWorker is already running');
      return;
    }
    // Try to load expanded universe from PG/ENV
    await this.refreshUniverse();

    this.isRunning = true;
    logger.info(`🚀 ProactiveWorker started - updating ${this.stocks.length} stocks every ${this.updateInterval/1000}s`);
    
    // Initial update
    await this.updateAllStocks();
    
    // Schedule periodic updates
    this.updateTimer = setInterval(() => {
      this.updateAllStocks().catch(error => {
        logger.error('Error in scheduled update:', error);
      });
    }, this.updateInterval);
    
    // Graceful shutdown handlers
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }
  
  async stop() {
    if (!this.isRunning) return;
    
    logger.info('🛑 Stopping ProactiveWorker...');
    this.isRunning = false;
    
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    // Print final statistics
    const runtime = Math.floor((Date.now() - this.startTime) / 1000);
    logger.info(`📊 Worker Statistics:
      - Runtime: ${runtime}s
      - Total updates: ${this.totalUpdates}
      - Total API calls: ${this.totalApiCalls}
      - Failed updates: ${this.failedUpdates}
      - Success rate: ${((this.totalUpdates - this.failedUpdates) / this.totalUpdates * 100).toFixed(2)}%
    `);
    
    // Close Redis connection
    await ensureRedis();
    await (redisCacheService as any).disconnect();
    process.exit(0);
  }
  
  async updateAllStocks() {
    await ensureRedis();
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    logger.info(`⏱️ Starting update cycle at ${timestamp}`);
    
    let updatedCount = 0;
    let apiCalls = 0;
    
    // Build update universe based on hot/warm configuration
    // 1) Hot set: first N symbols from list (or all if N=0)
    const hotCount = this.hotSetSize > 0 ? Math.min(this.hotSetSize, this.stocks.length) : this.stocks.length;
    const hotSet = this.stocks.slice(0, hotCount);
    
    // 2) Warm set: next M symbols, updated fractionally per cycle (round-robin)
    let toUpdate = [...hotSet];
    let warmChunk: string[] = [];
    if (this.warmSetSize > 0 && this.warmRefreshSeconds > 0 && this.stocks.length > hotCount) {
      const warmPool = this.stocks.slice(hotCount, Math.min(hotCount + this.warmSetSize, this.stocks.length));
      const cyclesPerWarmRound = Math.max(1, Math.floor(this.warmRefreshSeconds / this.hotRefreshSeconds));
      const warmPerCycle = Math.max(1, Math.floor(warmPool.length / cyclesPerWarmRound));
      const start = this.warmCursor;
      const end = Math.min(start + warmPerCycle, warmPool.length);
      warmChunk = warmPool.slice(start, end);
      toUpdate = [...hotSet, ...warmChunk];
      this.warmCursor = end >= warmPool.length ? 0 : end;
      logger.info(`🔥 Hot: ${hotSet.length} | 🌤️ Warm chunk: ${warmChunk.length} (pool ${warmPool.length}, cursor ${this.warmCursor})`);
    }

    // Track which symbols are from warm chunk to apply warm TTL
    const warmSymbols = new Set(warmChunk.map(s => s.toUpperCase()));

    // Lazy init token bucket (after module load) to avoid TDZ
    if (this.quotesCallsPerMinBudget > 0 && !this.bucket) {
      this.bucket = new TokenBucket(this.quotesCallsPerMinBudget, 60_000);
    }

    // Process selected symbols in batches
    for (let i = 0; i < toUpdate.length; i += this.batchSize) {
      if (!this.isRunning) break;
      
      const batch = toUpdate.slice(i, i + this.batchSize);
      const batchString = batch.join(',');
      
      try {
        // Token bucket pacing (if enabled)
        if (this.bucket) {
          await this.bucket.take(1);
        }

        // Fetch batch quotes from FMP with timeout + limited retries/backoff
        const url = `https://financialmodelingprep.com/api/v3/quote/${batchString}?apikey=${process.env.FMP_API_KEY}`;
        const response = await fetchWithTimeout(url, { timeoutMs: 7000, retries: 2, backoffMs: 800 });

        apiCalls++;
        this.totalApiCalls++;
        
        if (!response.ok) {
          logger.error(`FMP API error: ${response.status} ${response.statusText}`);
          this.failedUpdates += batch.length;
          continue;
        }
        
        const quotes = await response.json();
        
        // Save each quote to Redis applying TTL per set (hot vs warm)
        for (const quote of quotes) {
          if (quote && quote.symbol) {
            const cacheKey = `quote:${quote.symbol}`;
            const effectiveTtl = warmSymbols.has(String(quote.symbol).toUpperCase())
              ? this.ttlWarmSeconds
              : this.ttlHotSeconds;
            await (redisCacheService as any).set(
              cacheKey,
              {
                ...quote,
                cachedAt: timestamp,
                fromWorker: true
              },
              effectiveTtl
            );
            updatedCount++;
            this.totalUpdates++;
          }
        }
        
        // Also save as a batch for efficient batch queries
        if (quotes.length > 0) {
          const batchKey = `batch:${batch.join(',').substring(0, 100)}`; // Truncate key for safety
          await (redisCacheService as any).set(
            batchKey,
            {
              symbols: batch,
              quotes: quotes,
              cachedAt: timestamp
            },
            Math.min(this.ttlHotSeconds, this.ttlWarmSeconds)
          );
        }
        
        logger.debug(`Updated batch ${Math.floor(i/this.batchSize) + 1}/${Math.ceil(this.stocks.length/this.batchSize)}: ${quotes.length} quotes`);
        
        // Legacy spacing only if no token bucket is configured
        if (!this.bucket) {
          // Conservative spacing ~3/sec when no budget configured
          await new Promise(resolve => setTimeout(resolve, 350));
        }
        
      } catch (error) {
        logger.error(`Failed to update batch starting at index ${i}:`, error);
        this.failedUpdates += batch.length;
      }
    }
    
    const duration = Date.now() - startTime;
    
    // Store worker statistics in Redis for monitoring
    await (redisCacheService as any).set(
      'worker:stats',
      {
        lastUpdate: timestamp,
        duration,
        updatedCount,
        apiCalls,
        totalStocks: this.stocks.length,
        successRate: (updatedCount / this.stocks.length * 100).toFixed(2),
        nextUpdate: new Date(Date.now() + this.updateInterval).toISOString()
      },
      300 // 5 minute TTL
    );
    
    logger.info(`✅ Update cycle complete in ${duration}ms. Updated ${updatedCount}/${this.stocks.length} stocks with ${apiCalls} API calls`);
    
    // Check Redis memory usage
    try {
      const stats = await (redisCacheService as any).getStats();
      logger.info(`📊 Redis cache stats: Hits: ${stats.hits}, Misses: ${stats.misses}, Sets: ${stats.sets}`);
    } catch (error) {
      logger.debug('Could not get Redis stats:', error);
    }
  }
  
  // Utility method to get current cache status
  async getCacheStatus() {
    await ensureRedis();
    const stats = await (redisCacheService as any).get('worker:stats');
    const cacheStats = await (redisCacheService as any).getStats();
    
    return {
      cacheStats,
      workerStats: stats || null,
      isRunning: this.isRunning
    };
  }
}

// Start the worker if this file is run directly
console.log('Worker script starting...');
console.log('import.meta.url:', import.meta.url);
console.log('process.argv[1]:', process.argv[1]);

// Simplified startup - always start when script is run
const startWorker = async () => {
  console.log('Creating ProactiveWorker instance...');
  const worker = new ProactiveWorker();
  
  // Add health check endpoint for monitoring
  if (process.env.WORKER_HEALTH_PORT) {
    const http = await import('http');
    const server = http.createServer(async (req, res) => {
      if (req.url === '/health') {
        const status = await worker.getCacheStatus();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy', ...status }));
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    
    const port = parseInt(process.env.WORKER_HEALTH_PORT);
    server.listen(port, () => {
      logger.info(`🏥 Worker health check listening on port ${port}`);
    });
  }
  
  // Start the worker
  console.log('Starting worker...');
  worker.start();
};

// Start immediately
startWorker().catch(error => {
  console.error('Failed to start worker:', error);
  process.exit(1);
});

export { ProactiveWorker };

// --- Helpers: robust fetch with timeout + basic retry/backoff ---
type FetchOpts = { timeoutMs?: number; retries?: number; backoffMs?: number };
async function fetchWithTimeout(url: string, opts: FetchOpts = {}): Promise<Response> {
  const timeoutMs = Math.max(500, opts.timeoutMs ?? 7000);
  const retries = Math.max(0, opts.retries ?? 0);
  const backoffMs = Math.max(100, opts.backoffMs ?? 500);

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(url as any, { signal: controller.signal } as any);
      clearTimeout(to);
      // Retry on 429/5xx
      if (resp.status === 429 || (resp.status >= 500 && resp.status < 600)) {
        if (attempt < retries) {
          await sleep(backoffMs * (attempt + 1));
          continue;
        }
      }
      return resp;
    } catch (e) {
      clearTimeout(to);
      if (attempt < retries) {
        await sleep(backoffMs * (attempt + 1));
        continue;
      }
      throw e;
    }
  }
  // Should not reach here
  throw new Error('fetchWithTimeout: exhausted retries');
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
