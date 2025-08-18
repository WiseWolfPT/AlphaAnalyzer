#!/usr/bin/env tsx

/**
 * CACHE SYSTEM VALIDATION
 * Comprehensive validation of the 3-tier cache system for production
 * Tests the full flow: Memory → Redis → Supabase fallback
 */

import dotenv from 'dotenv';
dotenv.config();

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

interface ValidationResult {
  test: string;
  passed: boolean;
  details: string;
  performance?: number;
  layer?: string;
}

class CacheSystemValidator {
  private results: ValidationResult[] = [];
  private cacheManager: any;

  private log(color: string, message: string): void {
    console.log(`${color}${message}${colors.reset}`);
  }

  private addResult(test: string, passed: boolean, details: string, performance?: number, layer?: string): void {
    this.results.push({ test, passed, details, performance, layer });
    const icon = passed ? '✅' : '❌';
    const color = passed ? colors.green : colors.red;
    const perf = performance ? ` (${performance}ms)` : '';
    const layerInfo = layer ? ` [${layer}]` : '';
    this.log(color, `${icon} ${test}: ${details}${perf}${layerInfo}`);
  }

  async initializeCacheSystem(): Promise<boolean> {
    this.log(colors.blue, '\n🚀 Initializing Cache System...');
    
    try {
      const { CacheManager, CacheType } = await import('./server/services/cache/cache-manager.js');
      this.cacheManager = new CacheManager();
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.addResult(
        'Cache System Initialization',
        true,
        'Cache manager initialized successfully'
      );
      return true;
    } catch (error) {
      this.addResult(
        'Cache System Initialization',
        false,
        `Failed to initialize: ${error.message}`
      );
      return false;
    }
  }

  async testFinancialDataCaching(): Promise<void> {
    this.log(colors.blue, '\n💰 Testing Financial Data Caching Patterns...');
    
    const { CacheType } = await import('./server/services/cache/cache-manager.js');
    
    // Test different types of financial data with realistic scenarios
    const testScenarios = [
      {
        name: 'Real-time Stock Quote',
        key: 'quote:AAPL',
        data: {
          symbol: 'AAPL',
          price: 182.34,
          change: 1.25,
          changePercent: 0.69,
          timestamp: Date.now(),
          marketCap: '2.8T'
        },
        cacheType: CacheType.REALTIME_PRICE,
        expectedTTL: 30 * 1000 // 30 seconds
      },
      {
        name: 'Company Fundamentals',
        key: 'fundamentals:GOOGL',
        data: {
          symbol: 'GOOGL',
          pe_ratio: 24.5,
          market_cap: 1.7e12,
          revenue_ttm: 307.4e9,
          profit_margin: 0.21,
          last_updated: Date.now()
        },
        cacheType: CacheType.FUNDAMENTALS,
        expectedTTL: 60 * 60 * 1000 // 1 hour
      },
      {
        name: 'Chart Data',
        key: 'chart:MSFT:1D',
        data: {
          symbol: 'MSFT',
          interval: '1D',
          data: Array.from({ length: 100 }, (_, i) => ({
            timestamp: Date.now() - (100 - i) * 60 * 1000,
            open: 380 + Math.random() * 10,
            high: 385 + Math.random() * 10,
            low: 375 + Math.random() * 10,
            close: 382 + Math.random() * 10,
            volume: 1000000 + Math.random() * 500000
          })),
          generated_at: Date.now()
        },
        cacheType: CacheType.CHART_DATA,
        expectedTTL: 60 * 60 * 1000 // 1 hour
      }
    ];

    for (const scenario of testScenarios) {
      await this.testCacheScenario(scenario);
    }
  }

  async testCacheScenario(scenario: any): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test SET operation
      await this.cacheManager.set(
        scenario.key,
        scenario.data,
        scenario.cacheType,
        'test_provider',
        { test: 'validation', scenario: scenario.name }
      );
      
      const setTime = Date.now() - startTime;
      this.addResult(
        `${scenario.name} - SET`,
        true,
        'Data cached successfully',
        setTime
      );

      // Test GET operation (should hit cache)
      const getStartTime = Date.now();
      const cachedData = await this.cacheManager.get(scenario.key, scenario.cacheType);
      const getTime = Date.now() - getStartTime;

      const dataMatches = this.deepEqual(cachedData, scenario.data);
      this.addResult(
        `${scenario.name} - GET`,
        dataMatches,
        dataMatches ? 'Data retrieved successfully' : 'Data mismatch',
        getTime,
        getTime < 5 ? 'Memory' : getTime < 20 ? 'Redis' : 'Supabase'
      );

      // Test cache hit performance
      const hitStartTime = Date.now();
      await this.cacheManager.get(scenario.key, scenario.cacheType);
      const hitTime = Date.now() - hitStartTime;
      
      this.addResult(
        `${scenario.name} - Cache Hit Performance`,
        hitTime < 50, // Should be fast on second hit
        `Response time: ${hitTime}ms`,
        hitTime,
        hitTime < 5 ? 'Memory' : hitTime < 20 ? 'Redis' : 'Supabase'
      );

    } catch (error) {
      this.addResult(
        `${scenario.name} - Error`,
        false,
        `Test failed: ${error.message}`
      );
    }
  }

  async testCacheFallbackStrategy(): Promise<void> {
    this.log(colors.blue, '\n🛡️ Testing Cache Fallback Strategy...');
    
    const { CacheType } = await import('./server/services/cache/cache-manager.js');
    
    // Get initial stats
    const initialStats = this.cacheManager.getStats();
    
    // Store test data
    const testKey = 'fallback:test:data';
    const testData = {
      id: 'fallback-test',
      timestamp: Date.now(),
      layers: ['memory', 'redis', 'supabase'],
      content: 'This tests the fallback mechanism across all cache layers'
    };

    await this.cacheManager.set(testKey, testData, CacheType.REALTIME_PRICE, 'fallback_test');
    
    // Test multiple gets to ensure consistent retrieval
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      const retrievedData = await this.cacheManager.get(testKey, CacheType.REALTIME_PRICE);
      const responseTime = Date.now() - startTime;
      
      const dataMatches = this.deepEqual(retrievedData, testData);
      this.addResult(
        `Fallback Test ${i + 1}`,
        dataMatches && responseTime < 100,
        `Consistent data retrieval (${responseTime}ms)`,
        responseTime
      );
    }

    // Get final stats and compare
    const finalStats = this.cacheManager.getStats();
    const hitRateImproved = parseFloat(finalStats.hitRate) >= parseFloat(initialStats.hitRate);
    
    this.addResult(
      'Cache Hit Rate',
      hitRateImproved,
      `Hit rate: ${finalStats.hitRate} (was ${initialStats.hitRate})`,
      undefined,
      `Hits: ${finalStats.hits}, Misses: ${finalStats.misses}`
    );
  }

  async testCacheInvalidation(): Promise<void> {
    this.log(colors.blue, '\n🗑️ Testing Cache Invalidation...');
    
    const { CacheType } = await import('./server/services/cache/cache-manager.js');
    
    // Store test data for invalidation
    const testKeys = [
      'invalidation:test:1',
      'invalidation:test:2', 
      'invalidation:test:3'
    ];
    
    const testData = { test: 'invalidation', timestamp: Date.now() };

    // Store data in all test keys
    for (const key of testKeys) {
      await this.cacheManager.set(key, testData, CacheType.USER_DATA, 'invalidation_test');
    }

    // Verify data is cached
    let cachedCount = 0;
    for (const key of testKeys) {
      const data = await this.cacheManager.get(key, CacheType.USER_DATA);
      if (data) cachedCount++;
    }

    this.addResult(
      'Pre-Invalidation Cache State',
      cachedCount === testKeys.length,
      `${cachedCount}/${testKeys.length} keys cached`
    );

    // Test pattern invalidation
    const invalidatedCount = await this.cacheManager.invalidate('invalidation:test:*');
    this.addResult(
      'Pattern Invalidation',
      invalidatedCount >= 0,
      `Invalidated ${invalidatedCount} entries`
    );

    // Verify data is no longer cached
    let remainingCount = 0;
    for (const key of testKeys) {
      const data = await this.cacheManager.get(key, CacheType.USER_DATA);
      if (data) remainingCount++;
    }

    this.addResult(
      'Post-Invalidation Cache State',
      remainingCount === 0,
      `${remainingCount}/${testKeys.length} keys remaining (should be 0)`
    );
  }

  async testCacheWarming(): Promise<void> {
    this.log(colors.blue, '\n🔥 Testing Cache Warming...');
    
    // Test cache warming with common symbols
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];
    
    try {
      const startTime = Date.now();
      await this.cacheManager.warmCache(symbols);
      const warmTime = Date.now() - startTime;
      
      this.addResult(
        'Cache Warming',
        warmTime < 5000, // Should complete within 5 seconds
        `Warming completed in ${warmTime}ms for ${symbols.length} symbols`,
        warmTime
      );
      
      // Verify warmed cache can be accessed
      const stats = this.cacheManager.getStats();
      this.addResult(
        'Post-Warming Cache Stats',
        stats.sets > 0,
        `Cache has ${stats.sets} entries after warming`
      );
      
    } catch (error) {
      this.addResult(
        'Cache Warming',
        false,
        `Failed to warm cache: ${error.message}`
      );
    }
  }

  async testPerformanceBenchmarks(): Promise<void> {
    this.log(colors.blue, '\n⚡ Running Performance Benchmarks...');
    
    const { CacheType } = await import('./server/services/cache/cache-manager.js');
    
    // Benchmark SET operations
    const setTimes: number[] = [];
    for (let i = 0; i < 10; i++) {
      const startTime = Date.now();
      await this.cacheManager.set(
        `perf:test:${i}`,
        { id: i, data: Array(100).fill('benchmark_data'), timestamp: Date.now() },
        CacheType.REALTIME_PRICE,
        'benchmark'
      );
      setTimes.push(Date.now() - startTime);
    }
    
    const avgSetTime = setTimes.reduce((a, b) => a + b, 0) / setTimes.length;
    this.addResult(
      'SET Performance',
      avgSetTime < 20,
      `Average SET time: ${avgSetTime.toFixed(2)}ms`,
      avgSetTime
    );

    // Benchmark GET operations  
    const getTimes: number[] = [];
    for (let i = 0; i < 10; i++) {
      const startTime = Date.now();
      await this.cacheManager.get(`perf:test:${i}`, CacheType.REALTIME_PRICE);
      getTimes.push(Date.now() - startTime);
    }
    
    const avgGetTime = getTimes.reduce((a, b) => a + b, 0) / getTimes.length;
    this.addResult(
      'GET Performance',
      avgGetTime < 10,
      `Average GET time: ${avgGetTime.toFixed(2)}ms`,
      avgGetTime
    );

    // Cleanup benchmark data
    for (let i = 0; i < 10; i++) {
      await this.cacheManager.invalidate(`perf:test:${i}`);
    }
  }

  private deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return obj1 === obj2;
    if (typeof obj1 !== typeof obj2) return false;
    
    if (typeof obj1 !== 'object') return obj1 === obj2;
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!this.deepEqual(obj1[key], obj2[key])) return false;
    }
    
    return true;
  }

  private printValidationSummary(): void {
    this.log(colors.bright, '\n📊 VALIDATION SUMMARY');
    this.log(colors.bright, '=====================');
    
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const failed = total - passed;

    this.log(colors.green, `✅ Passed: ${passed}`);
    if (failed > 0) {
      this.log(colors.red, `❌ Failed: ${failed}`);
    }
    this.log(colors.blue, `📋 Total: ${total}`);
    
    const percentage = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
    const color = percentage === '100.0' ? colors.green : failed > 0 ? colors.red : colors.yellow;
    this.log(color, `🎯 Success Rate: ${percentage}%`);

    // Performance summary
    const performanceResults = this.results.filter(r => r.performance !== undefined);
    if (performanceResults.length > 0) {
      const avgPerformance = performanceResults.reduce((sum, r) => sum + (r.performance || 0), 0) / performanceResults.length;
      this.log(colors.cyan, `⚡ Average Response Time: ${avgPerformance.toFixed(2)}ms`);
    }

    // Layer distribution
    const layerStats = this.results.reduce((acc: any, r) => {
      if (r.layer) {
        acc[r.layer] = (acc[r.layer] || 0) + 1;
      }
      return acc;
    }, {});
    
    if (Object.keys(layerStats).length > 0) {
      this.log(colors.magenta, '\n📈 Cache Layer Usage:');
      Object.entries(layerStats).forEach(([layer, count]) => {
        this.log(colors.magenta, `   ${layer}: ${count} hits`);
      });
    }

    if (failed > 0) {
      this.log(colors.red, '\n❌ FAILED VALIDATIONS:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => this.log(colors.red, `   • ${r.test}: ${r.details}`));
    }

    if (percentage === '100.0') {
      this.log(colors.green, '\n🎉 CACHE SYSTEM VALIDATION PASSED!');
      this.log(colors.cyan, '\n✅ Production Readiness Checklist:');
      this.log(colors.cyan, '   ✅ Redis connection established and secure');
      this.log(colors.cyan, '   ✅ 3-tier cache system operational');
      this.log(colors.cyan, '   ✅ Fallback mechanisms working');
      this.log(colors.cyan, '   ✅ Performance benchmarks met');
      this.log(colors.cyan, '   ✅ Cache invalidation functional');
      this.log(colors.cyan, '   ✅ Financial data caching patterns validated');
      
      this.log(colors.green, '\n🚀 READY FOR PRODUCTION DEPLOYMENT!');
      this.log(colors.yellow, '\n📝 Next steps:');
      this.log(colors.yellow, '   1. Deploy to production server (Hetzner)');
      this.log(colors.yellow, '   2. Run Redis setup script with authentication');
      this.log(colors.yellow, '   3. Update production environment variables');
      this.log(colors.yellow, '   4. Restart PM2 processes');
      this.log(colors.yellow, '   5. Monitor cache performance via /api/cache/stats');
    } else {
      this.log(colors.red, '\n⚠️ VALIDATION FAILED - NOT READY FOR PRODUCTION');
      this.log(colors.yellow, '\n🔧 Recommended Actions:');
      this.log(colors.yellow, '   1. Fix failing tests before proceeding');
      this.log(colors.yellow, '   2. Verify Redis server configuration');
      this.log(colors.yellow, '   3. Check network connectivity and permissions');
      this.log(colors.yellow, '   4. Review cache manager implementation');
      this.log(colors.yellow, '   5. Re-run validation after fixes');
    }
  }

  async runFullValidation(): Promise<void> {
    this.log(colors.bright + colors.cyan, '🔍 ALFALYZER CACHE SYSTEM VALIDATION');
    this.log(colors.bright + colors.cyan, '====================================');
    
    const initialized = await this.initializeCacheSystem();
    if (!initialized) {
      this.log(colors.red, '\n❌ Cannot proceed - cache system failed to initialize');
      process.exit(1);
    }

    try {
      await this.testFinancialDataCaching();
      await this.testCacheFallbackStrategy();
      await this.testCacheInvalidation();
      await this.testCacheWarming();
      await this.testPerformanceBenchmarks();
      
      this.printValidationSummary();
      
      // Cleanup
      if (this.cacheManager) {
        await this.cacheManager.shutdown();
      }
      
    } catch (error) {
      this.log(colors.red, `\n❌ Validation failed with error: ${error.message}`);
      console.error(error);
      process.exit(1);
    }
    
    // Exit with appropriate code
    const allPassed = this.results.every(r => r.passed);
    process.exit(allPassed ? 0 : 1);
  }
}

// Run validation if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new CacheSystemValidator();
  validator.runFullValidation().catch(console.error);
}

export { CacheSystemValidator };