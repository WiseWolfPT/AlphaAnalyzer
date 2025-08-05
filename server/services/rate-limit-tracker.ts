import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../config/supabase-config';

// Initialize Supabase client for rate limiting
const config = supabaseConfig.getConfig();
const supabase = config ? createClient(config.url, config.key) : null;

export interface RateLimitResult {
  allowed: boolean;
  used: number;
  dailyLimit: number;
  minuteLimit?: number;
  remaining: number;
  usagePercent: number;
  resetAt: Date;
}

export interface RateLimitUsage {
  provider: string;
  endpoint: string;
  used: number;
  dailyLimit: number;
  minuteLimit?: number;
  usagePercent: number;
  callsLastHour: number;
  callsLastMinute: number;
  lastCall?: Date;
  resetAt: Date;
}

export interface ApiCallOptions {
  userId?: string;
  ipAddress?: string;
  responseTimeMs?: number;
  statusCode?: number;
  requestSize?: number;
  responseSize?: number;
}

/**
 * Persistent Rate Limit Tracker using Supabase
 * 
 * This service replaces the in-memory quota tracking with a database-persistent
 * system that survives server restarts and can be shared across multiple instances.
 * 
 * Features:
 * - Persistent quota tracking in Supabase
 * - Detailed API call logging
 * - Real-time usage monitoring
 * - Automatic daily resets
 * - Per-minute and per-day limits
 * - Usage alerts and warnings
 * - Performance analytics
 */
export class RateLimitTracker {
  private readonly alertThreshold = 80; // Alert when usage hits 80%
  private readonly warningThreshold = 90; // Warning when usage hits 90%
  private sqlFunctionsAvailable: boolean | null = null; // Track if SQL functions exist
  private checkInProgress = false; // Prevent concurrent checks
  
  constructor() {
    // Check SQL functions availability on initialization
    this.initializeSqlCheck();
  }
  
  private async initializeSqlCheck() {
    await this.checkSqlFunctionsAvailable();
  }
  
  private isSupabaseAvailable(): boolean {
    return supabase !== null;
  }
  
  /**
   * Check if SQL functions are available in the database
   */
  private async checkSqlFunctionsAvailable(): Promise<boolean> {
    // Return cached result if already checked
    if (this.sqlFunctionsAvailable !== null) {
      return this.sqlFunctionsAvailable;
    }
    
    // Prevent concurrent checks
    if (this.checkInProgress) {
      // Wait a bit and return false for now
      return false;
    }
    
    this.checkInProgress = true;
    
    if (!this.isSupabaseAvailable()) {
      this.sqlFunctionsAvailable = false;
      this.checkInProgress = false;
      return false;
    }
    
    try {
      // Try a simple call to check if function exists
      const { error } = await supabase.rpc('check_api_limit', {
        p_provider: 'test',
        p_endpoint: 'test'
      });
      
      // If error contains "not found" then functions don't exist
      if (error && error.message.includes('not found')) {
        this.sqlFunctionsAvailable = false;
        // Only log once
        if (process.env.LOG_LEVEL !== 'error') {
          console.info('[RateLimitTracker] SQL functions not found. Rate limiting disabled.');
        }
      } else {
        this.sqlFunctionsAvailable = true;
      }
    } catch (error) {
      this.sqlFunctionsAvailable = false;
    }
    
    this.checkInProgress = false;
    return this.sqlFunctionsAvailable;
  }

  /**
   * Check if an API call is allowed for the given provider/endpoint
   */
  async checkLimit(provider: string, endpoint: string): Promise<RateLimitResult> {
    // If Supabase is not configured or SQL functions don't exist, allow all requests
    if (!supabase || !(await this.checkSqlFunctionsAvailable())) {
      return {
        allowed: true,
        used: 0,
        dailyLimit: 1000,
        remaining: 1000,
        usagePercent: 0,
        resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };
    }

    try {
      const { data, error } = await supabase.rpc('check_api_limit', {
        p_provider: provider,
        p_endpoint: endpoint
      });

      if (error) {
        // Only log error if it's not a "function not found" error
        if (!error.message.includes('not found')) {
          console.error(`❌ [RateLimitTracker] Failed to check limit:`, error);
        }
        // Fail open - allow the request
        return {
          allowed: true,
          used: 0,
          dailyLimit: 1000,
          remaining: 1000,
          usagePercent: 0,
          resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        };
      }

      const result = data as any;
      const usagePercent = Math.round((result.used / result.daily_limit) * 100);

      return {
        allowed: result.allowed,
        used: result.used,
        dailyLimit: result.daily_limit,
        minuteLimit: result.minute_limit,
        remaining: result.remaining,
        usagePercent,
        resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Approximate
      };
    } catch (error) {
      console.error(`❌ [RateLimitTracker] Error checking limit:`, error);
      // Fail open - allow the request
      return {
        allowed: true,
        used: 0,
        dailyLimit: 1000,
        remaining: 1000,
        usagePercent: 0,
        resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };
    }
  }

  /**
   * Record an API call and increment usage counters
   */
  async recordCall(
    provider: string, 
    endpoint: string, 
    options: ApiCallOptions = {}
  ): Promise<RateLimitResult> {
    // If Supabase is not configured or SQL functions don't exist, return default
    if (!supabase || !(await this.checkSqlFunctionsAvailable())) {
      return {
        allowed: true,
        used: 0,
        dailyLimit: 1000,
        remaining: 1000,
        usagePercent: 0,
        resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };
    }
    
    try {
      const { data, error } = await supabase.rpc('increment_api_usage', {
        p_provider: provider,
        p_endpoint: endpoint,
        p_user_id: options.userId || null,
        p_ip_address: options.ipAddress || null,
        p_response_time_ms: options.responseTimeMs || null,
        p_status_code: options.statusCode || 200
      });

      if (error) {
        // Only log error if it's not a "function not found" error
        if (!error.message.includes('not found')) {
          console.error(`❌ [RateLimitTracker] Failed to record call:`, error);
        }
        throw new Error(`Failed to record API call: ${error.message}`);
      }

      const result = data as any;
      const usagePercent = Math.round((result.used / result.daily_limit) * 100);

      // Log usage and check for alerts
      console.log(`📊 [RateLimitTracker] ${provider}/${endpoint} - Usage: ${result.used}/${result.daily_limit} (${usagePercent}%)`);
      
      // Check for usage alerts
      if (usagePercent >= this.warningThreshold) {
        console.warn(`🚨 [RateLimitTracker] HIGH USAGE WARNING: ${provider}/${endpoint} at ${usagePercent}%`);
      } else if (usagePercent >= this.alertThreshold) {
        console.warn(`⚠️ [RateLimitTracker] Usage Alert: ${provider}/${endpoint} at ${usagePercent}%`);
      }

      return {
        allowed: result.allowed,
        used: result.used,
        dailyLimit: result.daily_limit,
        minuteLimit: result.minute_limit,
        remaining: result.remaining,
        usagePercent,
        resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Approximate
      };
    } catch (error: any) {
      // Only log error if it's not a "function not found" error
      if (!error.message?.includes('not found')) {
        console.error(`❌ [RateLimitTracker] Error recording call:`, error);
      }
      throw error;
    }
  }

  /**
   * Get current usage statistics for all providers
   */
  async getAllUsage(): Promise<RateLimitUsage[]> {
    // If Supabase is not configured or SQL functions don't exist, return empty
    if (!supabase || !(await this.checkSqlFunctionsAvailable())) {
      return [];
    }
    
    try {
      const { data, error } = await supabase.rpc('get_quota_stats');

      if (error) {
        // Only log error if it's not a "function not found" error
        if (!error.message.includes('not found')) {
          console.error(`❌ [RateLimitTracker] Failed to get usage stats:`, error);
        }
        return [];
      }

      return (data || []).map((row: any) => ({
        provider: row.provider,
        endpoint: row.endpoint,
        used: row.used,
        dailyLimit: row.daily_limit,
        minuteLimit: row.minute_limit,
        usagePercent: parseFloat(row.usage_percent) || 0,
        callsLastHour: row.calls_last_hour,
        callsLastMinute: row.calls_last_minute,
        lastCall: row.last_call ? new Date(row.last_call) : undefined,
        resetAt: new Date(row.reset_at)
      }));
    } catch (error) {
      console.error(`❌ [RateLimitTracker] Error getting usage stats:`, error);
      return [];
    }
  }

  /**
   * Get usage for a specific provider
   */
  async getProviderUsage(provider: string): Promise<RateLimitUsage[]> {
    const allUsage = await this.getAllUsage();
    return allUsage.filter(usage => usage.provider === provider);
  }

  /**
   * Get usage for a specific provider/endpoint combination
   */
  async getEndpointUsage(provider: string, endpoint: string): Promise<RateLimitUsage | null> {
    const allUsage = await this.getAllUsage();
    return allUsage.find(usage => usage.provider === provider && usage.endpoint === endpoint) || null;
  }

  /**
   * Get providers that are approaching their limits
   */
  async getProvidersNearLimit(threshold = 80): Promise<RateLimitUsage[]> {
    const allUsage = await this.getAllUsage();
    return allUsage.filter(usage => usage.usagePercent >= threshold);
  }

  /**
   * Get the best available provider for a given data type
   * Returns the provider with the lowest usage percentage that still has capacity
   */
  async selectBestProvider(
    providers: string[], 
    endpoint: string = 'quote'
  ): Promise<{ provider: string; usage: RateLimitUsage } | null> {
    const allUsage = await this.getAllUsage();
    
    // Filter to only the providers we're interested in
    const relevantUsage = allUsage.filter(usage => 
      providers.includes(usage.provider) && usage.endpoint === endpoint
    );

    // Sort by usage percentage (lowest first)
    const sortedProviders = relevantUsage
      .filter(usage => usage.usagePercent < 100) // Only providers with remaining capacity
      .sort((a, b) => a.usagePercent - b.usagePercent);

    if (sortedProviders.length === 0) {
      return null; // No providers with remaining capacity
    }

    return {
      provider: sortedProviders[0].provider,
      usage: sortedProviders[0]
    };
  }

  /**
   * Check for usage alerts across all providers
   */
  async checkAlerts(): Promise<{
    alerts: Array<{ provider: string; endpoint: string; usagePercent: number; level: 'warning' | 'alert' }>;
    summary: { total: number; warnings: number; alerts: number };
  }> {
    const allUsage = await this.getAllUsage();
    const alerts = [];

    for (const usage of allUsage) {
      if (usage.usagePercent >= this.warningThreshold) {
        alerts.push({
          provider: usage.provider,
          endpoint: usage.endpoint,
          usagePercent: usage.usagePercent,
          level: 'warning' as const
        });
      } else if (usage.usagePercent >= this.alertThreshold) {
        alerts.push({
          provider: usage.provider,
          endpoint: usage.endpoint,
          usagePercent: usage.usagePercent,
          level: 'alert' as const
        });
      }
    }

    const summary = {
      total: alerts.length,
      warnings: alerts.filter(a => a.level === 'warning').length,
      alerts: alerts.filter(a => a.level === 'alert').length
    };

    return { alerts, summary };
  }

  /**
   * Reset usage counters (mainly for testing)
   */
  async resetUsage(provider: string, endpoint: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('rate_limits')
        .update({ 
          used: 0, 
          reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('provider', provider)
        .eq('endpoint', endpoint);

      if (error) {
        console.error(`❌ [RateLimitTracker] Failed to reset usage:`, error);
        throw new Error(`Failed to reset usage: ${error.message}`);
      }

      console.log(`🔄 [RateLimitTracker] Reset usage for ${provider}/${endpoint}`);
    } catch (error) {
      console.error(`❌ [RateLimitTracker] Error resetting usage:`, error);
      throw error;
    }
  }

  /**
   * Clean up old rate limit logs
   */
  async cleanupOldLogs(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('cleanup_old_rate_limit_logs');

      if (error) {
        console.error(`❌ [RateLimitTracker] Failed to cleanup logs:`, error);
        return 0;
      }

      const deletedCount = data || 0;
      console.log(`🧹 [RateLimitTracker] Cleaned up ${deletedCount} old rate limit logs`);
      return deletedCount;
    } catch (error) {
      console.error(`❌ [RateLimitTracker] Error cleaning up logs:`, error);
      return 0;
    }
  }

  /**
   * Get performance analytics for API calls
   */
  async getPerformanceStats(
    provider?: string, 
    hours = 24
  ): Promise<{
    totalCalls: number;
    averageResponseTime: number;
    successRate: number;
    callsPerHour: number[];
    slowestCalls: Array<{ endpoint: string; responseTime: number; timestamp: Date }>;
  }> {
    try {
      const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      let query = supabase
        .from('rate_limit_logs')
        .select('*')
        .gte('timestamp', hoursAgo.toISOString());

      if (provider) {
        query = query.eq('provider', provider);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`❌ [RateLimitTracker] Failed to get performance stats:`, error);
        throw new Error(`Failed to get performance stats: ${error.message}`);
      }

      const logs = data || [];
      const totalCalls = logs.length;
      
      if (totalCalls === 0) {
        return {
          totalCalls: 0,
          averageResponseTime: 0,
          successRate: 0,
          callsPerHour: [],
          slowestCalls: []
        };
      }

      // Calculate average response time
      const responseTimes = logs
        .filter(log => log.response_time_ms != null)
        .map(log => log.response_time_ms);
      
      const averageResponseTime = responseTimes.length > 0 
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;

      // Calculate success rate
      const successfulCalls = logs.filter(log => log.status_code < 400).length;
      const successRate = Math.round((successfulCalls / totalCalls) * 100);

      // Calculate calls per hour
      const callsPerHour = new Array(hours).fill(0);
      logs.forEach(log => {
        const logTime = new Date(log.timestamp);
        const hoursAgo = Math.floor((Date.now() - logTime.getTime()) / (60 * 60 * 1000));
        if (hoursAgo >= 0 && hoursAgo < hours) {
          callsPerHour[hours - 1 - hoursAgo]++;
        }
      });

      // Get slowest calls
      const slowestCalls = logs
        .filter(log => log.response_time_ms != null)
        .sort((a, b) => b.response_time_ms - a.response_time_ms)
        .slice(0, 10)
        .map(log => ({
          endpoint: log.endpoint,
          responseTime: log.response_time_ms,
          timestamp: new Date(log.timestamp)
        }));

      return {
        totalCalls,
        averageResponseTime,
        successRate,
        callsPerHour,
        slowestCalls
      };
    } catch (error) {
      console.error(`❌ [RateLimitTracker] Error getting performance stats:`, error);
      throw error;
    }
  }

  /**
   * Get real-time usage dashboard data
   */
  async getDashboardData(): Promise<{
    providers: RateLimitUsage[];
    alerts: any;
    performance: any;
    summary: {
      totalProviders: number;
      activeProviders: number;
      averageUsage: number;
      totalCalls24h: number;
    };
  }> {
    try {
      const [usage, alerts, performance] = await Promise.all([
        this.getAllUsage(),
        this.checkAlerts(),
        this.getPerformanceStats()
      ]);

      const activeProviders = usage.filter(u => u.used > 0).length;
      const averageUsage = usage.length > 0 
        ? Math.round(usage.reduce((sum, u) => sum + u.usagePercent, 0) / usage.length)
        : 0;

      return {
        providers: usage,
        alerts,
        performance,
        summary: {
          totalProviders: usage.length,
          activeProviders,
          averageUsage,
          totalCalls24h: performance.totalCalls
        }
      };
    } catch (error) {
      console.error(`❌ [RateLimitTracker] Error getting dashboard data:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const rateLimitTracker = new RateLimitTracker();