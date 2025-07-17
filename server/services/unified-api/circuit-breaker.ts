/**
 * CIRCUIT BREAKER PATTERN IMPLEMENTATION
 * Prevents cascading failures by monitoring API provider health
 * Automatically opens circuits when failure rate is high, preventing wasted calls
 */

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing - blocking all calls
  HALF_OPEN = 'HALF_OPEN' // Testing - allowing limited calls
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening circuit
  successThreshold: number;      // Number of successes to close from half-open
  timeout: number;              // Time in ms to wait before trying half-open
  halfOpenMaxCalls: number;     // Max calls allowed in half-open state
  rollingWindowMs: number;      // Time window for failure counting
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  stateTransitions: Array<{
    fromState: CircuitBreakerState;
    toState: CircuitBreakerState;
    timestamp: number;
    reason: string;
  }>;
}

export interface CircuitBreakerHealthStatus {
  state: CircuitBreakerState;
  isHealthy: boolean;
  failureRate: number;
  uptime: number;
  lastStateChange: number;
}

export class CircuitBreakerOpenError extends Error {
  constructor(providerName: string) {
    super(`Circuit breaker is OPEN for provider: ${providerName}`);
    this.name = 'CircuitBreakerOpenError';
  }
}

export class CircuitBreakerHalfOpenMaxCallsError extends Error {
  constructor(providerName: string) {
    super(`Circuit breaker HALF_OPEN max calls exceeded for provider: ${providerName}`);
    this.name = 'CircuitBreakerHalfOpenMaxCallsError';
  }
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private metrics: CircuitBreakerMetrics;
  private config: CircuitBreakerConfig;
  private providerName: string;
  private stateChangedAt: number;
  private halfOpenCallCount: number = 0;
  private failures: Array<{ timestamp: number; error: string }> = [];

  constructor(providerName: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.providerName = providerName;
    this.stateChangedAt = Date.now();
    
    // Default configuration
    this.config = {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000,
      halfOpenMaxCalls: 3,
      rollingWindowMs: 300000, // 5 minutes
      ...config
    };

    this.metrics = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      stateTransitions: []
    };

    console.log(`🔌 Circuit breaker initialized for ${providerName} with config:`, this.config);
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitBreakerState.OPEN) {
      // Check if timeout has passed to try half-open
      if (Date.now() - this.stateChangedAt >= this.config.timeout) {
        this.transitionTo(CircuitBreakerState.HALF_OPEN, 'Timeout reached, trying half-open');
        this.halfOpenCallCount = 0;
      } else {
        throw new CircuitBreakerOpenError(this.providerName);
      }
    }

    // Check half-open call limit
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.halfOpenCallCount >= this.config.halfOpenMaxCalls) {
        throw new CircuitBreakerHalfOpenMaxCallsError(this.providerName);
      }
      this.halfOpenCallCount++;
    }

    this.metrics.totalRequests++;

    try {
      console.log(`🔌 Executing operation for ${this.providerName} (State: ${this.state}, Call: ${this.metrics.totalRequests})`);
      
      const result = await operation();
      
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  private onSuccess(): void {
    this.metrics.totalSuccesses++;
    this.metrics.consecutiveSuccesses++;
    this.metrics.consecutiveFailures = 0;
    this.metrics.lastSuccessTime = Date.now();

    // Remove old failures from rolling window
    this.cleanOldFailures();

    console.log(`✅ Circuit breaker success for ${this.providerName} (${this.metrics.consecutiveSuccesses} consecutive)`);

    // Handle state transitions on success
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.metrics.consecutiveSuccesses >= this.config.successThreshold) {
        this.transitionTo(CircuitBreakerState.CLOSED, `${this.config.successThreshold} consecutive successes in half-open`);
        this.halfOpenCallCount = 0;
      }
    }
  }

  private onFailure(error: Error): void {
    this.metrics.totalFailures++;
    this.metrics.consecutiveFailures++;
    this.metrics.consecutiveSuccesses = 0;
    this.metrics.lastFailureTime = Date.now();

    // Add failure to rolling window
    this.failures.push({
      timestamp: Date.now(),
      error: error.message
    });

    // Remove old failures from rolling window
    this.cleanOldFailures();

    console.error(`❌ Circuit breaker failure for ${this.providerName} (${this.metrics.consecutiveFailures} consecutive):`, error.message);

    // Check if we should open the circuit
    if (this.state !== CircuitBreakerState.OPEN) {
      const failuresInWindow = this.failures.length;
      const shouldOpen = failuresInWindow >= this.config.failureThreshold;

      if (shouldOpen) {
        this.transitionTo(
          CircuitBreakerState.OPEN, 
          `${failuresInWindow} failures in ${this.config.rollingWindowMs}ms window (threshold: ${this.config.failureThreshold})`
        );
      } else if (this.state === CircuitBreakerState.HALF_OPEN) {
        // On any failure in half-open, go back to open
        this.transitionTo(CircuitBreakerState.OPEN, 'Failure in half-open state');
        this.halfOpenCallCount = 0;
      }
    }
  }

  private cleanOldFailures(): void {
    const cutoff = Date.now() - this.config.rollingWindowMs;
    this.failures = this.failures.filter(failure => failure.timestamp > cutoff);
  }

  private transitionTo(newState: CircuitBreakerState, reason: string): void {
    const oldState = this.state;
    this.state = newState;
    this.stateChangedAt = Date.now();

    this.metrics.stateTransitions.push({
      fromState: oldState,
      toState: newState,
      timestamp: this.stateChangedAt,
      reason
    });

    console.log(`🔄 Circuit breaker for ${this.providerName}: ${oldState} → ${newState} (${reason})`);
  }

  // Public getter methods
  getState(): CircuitBreakerState {
    return this.state;
  }

  isAvailable(): boolean {
    if (this.state === CircuitBreakerState.OPEN) {
      // Check if we can transition to half-open
      return Date.now() - this.stateChangedAt >= this.config.timeout;
    }
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      return this.halfOpenCallCount < this.config.halfOpenMaxCalls;
    }
    
    return true; // CLOSED state
  }

  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }

  getHealthStatus(): CircuitBreakerHealthStatus {
    const totalCalls = this.metrics.totalRequests;
    const failureRate = totalCalls > 0 ? (this.metrics.totalFailures / totalCalls) * 100 : 0;
    
    return {
      state: this.state,
      isHealthy: this.state !== CircuitBreakerState.OPEN && failureRate < 50,
      failureRate: parseFloat(failureRate.toFixed(2)),
      uptime: Date.now() - this.stateChangedAt,
      lastStateChange: this.stateChangedAt
    };
  }

  // Administrative methods
  reset(): void {
    console.log(`🔌 Manually resetting circuit breaker for ${this.providerName}`);
    
    this.transitionTo(CircuitBreakerState.CLOSED, 'Manual reset');
    this.halfOpenCallCount = 0;
    this.failures = [];
    
    // Keep historical metrics but reset consecutive counters
    this.metrics.consecutiveFailures = 0;
    this.metrics.consecutiveSuccesses = 0;
  }

  forceOpen(reason: string = 'Manual force open'): void {
    console.log(`🔌 Manually opening circuit breaker for ${this.providerName}: ${reason}`);
    this.transitionTo(CircuitBreakerState.OPEN, reason);
  }

  updateConfig(newConfig: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(`🔌 Updated circuit breaker config for ${this.providerName}:`, this.config);
  }
}

/**
 * CIRCUIT BREAKER MANAGER
 * Manages multiple circuit breakers for different providers
 */
export class CircuitBreakerManager {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private defaultConfig: CircuitBreakerConfig;

  constructor(defaultConfig?: Partial<CircuitBreakerConfig>) {
    this.defaultConfig = {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000,
      halfOpenMaxCalls: 3,
      rollingWindowMs: 300000,
      ...defaultConfig
    };

    console.log('🔌 Circuit breaker manager initialized with default config:', this.defaultConfig);
  }

  getCircuitBreaker(providerName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.circuitBreakers.has(providerName)) {
      const breaker = new CircuitBreaker(providerName, config || this.defaultConfig);
      this.circuitBreakers.set(providerName, breaker);
    }
    
    return this.circuitBreakers.get(providerName)!;
  }

  getAllStatuses(): Record<string, CircuitBreakerHealthStatus> {
    const statuses: Record<string, CircuitBreakerHealthStatus> = {};
    
    for (const [providerName, breaker] of this.circuitBreakers) {
      statuses[providerName] = breaker.getHealthStatus();
    }
    
    return statuses;
  }

  getAvailableProviders(): string[] {
    const available: string[] = [];
    
    for (const [providerName, breaker] of this.circuitBreakers) {
      if (breaker.isAvailable()) {
        available.push(providerName);
      }
    }
    
    return available;
  }

  resetAll(): void {
    console.log('🔌 Resetting all circuit breakers');
    
    for (const breaker of this.circuitBreakers.values()) {
      breaker.reset();
    }
  }

  getGlobalStats() {
    const stats = {
      totalProviders: this.circuitBreakers.size,
      availableProviders: 0,
      openCircuits: 0,
      halfOpenCircuits: 0,
      closedCircuits: 0,
      totalRequests: 0,
      totalFailures: 0,
      globalFailureRate: 0
    };

    for (const breaker of this.circuitBreakers.values()) {
      const health = breaker.getHealthStatus();
      const metrics = breaker.getMetrics();
      
      stats.totalRequests += metrics.totalRequests;
      stats.totalFailures += metrics.totalFailures;
      
      if (breaker.isAvailable()) {
        stats.availableProviders++;
      }
      
      switch (health.state) {
        case CircuitBreakerState.OPEN:
          stats.openCircuits++;
          break;
        case CircuitBreakerState.HALF_OPEN:
          stats.halfOpenCircuits++;
          break;
        case CircuitBreakerState.CLOSED:
          stats.closedCircuits++;
          break;
      }
    }

    stats.globalFailureRate = stats.totalRequests > 0 
      ? parseFloat(((stats.totalFailures / stats.totalRequests) * 100).toFixed(2))
      : 0;

    return stats;
  }
}

// Global circuit breaker manager instance
export const circuitBreakerManager = new CircuitBreakerManager({
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 60000,
  halfOpenMaxCalls: 3,
  rollingWindowMs: 300000
});