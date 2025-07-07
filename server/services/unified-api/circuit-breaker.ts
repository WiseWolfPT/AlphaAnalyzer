// Circuit Breaker Pattern for API Reliability
// Implements 3-state circuit breaker: CLOSED -> OPEN -> HALF_OPEN

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // Normal operation, requests pass through
  OPEN = 'OPEN',         // Circuit open, requests fail immediately
  HALF_OPEN = 'HALF_OPEN' // Testing mode, limited requests allowed
}

export interface CircuitBreakerConfig {
  failureThreshold: number;     // Number of failures before opening circuit
  successThreshold: number;     // Number of successes to close from half-open
  timeout: number;             // Time in ms before transitioning to half-open
  monitoringPeriod: number;    // Time window for failure counting (ms)
  halfOpenMaxCalls: number;    // Max calls allowed in half-open state
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  state: CircuitBreakerState;
  stateChangeTime: number;
  halfOpenCalls: number;
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private metrics: CircuitBreakerMetrics;
  private readonly providerName: string;

  constructor(providerName: string, config?: Partial<CircuitBreakerConfig>) {
    this.providerName = providerName;
    this.config = {
      failureThreshold: 5,        // Open after 5 consecutive failures
      successThreshold: 3,        // Close after 3 consecutive successes in half-open
      timeout: 60000,            // 1 minute before trying half-open
      monitoringPeriod: 300000,  // 5 minute monitoring window
      halfOpenMaxCalls: 5,       // Allow max 5 calls in half-open
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
      state: CircuitBreakerState.CLOSED,
      stateChangeTime: Date.now(),
      halfOpenCalls: 0
    };

    console.log(`[CircuitBreaker:${providerName}] Initialized with config:`, this.config);
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition to half-open
    this.checkStateTransition();

    // If circuit is open, fail fast
    if (this.metrics.state === CircuitBreakerState.OPEN) {
      const error = new Error(`Circuit breaker is OPEN for ${this.providerName}`);
      error.name = 'CircuitBreakerOpenError';
      console.warn(`[CircuitBreaker:${this.providerName}] Request blocked - circuit is OPEN`);
      throw error;
    }

    // If half-open and we've reached max calls, block additional requests
    if (this.metrics.state === CircuitBreakerState.HALF_OPEN && 
        this.metrics.halfOpenCalls >= this.config.halfOpenMaxCalls) {
      const error = new Error(`Circuit breaker is HALF_OPEN with max calls reached for ${this.providerName}`);
      error.name = 'CircuitBreakerHalfOpenMaxCallsError';
      console.warn(`[CircuitBreaker:${this.providerName}] Request blocked - half-open max calls reached`);
      throw error;
    }

    this.metrics.totalRequests++;
    
    if (this.metrics.state === CircuitBreakerState.HALF_OPEN) {
      this.metrics.halfOpenCalls++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Record a successful execution
   */
  private onSuccess(): void {
    this.metrics.totalSuccesses++;
    this.metrics.consecutiveSuccesses++;
    this.metrics.consecutiveFailures = 0;
    this.metrics.lastSuccessTime = Date.now();

    console.log(`[CircuitBreaker:${this.providerName}] Success recorded - consecutive: ${this.metrics.consecutiveSuccesses}`);

    // If we're half-open and have enough successes, close the circuit
    if (this.metrics.state === CircuitBreakerState.HALF_OPEN &&
        this.metrics.consecutiveSuccesses >= this.config.successThreshold) {
      this.transitionToState(CircuitBreakerState.CLOSED);
      console.log(`[CircuitBreaker:${this.providerName}] Closing circuit after ${this.metrics.consecutiveSuccesses} successes`);
    }
  }

  /**
   * Record a failed execution
   */
  private onFailure(): void {
    this.metrics.totalFailures++;
    this.metrics.consecutiveFailures++;
    this.metrics.consecutiveSuccesses = 0;
    this.metrics.lastFailureTime = Date.now();

    console.warn(`[CircuitBreaker:${this.providerName}] Failure recorded - consecutive: ${this.metrics.consecutiveFailures}`);

    // If we've hit the failure threshold, open the circuit
    if (this.metrics.consecutiveFailures >= this.config.failureThreshold) {
      this.transitionToState(CircuitBreakerState.OPEN);
      console.error(`[CircuitBreaker:${this.providerName}] Opening circuit after ${this.metrics.consecutiveFailures} failures`);
    }
  }

  /**
   * Check if the circuit should transition states based on time
   */
  private checkStateTransition(): void {
    if (this.metrics.state === CircuitBreakerState.OPEN) {
      const timeSinceOpen = Date.now() - this.metrics.stateChangeTime;
      
      if (timeSinceOpen >= this.config.timeout) {
        this.transitionToState(CircuitBreakerState.HALF_OPEN);
        console.log(`[CircuitBreaker:${this.providerName}] Transitioning to HALF_OPEN after ${timeSinceOpen}ms`);
      }
    }
  }

  /**
   * Transition to a new state
   */
  private transitionToState(newState: CircuitBreakerState): void {
    const oldState = this.metrics.state;
    this.metrics.state = newState;
    this.metrics.stateChangeTime = Date.now();
    
    // Reset half-open call counter when entering half-open
    if (newState === CircuitBreakerState.HALF_OPEN) {
      this.metrics.halfOpenCalls = 0;
    }
    
    // Reset consecutive counters when closing
    if (newState === CircuitBreakerState.CLOSED) {
      this.metrics.consecutiveFailures = 0;
      this.metrics.consecutiveSuccesses = 0;
    }

    console.log(`[CircuitBreaker:${this.providerName}] State transition: ${oldState} -> ${newState}`);
  }

  /**
   * Get current circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    this.checkStateTransition();
    return this.metrics.state;
  }

  /**
   * Check if circuit is available for requests
   */
  isAvailable(): boolean {
    this.checkStateTransition();
    
    if (this.metrics.state === CircuitBreakerState.CLOSED) {
      return true;
    }
    
    if (this.metrics.state === CircuitBreakerState.HALF_OPEN) {
      return this.metrics.halfOpenCalls < this.config.halfOpenMaxCalls;
    }
    
    return false; // OPEN state
  }

  /**
   * Manually reset the circuit breaker (admin function)
   */
  reset(): void {
    console.log(`[CircuitBreaker:${this.providerName}] Manual reset triggered`);
    
    this.metrics = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      state: CircuitBreakerState.CLOSED,
      stateChangeTime: Date.now(),
      halfOpenCalls: 0
    };
  }

  /**
   * Get health status for monitoring
   */
  getHealthStatus(): {
    isHealthy: boolean;
    state: CircuitBreakerState;
    failureRate: number;
    avgResponseTime: number;
    uptime: number;
  } {
    const now = Date.now();
    const uptime = now - this.metrics.stateChangeTime;
    const totalCalls = this.metrics.totalRequests;
    const failureRate = totalCalls > 0 ? (this.metrics.totalFailures / totalCalls) * 100 : 0;
    
    return {
      isHealthy: this.metrics.state === CircuitBreakerState.CLOSED,
      state: this.metrics.state,
      failureRate: Math.round(failureRate * 100) / 100,
      avgResponseTime: 0, // TODO: Implement response time tracking
      uptime
    };
  }

  /**
   * Update configuration (for runtime tuning)
   */
  updateConfig(newConfig: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(`[CircuitBreaker:${this.providerName}] Config updated:`, newConfig);
  }
}

/**
 * Circuit Breaker Manager for multiple providers
 */
export class CircuitBreakerManager {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 60000,
    monitoringPeriod: 300000,
    halfOpenMaxCalls: 5
  };

  /**
   * Get or create a circuit breaker for a provider
   */
  getCircuitBreaker(providerName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.circuitBreakers.has(providerName)) {
      const circuitBreaker = new CircuitBreaker(
        providerName, 
        { ...this.defaultConfig, ...config }
      );
      this.circuitBreakers.set(providerName, circuitBreaker);
      console.log(`[CircuitBreakerManager] Created circuit breaker for provider: ${providerName}`);
    }
    
    return this.circuitBreakers.get(providerName)!;
  }

  /**
   * Get all circuit breaker statuses
   */
  getAllStatuses(): Record<string, any> {
    const statuses: Record<string, any> = {};
    
    for (const [providerName, circuitBreaker] of this.circuitBreakers) {
      statuses[providerName] = circuitBreaker.getHealthStatus();
    }
    
    return statuses;
  }

  /**
   * Reset all circuit breakers (emergency function)
   */
  resetAll(): void {
    console.log('[CircuitBreakerManager] Resetting all circuit breakers');
    
    for (const [providerName, circuitBreaker] of this.circuitBreakers) {
      circuitBreaker.reset();
      console.log(`[CircuitBreakerManager] Reset circuit breaker: ${providerName}`);
    }
  }

  /**
   * Get available providers (not in OPEN state)
   */
  getAvailableProviders(): string[] {
    const available: string[] = [];
    
    for (const [providerName, circuitBreaker] of this.circuitBreakers) {
      if (circuitBreaker.isAvailable()) {
        available.push(providerName);
      }
    }
    
    return available;
  }

  /**
   * Update default config for new circuit breakers
   */
  updateDefaultConfig(config: Partial<CircuitBreakerConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
    console.log('[CircuitBreakerManager] Default config updated:', config);
  }
}

// Export singleton instance
export const circuitBreakerManager = new CircuitBreakerManager();