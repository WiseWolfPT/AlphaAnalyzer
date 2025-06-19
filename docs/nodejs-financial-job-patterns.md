# Node.js Background Job Patterns for Financial Data

This guide documents comprehensive patterns for implementing background job processing in Node.js applications specifically for financial data fetching and processing, covering scheduling, queuing, retry mechanisms, monitoring, and TypeScript integration.

## 1. Job Scheduling Patterns: Node-cron vs Bull Queue

### Node-cron Pattern
Node-cron is ideal for simple, time-based scheduling without complex queue management.

**Best for:**
- Simple recurring tasks
- Low-volume operations
- Direct scheduling without persistence
- Lightweight cron-like functionality

```typescript
import cron from 'node-cron';
import { fetchMarketData } from './services/marketData';

// Schedule market data fetch every 5 minutes during trading hours
const marketDataJob = cron.schedule('*/5 9-16 * * 1-5', async () => {
  try {
    console.log('Fetching market data at:', new Date().toISOString());
    await fetchMarketData();
  } catch (error) {
    console.error('Market data fetch failed:', error);
  }
}, {
  scheduled: false,
  timezone: "America/New_York"
});

// Start the job
marketDataJob.start();

// Market close cleanup - runs at 4:30 PM EST
cron.schedule('30 16 * * 1-5', async () => {
  console.log('Running end-of-day market cleanup...');
  await performEndOfDayCleanup();
}, {
  timezone: "America/New_York"
});
```

### BullMQ Queue Pattern
BullMQ provides advanced queue management with persistence, retry logic, and distributed processing.

**Best for:**
- High-volume job processing
- Complex retry mechanisms
- Distributed worker systems
- Job persistence and monitoring
- Rate limiting and priority queues

```typescript
import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

// Redis connection configuration
const connection = new IORedis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
  retryStrategy: (times: number) => {
    return Math.max(Math.min(Math.exp(times), 20000), 1000);
  }
});

// Financial data processing queue
const financialDataQueue = new Queue('financial-data', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// Job types for financial data
interface MarketDataJob {
  symbol: string;
  dataType: 'price' | 'volume' | 'fundamentals';
  timestamp: string;
}

interface EarningsJob {
  symbol: string;
  quarter: string;
  year: number;
}

// Add jobs to queue
await financialDataQueue.add('fetch-market-data', {
  symbol: 'AAPL',
  dataType: 'price',
  timestamp: new Date().toISOString()
} as MarketDataJob, {
  priority: 10,
  delay: 1000 // Wait 1 second before processing
});
```

## 2. Market Hours Scheduling

### Using pandas_market_calendars for Market Hours

```typescript
// First, install the required Python dependencies and use a Python subprocess
// or implement market calendar logic in TypeScript

interface MarketHours {
  open: Date;
  close: Date;
  preMarket?: Date;
  postMarket?: Date;
}

class MarketScheduler {
  private nyseSchedule: Map<string, MarketHours> = new Map();

  // Check if market is currently open
  isMarketOpen(exchange: string = 'NYSE'): boolean {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const schedule = this.nyseSchedule.get(today);
    
    if (!schedule) return false;
    
    return now >= schedule.open && now <= schedule.close;
  }

  // Get next market open time
  getNextMarketOpen(exchange: string = 'NYSE'): Date {
    const now = new Date();
    let checkDate = new Date(now);
    
    // Look for next market open within 7 days
    for (let i = 0; i < 7; i++) {
      const dateKey = checkDate.toISOString().split('T')[0];
      const schedule = this.nyseSchedule.get(dateKey);
      
      if (schedule && schedule.open > now) {
        return schedule.open;
      }
      
      checkDate.setDate(checkDate.getDate() + 1);
    }
    
    throw new Error('No market open found in next 7 days');
  }

  // Schedule job for next market open
  scheduleForMarketOpen(jobCallback: () => Promise<void>): void {
    const nextOpen = this.getNextMarketOpen();
    const delay = nextOpen.getTime() - Date.now();
    
    setTimeout(async () => {
      try {
        await jobCallback();
      } catch (error) {
        console.error('Market open job failed:', error);
      }
    }, delay);
  }
}

// Market-aware job scheduling with BullMQ
const marketScheduler = new MarketScheduler();

// Only process during market hours
const worker = new Worker('financial-data', async (job) => {
  if (!marketScheduler.isMarketOpen()) {
    console.log('Market closed, skipping job processing');
    return { skipped: true, reason: 'Market closed' };
  }
  
  return await processFinancialData(job.data);
}, { connection });
```

### Cron Expressions for Financial Markets

```typescript
// Trading hours scheduling patterns
const marketSchedules = {
  // US Markets (9:30 AM - 4:00 PM EST, Mon-Fri)
  'us-market-open': '30 9 * * 1-5',
  'us-market-close': '0 16 * * 1-5',
  'us-pre-market': '0 4 * * 1-5', // 4:00 AM EST
  'us-after-hours': '0 20 * * 1-5', // 8:00 PM EST
  
  // European Markets (8:00 AM - 4:30 PM CET, Mon-Fri)
  'eu-market-open': '0 8 * * 1-5',
  'eu-market-close': '30 16 * * 1-5',
  
  // Asian Markets (9:00 AM - 3:00 PM JST, Mon-Fri)
  'asia-market-open': '0 9 * * 1-5',
  'asia-market-close': '0 15 * * 1-5',
  
  // End of day processing
  'eod-processing': '0 18 * * 1-5', // 6:00 PM EST
  'weekend-cleanup': '0 10 * * 0', // Sunday 10:00 AM
};

// Schedule multiple market data fetches
Object.entries(marketSchedules).forEach(([jobName, cronPattern]) => {
  cron.schedule(cronPattern, async () => {
    await financialDataQueue.add(`scheduled-${jobName}`, {
      scheduledAt: new Date().toISOString(),
      jobType: jobName
    });
  }, {
    timezone: getTimezoneForJob(jobName)
  });
});

function getTimezoneForJob(jobName: string): string {
  if (jobName.startsWith('us-')) return 'America/New_York';
  if (jobName.startsWith('eu-')) return 'Europe/London';
  if (jobName.startsWith('asia-')) return 'Asia/Tokyo';
  return 'UTC';
}
```

## 3. Retry Mechanisms for Failed Jobs

### Exponential Backoff with Custom Logic

```typescript
import { Worker, UnrecoverableError } from 'bullmq';

interface FinancialDataError {
  code: string;
  message: string;
  isRetryable: boolean;
  retryAfter?: number;
}

const worker = new Worker('financial-data', async (job) => {
  try {
    const result = await fetchFinancialData(job.data);
    return result;
  } catch (error) {
    const financialError = classifyError(error);
    
    // Don't retry certain errors
    if (!financialError.isRetryable) {
      throw new UnrecoverableError(financialError.message);
    }
    
    // Rate limit handling
    if (financialError.code === 'RATE_LIMIT') {
      await financialDataQueue.rateLimit(financialError.retryAfter || 60000);
      if (job.attemptsStarted >= job.opts.attempts) {
        throw new UnrecoverableError('Rate limit exceeded max attempts');
      }
      throw new RateLimitError();
    }
    
    throw error; // Let BullMQ handle retries
  }
}, {
  connection,
  settings: {
    backoffStrategy: (attemptsMade: number, type: string, err: Error) => {
      // Custom backoff for financial data APIs
      switch (type) {
        case 'financial-api':
          return Math.min(attemptsMade * 5000, 300000); // Max 5 minutes
        case 'market-data':
          return attemptsMade * 2000; // Linear backoff
        default:
          return Math.min(Math.pow(2, attemptsMade) * 1000, 60000); // Exponential, max 1 minute
      }
    },
  },
});

function classifyError(error: any): FinancialDataError {
  if (error.status === 429) {
    return {
      code: 'RATE_LIMIT',
      message: 'API rate limit exceeded',
      isRetryable: true,
      retryAfter: parseInt(error.headers?.['retry-after']) * 1000 || 60000
    };
  }
  
  if (error.status >= 500) {
    return {
      code: 'SERVER_ERROR',
      message: 'Server error, can retry',
      isRetryable: true
    };
  }
  
  if (error.status === 401 || error.status === 403) {
    return {
      code: 'AUTH_ERROR',
      message: 'Authentication failed',
      isRetryable: false
    };
  }
  
  return {
    code: 'UNKNOWN_ERROR',
    message: error.message || 'Unknown error',
    isRetryable: true
  };
}

// Add job with custom retry configuration
await financialDataQueue.add('fetch-stock-price', {
  symbol: 'TSLA'
}, {
  attempts: 5,
  backoff: {
    type: 'financial-api',
    delay: 1000,
  },
});
```

### Saga Pattern for Complex Financial Workflows

```typescript
// Multi-step financial data processing with compensation
enum ProcessingStep {
  FetchPrice = 'fetch-price',
  CalculateIndicators = 'calculate-indicators',
  UpdateDatabase = 'update-database',
  NotifyClients = 'notify-clients',
  Complete = 'complete'
}

interface FinancialProcessingJob {
  symbol: string;
  step: ProcessingStep;
  data?: any;
  compensationStack?: string[];
}

const worker = new Worker('financial-processing', async (job) => {
  const jobData = job.data as FinancialProcessingJob;
  let { step, symbol, data, compensationStack = [] } = jobData;
  
  while (step !== ProcessingStep.Complete) {
    try {
      switch (step) {
        case ProcessingStep.FetchPrice:
          data = await fetchPriceData(symbol);
          compensationStack.push('cleanupPriceData');
          step = ProcessingStep.CalculateIndicators;
          break;
          
        case ProcessingStep.CalculateIndicators:
          data = await calculateTechnicalIndicators(data);
          compensationStack.push('cleanupIndicators');
          step = ProcessingStep.UpdateDatabase;
          break;
          
        case ProcessingStep.UpdateDatabase:
          await updateFinancialDatabase(symbol, data);
          compensationStack.push('rollbackDatabase');
          step = ProcessingStep.NotifyClients;
          break;
          
        case ProcessingStep.NotifyClients:
          await notifyClients(symbol, data);
          step = ProcessingStep.Complete;
          break;
      }
      
      // Save progress
      await job.updateData({
        symbol,
        step,
        data,
        compensationStack
      });
      
    } catch (error) {
      console.error(`Step ${step} failed for ${symbol}:`, error);
      
      // Run compensation actions in reverse order
      for (let i = compensationStack.length - 1; i >= 0; i--) {
        await runCompensation(compensationStack[i], symbol, data);
      }
      
      throw error;
    }
  }
  
  return { symbol, status: 'completed', data };
}, { connection });

async function runCompensation(action: string, symbol: string, data: any): Promise<void> {
  switch (action) {
    case 'cleanupPriceData':
      await cleanupTemporaryPriceData(symbol);
      break;
    case 'cleanupIndicators':
      await cleanupIndicatorCache(symbol);
      break;
    case 'rollbackDatabase':
      await rollbackDatabaseChanges(symbol);
      break;
  }
}
```

## 4. Job Monitoring and Logging

### Comprehensive Monitoring Setup

```typescript
import { QueueEvents } from 'bullmq';
import winston from 'winston';

// Structured logging configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'financial-job-processor' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ],
});

// Job metrics tracking
interface JobMetrics {
  processed: number;
  failed: number;
  completed: number;
  averageProcessingTime: number;
  lastProcessed: Date;
}

class JobMonitor {
  private metrics: Map<string, JobMetrics> = new Map();
  private queueEvents: QueueEvents;

  constructor(queueName: string) {
    this.queueEvents = new QueueEvents(queueName, { connection });
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.queueEvents.on('completed', ({ jobId, returnvalue }) => {
      logger.info('Job completed', {
        jobId,
        returnvalue,
        timestamp: new Date().toISOString()
      });
      this.updateMetrics(jobId, 'completed');
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      logger.error('Job failed', {
        jobId,
        failedReason,
        timestamp: new Date().toISOString()
      });
      this.updateMetrics(jobId, 'failed');
    });

    this.queueEvents.on('progress', ({ jobId, data }) => {
      logger.debug('Job progress', {
        jobId,
        progress: data,
        timestamp: new Date().toISOString()
      });
    });

    this.queueEvents.on('stalled', ({ jobId }) => {
      logger.warn('Job stalled', {
        jobId,
        timestamp: new Date().toISOString()
      });
    });
  }

  private updateMetrics(jobId: string, status: 'completed' | 'failed'): void {
    // Implementation for updating job metrics
    const jobType = this.extractJobTypeFromId(jobId);
    const current = this.metrics.get(jobType) || {
      processed: 0,
      failed: 0,
      completed: 0,
      averageProcessingTime: 0,
      lastProcessed: new Date()
    };

    current.processed++;
    if (status === 'completed') {
      current.completed++;
    } else {
      current.failed++;
    }
    current.lastProcessed = new Date();

    this.metrics.set(jobType, current);
  }

  getMetrics(): Map<string, JobMetrics> {
    return this.metrics;
  }

  private extractJobTypeFromId(jobId: string): string {
    // Extract job type from job ID for metrics grouping
    return jobId.split('-')[0] || 'unknown';
  }
}

// Health check endpoint
export function setupHealthCheck(queue: Queue): void {
  setInterval(async () => {
    try {
      const health = await queue.checkHealth();
      logger.info('Queue health check', {
        waiting: health.waiting,
        active: health.active,
        completed: health.completed,
        failed: health.failed,
        timestamp: new Date().toISOString()
      });

      // Alert if queue is backing up
      if (health.waiting > 1000) {
        logger.warn('Queue backlog detected', {
          waitingJobs: health.waiting,
          activeJobs: health.active
        });
      }
    } catch (error) {
      logger.error('Health check failed', { error: error.message });
    }
  }, 30000); // Check every 30 seconds
}
```

### Performance Monitoring

```typescript
// Performance tracking wrapper
function withPerformanceTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  jobType: string
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const startTime = Date.now();
    const startCpuUsage = process.cpuUsage();
    
    try {
      const result = await fn(...args);
      const endTime = Date.now();
      const endCpuUsage = process.cpuUsage(startCpuUsage);
      
      logger.info('Job performance metrics', {
        jobType,
        duration: endTime - startTime,
        cpuUser: endCpuUsage.user / 1000, // Convert to milliseconds
        cpuSystem: endCpuUsage.system / 1000,
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      const endTime = Date.now();
      logger.error('Job performance metrics (failed)', {
        jobType,
        duration: endTime - startTime,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }) as T;
}

// Usage with performance tracking
const trackedFetchMarketData = withPerformanceTracking(
  fetchMarketData,
  'market-data-fetch'
);
```

## 5. TypeScript Job Definitions

### Type-Safe Job Interfaces

```typescript
// Base job interface
interface BaseJob {
  id: string;
  createdAt: Date;
  priority: number;
  metadata?: Record<string, any>;
}

// Specific job types
interface PriceDataJob extends BaseJob {
  type: 'price-data';
  payload: {
    symbols: string[];
    interval: '1m' | '5m' | '15m' | '1h' | '1d';
    source: 'yahoo' | 'alpha-vantage' | 'polygon';
  };
}

interface EarningsJob extends BaseJob {
  type: 'earnings';
  payload: {
    symbol: string;
    quarter: string;
    year: number;
    estimatedDate: Date;
  };
}

interface NewsAnalysisJob extends BaseJob {
  type: 'news-analysis';
  payload: {
    symbols: string[];
    sources: string[];
    sentiment: boolean;
    keywords: string[];
  };
}

// Union type for all job types
type FinancialJob = PriceDataJob | EarningsJob | NewsAnalysisJob;

// Type-safe job processor
class TypedJobProcessor {
  async processJob(job: FinancialJob): Promise<any> {
    switch (job.type) {
      case 'price-data':
        return this.processPriceData(job);
      case 'earnings':
        return this.processEarnings(job);
      case 'news-analysis':
        return this.processNewsAnalysis(job);
      default:
        // TypeScript will catch this if we miss a case
        const exhaustiveCheck: never = job;
        throw new Error(`Unhandled job type: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }

  private async processPriceData(job: PriceDataJob): Promise<{ prices: number[], timestamps: Date[] }> {
    // Type-safe processing
    const { symbols, interval, source } = job.payload;
    // Implementation here
    return { prices: [], timestamps: [] };
  }

  private async processEarnings(job: EarningsJob): Promise<{ eps: number, revenue: number }> {
    const { symbol, quarter, year } = job.payload;
    // Implementation here
    return { eps: 0, revenue: 0 };
  }

  private async processNewsAnalysis(job: NewsAnalysisJob): Promise<{ sentiment: number, relevantNews: any[] }> {
    const { symbols, sources, sentiment } = job.payload;
    // Implementation here
    return { sentiment: 0, relevantNews: [] };
  }
}

// Type-safe job creation helper
class JobCreator {
  createPriceDataJob(
    symbols: string[],
    interval: PriceDataJob['payload']['interval'],
    source: PriceDataJob['payload']['source'],
    priority: number = 5
  ): PriceDataJob {
    return {
      id: `price-${Date.now()}`,
      type: 'price-data',
      createdAt: new Date(),
      priority,
      payload: { symbols, interval, source }
    };
  }

  createEarningsJob(
    symbol: string,
    quarter: string,
    year: number,
    estimatedDate: Date,
    priority: number = 10
  ): EarningsJob {
    return {
      id: `earnings-${symbol}-${quarter}-${year}`,
      type: 'earnings',
      createdAt: new Date(),
      priority,
      payload: { symbol, quarter, year, estimatedDate }
    };
  }
}
```

## 6. Automated Data Fetching Schedules

### Multi-Exchange Data Pipeline

```typescript
// Exchange configuration
interface ExchangeConfig {
  name: string;
  timezone: string;
  openTime: string;
  closeTime: string;
  preMarketStart?: string;
  afterHoursEnd?: string;
  tradingDays: number[]; // 0 = Sunday, 1 = Monday, etc.
}

const exchanges: ExchangeConfig[] = [
  {
    name: 'NYSE',
    timezone: 'America/New_York',
    openTime: '09:30',
    closeTime: '16:00',
    preMarketStart: '04:00',
    afterHoursEnd: '20:00',
    tradingDays: [1, 2, 3, 4, 5] // Monday to Friday
  },
  {
    name: 'LSE',
    timezone: 'Europe/London',
    openTime: '08:00',
    closeTime: '16:30',
    tradingDays: [1, 2, 3, 4, 5]
  },
  {
    name: 'TSE',
    timezone: 'Asia/Tokyo',
    openTime: '09:00',
    closeTime: '15:00',
    tradingDays: [1, 2, 3, 4, 5]
  }
];

class ExchangeDataScheduler {
  private scheduledJobs: Map<string, any> = new Map();

  setupDataPipeline(): void {
    exchanges.forEach(exchange => {
      this.scheduleExchangeData(exchange);
    });
  }

  private scheduleExchangeData(exchange: ExchangeConfig): void {
    // Pre-market data (if available)
    if (exchange.preMarketStart) {
      const preMarketCron = this.timeToCron(exchange.preMarketStart, exchange.tradingDays);
      const preMarketJob = cron.schedule(preMarketCron, async () => {
        await this.fetchPreMarketData(exchange.name);
      }, { timezone: exchange.timezone });
      
      this.scheduledJobs.set(`${exchange.name}-premarket`, preMarketJob);
    }

    // Market open data
    const openCron = this.timeToCron(exchange.openTime, exchange.tradingDays);
    const openJob = cron.schedule(openCron, async () => {
      await this.fetchMarketOpenData(exchange.name);
    }, { timezone: exchange.timezone });
    
    this.scheduledJobs.set(`${exchange.name}-open`, openJob);

    // Intraday data (every 5 minutes during trading hours)
    const intradayCron = this.createIntradayCron(exchange);
    const intradayJob = cron.schedule(intradayCron, async () => {
      if (this.isMarketOpen(exchange)) {
        await this.fetchIntradayData(exchange.name);
      }
    }, { timezone: exchange.timezone });
    
    this.scheduledJobs.set(`${exchange.name}-intraday`, intradayJob);

    // Market close data
    const closeCron = this.timeToCron(exchange.closeTime, exchange.tradingDays);
    const closeJob = cron.schedule(closeCron, async () => {
      await this.fetchMarketCloseData(exchange.name);
    }, { timezone: exchange.timezone });
    
    this.scheduledJobs.set(`${exchange.name}-close`, closeJob);
  }

  private timeToCron(time: string, tradingDays: number[]): string {
    const [hours, minutes] = time.split(':');
    const days = tradingDays.join(',');
    return `${minutes} ${hours} * * ${days}`;
  }

  private createIntradayCron(exchange: ExchangeConfig): string {
    const days = exchange.tradingDays.join(',');
    const [openHour] = exchange.openTime.split(':');
    const [closeHour] = exchange.closeTime.split(':');
    return `*/5 ${openHour}-${closeHour} * * ${days}`;
  }

  private isMarketOpen(exchange: ExchangeConfig): boolean {
    const now = new Date();
    const currentDay = now.getDay();
    
    if (!exchange.tradingDays.includes(currentDay)) {
      return false;
    }

    // Additional logic to check current time against market hours
    // This would need proper timezone handling
    return true;
  }

  private async fetchPreMarketData(exchange: string): Promise<void> {
    await financialDataQueue.add('fetch-premarket-data', {
      exchange,
      timestamp: new Date().toISOString()
    }, { priority: 8 });
  }

  private async fetchMarketOpenData(exchange: string): Promise<void> {
    await financialDataQueue.add('fetch-market-open-data', {
      exchange,
      timestamp: new Date().toISOString()
    }, { priority: 10 });
  }

  private async fetchIntradayData(exchange: string): Promise<void> {
    await financialDataQueue.add('fetch-intraday-data', {
      exchange,
      timestamp: new Date().toISOString()
    }, { priority: 5 });
  }

  private async fetchMarketCloseData(exchange: string): Promise<void> {
    await financialDataQueue.add('fetch-market-close-data', {
      exchange,
      timestamp: new Date().toISOString()
    }, { priority: 9 });
  }

  stopAllJobs(): void {
    this.scheduledJobs.forEach((job, name) => {
      job.stop();
      console.log(`Stopped job: ${name}`);
    });
    this.scheduledJobs.clear();
  }
}

// Initialize the scheduler
const exchangeScheduler = new ExchangeDataScheduler();
exchangeScheduler.setupDataPipeline();

// Graceful shutdown
process.on('SIGTERM', () => {
  exchangeScheduler.stopAllJobs();
  process.exit(0);
});
```

## 7. Best Practices Summary

### Architecture Recommendations

1. **Use BullMQ for production workloads** - Better reliability, monitoring, and scalability
2. **Use node-cron for simple scheduling** - When you just need basic cron-like functionality
3. **Implement proper error classification** - Different retry strategies for different error types
4. **Use TypeScript for type safety** - Catch errors at compile time
5. **Monitor queue health** - Set up alerts for queue backlogs and failed jobs
6. **Implement graceful shutdown** - Allow jobs to complete before termination
7. **Use market-aware scheduling** - Don't process unnecessary jobs when markets are closed
8. **Implement circuit breakers** - Prevent cascade failures in external API calls
9. **Use structured logging** - Enable proper monitoring and debugging
10. **Test with realistic data volumes** - Ensure your system can handle production loads

### Performance Considerations

- Use Redis clustering for high availability
- Implement job prioritization for time-sensitive data
- Use worker pools to maximize concurrency
- Monitor memory usage and implement proper cleanup
- Use database connection pooling
- Implement caching for frequently accessed data
- Use compression for large job payloads

This comprehensive guide provides the foundation for building robust, scalable background job processing systems specifically tailored for financial data applications.