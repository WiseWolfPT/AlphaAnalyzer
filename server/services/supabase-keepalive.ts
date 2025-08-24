import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import logger from '../lib/logger';

/**
 * Supabase Keep-Alive Service
 * Prevents Supabase from pausing the database after 1 week of inactivity
 * by making periodic health check queries
 */
class SupabaseKeepAliveService {
  private supabase: any;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly KEEP_ALIVE_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
  private isRunning = false;

  constructor() {
    if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
      this.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
      logger.info('Supabase Keep-Alive Service initialized');
    } else {
      logger.warn('Supabase Keep-Alive Service: Missing configuration');
    }
  }

  /**
   * Perform a keep-alive query to prevent database from pausing
   */
  private async performKeepAlive(): Promise<boolean> {
    if (!this.supabase) {
      logger.warn('Supabase Keep-Alive: No client available');
      return false;
    }

    try {
      const startTime = Date.now();
      
      // Simple query to keep the database active
      const { data, error } = await this.supabase
        .from('cache_quotes')
        .select('symbol')
        .limit(1);

      const duration = Date.now() - startTime;

      if (error) {
        logger.error('Supabase Keep-Alive query failed', {
          error: error.message,
          code: error.code,
          duration
        });
        return false;
      }

      logger.info('Supabase Keep-Alive successful', {
        duration,
        timestamp: new Date().toISOString(),
        rowsReturned: data?.length || 0
      });

      // Also update a heartbeat record if the table exists
      try {
        await this.updateHeartbeat();
      } catch (hbError) {
        // Non-critical error, just log it
        logger.debug('Heartbeat update failed (non-critical)', { error: hbError });
      }

      return true;
    } catch (error) {
      logger.error('Supabase Keep-Alive error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  /**
   * Update a heartbeat record to show the service is active
   */
  private async updateHeartbeat(): Promise<void> {
    if (!this.supabase) return;

    try {
      // Try to upsert a heartbeat record
      const { error } = await this.supabase
        .from('system_heartbeat')
        .upsert({
          service_name: 'alfalyzer_backend',
          last_heartbeat: new Date().toISOString(),
          environment: env.NODE_ENV,
          metadata: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            pid: process.pid
          }
        }, {
          onConflict: 'service_name'
        });

      if (error && error.code === '42P01') {
        // Table doesn't exist, create it
        await this.createHeartbeatTable();
      }
    } catch (error) {
      // Silently fail - this is optional functionality
    }
  }

  /**
   * Create heartbeat table if it doesn't exist
   */
  private async createHeartbeatTable(): Promise<void> {
    if (!this.supabase) return;

    try {
      // Note: This requires admin privileges
      // In production, create this table manually via Supabase dashboard
      const { error } = await this.supabase.rpc('create_heartbeat_table', {
        sql: `
          CREATE TABLE IF NOT EXISTS system_heartbeat (
            service_name TEXT PRIMARY KEY,
            last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            environment TEXT,
            metadata JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_heartbeat_timestamp 
          ON system_heartbeat(last_heartbeat);
        `
      });

      if (!error) {
        logger.info('Heartbeat table created successfully');
      }
    } catch (error) {
      // Table creation might fail due to permissions
      // This is okay - the table can be created manually
      logger.debug('Could not create heartbeat table (requires admin)');
    }
  }

  /**
   * Start the keep-alive service
   */
  public start(): void {
    if (this.isRunning) {
      logger.warn('Supabase Keep-Alive Service is already running');
      return;
    }

    if (!this.supabase) {
      logger.warn('Cannot start Keep-Alive Service: Supabase not configured');
      return;
    }

    // Perform initial keep-alive
    this.performKeepAlive();

    // Schedule periodic keep-alive
    this.intervalId = setInterval(() => {
      this.performKeepAlive();
    }, this.KEEP_ALIVE_INTERVAL);

    this.isRunning = true;
    logger.info(`Supabase Keep-Alive Service started (interval: ${this.KEEP_ALIVE_INTERVAL / 1000 / 60} minutes)`);
  }

  /**
   * Stop the keep-alive service
   */
  public stop(): void {
    if (!this.isRunning) {
      logger.warn('Supabase Keep-Alive Service is not running');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    logger.info('Supabase Keep-Alive Service stopped');
  }

  /**
   * Get service status
   */
  public getStatus(): {
    running: boolean;
    configured: boolean;
    interval: number;
    nextRun?: Date;
  } {
    return {
      running: this.isRunning,
      configured: !!this.supabase,
      interval: this.KEEP_ALIVE_INTERVAL,
      nextRun: this.isRunning ? new Date(Date.now() + this.KEEP_ALIVE_INTERVAL) : undefined
    };
  }

  /**
   * Manually trigger a keep-alive
   */
  public async triggerKeepAlive(): Promise<boolean> {
    logger.info('Manually triggering Supabase keep-alive');
    return await this.performKeepAlive();
  }
}

// Export singleton instance
const supabaseKeepAlive = new SupabaseKeepAliveService();

export default supabaseKeepAlive;