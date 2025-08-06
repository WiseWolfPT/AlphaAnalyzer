/**
 * CLEANUP MANAGER - CRITICAL FOR SUPABASE FREE TIER!
 * 
 * Supabase Free Tier: 500MB limit
 * This service MUST run hourly to prevent database overflow
 * 
 * According to ALFALYZER-PRODUCTION-PLAN.md Day 5
 */

import cron from 'node-cron';
import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';

export class CleanupManager {
  private isRunning = false;
  private lastCleanupTime = Date.now();
  private cleanupStats = {
    totalRuns: 0,
    totalDeleted: 0,
    lastRunAt: null as Date | null,
    lastFreedMB: 0
  };

  /**
   * Start all cleanup cron jobs
   */
  startCleanupJobs() {
    // CRITICAL: Run every hour to keep database under 500MB
    cron.schedule('0 * * * *', async () => {
      await this.performHourlyCleanup();
    });

    // FAILSAFE: Check every 10 minutes for emergency cleanup
    cron.schedule('*/10 * * * *', async () => {
      await this.checkDatabaseSize();
    });

    logger.info('🧹 Cleanup manager started - Hourly cleanup + 10min monitoring');
  }

  /**
   * Perform hourly cleanup
   */
  private async performHourlyCleanup() {
    if (this.isRunning) {
      logger.warn('Cleanup already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('🧹 Starting hourly cleanup...');
      
      // Get current database size
      const startSize = await this.getDatabaseSize();
      logger.info(`📊 Database size before cleanup: ${(startSize / 1_000_000).toFixed(2)}MB`);

      // Delete old cache_quotes (> 2 hours old)
      const quotesDeleted = await this.cleanTable('cache_quotes', 2 * 60);
      
      // Delete old cache_fundamentals (> 24 hours old)
      const fundamentalsDeleted = await this.cleanTable('cache_fundamentals', 24 * 60);
      
      // Delete old cache_historical (> 6 hours old)
      const historicalDeleted = await this.cleanTable('cache_historical', 6 * 60);
      
      // Delete old market_news (> 48 hours old)
      const newsDeleted = await this.cleanTable('market_news', 48 * 60);

      // Get new size
      const endSize = await this.getDatabaseSize();
      const freedMB = (startSize - endSize) / 1_000_000;
      
      // Update stats
      this.cleanupStats.totalRuns++;
      this.cleanupStats.totalDeleted += quotesDeleted + fundamentalsDeleted + historicalDeleted + newsDeleted;
      this.cleanupStats.lastRunAt = new Date();
      this.cleanupStats.lastFreedMB = freedMB;

      const elapsed = Date.now() - startTime;
      
      logger.info(`✅ Cleanup complete in ${elapsed}ms`);
      logger.info(`📊 Database size after: ${(endSize / 1_000_000).toFixed(2)}MB`);
      logger.info(`🗑️ Freed: ${freedMB.toFixed(2)}MB`);
      logger.info(`📈 Deleted: ${quotesDeleted} quotes, ${fundamentalsDeleted} fundamentals, ${historicalDeleted} historical, ${newsDeleted} news`);

      // Alert if cleanup didn't free enough space
      if (freedMB < 10 && endSize > 300_000_000) {
        logger.warn('⚠️ Cleanup freed less than 10MB and database is over 300MB!');
      }

      // CRITICAL: Emergency cleanup if over 450MB
      if (endSize > 450_000_000) {
        logger.error('🚨 DATABASE CRITICAL: Over 450MB! Running emergency cleanup...');
        await this.emergencyCleanup();
      }

    } catch (error) {
      logger.error('❌ Cleanup failed:', error);
    } finally {
      this.isRunning = false;
      this.lastCleanupTime = Date.now();
    }
  }

  /**
   * Clean a specific table
   */
  private async cleanTable(tableName: string, olderThanMinutes: number): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString();
      
      const { error, count } = await supabase
        .from(tableName)
        .delete()
        .lt('updated_at', cutoffTime);

      if (error) {
        logger.error(`Failed to clean ${tableName}:`, error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      logger.error(`Error cleaning ${tableName}:`, error);
      return 0;
    }
  }

  /**
   * Check database size and trigger emergency cleanup if needed
   */
  private async checkDatabaseSize() {
    try {
      const size = await this.getDatabaseSize();
      const sizeMB = size / 1_000_000;
      
      logger.debug(`📊 Database size check: ${sizeMB.toFixed(2)}MB`);

      // Emergency thresholds
      if (size > 480_000_000) { // 480MB = EMERGENCY
        logger.error('🆘 EMERGENCY: Database at 480MB! Running emergency cleanup NOW!');
        await this.emergencyCleanup();
      } else if (size > 450_000_000) { // 450MB = Critical
        logger.warn('🚨 CRITICAL: Database at 450MB! Triggering aggressive cleanup...');
        await this.performHourlyCleanup();
      } else if (size > 400_000_000) { // 400MB = Warning
        logger.warn(`⚠️ WARNING: Database at ${sizeMB.toFixed(0)}MB (80% of limit)`);
      }

      // Ping healthcheck if configured
      if (process.env.HEALTHCHECK_UUID) {
        await fetch(`https://hc-ping.com/${process.env.HEALTHCHECK_UUID}`).catch(() => {});
      }

    } catch (error) {
      logger.error('Failed to check database size:', error);
    }
  }

  /**
   * EMERGENCY: Delete everything possible to free space
   */
  private async emergencyCleanup() {
    logger.error('🆘 EMERGENCY CLEANUP STARTED!');
    
    try {
      // Delete EVERYTHING older than 30 minutes from cache tables
      await this.cleanTable('cache_quotes', 30);
      await this.cleanTable('cache_fundamentals', 60);
      await this.cleanTable('cache_historical', 60);
      await this.cleanTable('market_news', 60);
      
      // Delete old portfolios data
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('portfolio_history').delete().lt('created_at', oneWeekAgo);
      
      // Run VACUUM to reclaim space (if supported)
      await supabase.rpc('vacuum_tables').catch(() => {
        logger.warn('VACUUM not available or failed');
      });
      
      const newSize = await this.getDatabaseSize();
      logger.info(`🆘 Emergency cleanup complete. New size: ${(newSize / 1_000_000).toFixed(2)}MB`);
      
      // Send alert if we have webhook configured
      if (process.env.ALERT_WEBHOOK) {
        await fetch(process.env.ALERT_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🆘 ALFALYZER EMERGENCY: Database cleanup executed! Size: ${(newSize / 1_000_000).toFixed(0)}MB`
          })
        }).catch(() => {});
      }

    } catch (error) {
      logger.error('🆘 EMERGENCY CLEANUP FAILED:', error);
    }
  }

  /**
   * Get current database size from Supabase
   */
  private async getDatabaseSize(): Promise<number> {
    try {
      // Try to get size from Supabase system function
      const { data, error } = await supabase.rpc('get_database_size');
      
      if (error || !data) {
        // Fallback: estimate from row counts
        const tables = ['cache_quotes', 'cache_fundamentals', 'cache_historical', 'market_news'];
        let totalRows = 0;
        
        for (const table of tables) {
          const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
          totalRows += count || 0;
        }
        
        // Rough estimate: 1KB per row average
        return totalRows * 1000;
      }
      
      return data[0]?.size || 0;
    } catch (error) {
      logger.error('Failed to get database size:', error);
      return 0;
    }
  }

  /**
   * Get cleanup statistics
   */
  getStats() {
    return {
      ...this.cleanupStats,
      isRunning: this.isRunning,
      nextRunIn: Math.max(0, 3600000 - (Date.now() - this.lastCleanupTime))
    };
  }

  /**
   * Force run cleanup (for testing or emergency)
   */
  async forceCleanup() {
    logger.info('🔧 Force cleanup triggered');
    await this.performHourlyCleanup();
  }
}

// Export singleton instance
export const cleanupManager = new CleanupManager();