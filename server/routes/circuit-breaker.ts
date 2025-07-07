// Circuit Breaker Management API Routes
import express from 'express';
import { unifiedApiService } from '../services/unified-api';
import { circuitBreakerManager } from '../services/unified-api/circuit-breaker';
import { ProviderName } from '../services/quota/quota-limits';

const router = express.Router();

/**
 * Get all circuit breaker statuses
 * GET /api/circuit-breaker/status
 */
router.get('/status', async (req, res) => {
  try {
    const statuses = circuitBreakerManager.getAllStatuses();
    const availableProviders = circuitBreakerManager.getAvailableProviders();
    
    res.json({
      success: true,
      data: {
        circuitBreakers: statuses,
        availableProviders,
        summary: {
          totalProviders: Object.keys(statuses).length,
          healthyProviders: availableProviders.length,
          unhealthyProviders: Object.keys(statuses).length - availableProviders.length
        }
      }
    });
  } catch (error) {
    console.error('[CircuitBreakerAPI] Error getting status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get circuit breaker status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get specific provider circuit breaker status
 * GET /api/circuit-breaker/status/:provider
 */
router.get('/status/:provider', async (req, res) => {
  try {
    const providerName = req.params.provider as ProviderName;
    
    if (!providerName) {
      return res.status(400).json({
        success: false,
        error: 'Provider name is required'
      });
    }

    const status = unifiedApiService.getCircuitBreakerStatus(providerName);
    
    res.json({
      success: true,
      data: {
        provider: providerName,
        ...status
      }
    });
  } catch (error) {
    console.error(`[CircuitBreakerAPI] Error getting status for ${req.params.provider}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get provider circuit breaker status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Reset specific provider circuit breaker
 * POST /api/circuit-breaker/reset/:provider
 */
router.post('/reset/:provider', async (req, res) => {
  try {
    const providerName = req.params.provider as ProviderName;
    
    if (!providerName) {
      return res.status(400).json({
        success: false,
        error: 'Provider name is required'
      });
    }

    // Validate provider exists
    const validProviders: ProviderName[] = ['alphaVantage', 'finnhub', 'fmp', 'twelveData', 'polygon'];
    if (!validProviders.includes(providerName)) {
      return res.status(400).json({
        success: false,
        error: `Invalid provider name. Valid providers: ${validProviders.join(', ')}`
      });
    }

    unifiedApiService.resetCircuitBreaker(providerName);
    
    // Get updated status
    const status = unifiedApiService.getCircuitBreakerStatus(providerName);
    
    res.json({
      success: true,
      message: `Circuit breaker reset for ${providerName}`,
      data: {
        provider: providerName,
        ...status
      }
    });
  } catch (error) {
    console.error(`[CircuitBreakerAPI] Error resetting circuit breaker for ${req.params.provider}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset circuit breaker',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Reset all circuit breakers
 * POST /api/circuit-breaker/reset-all
 */
router.post('/reset-all', async (req, res) => {
  try {
    unifiedApiService.resetAllCircuitBreakers();
    
    // Get updated statuses
    const statuses = circuitBreakerManager.getAllStatuses();
    
    res.json({
      success: true,
      message: 'All circuit breakers reset successfully',
      data: {
        circuitBreakers: statuses,
        resetCount: Object.keys(statuses).length
      }
    });
  } catch (error) {
    console.error('[CircuitBreakerAPI] Error resetting all circuit breakers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset all circuit breakers',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get circuit breaker metrics for monitoring
 * GET /api/circuit-breaker/metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const statuses = circuitBreakerManager.getAllStatuses();
    const availableProviders = circuitBreakerManager.getAvailableProviders();
    
    // Calculate aggregated metrics
    let totalRequests = 0;
    let totalFailures = 0;
    let totalSuccesses = 0;
    const providerMetrics: any[] = [];
    
    for (const [providerName, status] of Object.entries(statuses)) {
      const circuitBreaker = circuitBreakerManager.getCircuitBreaker(providerName);
      const metrics = circuitBreaker.getMetrics();
      
      totalRequests += metrics.totalRequests;
      totalFailures += metrics.totalFailures;
      totalSuccesses += metrics.totalSuccesses;
      
      providerMetrics.push({
        provider: providerName,
        state: metrics.state,
        requests: metrics.totalRequests,
        failures: metrics.totalFailures,
        successes: metrics.totalSuccesses,
        failureRate: metrics.totalRequests > 0 ? (metrics.totalFailures / metrics.totalRequests * 100).toFixed(2) : 0,
        consecutiveFailures: metrics.consecutiveFailures,
        isAvailable: circuitBreaker.isAvailable(),
        lastFailure: metrics.lastFailureTime ? new Date(metrics.lastFailureTime).toISOString() : null,
        lastSuccess: metrics.lastSuccessTime ? new Date(metrics.lastSuccessTime).toISOString() : null
      });
    }
    
    const overallFailureRate = totalRequests > 0 ? (totalFailures / totalRequests * 100).toFixed(2) : 0;
    
    res.json({
      success: true,
      data: {
        summary: {
          totalProviders: Object.keys(statuses).length,
          availableProviders: availableProviders.length,
          totalRequests,
          totalFailures,
          totalSuccesses,
          overallFailureRate: parseFloat(overallFailureRate),
          timestamp: new Date().toISOString()
        },
        providers: providerMetrics
      }
    });
  } catch (error) {
    console.error('[CircuitBreakerAPI] Error getting metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get circuit breaker metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get circuit breaker health check for monitoring systems
 * GET /api/circuit-breaker/health
 */
router.get('/health', async (req, res) => {
  try {
    const statuses = circuitBreakerManager.getAllStatuses();
    const availableProviders = circuitBreakerManager.getAvailableProviders();
    
    const healthy = availableProviders.length > 0;
    const statusCode = healthy ? 200 : 503;
    
    res.status(statusCode).json({
      success: healthy,
      status: healthy ? 'healthy' : 'unhealthy',
      data: {
        availableProviders: availableProviders.length,
        totalProviders: Object.keys(statuses).length,
        healthyRatio: Object.keys(statuses).length > 0 ? 
          (availableProviders.length / Object.keys(statuses).length * 100).toFixed(1) : 0,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[CircuitBreakerAPI] Error in health check:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Test circuit breaker functionality (development/testing only)
 * POST /api/circuit-breaker/test/:provider
 */
router.post('/test/:provider', async (req, res) => {
  try {
    const providerName = req.params.provider as ProviderName;
    const { action } = req.body; // 'success' or 'failure'
    
    if (!providerName) {
      return res.status(400).json({
        success: false,
        error: 'Provider name is required'
      });
    }

    if (!['success', 'failure'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Action must be either "success" or "failure"'
      });
    }

    const circuitBreaker = circuitBreakerManager.getCircuitBreaker(providerName);
    
    // Simulate success or failure
    if (action === 'success') {
      await circuitBreaker.execute(async () => {
        return Promise.resolve({ test: 'success' });
      });
    } else {
      try {
        await circuitBreaker.execute(async () => {
          throw new Error('Simulated failure for testing');
        });
      } catch (error) {
        // Expected failure, ignore
      }
    }
    
    const status = unifiedApiService.getCircuitBreakerStatus(providerName);
    
    res.json({
      success: true,
      message: `Simulated ${action} for ${providerName}`,
      data: {
        provider: providerName,
        action,
        ...status
      }
    });
  } catch (error) {
    console.error(`[CircuitBreakerAPI] Error testing circuit breaker for ${req.params.provider}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to test circuit breaker',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;