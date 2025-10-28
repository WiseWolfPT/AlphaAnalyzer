#!/usr/bin/env ts-node
/**
 * Stock Universe Batch Seeding Script
 *
 * Populates PostgreSQL stocks table with missing US stocks from stock_universe_complete.csv
 *
 * Features:
 * - FMP API validation before insertion
 * - Rate limiting (4 req/s respecting FMP limits)
 * - Dry-run mode for testing
 * - Progress tracking and resumption
 * - Comprehensive error handling
 * - Bandwidth usage tracking
 *
 * Usage:
 *   # Dry run (no database changes)
 *   TARGET_URL=https://128.140.45.28.sslip.io npm run seed-stocks -- --dry-run
 *
 *   # Production run
 *   TARGET_URL=https://128.140.45.28.sslip.io npm run seed-stocks
 *
 *   # Resume from checkpoint
 *   TARGET_URL=https://128.140.45.28.sslip.io npm run seed-stocks -- --resume
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface SeedConfig {
  dryRun: boolean;
  resume: boolean;
  rateLimit: number; // calls per second
  maxRetries: number;
  checkpointInterval: number; // stocks
  targetUrl: string;
}

interface StockRecord {
  symbol: string;
  company_name: string;
  exchange: string;
  sector: string;
  industry: string;
  type: string;
  can_calculate_iv: string;
}

interface FMPProfile {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  exchange: string;
  exchangeShortName: string;
  currency: string;
  country: string;
  mktCap: number;
  price: number;
  isEtf: boolean;
  isFund: boolean;
  isActivelyTrading: boolean;
}

interface SeedResult {
  totalStocks: number;
  usStocks: number;
  alreadyExists: number;
  seeded: number;
  failed: number;
  skipped: number;
  bandwidthMB: number;
  durationMinutes: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function log(level: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;

  if (data) {
    console.log(logMessage, JSON.stringify(data, null, 2));
  } else {
    console.log(logMessage);
  }
}

function logInfo(message: string, data?: any) { log('INFO', message, data); }
function logWarn(message: string, data?: any) { log('WARN', message, data); }
function logError(message: string, data?: any) { log('ERROR', message, data); }
function logSuccess(message: string, data?: any) { log('✅', message, data); }

// ============================================================================
// FMP API CLIENT
// ============================================================================

class FMPClient {
  private apiKey: string;
  private baseUrl = 'https://financialmodelingprep.com/api/v3';
  private bandwidthBytes = 0;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getCompanyProfile(symbol: string): Promise<FMPProfile | null> {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}/profile/${symbol}?apikey=${this.apiKey}`;

      https.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
          this.bandwidthBytes += chunk.length;
        });

        res.on('end', () => {
          try {
            const profiles = JSON.parse(data);

            if (Array.isArray(profiles) && profiles.length > 0) {
              resolve(profiles[0]);
            } else {
              resolve(null);
            }
          } catch (error) {
            logWarn(`Failed to parse FMP response for ${symbol}`, { error: (error as Error).message, data: data.substring(0, 100) });
            resolve(null);
          }
        });
      }).on('error', (error) => {
        logError(`FMP API request failed for ${symbol}`, { error: error.message });
        reject(error);
      });
    });
  }

  getBandwidthMB(): number {
    return this.bandwidthBytes / (1024 * 1024);
  }
}

// ============================================================================
// DATABASE CLIENT
// ============================================================================

class StockDatabase {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.PGHOST || '127.0.0.1',
      port: parseInt(process.env.PGPORT || '5432'),
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      application_name: 'alfalyzer-stock-seeder'
    });
  }

  async connect(): Promise<void> {
    try {
      await this.pool.query('SELECT NOW()');
      logSuccess('Connected to PostgreSQL database');
    } catch (error) {
      logError('Failed to connect to database', { error: (error as Error).message });
      throw error;
    }
  }

  async stockExists(symbol: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT 1 FROM stocks WHERE symbol = $1 LIMIT 1',
      [symbol]
    );
    return result.rows.length > 0;
  }

  async insertStock(profile: FMPProfile): Promise<void> {
    await this.pool.query(
      `INSERT INTO stocks (symbol, company_name, sector, industry, exchange, market_cap, price, currency, country, is_etf, is_actively_trading, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       ON CONFLICT (symbol) DO NOTHING`,
      [
        profile.symbol,
        profile.companyName,
        profile.sector || '',
        profile.industry || '',
        profile.exchangeShortName || profile.exchange || '',
        profile.mktCap || 0,
        profile.price || 0,
        profile.currency || 'USD',
        profile.country || 'US',
        profile.isEtf || false,
        profile.isActivelyTrading !== false // default to true
      ]
    );
  }

  async getStockCount(): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) as count FROM stocks');
    return parseInt(result.rows[0].count);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// ============================================================================
// CSV PARSER
// ============================================================================

function loadStockUniverse(csvPath: string): StockRecord[] {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  // Skip header
  const dataLines = lines.slice(1);

  const stocks: StockRecord[] = [];

  for (const line of dataLines) {
    const parts = line.split(',');

    if (parts.length >= 7) {
      stocks.push({
        symbol: parts[0].trim(),
        company_name: parts[1].trim(),
        exchange: parts[2].trim(),
        sector: parts[3].trim(),
        industry: parts[4].trim(),
        type: parts[5].trim(),
        can_calculate_iv: parts[6].trim()
      });
    }
  }

  return stocks;
}

function filterUSStocks(stocks: StockRecord[]): StockRecord[] {
  const usExchanges = ['NYSE', 'NASDAQ', 'AMEX', 'NYSEARCA', 'N/A'];

  return stocks.filter(stock => {
    // Exclude European exchanges
    const excludedExchanges = ['LSE', 'EURONEXT', 'XETRA', 'BME', 'OTC'];

    if (excludedExchanges.includes(stock.exchange)) {
      return false;
    }

    // Include US exchanges or N/A (need FMP validation)
    return usExchanges.includes(stock.exchange) || stock.exchange === 'N/A';
  });
}

// ============================================================================
// CHECKPOINT MANAGEMENT
// ============================================================================

interface Checkpoint {
  lastProcessedSymbol: string;
  processedCount: number;
  timestamp: string;
}

const CHECKPOINT_FILE = '/tmp/stock-seeding-checkpoint.json';

function saveCheckpoint(checkpoint: Checkpoint): void {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
}

function loadCheckpoint(): Checkpoint | null {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      const data = fs.readFileSync(CHECKPOINT_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    logWarn('Failed to load checkpoint', { error: (error as Error).message });
  }
  return null;
}

function clearCheckpoint(): void {
  if (fs.existsSync(CHECKPOINT_FILE)) {
    fs.unlinkSync(CHECKPOINT_FILE);
  }
}

// ============================================================================
// MAIN SEEDING LOGIC
// ============================================================================

async function seedStockUniverse(config: SeedConfig): Promise<SeedResult> {
  const startTime = Date.now();
  const result: SeedResult = {
    totalStocks: 0,
    usStocks: 0,
    alreadyExists: 0,
    seeded: 0,
    failed: 0,
    skipped: 0,
    bandwidthMB: 0,
    durationMinutes: 0
  };

  // Initialize clients
  const fmpApiKey = process.env.FMP_API_KEY;
  if (!fmpApiKey) {
    throw new Error('FMP_API_KEY environment variable not set');
  }

  const fmpClient = new FMPClient(fmpApiKey);
  const db = new StockDatabase();

  if (!config.dryRun) {
    await db.connect();
    const currentCount = await db.getStockCount();
    logInfo(`Current database stock count: ${currentCount}`);
  }

  // Load stock universe
  const csvPath = path.join(__dirname, '..', 'stock_universe_complete.csv');
  logInfo(`Loading stock universe from: ${csvPath}`);

  const allStocks = loadStockUniverse(csvPath);
  result.totalStocks = allStocks.length;
  logInfo(`Loaded ${allStocks.length} total stocks`);

  // Filter US stocks only
  const usStocks = filterUSStocks(allStocks);
  result.usStocks = usStocks.length;
  logInfo(`Filtered to ${usStocks.length} US stocks`);

  // Handle resume
  let startIndex = 0;
  if (config.resume) {
    const checkpoint = loadCheckpoint();
    if (checkpoint) {
      startIndex = usStocks.findIndex(s => s.symbol === checkpoint.lastProcessedSymbol) + 1;
      logInfo(`Resuming from checkpoint: ${checkpoint.lastProcessedSymbol} (index ${startIndex})`);
    }
  }

  // Rate limiting setup
  const sleepInterval = 1000 / config.rateLimit; // ms per request

  logInfo('');
  logInfo('='.repeat(80));
  logInfo('BATCH SEEDING STARTED');
  logInfo('='.repeat(80));
  logInfo(`Mode: ${config.dryRun ? 'DRY RUN' : 'PRODUCTION'}`);
  logInfo(`Rate limit: ${config.rateLimit} req/s (${sleepInterval}ms sleep)`);
  logInfo(`Stocks to process: ${usStocks.length - startIndex}`);
  logInfo(`Estimated duration: ${Math.ceil((usStocks.length - startIndex) / config.rateLimit / 60)} minutes`);
  logInfo('');

  // Confirmation prompt for production
  if (!config.dryRun) {
    logWarn('⚠️  PRODUCTION MODE - Database will be modified!');
    logWarn('⚠️  Press Ctrl+C within 5 seconds to cancel...');
    await sleep(5000);
    logInfo('Starting seeding...');
  }

  // Process each stock
  for (let i = startIndex; i < usStocks.length; i++) {
    const stock = usStocks[i];
    const index = i + 1;
    const percent = ((index / usStocks.length) * 100).toFixed(1);

    // Progress logging every 10 stocks
    if (index % 10 === 0 || index === 1) {
      const elapsed = (Date.now() - startTime) / 1000 / 60;
      const rate = index / ((Date.now() - startTime) / 1000);
      const eta = (usStocks.length - index) / rate / 60;

      logInfo(`Progress: [${index}/${usStocks.length}] ${percent}% | Seeded: ${result.seeded} | Failed: ${result.failed} | Elapsed: ${elapsed.toFixed(1)}m | ETA: ${eta.toFixed(0)}m`);
    }

    try {
      // Check if exists
      if (!config.dryRun) {
        const exists = await db.stockExists(stock.symbol);
        if (exists) {
          result.alreadyExists++;
          continue;
        }
      }

      // Fetch FMP profile
      const profile = await fmpClient.getCompanyProfile(stock.symbol);

      if (!profile) {
        logWarn(`Skipping ${stock.symbol}: No FMP data`);
        result.skipped++;
        continue;
      }

      // Skip ETFs
      if (profile.isEtf || profile.isFund) {
        logWarn(`Skipping ${stock.symbol}: ETF/Fund detected`);
        result.skipped++;
        continue;
      }

      // Insert into database
      if (!config.dryRun) {
        await db.insertStock(profile);
        result.seeded++;

        if (result.seeded % 50 === 0) {
          logSuccess(`[${index}/${usStocks.length}] Seeded ${result.seeded} stocks (${stock.symbol}: ${profile.companyName})`);
        }
      } else {
        result.seeded++;

        if (result.seeded % 20 === 0) {
          logInfo(`[DRY RUN] Would seed: ${stock.symbol} - ${profile.companyName} (${profile.sector})`);
        }
      }

      // Save checkpoint
      if (index % config.checkpointInterval === 0 && !config.dryRun) {
        saveCheckpoint({
          lastProcessedSymbol: stock.symbol,
          processedCount: index,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      logError(`Failed to process ${stock.symbol}`, { error: (error as Error).message });
      result.failed++;

      // Abort if too many failures
      if (result.failed > 50) {
        logError('Too many failures (>50) - aborting to prevent API spam');
        break;
      }
    }

    // Rate limiting
    await sleep(sleepInterval);
  }

  // Final stats
  const endTime = Date.now();
  result.durationMinutes = (endTime - startTime) / 1000 / 60;
  result.bandwidthMB = fmpClient.getBandwidthMB();

  logInfo('');
  logInfo('='.repeat(80));
  logInfo('BATCH SEEDING COMPLETE');
  logInfo('='.repeat(80));
  logInfo(`Total stocks in CSV: ${result.totalStocks}`);
  logInfo(`US stocks: ${result.usStocks}`);
  logInfo(`Already existed: ${result.alreadyExists}`);
  logInfo(`Successfully seeded: ${result.seeded}`);
  logInfo(`Failed: ${result.failed}`);
  logInfo(`Skipped (no data/ETF): ${result.skipped}`);
  logInfo(`Duration: ${result.durationMinutes.toFixed(1)} minutes`);
  logInfo(`Bandwidth used: ${result.bandwidthMB.toFixed(2)} MB`);
  logInfo(`Average per stock: ${(result.bandwidthMB * 1024 / result.seeded).toFixed(2)} KB`);
  logInfo('='.repeat(80));

  // Cleanup
  if (!config.dryRun) {
    await db.close();
    clearCheckpoint();

    const finalCount = await db.getStockCount();
    logSuccess(`Final database stock count: ${finalCount}`);
  }

  return result;
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

async function main() {
  // Parse CLI arguments
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const resume = args.includes('--resume');

  const config: SeedConfig = {
    dryRun,
    resume,
    rateLimit: 4, // FMP limit: 4 req/s
    maxRetries: 3,
    checkpointInterval: 50,
    targetUrl: process.env.TARGET_URL || 'http://localhost:3001'
  };

  try {
    const result = await seedStockUniverse(config);

    // Success criteria
    const successRate = (result.seeded / result.usStocks) * 100;

    if (successRate >= 90) {
      logSuccess(`✅ Seeding completed successfully (${successRate.toFixed(1)}% success rate)`);
      process.exit(0);
    } else if (successRate >= 75) {
      logWarn(`⚠️  Seeding completed with warnings (${successRate.toFixed(1)}% success rate)`);
      process.exit(0);
    } else {
      logError(`❌ Seeding failed (${successRate.toFixed(1)}% success rate is below 75% threshold)`);
      process.exit(1);
    }
  } catch (error) {
    logError('Fatal error during seeding', { error: (error as Error).message, stack: (error as Error).stack });
    process.exit(1);
  }
}

// Run if executed directly (ES module compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { seedStockUniverse, SeedConfig, SeedResult };
