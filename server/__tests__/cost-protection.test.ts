/**
 * COST PROTECTION SYSTEM TESTS - P0 FINANCIAL SAFETY VALIDATION
 * 
 * CRITICAL: These tests MUST pass to ensure financial protection works
 * Simulates various cost disaster scenarios and validates protection measures
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { budgetMonitor, BudgetMonitor } from '../services/budget-monitor';
import { emergencySwitches, EmergencySwitches, CircuitState } from '../utils/emergency-switches';
import { costProtectionMiddleware, apiProviderProtection } from '../middleware/cost-protection';
import { 
  PROVIDER_COST_LIMITS, 
  GLOBAL_BUDGET_CONFIG,
  FEATURE_KILL_SWITCHES 
} from '../config/cost-limits';

// Mock cache
const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn()
};

jest.mock('../services/cache', () => ({
  getCache: () => mockCache
}));

describe('Cost Protection System - CRITICAL FINANCIAL SAFETY TESTS', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      path: '/api/test',
      method: 'GET',
      user: { id: 'test-user', email: 'test@example.com' },
      costProtection: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis()
    };

    nextFn = jest.fn();

    // Reset all systems
    mockCache.get.mockResolvedValue(0);
    mockCache.set.mockResolvedValue(true);
  });

  afterEach(() => {
    // Clean up any timers or intervals
    jest.clearAllTimers();
  });

  describe('Budget Monitoring - CRITICAL COST TRACKING', () => {
    it('should track API call costs correctly', async () => {
      const provider = 'finnhub';
      const endpoint = '/stock/price';
      
      await budgetMonitor.recordAPICall(provider, endpoint, 100, true);
      
      // Verify cost was recorded
      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining(`cost:${provider}`),
        PROVIDER_COST_LIMITS[provider].costPerCall,
        expect.any(Number)
      );
      
      // Verify global cost was updated
      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('cost:global'),
        PROVIDER_COST_LIMITS[provider].costPerCall,
        expect.any(Number)
      );
    });

    it('should calculate budget percentages correctly', async () => {
      const provider = 'alphaVantage';
      const costConfig = PROVIDER_COST_LIMITS[provider];
      
      // Mock current cost at 80% of budget
      const currentCost = costConfig.dailyBudget * 0.8;
      mockCache.get.mockResolvedValue(currentCost / costConfig.costPerCall);
      
      const costs = await budgetMonitor.getProviderCosts(provider);
      
      expect(costs.budgetUsedPercent).toBeCloseTo(80, 1);
      expect(costs.status).toBe('critical');
    });

    it('should trigger emergency mode at 100% budget', async () => {
      // Mock budget exceeded
      const totalCost = GLOBAL_BUDGET_CONFIG.dailyBudget * 1.1;
      mockCache.get.mockImplementation((key) => {
        if (key.includes('cost:global')) {
          return Promise.resolve(totalCost);
        }
        return Promise.resolve(0);
      });

      const globalStatus = await budgetMonitor.getGlobalBudgetStatus();
      
      expect(globalStatus.budgetUsedPercent).toBeGreaterThan(100);
      expect(globalStatus.status).toBe('emergency');
    });

    it('should project daily costs accurately', async () => {
      // Mock 50% of day passed with $2 spent
      const hoursElapsed = 12;
      const currentCost = 2.0;
      
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(hoursElapsed);
      mockCache.get.mockResolvedValue(currentCost);

      const globalStatus = await budgetMonitor.getGlobalBudgetStatus();
      
      // Should project $4 total for the day
      expect(globalStatus.projectedDailyCost).toBeCloseTo(4.0, 1);
    });
  });

  describe('Circuit Breakers - CRITICAL FAILURE PROTECTION', () => {
    it('should trip circuit breaker after failure threshold', async () => {
      const provider = 'finnhub';
      
      // Record multiple failures
      for (let i = 0; i < 4; i++) {
        await emergencySwitches.recordFailure(
          provider,
          '/test',
          'Test failure',
          5000,
          500
        );
      }
      
      const isAvailable = await emergencySwitches.isProviderAvailable(provider);
      expect(isAvailable).toBe(false);
      
      const status = emergencySwitches.getCircuitBreakerStatus();
      expect(status[provider].state).toBe(CircuitState.OPEN);
    });

    it('should trip circuit breaker on rate limit immediately', async () => {
      const provider = 'twelveData';
      
      await emergencySwitches.recordFailure(
        provider,
        '/test',
        'Rate limit exceeded',
        1000,
        429
      );
      
      const isAvailable = await emergencySwitches.isProviderAvailable(provider);
      expect(isAvailable).toBe(false);
    });

    it('should trip circuit breaker on slow responses', async () => {
      const provider = 'fmp';
      
      await emergencySwitches.recordSuccess(provider, 10000); // 10 second response
      
      const status = emergencySwitches.getCircuitBreakerStatus();
      expect(status[provider].state).toBe(CircuitState.OPEN);
    });

    it('should reset circuit breaker after timeout', async () => {
      const provider = 'alphaVantage';
      
      // Trip the circuit breaker
      await emergencySwitches.recordFailure(provider, '/test', 'Test failure', 0, 500);
      await emergencySwitches.recordFailure(provider, '/test', 'Test failure', 0, 500);
      await emergencySwitches.recordFailure(provider, '/test', 'Test failure', 0, 500);
      
      expect(await emergencySwitches.isProviderAvailable(provider)).toBe(false);
      
      // Mock time passage
      const now = Date.now();
      const futureTime = now + 700000; // 11+ minutes
      jest.spyOn(Date, 'now').mockReturnValue(futureTime);
      
      // Should allow retry in HALF_OPEN state
      expect(await emergencySwitches.isProviderAvailable(provider)).toBe(true);
    });
  });

  describe('Kill Switches - CRITICAL FEATURE PROTECTION', () => {
    it('should kill expensive features when budget exceeded', async () => {
      // Mock budget at 70% (trigger threshold for real-time prices)
      mockCache.get.mockImplementation((key) => {
        if (key.includes('cost:global')) {
          return Promise.resolve(GLOBAL_BUDGET_CONFIG.dailyBudget * 0.7);
        }
        return Promise.resolve(0);
      });

      const isKilled = await budgetMonitor.isFeatureKilled('realTimePrices');
      expect(isKilled).toBe(true);
      
      const fallbackMode = budgetMonitor.getFallbackMode('realTimePrices');
      expect(fallbackMode).toBe('cached_prices');
    });

    it('should activate kill switches in correct order', async () => {
      // Mock budget at 80%
      mockCache.get.mockImplementation((key) => {
        if (key.includes('cost:global')) {
          return Promise.resolve(GLOBAL_BUDGET_CONFIG.dailyBudget * 0.8);
        }
        return Promise.resolve(0);
      });

      // Check which features should be killed
      const heavyApiKilled = await budgetMonitor.isFeatureKilled('heavyApiCalls');
      const alertsKilled = await budgetMonitor.isFeatureKilled('alertMonitoring');
      const financialKilled = await budgetMonitor.isFeatureKilled('financialCalculations');

      expect(heavyApiKilled).toBe(true); // 50% threshold
      expect(alertsKilled).toBe(true);   // 70% threshold
      expect(financialKilled).toBe(false); // 80% threshold
    });
  });

  describe('Cost Protection Middleware - CRITICAL REQUEST FILTERING', () => {
    it('should block requests in emergency mode', async () => {
      emergencySwitches.activateEmergencyMode('Test emergency');
      
      const middleware = costProtectionMiddleware();
      await middleware(mockReq as Request, mockRes as Response, nextFn);
      
      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'EMERGENCY_MODE'
        })
      );
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should block requests to unavailable providers', async () => {
      const provider = 'finnhub';
      
      // Trip circuit breaker
      await emergencySwitches.recordFailure(provider, '/test', 'Failure', 0, 500);
      await emergencySwitches.recordFailure(provider, '/test', 'Failure', 0, 500);
      await emergencySwitches.recordFailure(provider, '/test', 'Failure', 0, 500);
      
      const middleware = apiProviderProtection(provider);
      await middleware(mockReq as Request, mockRes as Response, nextFn);
      
      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should block requests when budget exceeded', async () => {
      // Mock budget at 96%
      mockCache.get.mockImplementation((key) => {
        if (key.includes('cost:global')) {
          return Promise.resolve(GLOBAL_BUDGET_CONFIG.dailyBudget * 0.96);
        }
        return Promise.resolve(0);
      });
      
      const middleware = costProtectionMiddleware();
      await middleware(mockReq as Request, mockRes as Response, nextFn);
      
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'BUDGET_EXCEEDED'
        })
      );
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should provide fallback responses when available', async () => {
      const provider = 'alphaVantage';
      
      // Trip circuit breaker
      await emergencySwitches.recordFailure(provider, '/test', 'Failure', 0, 500);
      await emergencySwitches.recordFailure(provider, '/test', 'Failure', 0, 500);
      await emergencySwitches.recordFailure(provider, '/test', 'Failure', 0, 500);
      
      const middleware = apiProviderProtection(provider);
      await middleware(mockReq as Request, mockRes as Response, nextFn);
      
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: null,
          cached: true,
          demo: true,
          providerUnavailable: true
        })
      );
    });

    it('should allow admin bypass with proper authentication', async () => {
      mockReq.user = { role: 'admin', email: 'admin@test.com' };
      mockReq.query = { adminOverride: 'true' };
      
      emergencySwitches.activateEmergencyMode('Test emergency');
      
      const middleware = costProtectionMiddleware({ bypassForAdmin: true });
      await middleware(mockReq as Request, mockRes as Response, nextFn);
      
      expect(nextFn).toHaveBeenCalled();
      expect(mockReq.costProtection?.bypassChecks).toBe(true);
    });
  });

  describe('Cost Affordability Checks - CRITICAL PRE-FLIGHT VALIDATION', () => {
    it('should reject operations that would exceed critical threshold', async () => {
      const provider = 'alphaVantage';
      const costConfig = PROVIDER_COST_LIMITS[provider];
      
      // Mock current cost near critical threshold
      const nearCriticalCost = (costConfig.dailyBudget * costConfig.criticalThreshold / 100) - (costConfig.costPerCall * 0.5);
      mockCache.get.mockResolvedValue(nearCriticalCost / costConfig.costPerCall);
      
      const middleware = costProtectionMiddleware({ provider });
      await middleware(mockReq as Request, mockRes as Response, nextFn);
      
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'OPERATION_TOO_EXPENSIVE'
        })
      );
    });

    it('should allow operations within safe limits', async () => {
      const provider = 'finnhub';
      
      // Mock low current cost
      mockCache.get.mockResolvedValue(1); // Only 1 call made
      
      const middleware = costProtectionMiddleware({ provider });
      await middleware(mockReq as Request, mockRes as Response, nextFn);
      
      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Emergency Scenarios - DISASTER SIMULATION', () => {
    it('should handle runaway API calls', async () => {
      const provider = 'fmp';
      
      // Simulate 100 rapid API calls
      for (let i = 0; i < 100; i++) {
        await budgetMonitor.recordAPICall(provider, '/test', 100, true);
      }
      
      const costs = await budgetMonitor.getProviderCosts(provider);
      
      // Should have tripped emergency thresholds
      expect(costs.budgetUsedPercent).toBeGreaterThan(50);
      expect(costs.status).toMatch(/warning|critical|emergency/);
    });

    it('should protect against cost overflow attacks', async () => {
      // Simulate malicious requests trying to exhaust budget
      const providers = Object.keys(PROVIDER_COST_LIMITS);
      
      for (const provider of providers) {
        // Try to make many expensive calls
        for (let i = 0; i < 50; i++) {
          await budgetMonitor.recordAPICall(provider as any, '/expensive', 100, true);
        }
      }
      
      const globalStatus = await budgetMonitor.getGlobalBudgetStatus();
      
      // System should have multiple kill switches active
      expect(globalStatus.activeKillSwitches.length).toBeGreaterThan(0);
      
      // Emergency mode might be activated
      if (globalStatus.budgetUsedPercent >= 90) {
        expect(globalStatus.emergencyMode).toBeTruthy();
      }
    });

    it('should fail safe on protection system errors', async () => {
      // Mock cache failures
      mockCache.get.mockRejectedValue(new Error('Cache failure'));
      mockCache.set.mockRejectedValue(new Error('Cache failure'));
      
      const middleware = costProtectionMiddleware();
      await middleware(mockReq as Request, mockRes as Response, nextFn);
      
      // Should fail closed (reject request)
      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'COST_PROTECTION_FAILURE'
        })
      );
      expect(nextFn).not.toHaveBeenCalled();
    });
  });

  describe('Recovery Scenarios - SYSTEM RESTORATION', () => {
    it('should recover from emergency mode when safe', async () => {
      // Activate emergency mode
      emergencySwitches.activateEmergencyMode('Test recovery');
      expect(emergencySwitches.isEmergencyMode()).toBe(true);
      
      // Deactivate
      emergencySwitches.deactivateEmergencyMode();
      expect(emergencySwitches.isEmergencyMode()).toBe(false);
    });

    it('should gradually restore features as budget recovers', async () => {
      // Mock budget reset (new day)
      mockCache.get.mockResolvedValue(0);
      
      // All features should be available
      const features = Object.keys(FEATURE_KILL_SWITCHES);
      for (const feature of features) {
        const isKilled = await budgetMonitor.isFeatureKilled(feature as any);
        expect(isKilled).toBe(false);
      }
    });
  });
});

describe('Performance Tests - CRITICAL EFFICIENCY VALIDATION', () => {
  it('should complete cost checks within performance threshold', async () => {
    const startTime = Date.now();
    
    const middleware = costProtectionMiddleware({ provider: 'finnhub' });
    await middleware(
      { costProtection: {} } as Request,
      { status: jest.fn().mockReturnThis(), json: jest.fn() } as any,
      jest.fn()
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Cost protection should add minimal latency (< 100ms)
    expect(duration).toBeLessThan(100);
  });

  it('should handle concurrent requests without race conditions', async () => {
    const provider = 'twelveData';
    const promises = [];
    
    // Simulate 20 concurrent API calls
    for (let i = 0; i < 20; i++) {
      promises.push(budgetMonitor.recordAPICall(provider, '/concurrent', 50, true));
    }
    
    await Promise.all(promises);
    
    const costs = await budgetMonitor.getProviderCosts(provider);
    
    // Should have recorded exactly 20 calls
    expect(costs.callsToday).toBe(20);
  });
});

// CRITICAL: Run these tests before every deployment
console.log('🚨 RUNNING CRITICAL COST PROTECTION TESTS 🚨');
console.log('These tests MUST pass to ensure financial safety!');