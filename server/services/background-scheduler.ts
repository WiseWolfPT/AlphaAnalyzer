/**
 * BACKGROUND SCHEDULER SERVICE
 * Manages automated API calls and cache warming to optimize user experience
 * Part of the professional platform strategy with invisible API management
 */

import { globalCache, DataType } from '../cache/intelligent-cache-manager';
import { ServerMarketDataService } from './market-data-service';

interface ScheduledJob {
  id: string;
  name: string;
  interval: number; // milliseconds
  lastRun: Date | null;
  nextRun: Date;
  isRunning: boolean;
  enabled: boolean;
  priority: 'high' | 'medium' | 'low';
}

interface SchedulerStats {
  totalJobs: number;
  activeJobs: number;
  completedRuns: number;
  failedRuns: number;
  apiCallsSaved: number;
  uptime: number;
}

export class BackgroundScheduler {
  private jobs = new Map<string, ScheduledJob>();
  private timers = new Map<string, NodeJS.Timeout>();
  private marketDataService: ServerMarketDataService;
  private stats: SchedulerStats = {
    totalJobs: 0,
    activeJobs: 0,
    completedRuns: 0,
    failedRuns: 0,
    apiCallsSaved: 0,
    uptime: Date.now()
  };

  // Most popular stocks to pre-cache
  private readonly POPULAR_STOCKS = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA',
    'META', 'NVDA', 'JPM', 'V', 'JNJ',
    'WMT', 'PG', 'UNH', 'DIS', 'MA'
  ];

  // Extended watchlist for broader market coverage
  private readonly EXTENDED_WATCHLIST = [
    ...this.POPULAR_STOCKS,
    'NFLX', 'PYPL', 'ADBE', 'CRM', 'INTC',
    'AMD', 'ORCL', 'IBM', 'QCOM', 'BABA',
    'BRK.B', 'KO', 'PFE', 'MRK', 'XOM'
  ];

  constructor() {
    this.marketDataService = new ServerMarketDataService();
    this.initializeJobs();
  }

  private initializeJobs(): void {
    // Job 1: Pre-market cache warming (6:00 AM ET)
    this.addJob({
      id: 'premarket-warm',
      name: 'Pre-market Cache Warming',
      interval: 24 * 60 * 60 * 1000, // Daily
      lastRun: null,
      nextRun: this.getNextScheduledTime(6, 0), // 6:00 AM ET
      isRunning: false,
      enabled: true,
      priority: 'high'
    });

    // Job 2: Market hours real-time updates (9:30 AM - 4:00 PM ET)
    this.addJob({
      id: 'market-hours-updates',
      name: 'Market Hours Price Updates',
      interval: 60 * 1000, // Every minute during market hours
      lastRun: null,
      nextRun: new Date(Date.now() + 60 * 1000),
      isRunning: false,
      enabled: true,
      priority: 'high'
    });

    // Job 3: After-hours updates (4:00 PM - 8:00 PM ET)
    this.addJob({
      id: 'after-hours-updates',
      name: 'After Hours Price Updates',
      interval: 5 * 60 * 1000, // Every 5 minutes after hours
      lastRun: null,
      nextRun: new Date(Date.now() + 5 * 60 * 1000),
      isRunning: false,
      enabled: true,
      priority: 'medium'
    });

    // Job 4: Cache cleanup and maintenance
    this.addJob({
      id: 'cache-maintenance',
      name: 'Cache Maintenance',
      interval: 10 * 60 * 1000, // Every 10 minutes
      lastRun: null,
      nextRun: new Date(Date.now() + 10 * 60 * 1000),
      isRunning: false,
      enabled: true,
      priority: 'low'
    });

    // Job 5: Weekly deep cache warming
    this.addJob({
      id: 'weekly-deep-warm',
      name: 'Weekly Deep Cache Warming',
      interval: 7 * 24 * 60 * 60 * 1000, // Weekly
      lastRun: null,
      nextRun: this.getNextScheduledTime(0, 0, true), // Sunday midnight
      isRunning: false,
      enabled: true,
      priority: 'medium'
    });

    this.stats.totalJobs = this.jobs.size;
    console.log(`📅 Background Scheduler initialized with ${this.jobs.size} jobs`);
  }

  private addJob(job: ScheduledJob): void {
    this.jobs.set(job.id, job);
    if (job.enabled) {
      this.scheduleJob(job.id);
    }
  }

  private scheduleJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job || !job.enabled) return;

    const now = Date.now();
    const delay = Math.max(0, job.nextRun.getTime() - now);

    const timer = setTimeout(async () => {
      await this.executeJob(jobId);
    }, delay);

    this.timers.set(jobId, timer);
    console.log(`⏰ Scheduled job '${job.name}' to run in ${Math.round(delay / 1000)}s`);
  }

  private async executeJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.isRunning) return;

    job.isRunning = true;
    job.lastRun = new Date();
    this.stats.activeJobs++;

    console.log(`🚀 Executing job: ${job.name}`);

    try {
      switch (jobId) {
        case 'premarket-warm':
          await this.executePremarketWarm();
          break;
        case 'market-hours-updates':
          await this.executeMarketHoursUpdates();
          break;
        case 'after-hours-updates':
          await this.executeAfterHoursUpdates();
          break;
        case 'cache-maintenance':
          await this.executeCacheMaintenance();
          break;
        case 'weekly-deep-warm':
          await this.executeWeeklyDeepWarm();
          break;
        default:
          console.warn(`Unknown job: ${jobId}`);
      }

      this.stats.completedRuns++;
      console.log(`✅ Job completed: ${job.name}`);

    } catch (error) {
      this.stats.failedRuns++;
      console.error(`❌ Job failed: ${job.name}`, error.message);
    } finally {
      job.isRunning = false;
      this.stats.activeJobs--;
      
      // Schedule next run
      job.nextRun = new Date(job.lastRun.getTime() + job.interval);
      this.scheduleJob(jobId);
    }
  }

  private async executePremarketWarm(): Promise<void> {
    console.log('🌅 Pre-market cache warming starting...');
    
    // Warm cache for popular stocks before market open
    await this.marketDataService.warmCache(this.POPULAR_STOCKS);
    
    // Pre-fetch some company profiles (7-day cache)
    for (const symbol of this.POPULAR_STOCKS.slice(0, 5)) {
      // This would be implemented when we add company profile endpoints
      console.log(`📊 Would pre-fetch profile for ${symbol}`);
    }
    
    this.stats.apiCallsSaved += this.POPULAR_STOCKS.length;
    console.log('🌅 Pre-market warming completed');
  }

  private async executeMarketHoursUpdates(): Promise<void> {
    if (!this.isMarketOpen()) {
      return; // Skip during non-market hours
    }

    console.log('📈 Market hours update starting...');
    
    // Update prices for popular stocks
    const quotes = await this.marketDataService.getBatchQuotes(this.POPULAR_STOCKS.slice(0, 10));
    console.log(`📈 Updated ${quotes.length} quotes during market hours`);
    
    this.stats.apiCallsSaved += quotes.length;
  }

  private async executeAfterHoursUpdates(): Promise<void> {
    if (this.isMarketOpen() || !this.isAfterHours()) {
      return; // Skip if market is open or not in after-hours period
    }

    console.log('🌙 After hours update starting...');
    
    // Update fewer stocks, less frequently after hours
    const quotes = await this.marketDataService.getBatchQuotes(this.POPULAR_STOCKS.slice(0, 5));
    console.log(`🌙 Updated ${quotes.length} quotes after hours`);
    
    this.stats.apiCallsSaved += quotes.length;
  }

  private async executeCacheMaintenance(): Promise<void> {
    console.log('🧹 Cache maintenance starting...');
    
    const cleaned = globalCache.cleanup();
    console.log(`🧹 Cache maintenance: removed ${cleaned} expired entries`);
    
    // Log cache stats
    const stats = globalCache.getStats();
    console.log(`📊 Cache stats: ${stats.hitRate} hit rate, ${stats.totalEntries} entries`);
  }

  private async executeWeeklyDeepWarm(): Promise<void> {
    console.log('🔥 Weekly deep cache warming starting...');
    
    // Warm extended watchlist
    await this.marketDataService.warmCache(this.EXTENDED_WATCHLIST);
    
    // Clear old cache entries that might be stale
    globalCache.clear(DataType.COMPANY_PROFILE);
    
    this.stats.apiCallsSaved += this.EXTENDED_WATCHLIST.length;
    console.log('🔥 Weekly deep warming completed');
  }

  private isMarketOpen(): boolean {
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const day = easternTime.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Skip weekends
    if (day === 0 || day === 6) return false;
    
    const hours = easternTime.getHours();
    const minutes = easternTime.getMinutes();
    const currentTime = hours * 60 + minutes;
    
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM
    
    return currentTime >= marketOpen && currentTime < marketClose;
  }

  private isAfterHours(): boolean {
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const day = easternTime.getDay();
    
    // Skip weekends
    if (day === 0 || day === 6) return false;
    
    const hours = easternTime.getHours();
    const minutes = easternTime.getMinutes();
    const currentTime = hours * 60 + minutes;
    
    const afterHoursStart = 16 * 60; // 4:00 PM
    const afterHoursEnd = 20 * 60; // 8:00 PM
    
    return currentTime >= afterHoursStart && currentTime < afterHoursEnd;
  }

  private getNextScheduledTime(hour: number, minute: number, nextWeek = false): Date {
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    
    const scheduledTime = new Date(easternTime);
    scheduledTime.setHours(hour, minute, 0, 0);
    
    // If the time has already passed today, schedule for tomorrow
    if (scheduledTime <= easternTime) {
      scheduledTime.setDate(scheduledTime.getDate() + (nextWeek ? 7 : 1));
    }
    
    return scheduledTime;
  }

  // Public methods for admin panel
  start(): void {
    console.log('🚀 Background Scheduler starting...');
    
    for (const [jobId, job] of this.jobs) {
      if (job.enabled) {
        this.scheduleJob(jobId);
      }
    }
    
    console.log('✅ Background Scheduler started');
  }

  stop(): void {
    console.log('🛑 Background Scheduler stopping...');
    
    for (const [jobId, timer] of this.timers) {
      clearTimeout(timer);
    }
    
    this.timers.clear();
    console.log('✅ Background Scheduler stopped');
  }

  getJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  getStats(): SchedulerStats {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.uptime
    };
  }

  enableJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job) {
      job.enabled = true;
      this.scheduleJob(jobId);
      console.log(`✅ Enabled job: ${job.name}`);
      return true;
    }
    return false;
  }

  disableJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job) {
      job.enabled = false;
      const timer = this.timers.get(jobId);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(jobId);
      }
      console.log(`⏸️ Disabled job: ${job.name}`);
      return true;
    }
    return false;
  }

  // Force run a job immediately (for admin panel)
  async runJobNow(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (job && !job.isRunning) {
      await this.executeJob(jobId);
      return true;
    }
    return false;
  }
}

// Global scheduler instance
export const backgroundScheduler = new BackgroundScheduler();

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  backgroundScheduler.start();
  console.log('🚀 Background Scheduler auto-started for production');
}