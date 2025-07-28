/**
 * COST PROTECTION MIDDLEWARE - P0 FINANCIAL SAFETY
 * 
 * Central middleware that enforces all cost protection measures:
 * - Budget monitoring
 * - Circuit breakers  
 * - Kill switches
 * - Emergency modes
 */

import { Request, Response, NextFunction } from 'express';
import { budgetMonitor } from '../services/budget-monitor';
import { emergencySwitches, CircuitState } from '../utils/emergency-switches';
import { 
  PROVIDER_COST_LIMITS, 
  FEATURE_KILL_SWITCHES, 
  GLOBAL_BUDGET_CONFIG,
  ProviderName,
  FeatureName 
} from '../config/cost-limits';

// Extend Request interface to include cost protection data
declare global {
  namespace Express {
    interface Request {
      costProtection?: {
        provider?: ProviderName;
        feature?: FeatureName;
        bypassChecks?: boolean;
        startTime?: number;
      };
    }
  }
}

export interface CostProtectionOptions {
  provider?: ProviderName;
  feature?: FeatureName;
  bypassForAdmin?: boolean;
  allowDemoMode?: boolean;
  fallbackResponse?: any;
}

/**
 * Main cost protection middleware
 */
export function costProtectionMiddleware(options: CostProtectionOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    try {
      // Initialize cost protection context
      req.costProtection = {
        provider: options.provider,
        feature: options.feature,
        bypassChecks: false,
        startTime
      };

      // Check if admin can bypass (be very careful with this)
      if (options.bypassForAdmin && req.user?.role === 'admin' && req.query.adminOverride === 'true') {
        console.warn(`[CostProtection] ⚠️ ADMIN BYPASS for ${req.path} by ${req.user.email}`);
        req.costProtection.bypassChecks = true;
        return next();
      }

      // Check emergency mode first
      if (emergencySwitches.isEmergencyMode()) {
        return handleEmergencyMode(req, res, options);
      }

      // Check kill switches for specific features
      if (options.feature) {
        const isKilled = await budgetMonitor.isFeatureKilled(options.feature);
        if (isKilled) {
          return handleKilledFeature(req, res, options);
        }
      }

      // Check provider availability (circuit breakers)
      if (options.provider) {
        const isAvailable = await emergencySwitches.isProviderAvailable(options.provider);
        if (!isAvailable) {
          return handleUnavailableProvider(req, res, options);
        }
      }

      // Check global budget limits
      const globalStatus = await budgetMonitor.getGlobalBudgetStatus();
      if (globalStatus.budgetUsedPercent >= 95) {
        return handleBudgetExceeded(req, res, globalStatus);
      }

      // Pre-flight cost check for expensive operations
      if (options.provider) {
        const canAfford = await checkCostAffordability(options.provider);
        if (!canAfford) {
          return handleCannotAffordOperation(req, res, options);
        }
      }

      // Add response tracking
      trackResponse(req, res, options);

      next();
    } catch (error) {
      console.error('[CostProtection] Middleware error:', error);
      
      // Fail closed - reject request on protection system failure
      return res.status(503).json({
        error: 'COST_PROTECTION_FAILURE',
        message: 'Cost protection system temporarily unavailable',
        statusCode: 503
      });
    }
  };
}

/**
 * Specific middleware for API provider calls
 */
export function apiProviderProtection(provider: ProviderName) {
  return costProtectionMiddleware({ 
    provider,
    allowDemoMode: true,
    fallbackResponse: { 
      data: null, 
      cached: true, 
      demo: true,
      message: `${provider} temporarily unavailable - using demo data`
    }
  });
}

/**
 * Specific middleware for expensive features
 */
export function expensiveFeatureProtection(feature: FeatureName) {
  return costProtectionMiddleware({ 
    feature,
    allowDemoMode: true,
    fallbackResponse: getDemoModeResponse(feature)
  });
}

/**
 * Handle emergency mode
 */
function handleEmergencyMode(req: Request, res: Response, options: CostProtectionOptions) {
  console.warn(`[CostProtection] 🚨 Emergency mode - blocking ${req.path}`);

  if (options.allowDemoMode && options.fallbackResponse) {
    return res.json({
      ...options.fallbackResponse,
      emergencyMode: true,
      message: 'System in emergency mode - showing demo data'
    });
  }

  return res.status(503).json({
    error: 'EMERGENCY_MODE',
    message: 'System temporarily unavailable due to cost protection',
    statusCode: 503,
    retryAfter: 3600 // 1 hour
  });
}

/**
 * Handle killed feature
 */
function handleKilledFeature(req: Request, res: Response, options: CostProtectionOptions) {
  const fallbackMode = budgetMonitor.getFallbackMode(options.feature!);
  
  console.warn(`[CostProtection] 🛑 Feature ${options.feature} killed - fallback: ${fallbackMode}`);

  if (options.allowDemoMode && options.fallbackResponse) {
    return res.json({
      ...options.fallbackResponse,
      featureKilled: true,
      fallbackMode,
      message: `Feature temporarily disabled - using ${fallbackMode}`
    });
  }

  return res.status(429).json({
    error: 'FEATURE_TEMPORARILY_DISABLED',
    message: `Feature temporarily disabled due to budget constraints. Using ${fallbackMode}.`,
    statusCode: 429,
    fallbackMode
  });
}

/**
 * Handle unavailable provider (circuit breaker)
 */
function handleUnavailableProvider(req: Request, res: Response, options: CostProtectionOptions) {
  console.warn(`[CostProtection] ⚡ Provider ${options.provider} unavailable (circuit breaker)`);

  if (options.allowDemoMode && options.fallbackResponse) {
    return res.json({
      ...options.fallbackResponse,
      providerUnavailable: true,
      message: `${options.provider} temporarily unavailable - using fallback data`
    });
  }

  return res.status(503).json({
    error: 'PROVIDER_UNAVAILABLE',
    message: `Data provider temporarily unavailable`,
    statusCode: 503,
    retryAfter: 300 // 5 minutes
  });
}

/**
 * Handle budget exceeded
 */
function handleBudgetExceeded(req: Request, res: Response, globalStatus: any) {
  console.error(`[CostProtection] 💰 Budget exceeded: ${globalStatus.budgetUsedPercent.toFixed(1)}%`);

  return res.status(429).json({
    error: 'BUDGET_EXCEEDED',
    message: 'Daily budget exceeded. Service temporarily limited.',
    statusCode: 429,
    budgetStatus: {
      used: globalStatus.budgetUsedPercent,
      remaining: globalStatus.remainingBudget
    },
    retryAfter: getSecondsUntilReset()
  });
}

/**
 * Handle cannot afford operation
 */
function handleCannotAffordOperation(req: Request, res: Response, options: CostProtectionOptions) {
  console.warn(`[CostProtection] 💸 Cannot afford ${options.provider} operation`);

  return res.status(429).json({
    error: 'OPERATION_TOO_EXPENSIVE',
    message: `Operation would exceed budget limits`,
    statusCode: 429,
    provider: options.provider
  });
}

/**
 * Check if we can afford an operation
 */
async function checkCostAffordability(provider: ProviderName): Promise<boolean> {
  const costs = await budgetMonitor.getProviderCosts(provider);
  const config = PROVIDER_COST_LIMITS[provider];
  
  // Check if adding one more call would exceed critical threshold
  const nextCallCost = costs.estimatedCost + config.costPerCall;
  const nextCallPercent = (nextCallCost / config.dailyBudget) * 100;
  
  return nextCallPercent < config.criticalThreshold;
}

/**
 * Track response and record costs
 */
function trackResponse(req: Request, res: Response, options: CostProtectionOptions) {
  // Store cost protection data in res.locals
  if (!res.locals) res.locals = {};
  res.locals.costProtection = {
    provider: options.provider,
    startTime: req.costProtection?.startTime,
    bypassChecks: req.costProtection?.bypassChecks
  };
  
  // Track response after it's sent
  res.on('finish', () => {
    const endTime = Date.now();
    const responseTime = res.locals.costProtection.startTime ? endTime - res.locals.costProtection.startTime : 0;
    const success = res.statusCode < 400;

    // Record the API call for budget monitoring
    if (res.locals.costProtection.provider && !res.locals.costProtection.bypassChecks) {
      budgetMonitor.recordAPICall(res.locals.costProtection.provider, req.path, responseTime, success)
        .catch(error => {
          console.error('[CostProtection] Failed to record API call:', error);
        });

      // Record success/failure for circuit breaker
      if (success) {
        emergencySwitches.recordSuccess(res.locals.costProtection.provider, responseTime)
          .catch(error => {
            console.error('[CostProtection] Failed to record success:', error);
          });
      } else {
        emergencySwitches.recordFailure(
          res.locals.costProtection.provider, 
          req.path, 
          `HTTP ${res.statusCode}`, 
          responseTime, 
          res.statusCode
        ).catch(error => {
          console.error('[CostProtection] Failed to record failure:', error);
        });
      }
    }
  });
}

/**
 * Get demo mode response for different features
 */
function getDemoModeResponse(feature: FeatureName): any {
  const demoResponses = {
    realTimePrices: {
      prices: [],
      message: 'Real-time prices temporarily unavailable',
      demoMode: true
    },
    
    alertMonitoring: {
      alerts: [],
      message: 'Alert monitoring temporarily disabled',
      demoMode: true
    },
    
    heavyApiCalls: {
      data: null,
      message: 'Heavy calculations temporarily unavailable',
      demoMode: true
    },
    
    financialCalculations: {
      calculations: {},
      message: 'Advanced calculations temporarily limited',
      demoMode: true
    }
  };

  return demoResponses[feature] || {
    data: null,
    message: 'Feature temporarily unavailable',
    demoMode: true
  };
}

/**
 * Get seconds until daily reset
 */
function getSecondsUntilReset(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  return Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
}

/**
 * Admin endpoints for cost protection management
 */
export function createCostProtectionRoutes() {
  const router = require('express').Router();

  // Get cost protection status
  router.get('/status', async (req: Request, res: Response) => {
    try {
      const globalStatus = await budgetMonitor.getGlobalBudgetStatus();
      const circuitBreakers = emergencySwitches.getCircuitBreakerStatus();
      const killSwitches = emergencySwitches.getKillSwitchStatus();

      res.json({
        globalBudget: globalStatus,
        circuitBreakers,
        killSwitches,
        emergencyMode: emergencySwitches.isEmergencyMode(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get cost protection status' });
    }
  });

  // Admin override for emergency situations (use with EXTREME caution)
  router.post('/admin/reset-circuit-breaker', async (req: Request, res: Response) => {
    const { provider, reason } = req.body;
    
    if (!req.user?.role === 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    try {
      await emergencySwitches.forceResetCircuitBreaker(provider, `Admin reset: ${reason}`);
      res.json({ success: true, message: `Circuit breaker reset for ${provider}` });
    } catch (error) {
      res.status(500).json({ error: 'Failed to reset circuit breaker' });
    }
  });

  // Activate emergency mode
  router.post('/admin/emergency-mode', async (req: Request, res: Response) => {
    const { activate, reason } = req.body;
    
    if (!req.user?.role === 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    try {
      if (activate) {
        emergencySwitches.activateEmergencyMode(`Admin activation: ${reason}`);
      } else {
        emergencySwitches.deactivateEmergencyMode();
      }
      
      res.json({ 
        success: true, 
        emergencyMode: activate,
        message: activate ? 'Emergency mode activated' : 'Emergency mode deactivated'
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to toggle emergency mode' });
    }
  });

  return router;
}

// Export middleware functions
export {
  budgetMonitor,
  emergencySwitches
};