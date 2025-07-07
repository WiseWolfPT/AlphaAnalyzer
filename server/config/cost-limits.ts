/**
 * COST PROTECTION SYSTEM - P0 FINANCIAL SAFETY
 * 
 * ULTRA-CONSERVATIVE LIMITS TO PREVENT COST DISASTERS
 * These limits are intentionally aggressive to prevent any risk of runaway costs
 */

export interface CostLimit {
  dailyLimit: number;
  hourlyLimit: number;
  dailyBudget: number; // USD
  costPerCall: number; // USD estimate
  emergencyThreshold: number; // % at which to trigger emergency mode
  criticalThreshold: number; // % at which to trigger kill switches
}

export interface BudgetAlert {
  level: 'info' | 'warning' | 'critical' | 'emergency';
  threshold: number;
  action: 'log' | 'email' | 'kill_switch' | 'emergency_mode';
  message: string;
}

// ULTRA-CONSERVATIVE API LIMITS - Designed to prevent cost disasters
export const PROVIDER_COST_LIMITS: Record<string, CostLimit> = {
  alphaVantage: {
    dailyLimit: 25, // API free tier limit
    hourlyLimit: 5,
    dailyBudget: 0.00, // Free tier
    costPerCall: 0.0,
    emergencyThreshold: 80, // Emergency at 20 calls
    criticalThreshold: 95   // Kill switch at 24 calls
  },
  
  finnhub: {
    dailyLimit: 500, // Reduced from theoretical 60/min * 1440
    hourlyLimit: 30, // Heavily reduced from 60/min
    dailyBudget: 5.00,
    costPerCall: 0.01,
    emergencyThreshold: 70, // Emergency at 350 calls
    criticalThreshold: 90   // Kill switch at 450 calls
  },
  
  twelveData: {
    dailyLimit: 100, // Heavily reduced from 800
    hourlyLimit: 8,
    dailyBudget: 3.00,
    costPerCall: 0.03,
    emergencyThreshold: 60, // Emergency at 60 calls
    criticalThreshold: 80   // Kill switch at 80 calls
  },
  
  fmp: {
    dailyLimit: 50, // Heavily reduced from 250
    hourlyLimit: 5,
    dailyBudget: 2.00,
    costPerCall: 0.04,
    emergencyThreshold: 60, // Emergency at 30 calls
    criticalThreshold: 80   // Kill switch at 40 calls
  },
  
  polygon: {
    dailyLimit: 20, // Ultra conservative
    hourlyLimit: 3,
    dailyBudget: 1.00,
    costPerCall: 0.05,
    emergencyThreshold: 50, // Emergency at 10 calls
    criticalThreshold: 75   // Kill switch at 15 calls
  }
};

// GLOBAL BUDGET THRESHOLDS
export const GLOBAL_BUDGET_CONFIG = {
  dailyBudget: 10.00, // $10/day maximum spend
  monthlyBudget: 200.00, // $200/month maximum spend
  emergencyBudget: 5.00, // Emergency mode at $5/day
  killSwitchBudget: 8.00, // Kill switches at $8/day
  
  alertThresholds: [
    { 
      level: 'info' as const, 
      threshold: 25, 
      action: 'log' as const,
      message: '25% daily budget used - monitoring closely'
    },
    { 
      level: 'warning' as const, 
      threshold: 50, 
      action: 'email' as const,
      message: '50% daily budget used - WARNING'
    },
    { 
      level: 'critical' as const, 
      threshold: 80, 
      action: 'kill_switch' as const,
      message: '80% daily budget used - CRITICAL ALERT - KILL SWITCHES READY'
    },
    { 
      level: 'emergency' as const, 
      threshold: 90, 
      action: 'emergency_mode' as const,
      message: '90% daily budget used - EMERGENCY MODE ACTIVATED'
    }
  ]
};

// FEATURE KILL SWITCHES
export const FEATURE_KILL_SWITCHES = {
  realTimePrices: {
    enabled: true,
    budgetThreshold: 60, // Disable at 60% budget
    fallbackMode: 'cached_prices'
  },
  
  alertMonitoring: {
    enabled: true,
    budgetThreshold: 70, // Disable at 70% budget
    fallbackMode: 'disabled'
  },
  
  heavyApiCalls: {
    enabled: true,
    budgetThreshold: 50, // Disable at 50% budget
    fallbackMode: 'demo_data'
  },
  
  financialCalculations: {
    enabled: true,
    budgetThreshold: 80, // Keep essential features longer
    fallbackMode: 'basic_mode'
  }
};

// CIRCUIT BREAKER CONFIG - ULTRA CONSERVATIVE
export const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 3, // Open circuit after 3 failures
  timeout: 300000, // 5 minutes timeout
  resetTimeout: 600000, // 10 minutes before retry
  
  // HTTP status codes that trigger circuit breaker
  errorStatusCodes: [429, 500, 502, 503, 504],
  
  // Response times that trigger circuit breaker (milliseconds)
  slowResponseThreshold: 5000, // 5 seconds
  
  // Cost-based circuit breaker
  costThreshold: 1.00, // Open circuit if provider cost > $1/day
};

// MONITORING CONFIG
export const MONITORING_CONFIG = {
  logLevel: 'debug',
  alertEmail: process.env.ADMIN_EMAIL || 'admin@alfalyzer.com',
  alertWebhook: process.env.COST_ALERT_WEBHOOK,
  
  // How often to check budgets
  budgetCheckInterval: 60000, // Every minute
  
  // How often to send cost alerts
  alertCooldown: 300000, // 5 minutes between alerts
  
  // Cost projection settings
  projectionLookahead: 24, // Hours to project costs
  projectionAlertThreshold: 150, // Alert if projected to exceed 150% of budget
};

// EMERGENCY MODES
export const EMERGENCY_MODES = {
  demo: {
    name: 'Demo Mode',
    description: 'Show only cached/demo data, no API calls',
    allowedAPIs: [],
    maxConcurrentUsers: 10,
    features: ['basic_charts', 'demo_data']
  },
  
  minimal: {
    name: 'Minimal Mode', 
    description: 'Only essential API calls, heavy caching',
    allowedAPIs: ['alphaVantage'], // Only free tier
    maxConcurrentUsers: 5,
    features: ['basic_data', 'cached_prices']
  },
  
  maintenance: {
    name: 'Maintenance Mode',
    description: 'System down for cost protection',
    allowedAPIs: [],
    maxConcurrentUsers: 0,
    features: []
  }
};

// Export types
export type ProviderName = keyof typeof PROVIDER_COST_LIMITS;
export type FeatureName = keyof typeof FEATURE_KILL_SWITCHES;
export type EmergencyMode = keyof typeof EMERGENCY_MODES;