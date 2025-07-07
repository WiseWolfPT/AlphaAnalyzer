/**
 * COST PROTECTION INTEGRATION SETUP
 * 
 * This file shows how to integrate the cost protection system
 * into the existing Alfalyzer server
 */

import { Express } from 'express';
import { 
  costProtectionMiddleware, 
  apiProviderProtection, 
  expensiveFeatureProtection,
  createCostProtectionRoutes,
  budgetMonitor,
  emergencySwitches
} from './middleware/cost-protection';

/**
 * Setup cost protection middleware for the entire application
 */
export function setupCostProtection(app: Express): void {
  console.log('🛡️ Setting up Cost Protection System...');

  // 1. Add global cost protection middleware (FIRST - before all routes)
  app.use(costProtectionMiddleware({
    bypassForAdmin: true, // Allow admin bypass with proper auth
    allowDemoMode: true   // Provide demo data when features are killed
  }));

  // 2. Add specific protection for API provider routes
  app.use('/api/stocks', apiProviderProtection('finnhub'));
  app.use('/api/market-data', apiProviderProtection('twelveData'));
  app.use('/api/financial-data', apiProviderProtection('fmp'));
  app.use('/api/alpha-vantage', apiProviderProtection('alphaVantage'));

  // 3. Add protection for expensive features
  app.use('/api/intrinsic-value', expensiveFeatureProtection('financialCalculations'));
  app.use('/api/alerts', expensiveFeatureProtection('alertMonitoring'));
  app.use('/api/real-time', expensiveFeatureProtection('realTimePrices'));
  app.use('/api/heavy-calculations', expensiveFeatureProtection('heavyApiCalls'));

  // 4. Add admin routes for cost protection monitoring
  app.use('/api/admin/cost-protection', createCostProtectionRoutes());

  // 5. Setup error handling for cost protection failures
  app.use((error: any, req: any, res: any, next: any) => {
    if (error.type === 'COST_PROTECTION_ERROR') {
      console.error('[CostProtection] Error:', error.message);
      
      return res.status(503).json({
        error: 'COST_PROTECTION_FAILURE',
        message: 'Cost protection system temporarily unavailable',
        statusCode: 503
      });
    }
    
    next(error);
  });

  console.log('✅ Cost Protection System setup complete');
}

/**
 * Setup monitoring and periodic checks
 */
export function setupCostMonitoring(): void {
  console.log('📊 Setting up Cost Monitoring...');

  // Start budget monitoring
  budgetMonitor.on('budget_alert', (alert) => {
    console.log(`🚨 [BudgetAlert] ${alert.level.toUpperCase()}: ${alert.message}`);
    
    // TODO: Send email/webhook alerts if configured
    if (alert.level === 'emergency') {
      console.error('🚨 EMERGENCY BUDGET ALERT - IMMEDIATE ACTION REQUIRED');
    }
  });

  budgetMonitor.on('emergency_mode_activated', (event) => {
    console.error(`🚨 EMERGENCY MODE ACTIVATED: ${event.mode} - ${event.reason}`);
  });

  // Setup circuit breaker monitoring
  emergencySwitches.on('circuit_breaker_tripped', (event) => {
    console.error(`⚡ CIRCUIT BREAKER TRIPPED: ${event.provider} - ${event.reason}`);
  });

  emergencySwitches.on('circuit_breaker_closed', (event) => {
    console.log(`✅ Circuit breaker recovered: ${event.provider}`);
  });

  emergencySwitches.on('kill_switch_activated', (event) => {
    console.warn(`🛑 Kill switch activated: ${event.switchName} - ${event.reason}`);
  });

  // Periodic cost reporting
  setInterval(async () => {
    try {
      const globalStatus = await budgetMonitor.getGlobalBudgetStatus();
      
      if (globalStatus.budgetUsedPercent > 25) {
        console.log(`💰 Budget Status: ${globalStatus.budgetUsedPercent.toFixed(1)}% used ($${globalStatus.totalCostToday.toFixed(2)}/$${globalStatus.totalCostToday + globalStatus.remainingBudget})`);
      }
      
      if (globalStatus.activeKillSwitches.length > 0) {
        console.warn(`🛑 Active kill switches: ${globalStatus.activeKillSwitches.join(', ')}`);
      }
    } catch (error) {
      console.error('[CostMonitoring] Error in periodic check:', error);
    }
  }, 5 * 60 * 1000); // Every 5 minutes

  console.log('✅ Cost Monitoring setup complete');
}

/**
 * Enhanced API call wrapper with cost protection
 */
export function createProtectedAPIClient(provider: string) {
  return {
    async makeCall(endpoint: string, options: any = {}) {
      // Check if provider is available
      const isAvailable = await emergencySwitches.isProviderAvailable(provider as any);
      
      if (!isAvailable) {
        throw new Error(`Provider ${provider} is currently unavailable (circuit breaker)`);
      }

      const startTime = Date.now();
      
      try {
        // Make the actual API call
        const response = await fetch(endpoint, options);
        const responseTime = Date.now() - startTime;
        
        if (!response.ok) {
          // Record failure
          await emergencySwitches.recordFailure(
            provider as any,
            endpoint,
            `HTTP ${response.status}`,
            responseTime,
            response.status
          );
          
          throw new Error(`API call failed: ${response.status}`);
        }
        
        // Record success
        await emergencySwitches.recordSuccess(provider as any, responseTime);
        await budgetMonitor.recordAPICall(provider as any, endpoint, responseTime, true);
        
        return await response.json();
        
      } catch (error) {
        const responseTime = Date.now() - startTime;
        
        // Record failure
        await emergencySwitches.recordFailure(
          provider as any,
          endpoint,
          error.message,
          responseTime
        );
        
        await budgetMonitor.recordAPICall(provider as any, endpoint, responseTime, false);
        
        throw error;
      }
    }
  };
}

/**
 * Example usage in existing routes
 */
export function exampleRouteIntegration(app: Express): void {
  // Example: Protected stock price endpoint
  app.get('/api/stocks/:symbol/price', async (req, res) => {
    try {
      // The cost protection middleware will already have run
      // If we get here, the request is allowed
      
      const { symbol } = req.params;
      const apiClient = createProtectedAPIClient('finnhub');
      
      // This call is automatically tracked and protected
      const data = await apiClient.makeCall(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`);
      
      res.json({
        symbol,
        price: data.c,
        change: data.d,
        changePercent: data.dp,
        timestamp: new Date().toISOString(),
        provider: 'finnhub'
      });
      
    } catch (error) {
      console.error(`[StockPrice] Error for ${req.params.symbol}:`, error.message);
      
      // Return cached/demo data if available
      res.json({
        symbol: req.params.symbol,
        price: 100.00,
        change: 0,
        changePercent: 0,
        timestamp: new Date().toISOString(),
        provider: 'demo',
        cached: true,
        message: 'Real-time data temporarily unavailable'
      });
    }
  });
}

/**
 * Health check endpoint for cost protection system
 */
export function setupCostProtectionHealthCheck(app: Express): void {
  app.get('/api/health/cost-protection', async (req, res) => {
    try {
      const globalStatus = await budgetMonitor.getGlobalBudgetStatus();
      const circuitBreakers = emergencySwitches.getCircuitBreakerStatus();
      const killSwitches = emergencySwitches.getKillSwitchStatus();
      
      const isHealthy = 
        globalStatus.budgetUsedPercent < 90 &&
        !emergencySwitches.isEmergencyMode() &&
        Object.values(circuitBreakers).filter(cb => cb.state === 'open').length < 2;
      
      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'degraded',
        budget: {
          used: globalStatus.budgetUsedPercent,
          remaining: globalStatus.remainingBudget,
          status: globalStatus.status
        },
        circuitBreakers: Object.entries(circuitBreakers).map(([provider, cb]) => ({
          provider,
          state: cb.state,
          reason: cb.reason
        })),
        killSwitches: Object.entries(killSwitches).filter(([_, active]) => active).map(([name]) => name),
        emergencyMode: emergencySwitches.isEmergencyMode(),
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      res.status(503).json({
        status: 'error',
        message: 'Cost protection system health check failed',
        error: error.message
      });
    }
  });
}

/**
 * INTEGRATION CHECKLIST
 * 
 * To integrate cost protection into your server:
 * 
 * 1. Add this to your main server file (index.ts):
 * 
 * ```typescript
 * import { setupCostProtection, setupCostMonitoring, setupCostProtectionHealthCheck } from './setup-cost-protection';
 * 
 * const app = express();
 * 
 * // Setup cost protection EARLY in middleware chain
 * setupCostProtection(app);
 * setupCostMonitoring();
 * setupCostProtectionHealthCheck(app);
 * 
 * // Continue with your existing routes...
 * ```
 * 
 * 2. Update your API clients to use the protected wrapper:
 * 
 * ```typescript
 * import { createProtectedAPIClient } from './setup-cost-protection';
 * 
 * const finnhubClient = createProtectedAPIClient('finnhub');
 * const data = await finnhubClient.makeCall(apiUrl);
 * ```
 * 
 * 3. Monitor the system with:
 * 
 * ```bash
 * curl http://localhost:3001/api/health/cost-protection
 * curl http://localhost:3001/api/admin/cost-protection/status
 * ```
 */