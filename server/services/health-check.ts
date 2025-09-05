/**
 * Health Check Service
 * Monitors system components and provides status endpoints
 */

import { env } from '../config/env.js';
import { supabase } from '../lib/supabase.js';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  services: {
    server: boolean;
    database: boolean;
    redis: boolean;
    apis: {
      alphaVantage: boolean;
      finnhub: boolean;
      fmp: boolean;
      twelveData: boolean;
    };
  };
  details?: Record<string, any>;
}

export class HealthCheckService {
  async getHealth(): Promise<HealthStatus> {
    const dbConfigured = !!supabase; // Supabase optional in current architecture

    const health: HealthStatus = {
      status: 'healthy',
      timestamp: Date.now(),
      services: {
        server: true,
        // If DB is not configured, treat as non-critical and mark as true
        database: dbConfigured ? false : true,
        redis: false,
        apis: {
          alphaVantage: false,
          finnhub: false,
          fmp: false,
          twelveData: false
        }
      }
    };

    // Check database (Supabase)
    if (dbConfigured) {
      try {
        const { error } = await supabase!.from('cache_quotes').select('symbol').limit(1);
        health.services.database = !error;
      } catch {
        health.services.database = false;
      }
    }

    // Check Redis
    try {
      if (env.REDIS_HOST && env.REDIS_PASSWORD) {
        // Try to import and check Redis
        const { redisCacheService } = await import('../cache/redis-cache-service.js');
        const redisHealth = await redisCacheService.healthCheck();
        health.services.redis = redisHealth.status === 'healthy';
        
        if (health.services.redis) {
          console.log('✅ Redis health check passed');
        }
      }
    } catch (error) {
      console.log('❌ Redis health check failed:', error.message);
      health.services.redis = false;
    }

    // Check API keys
    health.services.apis.alphaVantage = !!env.ALPHA_VANTAGE_API_KEY;
    health.services.apis.finnhub = !!env.FINNHUB_API_KEY;
    health.services.apis.fmp = !!env.FMP_API_KEY;
    health.services.apis.twelveData = !!env.TWELVE_DATA_API_KEY;

    // Determine overall status
    // Database is only critical if configured
    const criticalServices = dbConfigured
      ? [health.services.server, health.services.database]
      : [health.services.server];
    
    const importantServices = [
      health.services.redis,
      Object.values(health.services.apis).some(v => v) // At least one API
    ];

    if (criticalServices.every(s => s) && importantServices.every(s => s)) {
      health.status = 'healthy';
    } else if (criticalServices.every(s => s)) {
      health.status = 'degraded';
    } else {
      health.status = 'unhealthy';
    }

    return health;
  }

  async getDetailedHealth(): Promise<HealthStatus & { details: Record<string, any> }> {
    const health = await this.getHealth();
    
    const details: Record<string, any> = {
      environment: env.NODE_ENV,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      versions: {
        node: process.version,
        v8: process.versions.v8
      }
    };

    // Add Redis details if available
    if (health.services.redis) {
      try {
        const { redisCacheService } = await import('../cache/redis-cache-service.js');
        const stats = redisCacheService.getStats();
        details.redis = stats;
      } catch {
        // Ignore
      }
    }

    return { ...health, details };
  }
}

export const healthCheckService = new HealthCheckService();
