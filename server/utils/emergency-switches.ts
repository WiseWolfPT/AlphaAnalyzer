/**
 * EMERGENCY SWITCHES - Circuit Breakers & Kill Switches
 * 
 * Ultra-conservative circuit breakers to prevent cost disasters
 * Automatically cut off failing or expensive API providers
 */

import { EventEmitter } from 'events';
import { CIRCUIT_BREAKER_CONFIG, PROVIDER_COST_LIMITS, ProviderName } from '../config/cost-limits';
// REMOVED: Cache import due to startup issues
// import { getCache } from '../services/cache';

export enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Circuit breaker tripped
  HALF_OPEN = 'half_open' // Testing if service is back
}

export interface CircuitBreaker {
  provider: ProviderName;
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  nextAttemptTime: number;
  costExceeded: boolean;
  reason: string;
}

export interface FailureEvent {
  provider: ProviderName;
  endpoint: string;
  error: string;
  responseTime: number;
  statusCode?: number;
  timestamp: Date;
}

export class EmergencySwitches extends EventEmitter {
  // REMOVED: Cache disabled due to startup issues
  // private cache = getCache();
  private circuitBreakers = new Map<ProviderName, CircuitBreaker>();
  private killSwitches = new Map<string, boolean>();
  private emergencyMode = false;

  constructor() {
    super();
    this.initializeCircuitBreakers();
    this.startCleanupTimer();
  }

  /**
   * Check if provider is available (circuit breaker check)
   */
  async isProviderAvailable(provider: ProviderName): Promise<boolean> {
    const breaker = this.circuitBreakers.get(provider);
    if (!breaker) {
      console.warn(`[EmergencySwitches] Unknown provider: ${provider}`);
      return false;
    }

    const now = Date.now();

    switch (breaker.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        // Check if enough time has passed to try again
        if (now >= breaker.nextAttemptTime) {
          breaker.state = CircuitState.HALF_OPEN;
          await this.updateCircuitBreaker(provider, breaker);
          console.log(`[EmergencySwitches] ${provider} circuit breaker moved to HALF_OPEN`);
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        // Allow one request to test the service
        return true;

      default:
        return false;
    }
  }

  /**
   * Record API call success
   */
  async recordSuccess(provider: ProviderName, responseTime: number = 0): Promise<void> {
    const breaker = this.circuitBreakers.get(provider);
    if (!breaker) return;

    const now = Date.now();
    breaker.lastSuccessTime = now;

    // Check if response time is acceptable
    if (responseTime > CIRCUIT_BREAKER_CONFIG.slowResponseThreshold) {
      console.warn(`[EmergencySwitches] ${provider} slow response: ${responseTime}ms`);
      await this.recordFailure(provider, 'performance', `Slow response: ${responseTime}ms`, responseTime);
      return;
    }

    // Reset circuit breaker if it was in HALF_OPEN state
    if (breaker.state === CircuitState.HALF_OPEN) {
      breaker.state = CircuitState.CLOSED;
      breaker.failureCount = 0;
      breaker.reason = '';
      
      console.log(`[EmergencySwitches] ✅ ${provider} circuit breaker CLOSED - service recovered`);
      
      this.emit('circuit_breaker_closed', { provider, breaker });
    }

    await this.updateCircuitBreaker(provider, breaker);
  }

  /**
   * Record API call failure
   */
  async recordFailure(
    provider: ProviderName, 
    endpoint: string, 
    error: string, 
    responseTime: number = 0,
    statusCode?: number
  ): Promise<void> {
    const breaker = this.circuitBreakers.get(provider);
    if (!breaker) return;

    const now = Date.now();
    breaker.lastFailureTime = now;
    breaker.failureCount++;

    // Log the failure
    const failureEvent: FailureEvent = {
      provider,
      endpoint,
      error,
      responseTime,
      statusCode,
      timestamp: new Date()
    };

    console.error(`[EmergencySwitches] ❌ ${provider} failure #${breaker.failureCount}: ${error}`);
    this.emit('api_failure', failureEvent);

    // Check if circuit breaker should trip
    const shouldTrip = this.shouldTripCircuitBreaker(breaker, error, statusCode);
    
    if (shouldTrip && breaker.state !== CircuitState.OPEN) {
      await this.tripCircuitBreaker(provider, breaker, error);
    }

    await this.updateCircuitBreaker(provider, breaker);
  }

  /**
   * Record cost exceeded for provider
   */
  async recordCostExceeded(provider: ProviderName, currentCost: number, limit: number): Promise<void> {
    const breaker = this.circuitBreakers.get(provider);
    if (!breaker) return;

    breaker.costExceeded = true;
    breaker.reason = `Cost exceeded: $${currentCost.toFixed(2)} > $${limit.toFixed(2)}`;

    await this.tripCircuitBreaker(provider, breaker, 'Cost limit exceeded');
    
    console.error(`[EmergencySwitches] 💰 ${provider} cost limit exceeded - circuit opened`);
  }

  /**
   * Manually trip circuit breaker
   */
  async tripCircuitBreaker(provider: ProviderName, breaker: CircuitBreaker, reason: string): Promise<void> {
    breaker.state = CircuitState.OPEN;
    breaker.reason = reason;
    breaker.nextAttemptTime = Date.now() + CIRCUIT_BREAKER_CONFIG.resetTimeout;

    console.error(`[EmergencySwitches] 🚨 CIRCUIT BREAKER TRIPPED: ${provider} - ${reason}`);
    console.error(`[EmergencySwitches] Next attempt at: ${new Date(breaker.nextAttemptTime).toISOString()}`);

    this.emit('circuit_breaker_tripped', { provider, breaker, reason });
    
    await this.updateCircuitBreaker(provider, breaker);
  }

  /**
   * Kill switch controls
   */
  activateKillSwitch(switchName: string, reason: string): void {
    this.killSwitches.set(switchName, true);
    console.error(`[EmergencySwitches] 🛑 KILL SWITCH ACTIVATED: ${switchName} - ${reason}`);
    this.emit('kill_switch_activated', { switchName, reason });
  }

  deactivateKillSwitch(switchName: string): void {
    this.killSwitches.set(switchName, false);
    console.log(`[EmergencySwitches] ✅ Kill switch deactivated: ${switchName}`);
    this.emit('kill_switch_deactivated', { switchName });
  }

  isKillSwitchActive(switchName: string): boolean {
    return this.killSwitches.get(switchName) || false;
  }

  /**
   * Emergency mode controls
   */
  activateEmergencyMode(reason: string): void {
    this.emergencyMode = true;
    
    // Trip all circuit breakers
    for (const [provider, breaker] of this.circuitBreakers) {
      if (breaker.state !== CircuitState.OPEN) {
        this.tripCircuitBreaker(provider, breaker, 'Emergency mode activated');
      }
    }

    // Activate all kill switches
    const emergencyKillSwitches = [
      'real_time_prices',
      'heavy_api_calls',
      'alert_monitoring',
      'background_tasks'
    ];

    emergencyKillSwitches.forEach(switchName => {
      this.activateKillSwitch(switchName, 'Emergency mode');
    });

    console.error(`[EmergencySwitches] 🚨 EMERGENCY MODE ACTIVATED: ${reason}`);
    this.emit('emergency_mode_activated', { reason });
  }

  deactivateEmergencyMode(): void {
    this.emergencyMode = false;
    console.log(`[EmergencySwitches] ✅ Emergency mode deactivated`);
    this.emit('emergency_mode_deactivated');
  }

  isEmergencyMode(): boolean {
    return this.emergencyMode;
  }

  /**
   * Get status of all circuit breakers
   */
  getCircuitBreakerStatus(): Record<string, CircuitBreaker> {
    const status: Record<string, CircuitBreaker> = {};
    
    for (const [provider, breaker] of this.circuitBreakers) {
      status[provider] = { ...breaker };
    }
    
    return status;
  }

  /**
   * Get status of all kill switches
   */
  getKillSwitchStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    
    for (const [switchName, active] of this.killSwitches) {
      status[switchName] = active;
    }
    
    return status;
  }

  /**
   * Force reset circuit breaker (admin only)
   */
  async forceResetCircuitBreaker(provider: ProviderName, adminReason: string): Promise<void> {
    const breaker = this.circuitBreakers.get(provider);
    if (!breaker) return;

    breaker.state = CircuitState.CLOSED;
    breaker.failureCount = 0;
    breaker.costExceeded = false;
    breaker.reason = '';
    breaker.nextAttemptTime = 0;

    await this.updateCircuitBreaker(provider, breaker);

    console.log(`[EmergencySwitches] ⚡ ADMIN RESET: ${provider} circuit breaker - ${adminReason}`);
    this.emit('circuit_breaker_admin_reset', { provider, adminReason });
  }

  /**
   * Initialize circuit breakers for all providers
   */
  private initializeCircuitBreakers(): void {
    for (const provider of Object.keys(PROVIDER_COST_LIMITS) as ProviderName[]) {
      const breaker: CircuitBreaker = {
        provider,
        state: CircuitState.CLOSED,
        failureCount: 0,
        lastFailureTime: 0,
        lastSuccessTime: Date.now(),
        nextAttemptTime: 0,
        costExceeded: false,
        reason: ''
      };
      
      this.circuitBreakers.set(provider, breaker);
    }

    console.log(`[EmergencySwitches] Initialized ${this.circuitBreakers.size} circuit breakers`);
  }

  /**
   * Determine if circuit breaker should trip
   */
  private shouldTripCircuitBreaker(
    breaker: CircuitBreaker, 
    error: string, 
    statusCode?: number
  ): boolean {
    // Always trip on cost exceeded
    if (breaker.costExceeded) {
      return true;
    }

    // Trip on failure threshold
    if (breaker.failureCount >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
      return true;
    }

    // Trip on specific error status codes
    if (statusCode && CIRCUIT_BREAKER_CONFIG.errorStatusCodes.includes(statusCode)) {
      console.warn(`[EmergencySwitches] Critical error status ${statusCode} - tripping circuit`);
      return true;
    }

    // Trip on rate limit errors (conservative approach)
    if (statusCode === 429 || error.toLowerCase().includes('rate limit')) {
      console.warn(`[EmergencySwitches] Rate limit error - tripping circuit`);
      return true;
    }

    return false;
  }

  /**
   * Update circuit breaker in cache - DISABLED
   */
  private async updateCircuitBreaker(provider: ProviderName, breaker: CircuitBreaker): Promise<void> {
    // REMOVED: Cache disabled due to startup issues
    // const key = `circuit_breaker:${provider}`;
    // await this.cache.set(key, breaker, 86400); // Store for 24 hours
    console.log(`Circuit breaker updated for ${provider}: ${breaker.state}`);
  }

  /**
   * Cleanup timer to reset old circuit breakers
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupOldFailures();
    }, 300000); // Every 5 minutes
  }

  /**
   * Clean up old failures to prevent permanent circuit breaker states
   */
  private cleanupOldFailures(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [provider, breaker] of this.circuitBreakers) {
      // Reset failure count if last failure was more than 24 hours ago
      if (breaker.lastFailureTime && (now - breaker.lastFailureTime) > maxAge) {
        if (breaker.failureCount > 0) {
          console.log(`[EmergencySwitches] Resetting old failures for ${provider}`);
          breaker.failureCount = Math.max(0, breaker.failureCount - 1);
        }
      }

      // Auto-close circuit breakers that have been open too long
      if (breaker.state === CircuitState.OPEN && (now - breaker.lastFailureTime) > (4 * 60 * 60 * 1000)) {
        console.log(`[EmergencySwitches] Auto-closing circuit breaker for ${provider} after 4 hours`);
        breaker.state = CircuitState.HALF_OPEN;
        breaker.nextAttemptTime = now;
      }
    }
  }

  /**
   * Cleanup and shutdown
   */
  destroy(): void {
    this.removeAllListeners();
    console.log('[EmergencySwitches] Shutdown complete');
  }
}

// Export singleton instance
export const emergencySwitches = new EmergencySwitches();