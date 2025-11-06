/**
 * AGENT 15: Data Fallback Monitoring Routes
 *
 * Provides API endpoints to monitor multi-provider fallback usage
 * and data quality metrics
 */

import express, { Request, Response } from 'express';
import { DataProviderOrchestrator } from '../services/data-provider-orchestrator';

const router = express.Router();

// This will be injected by the main server
let orchestrator: DataProviderOrchestrator | null = null;

/**
 * Initialize the monitoring routes with the orchestrator instance
 */
export function initDataFallbackMonitoring(dataOrchestrator: DataProviderOrchestrator): void {
  orchestrator = dataOrchestrator;
  console.log('[DataFallbackMonitoring] Monitoring routes initialized');
}

/**
 * GET /api/monitoring/data-fallbacks
 *
 * Returns statistics about provider fallback usage over the last 24 hours
 */
router.get('/data-fallbacks', async (req: Request, res: Response) => {
  if (!orchestrator) {
    return res.status(503).json({
      error: 'Data orchestrator not initialized',
      message: 'The fallback monitoring system is not ready yet'
    });
  }

  try {
    const hoursBack = parseInt(req.query.hours as string) || 24;
    const since = Date.now() - (hoursBack * 60 * 60 * 1000);

    const stats = orchestrator.getFallbackStats(since);

    res.json({
      period: `last_${hoursBack}_hours`,
      timestamp: new Date().toISOString(),
      total_requests: stats.total,
      data_completeness_percent: stats.completeness,
      by_provider: Object.values(stats.byProvider).map(provider => ({
        provider: provider.provider,
        requests: provider.requests,
        successes: provider.successes,
        failures: provider.failures,
        success_rate: provider.successRate,
        avg_duration_ms: provider.avgDuration,
        fallback_usage_percent: provider.fallbackUsagePercent
      })),
      stocks_requiring_fallback: stats.stocksWithFallback.length,
      stocks_requiring_fallback_list: stats.stocksWithFallback
    });
  } catch (error: any) {
    console.error('[DataFallbackMonitoring] Error fetching stats:', error);
    res.status(500).json({
      error: 'Failed to fetch fallback statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/monitoring/data-providers
 *
 * Returns health status of all configured data providers
 */
router.get('/data-providers', async (req: Request, res: Response) => {
  if (!orchestrator) {
    return res.status(503).json({
      error: 'Data orchestrator not initialized',
      message: 'The fallback monitoring system is not ready yet'
    });
  }

  try {
    const providerStatus = orchestrator.getProviderStatus();

    res.json({
      timestamp: new Date().toISOString(),
      providers: providerStatus.map(p => ({
        name: p.name,
        priority: p.priority,
        status: p.healthy ? 'healthy' : 'unhealthy',
        failures: p.failures,
        rate_limit: {
          usage: p.rateLimit.usage,
          limit: p.rateLimit.limit,
          percent_used: p.rateLimit.percent,
          status: p.rateLimit.percent < 80 ? 'ok' : p.rateLimit.percent < 95 ? 'warning' : 'critical'
        }
      })),
      summary: {
        total_providers: providerStatus.length,
        healthy_providers: providerStatus.filter(p => p.healthy).length,
        unhealthy_providers: providerStatus.filter(p => !p.healthy).length,
        providers_near_rate_limit: providerStatus.filter(p => p.rateLimit.percent >= 80).length
      }
    });
  } catch (error: any) {
    console.error('[DataFallbackMonitoring] Error fetching provider status:', error);
    res.status(500).json({
      error: 'Failed to fetch provider status',
      message: error.message
    });
  }
});

/**
 * GET /api/monitoring/data-quality
 *
 * Returns data quality metrics (completeness, coverage, etc.)
 */
router.get('/data-quality', async (req: Request, res: Response) => {
  if (!orchestrator) {
    return res.status(503).json({
      error: 'Data orchestrator not initialized',
      message: 'The fallback monitoring system is not ready yet'
    });
  }

  try {
    const hoursBack = parseInt(req.query.hours as string) || 24;
    const since = Date.now() - (hoursBack * 60 * 60 * 1000);

    const stats = orchestrator.getFallbackStats(since);
    const providerStatus = orchestrator.getProviderStatus();

    res.json({
      period: `last_${hoursBack}_hours`,
      timestamp: new Date().toISOString(),
      quality_metrics: {
        overall_completeness: stats.completeness,
        total_symbols_fetched: stats.total,
        symbols_with_incomplete_data: stats.stocksWithFallback.length,
        data_completeness_rate: stats.total > 0
          ? Math.round(((stats.total - stats.stocksWithFallback.length) / stats.total) * 100)
          : 0
      },
      provider_health: {
        fmp: providerStatus.find(p => p.name === 'FMP') || null,
        alpha_vantage: providerStatus.find(p => p.name === 'Alpha Vantage') || null,
        polygon: providerStatus.find(p => p.name === 'Polygon.io') || null,
        yahoo_finance: providerStatus.find(p => p.name === 'Yahoo Finance') || null
      },
      recommendations: generateRecommendations(stats, providerStatus)
    });
  } catch (error: any) {
    console.error('[DataFallbackMonitoring] Error fetching data quality:', error);
    res.status(500).json({
      error: 'Failed to fetch data quality metrics',
      message: error.message
    });
  }
});

/**
 * Generate recommendations based on current stats
 */
function generateRecommendations(
  stats: any,
  providers: any[]
): string[] {
  const recommendations: string[] = [];

  // Check completeness
  if (stats.completeness < 85) {
    recommendations.push(`Data completeness is ${stats.completeness}%. Consider investigating provider failures.`);
  }

  // Check provider health
  const unhealthyProviders = providers.filter(p => !p.healthy);
  if (unhealthyProviders.length > 0) {
    recommendations.push(`${unhealthyProviders.length} provider(s) unhealthy: ${unhealthyProviders.map(p => p.name).join(', ')}`);
  }

  // Check rate limits
  const providersNearLimit = providers.filter(p => p.rateLimit.percent >= 80);
  if (providersNearLimit.length > 0) {
    recommendations.push(`${providersNearLimit.length} provider(s) near rate limit (>80%): ${providersNearLimit.map(p => p.name).join(', ')}`);
  }

  // Check fallback usage
  if (stats.stocksWithFallback.length > stats.total * 0.3) {
    recommendations.push(`High fallback usage (${Math.round((stats.stocksWithFallback.length / stats.total) * 100)}%). Primary provider (FMP) may be having issues.`);
  }

  if (recommendations.length === 0) {
    recommendations.push('All systems operating normally. No action required.');
  }

  return recommendations;
}

export default router;
