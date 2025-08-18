#!/usr/bin/env tsx

/**
 * REDIS CONNECTION TEST
 * Comprehensive Redis connectivity and functionality test
 * Use this to validate Redis setup and cache system
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

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

class RedisConnectionTester {
  private results: TestResult[] = [];

  private log(color: string, message: string): void {
    console.log(`${color}${message}${colors.reset}`);
  }

  private addResult(name: string, passed: boolean, message: string, details?: any): void {
    this.results.push({ name, passed, message, details });
    const icon = passed ? '✅' : '❌';
    const color = passed ? colors.green : colors.red;
    this.log(color, `${icon} ${name}: ${message}`);
    if (details) {
      console.log(`   Details:`, details);
    }
  }

  async testEnvironmentVariables(): Promise<void> {
    this.log(colors.blue, '\n📋 Testing Environment Variables...');
    
    const requiredVars = ['REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD'];
    const missingVars: string[] = [];
    
    requiredVars.forEach(varName => {
      const value = process.env[varName];
      if (!value || value === 'TO_BE_SET_BY_SETUP_SCRIPT') {
        missingVars.push(varName);
      }
    });

    if (missingVars.length === 0) {
      this.addResult(
        'Environment Variables',
        true,
        'All Redis environment variables are set',
        {
          REDIS_HOST: process.env.REDIS_HOST,
          REDIS_PORT: process.env.REDIS_PORT,
          REDIS_URL: process.env.REDIS_URL ? 'SET' : 'NOT SET'
        }
      );
    } else {
      this.addResult(
        'Environment Variables',
        false,
        `Missing variables: ${missingVars.join(', ')}`,
        { missing: missingVars }
      );
    }
  }

  async testRedisCacheService(): Promise<void> {
    this.log(colors.blue, '\n🔧 Testing Redis Cache Service...');
    
    try {
      const { redisCacheService } = await import('./server/cache/redis-cache-service.js');
      
      // Health check
      const health = await redisCacheService.healthCheck();
      this.addResult(
        'Redis Health Check',
        health.status === 'healthy',
        health.message,
        { memoryUsage: health.memoryUsage ? `${(health.memoryUsage / 1024 / 1024).toFixed(2)} MB` : 'N/A' }
      );

      if (health.status === 'healthy') {
        // Test basic operations
        const testKey = 'alfalyzer:test:connection';
        const testValue = { timestamp: Date.now(), message: 'Redis connection test' };

        // Set operation
        await redisCacheService.set(testKey, testValue, 60);
        this.addResult('Redis SET Operation', true, 'Successfully stored test data');

        // Get operation
        const retrievedValue = await redisCacheService.get(testKey);
        const dataMatches = JSON.stringify(retrievedValue) === JSON.stringify(testValue);
        this.addResult(
          'Redis GET Operation',
          dataMatches,
          dataMatches ? 'Successfully retrieved test data' : 'Data mismatch',
          { expected: testValue, retrieved: retrievedValue }
        );

        // TTL operation
        const ttl = await redisCacheService.ttl(testKey);
        this.addResult(
          'Redis TTL Operation',
          ttl > 0 && ttl <= 60,
          `TTL: ${ttl} seconds`,
          { ttl }
        );

        // Delete operation
        await redisCacheService.del(testKey);
        const deletedValue = await redisCacheService.get(testKey);
        this.addResult(
          'Redis DELETE Operation',
          deletedValue === null,
          deletedValue === null ? 'Successfully deleted test data' : 'Failed to delete data'
        );

        // Get stats
        const stats = redisCacheService.getStats();
        this.addResult(
          'Redis Stats',
          typeof stats === 'object',
          'Successfully retrieved Redis statistics',
          stats
        );
      }
    } catch (error) {
      this.addResult(
        'Redis Cache Service',
        false,
        `Failed to import or use Redis service: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async testCacheProvider(): Promise<void> {
    this.log(colors.blue, '\n⚡ Testing Redis Cache Provider...');
    
    try {
      const { redisCache } = await import('./server/services/cache/providers/redis-cache.js');
      
      // Connection state
      const isConnected = redisCache.isConnectedState();
      this.addResult(
        'Cache Provider Connection',
        isConnected,
        isConnected ? 'Provider reports connected' : 'Provider reports disconnected'
      );

      if (isConnected) {
        // Ping test
        const pingResult = await redisCache.ping();
        this.addResult(
          'Cache Provider Ping',
          pingResult,
          pingResult ? 'Ping successful' : 'Ping failed'
        );

        // Test operations
        const testKey = 'alfalyzer:provider:test';
        const testData = { test: 'provider_data', timestamp: Date.now() };

        // Set operation
        const setResult = await redisCache.set(testKey, testData, 60000, 'test');
        this.addResult(
          'Provider SET Operation',
          setResult,
          setResult ? 'Successfully stored data via provider' : 'Failed to store data'
        );

        if (setResult) {
          // Get operation
          const getData = await redisCache.get(testKey);
          const dataMatches = JSON.stringify(getData) === JSON.stringify(testData);
          this.addResult(
            'Provider GET Operation',
            dataMatches,
            dataMatches ? 'Successfully retrieved data via provider' : 'Data retrieval failed',
            { expected: testData, retrieved: getData }
          );

          // Delete operation
          const deleteResult = await redisCache.delete(testKey);
          this.addResult(
            'Provider DELETE Operation',
            deleteResult,
            deleteResult ? 'Successfully deleted data via provider' : 'Failed to delete data'
          );
        }

        // Get provider stats
        const providerStats = await redisCache.getStats();
        this.addResult(
          'Provider Stats',
          typeof providerStats === 'object',
          'Successfully retrieved provider statistics',
          providerStats
        );
      }
    } catch (error) {
      this.addResult(
        'Redis Cache Provider',
        false,
        `Failed to import or use cache provider: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async testCacheManager(): Promise<void> {
    this.log(colors.blue, '\n🏗️ Testing Cache Manager (3-Tier System)...');
    
    try {
      const { CacheManager, CacheType } = await import('./server/services/cache/cache-manager.js');
      const cacheManager = new CacheManager();
      
      // Test cache manager initialization
      this.addResult('Cache Manager', true, 'Successfully initialized cache manager');

      // Test 3-tier cache operations
      const testKey = 'alfalyzer:manager:test';
      const testData = { test: 'manager_data', timestamp: Date.now(), layers: ['memory', 'redis', 'supabase'] };

      // Set operation (should store in all layers)
      await cacheManager.set(testKey, testData, CacheType.REALTIME_PRICE, 'test_provider');
      this.addResult('Manager SET Operation', true, 'Data stored via cache manager');

      // Get operation (should retrieve from fastest available layer)
      const retrievedData = await cacheManager.get(testKey, CacheType.REALTIME_PRICE);
      const dataMatches = JSON.stringify(retrievedData) === JSON.stringify(testData);
      this.addResult(
        'Manager GET Operation',
        dataMatches,
        dataMatches ? 'Successfully retrieved data via cache manager' : 'Data retrieval failed',
        { expected: testData, retrieved: retrievedData }
      );

      // Get cache statistics
      const cacheStats = cacheManager.getStats();
      this.addResult(
        'Manager Statistics',
        typeof cacheStats === 'object' && cacheStats.redisConnected !== undefined,
        `Redis connected: ${cacheStats.redisConnected}, Hit rate: ${cacheStats.hitRate}`,
        {
          redisConnected: cacheStats.redisConnected,
          hitRate: cacheStats.hitRate,
          hits: cacheStats.hits,
          misses: cacheStats.misses
        }
      );

      // Test cache invalidation
      const invalidatedCount = await cacheManager.invalidate(testKey);
      this.addResult(
        'Manager Invalidation',
        invalidatedCount >= 0,
        `Invalidated ${invalidatedCount} cache entries`,
        { invalidatedCount }
      );

      // Cleanup
      await cacheManager.shutdown();
      this.addResult('Manager Shutdown', true, 'Cache manager shutdown successfully');
      
    } catch (error) {
      this.addResult(
        'Cache Manager',
        false,
        `Failed to test cache manager: ${error.message}`,
        { error: error.message }
      );
    }
  }

  private printSummary(): void {
    this.log(colors.bright, '\n📊 TEST SUMMARY');
    this.log(colors.bright, '==================');
    
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

    if (failed > 0) {
      this.log(colors.red, '\n❌ FAILED TESTS:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => this.log(colors.red, `   • ${r.name}: ${r.message}`));
    }

    if (percentage === '100.0') {
      this.log(colors.green, '\n🎉 ALL TESTS PASSED! Redis is ready for production.');
      this.log(colors.cyan, '\n📝 Next steps:');
      this.log(colors.cyan, '   1. Redis is properly configured and working');
      this.log(colors.cyan, '   2. Cache system is operational (3-tier: Memory → Redis → Supabase)');
      this.log(colors.cyan, '   3. You can now restart PM2: pm2 restart alfalyzer');
      this.log(colors.cyan, '   4. Monitor cache performance via /api/cache/stats endpoint');
    } else {
      this.log(colors.red, '\n⚠️ SOME TESTS FAILED. Check Redis configuration and connectivity.');
      this.log(colors.yellow, '\n🔧 Troubleshooting steps:');
      this.log(colors.yellow, '   1. Verify Redis server is running: sudo systemctl status redis-server');
      this.log(colors.yellow, '   2. Check Redis logs: sudo tail -f /var/log/redis/redis-server.log');
      this.log(colors.yellow, '   3. Verify environment variables in .env.production');
      this.log(colors.yellow, '   4. Test manual Redis connection: redis-cli -a [password] ping');
    }
  }

  async runAllTests(): Promise<void> {
    this.log(colors.bright + colors.cyan, '🧪 ALFALYZER REDIS CONNECTION TEST');
    this.log(colors.bright + colors.cyan, '===================================');
    
    await this.testEnvironmentVariables();
    await this.testRedisCacheService();
    await this.testCacheProvider();
    await this.testCacheManager();
    
    this.printSummary();
    
    // Exit with appropriate code
    const allPassed = this.results.every(r => r.passed);
    process.exit(allPassed ? 0 : 1);
  }
}

// Run tests if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new RedisConnectionTester();
  tester.runAllTests().catch(console.error);
}

export { RedisConnectionTester };