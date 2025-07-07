/**
 * BUDGET MONITOR - Real-time Cost Protection System
 * 
 * Monitors API usage costs in real-time and triggers emergency actions
 * to prevent runaway expenses
 */

import { EventEmitter } from 'events';
import { 
  PROVIDER_COST_LIMITS, 
  GLOBAL_BUDGET_CONFIG, 
  FEATURE_KILL_SWITCHES,
  EMERGENCY_MODES,
  MONITORING_CONFIG,
  ProviderName,
  FeatureName,
  EmergencyMode,
  BudgetAlert 
} from '../config/cost-limits';
import { QuotaTracker } from './quota/quota-tracker';
import { getCache } from './cache';

export interface CostUsage {
  provider: string;
  callsToday: number;
  estimatedCost: number;
  budgetUsedPercent: number;
  status: 'safe' | 'warning' | 'critical' | 'emergency';
  lastReset: Date;
}

export interface GlobalBudgetStatus {
  totalCostToday: number;
  budgetUsedPercent: number;
  remainingBudget: number;
  projectedDailyCost: number;
  status: 'safe' | 'warning' | 'critical' | 'emergency';
  activeKillSwitches: FeatureName[];
  emergencyMode: EmergencyMode | null;
}

export interface BudgetAlert {
  level: 'info' | 'warning' | 'critical' | 'emergency';
  message: string;
  provider?: string;
  currentCost: number;
  budgetPercent: number;
  timestamp: Date;
  action: string;
}

export class BudgetMonitor extends EventEmitter {
  private cache = getCache();
  private quotaTracker: QuotaTracker;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastAlertTime = new Map<string, number>();
  private emergencyMode: EmergencyMode | null = null;
  private activeKillSwitches = new Set<FeatureName>();

  constructor(quotaTracker: QuotaTracker) {
    super();
    this.quotaTracker = quotaTracker;
    this.startMonitoring();
    this.setupEmergencyHandlers();
  }

  /**
   * Record an API call with cost tracking
   */
  async recordAPICall(
    provider: ProviderName, 
    endpoint: string, 
    responseTime: number = 0,
    success: boolean = true
  ): Promise<void> {
    const now = Date.now();
    const costConfig = PROVIDER_COST_LIMITS[provider];
    
    if (!costConfig) {
      console.warn(`[BudgetMonitor] Unknown provider: ${provider}`);
      return;
    }

    // Record the call in quota tracker
    await this.quotaTracker.recordCall(provider, endpoint);

    // Record cost tracking
    const dailyKey = `cost:${provider}:${this.getTodayKey()}`;
    const currentCost = await this.cache.get<number>(dailyKey) || 0;
    const newCost = currentCost + costConfig.costPerCall;
    
    // Store with TTL until end of day
    await this.cache.set(dailyKey, newCost, this.getSecondsUntilReset());

    // Update global cost tracking
    await this.updateGlobalCosts(costConfig.costPerCall);

    // Check if this provider has exceeded thresholds
    await this.checkProviderThresholds(provider);

    // Check global budget thresholds
    await this.checkGlobalThresholds();

    // Log the cost tracking
    console.log(`[BudgetMonitor] ${provider} call: $${costConfig.costPerCall.toFixed(4)} | Daily total: $${newCost.toFixed(2)}`);

    // Emit monitoring event
    this.emit('api_call_recorded', {
      provider,
      endpoint,
      cost: costConfig.costPerCall,
      dailyCost: newCost,
      success,
      responseTime,
      timestamp: new Date()
    });
  }

  /**
   * Get current cost usage for a provider
   */
  async getProviderCosts(provider: ProviderName): Promise<CostUsage> {
    const usage = await this.quotaTracker.getUsage(provider);
    const costConfig = PROVIDER_COST_LIMITS[provider];
    const estimatedCost = usage.today * costConfig.costPerCall;
    const budgetUsedPercent = (estimatedCost / costConfig.dailyBudget) * 100;

    return {
      provider,
      callsToday: usage.today,
      estimatedCost,
      budgetUsedPercent,
      status: this.getCostStatus(budgetUsedPercent),
      lastReset: new Date(usage.lastReset)
    };
  }

  /**
   * Get global budget status
   */
  async getGlobalBudgetStatus(): Promise<GlobalBudgetStatus> {
    const totalCost = await this.getTotalCostToday();
    const budgetUsedPercent = (totalCost / GLOBAL_BUDGET_CONFIG.dailyBudget) * 100;
    const projectedCost = await this.getProjectedDailyCost();

    return {
      totalCostToday: totalCost,
      budgetUsedPercent,
      remainingBudget: Math.max(0, GLOBAL_BUDGET_CONFIG.dailyBudget - totalCost),
      projectedDailyCost: projectedCost,
      status: this.getCostStatus(budgetUsedPercent),
      activeKillSwitches: Array.from(this.activeKillSwitches),
      emergencyMode: this.emergencyMode
    };
  }

  /**
   * Check if a feature should be killed due to budget constraints
   */
  async isFeatureKilled(feature: FeatureName): Promise<boolean> {
    if (this.activeKillSwitches.has(feature)) {
      return true;
    }

    const featureConfig = FEATURE_KILL_SWITCHES[feature];
    if (!featureConfig.enabled) {
      return true;
    }

    const globalStatus = await this.getGlobalBudgetStatus();
    
    return globalStatus.budgetUsedPercent >= featureConfig.budgetThreshold;
  }

  /**
   * Get fallback mode for a killed feature
   */
  getFallbackMode(feature: FeatureName): string {
    const featureConfig = FEATURE_KILL_SWITCHES[feature];
    return featureConfig.fallbackMode;
  }

  /**
   * Manually trigger emergency mode
   */
  async activateEmergencyMode(mode: EmergencyMode, reason: string): Promise<void> {
    this.emergencyMode = mode;
    const modeConfig = EMERGENCY_MODES[mode];

    console.error(`🚨 [BudgetMonitor] EMERGENCY MODE ACTIVATED: ${modeConfig.name}`);
    console.error(`🚨 Reason: ${reason}`);

    // Kill all expensive features
    Object.keys(FEATURE_KILL_SWITCHES).forEach(feature => {
      this.activeKillSwitches.add(feature as FeatureName);
    });

    // Send emergency alert
    await this.sendAlert({
      level: 'emergency',
      message: `EMERGENCY MODE ACTIVATED: ${modeConfig.name} - ${reason}`,
      currentCost: await this.getTotalCostToday(),
      budgetPercent: await this.getGlobalBudgetPercent(),
      timestamp: new Date(),
      action: `Switched to ${modeConfig.description}`
    });

    this.emit('emergency_mode_activated', { mode, reason, config: modeConfig });
  }

  /**
   * Deactivate emergency mode
   */
  async deactivateEmergencyMode(): Promise<void> {
    const previousMode = this.emergencyMode;
    this.emergencyMode = null;
    this.activeKillSwitches.clear();

    console.log(`[BudgetMonitor] Emergency mode deactivated. Previous mode: ${previousMode}`);
    
    this.emit('emergency_mode_deactivated', { previousMode });
  }

  /**
   * Get cost projection for remaining day
   */
  private async getProjectedDailyCost(): Promise<number> {
    const now = new Date();
    const hoursElapsed = now.getHours() + (now.getMinutes() / 60);
    const hoursRemaining = 24 - hoursElapsed;
    
    if (hoursElapsed < 1) {
      return await this.getTotalCostToday(); // Not enough data to project
    }

    const currentCost = await this.getTotalCostToday();
    const hourlyRate = currentCost / hoursElapsed;
    
    return currentCost + (hourlyRate * hoursRemaining);
  }

  /**
   * Monitor costs in real-time
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performMonitoringCheck();
      } catch (error) {
        console.error('[BudgetMonitor] Monitoring check failed:', error);
      }
    }, MONITORING_CONFIG.budgetCheckInterval);

    console.log('[BudgetMonitor] Real-time cost monitoring started');
  }

  /**
   * Perform monitoring checks
   */
  private async performMonitoringCheck(): Promise<void> {
    // Check global budget status
    const globalStatus = await this.getGlobalBudgetStatus();
    
    // Check if projected costs will exceed budget
    if (globalStatus.projectedDailyCost > GLOBAL_BUDGET_CONFIG.dailyBudget * 1.5) {
      await this.sendAlert({
        level: 'warning',
        message: `Projected daily cost ($${globalStatus.projectedDailyCost.toFixed(2)}) will exceed budget by 150%`,
        currentCost: globalStatus.totalCostToday,
        budgetPercent: globalStatus.budgetUsedPercent,
        timestamp: new Date(),
        action: 'Cost projection alert'
      });
    }

    // Auto-activate emergency mode if budget exceeded
    if (globalStatus.budgetUsedPercent >= 100 && !this.emergencyMode) {
      await this.activateEmergencyMode('maintenance', 'Daily budget exceeded');
    }

    // Check individual providers
    for (const provider of Object.keys(PROVIDER_COST_LIMITS) as ProviderName[]) {
      await this.checkProviderThresholds(provider);
    }
  }

  /**
   * Check provider-specific thresholds
   */
  private async checkProviderThresholds(provider: ProviderName): Promise<void> {
    const costs = await this.getProviderCosts(provider);
    const config = PROVIDER_COST_LIMITS[provider];

    // Check emergency threshold
    if (costs.budgetUsedPercent >= config.emergencyThreshold) {
      await this.sendAlert({
        level: 'critical',
        message: `Provider ${provider} at ${costs.budgetUsedPercent.toFixed(1)}% of budget`,
        provider,
        currentCost: costs.estimatedCost,
        budgetPercent: costs.budgetUsedPercent,
        timestamp: new Date(),
        action: 'Provider threshold alert'
      });
    }

    // Check critical threshold - could trigger kill switches
    if (costs.budgetUsedPercent >= config.criticalThreshold) {
      await this.sendAlert({
        level: 'emergency',
        message: `CRITICAL: Provider ${provider} at ${costs.budgetUsedPercent.toFixed(1)}% - KILL SWITCH READY`,
        provider,
        currentCost: costs.estimatedCost,
        budgetPercent: costs.budgetUsedPercent,
        timestamp: new Date(),
        action: 'Critical threshold - kill switch ready'
      });
    }
  }

  /**
   * Check global budget thresholds
   */
  private async checkGlobalThresholds(): Promise<void> {
    const globalPercent = await this.getGlobalBudgetPercent();

    for (const threshold of GLOBAL_BUDGET_CONFIG.alertThresholds) {
      if (globalPercent >= threshold.threshold && globalPercent < threshold.threshold + 5) {
        await this.handleBudgetThreshold(threshold, globalPercent);
      }
    }
  }

  /**
   * Handle budget threshold crossed
   */
  private async handleBudgetThreshold(threshold: any, currentPercent: number): Promise<void> {
    const alertKey = `threshold_${threshold.threshold}`;
    const now = Date.now();
    const lastAlert = this.lastAlertTime.get(alertKey) || 0;

    // Prevent spam alerts
    if (now - lastAlert < MONITORING_CONFIG.alertCooldown) {
      return;
    }

    this.lastAlertTime.set(alertKey, now);

    await this.sendAlert({
      level: threshold.level,
      message: threshold.message,
      currentCost: await this.getTotalCostToday(),
      budgetPercent: currentPercent,
      timestamp: new Date(),
      action: threshold.action
    });

    // Execute threshold action
    switch (threshold.action) {
      case 'kill_switch':
        await this.activateKillSwitches();
        break;
      case 'emergency_mode':
        await this.activateEmergencyMode('minimal', `Budget threshold ${threshold.threshold}% exceeded`);
        break;
    }
  }

  /**
   * Activate kill switches for expensive features
   */
  private async activateKillSwitches(): Promise<void> {
    const budgetPercent = await this.getGlobalBudgetPercent();

    for (const [featureName, config] of Object.entries(FEATURE_KILL_SWITCHES)) {
      if (budgetPercent >= config.budgetThreshold) {
        this.activeKillSwitches.add(featureName as FeatureName);
        console.warn(`🛑 [BudgetMonitor] Kill switch activated: ${featureName} -> ${config.fallbackMode}`);
      }
    }

    this.emit('kill_switches_activated', Array.from(this.activeKillSwitches));
  }

  /**
   * Send budget alert
   */
  private async sendAlert(alert: BudgetAlert): Promise<void> {
    console.log(`🚨 [BudgetMonitor] ${alert.level.toUpperCase()}: ${alert.message}`);

    // Store alert for admin dashboard
    const alertKey = `alert:${Date.now()}`;
    await this.cache.set(alertKey, alert, 86400); // Store for 24 hours

    // TODO: Send email/webhook alerts if configured
    if (MONITORING_CONFIG.alertEmail && alert.level !== 'info') {
      // Implement email sending
    }

    this.emit('budget_alert', alert);
  }

  /**
   * Utility methods
   */
  private async updateGlobalCosts(cost: number): Promise<void> {
    const globalKey = `cost:global:${this.getTodayKey()}`;
    const currentGlobalCost = await this.cache.get<number>(globalKey) || 0;
    const newGlobalCost = currentGlobalCost + cost;
    
    await this.cache.set(globalKey, newGlobalCost, this.getSecondsUntilReset());
  }

  private async getTotalCostToday(): Promise<number> {
    const globalKey = `cost:global:${this.getTodayKey()}`;
    return await this.cache.get<number>(globalKey) || 0;
  }

  private async getGlobalBudgetPercent(): Promise<number> {
    const totalCost = await this.getTotalCostToday();
    return (totalCost / GLOBAL_BUDGET_CONFIG.dailyBudget) * 100;
  }

  private getCostStatus(budgetPercent: number): 'safe' | 'warning' | 'critical' | 'emergency' {
    if (budgetPercent >= 90) return 'emergency';
    if (budgetPercent >= 70) return 'critical';
    if (budgetPercent >= 50) return 'warning';
    return 'safe';
  }

  private getTodayKey(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getSecondsUntilReset(): number {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    return Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
  }

  private setupEmergencyHandlers(): void {
    // Handle uncaught exceptions that could cause cost runaway
    process.on('uncaughtException', (error) => {
      console.error('[BudgetMonitor] Uncaught exception - activating emergency mode:', error);
      this.activateEmergencyMode('maintenance', 'Uncaught exception');
    });

    // Handle memory issues
    process.on('warning', (warning) => {
      if (warning.name === 'MaxListenersExceededWarning') {
        console.warn('[BudgetMonitor] Memory warning - potential leak detected');
      }
    });
  }

  /**
   * Cleanup and shutdown
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.removeAllListeners();
    console.log('[BudgetMonitor] Shutdown complete');
  }
}

// Export singleton instance for use throughout the application
export const budgetMonitor = new BudgetMonitor(new QuotaTracker());