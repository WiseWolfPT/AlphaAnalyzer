import { config } from 'dotenv';
import { resolve } from 'path';
import { redisCacheService } from '../cache/redis-cache-service.js';

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
  : '.env';  // Use .env for development (where our FMP_API_KEY is)
config({ path: resolve(process.cwd(), envPath) });

// Verify FMP API key is loaded
if (!process.env.FMP_API_KEY) {
  console.error('❌ FMP_API_KEY not found in environment variables!');
  console.log('Loading from:', envPath);
}

/**
 * Proactive Worker for updating stock prices in cache
 * Updates 300 popular stocks every 30 seconds for instant response times
 */
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
  
  private updateInterval = 30000; // 30 seconds
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
  
  async start() {
    if (this.isRunning) {
      logger.warn('ProactiveWorker is already running');
      return;
    }
    
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
    await redisCacheService.disconnect();
    process.exit(0);
  }
  
  async updateAllStocks() {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    logger.info(`⏱️ Starting update cycle at ${timestamp}`);
    
    let updatedCount = 0;
    let apiCalls = 0;
    
    // Process stocks in batches
    for (let i = 0; i < this.stocks.length; i += this.batchSize) {
      if (!this.isRunning) break;
      
      const batch = this.stocks.slice(i, i + this.batchSize);
      const batchString = batch.join(',');
      
      try {
        // Fetch batch quotes from FMP
        const response = await fetch(
          `https://financialmodelingprep.com/api/v3/quote/${batchString}?apikey=${process.env.FMP_API_KEY}`
        );
        
        apiCalls++;
        this.totalApiCalls++;
        
        if (!response.ok) {
          logger.error(`FMP API error: ${response.status} ${response.statusText}`);
          this.failedUpdates += batch.length;
          continue;
        }
        
        const quotes = await response.json();
        
        // Save each quote to Redis with 60 second TTL
        for (const quote of quotes) {
          if (quote && quote.symbol) {
            const cacheKey = `quote:${quote.symbol}`;
            await redisCacheService.set(
              cacheKey,
              {
                ...quote,
                cachedAt: timestamp,
                fromWorker: true
              },
              60 // 60 seconds TTL
            );
            updatedCount++;
            this.totalUpdates++;
          }
        }
        
        // Also save as a batch for efficient batch queries
        if (quotes.length > 0) {
          const batchKey = `batch:${batch.join(',').substring(0, 100)}`; // Truncate key for safety
          await redisCacheService.set(
            batchKey,
            {
              symbols: batch,
              quotes: quotes,
              cachedAt: timestamp
            },
            60
          );
        }
        
        logger.debug(`Updated batch ${Math.floor(i/this.batchSize) + 1}/${Math.ceil(this.stocks.length/this.batchSize)}: ${quotes.length} quotes`);
        
        // Rate limit protection (FMP: 300 requests/min = 5/sec)
        // We'll be conservative and do 3/sec
        await new Promise(resolve => setTimeout(resolve, 350));
        
      } catch (error) {
        logger.error(`Failed to update batch starting at index ${i}:`, error);
        this.failedUpdates += batch.length;
      }
    }
    
    const duration = Date.now() - startTime;
    
    // Store worker statistics in Redis for monitoring
    await redisCacheService.set(
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
      const stats = await redisCacheService.getStats();
      logger.info(`📊 Redis cache stats: Hits: ${stats.hits}, Misses: ${stats.misses}, Sets: ${stats.sets}`);
    } catch (error) {
      logger.debug('Could not get Redis stats:', error);
    }
  }
  
  // Utility method to get current cache status
  async getCacheStatus() {
    const stats = await redisCacheService.get('worker:stats');
    const cacheStats = await redisCacheService.getStats();
    
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
