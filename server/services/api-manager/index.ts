/**
 * API MANAGER MODULE
 * Centralized API management system with intelligent routing,
 * quota management, circuit breaker pattern, and smart caching
 */

// Main API Manager
export { ApiManager, getApiManager, apiManager } from './api-manager';

// Types and interfaces
export * from './types';

// Cache strategies
export { 
  SMART_CACHE_STRATEGIES,
  CacheWarmingStrategy,
  CacheInvalidationStrategy,
  CacheOptimizationEngine,
  cacheWarmingStrategy,
  cacheInvalidationStrategy,
  cacheOptimizationEngine
} from './cache-strategy';

// Quota management
export {
  AdvancedQuotaManager,
  advancedQuotaManager
} from './quota-management';

// Re-export circuit breaker for convenience
export {
  CircuitBreaker,
  CircuitBreakerManager,
  circuitBreakerManager,
  CircuitBreakerState
} from '../unified-api/circuit-breaker';

// Re-export unified API service
export { UnifiedAPIService } from '../unified-api/unified-api-service';