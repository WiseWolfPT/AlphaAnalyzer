#!/usr/bin/env tsx

/**
 * Redis Connection Test
 * Tests Redis setup for Alfalyzer 3-tier cache strategy
 * 
 * Usage: npm run test:redis or tsx test-redis-connection.ts
 */

import { redisCacheService } from './server/cache/redis-cache-service.js';

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}

class RedisConnectionTest {
  private results: TestResult[] = [];

  async runTest(name: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    
    try {
      const data = await testFn();
      const duration = Date.now() - startTime;
      
      this.results.push({
        name,
        success: true,
        duration,
        data
      });
      
      console.log(`✅ ${name} - ${duration}ms`);
      if (data && typeof data === 'object') {
        console.log(`   Data: ${JSON.stringify(data).substring(0, 100)}...`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        name,
        success: false,
        duration,
        error: error.message
      });
      
      console.error(`❌ ${name} - ${duration}ms`);
      console.error(`   Error: ${error.message}`);
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Redis Connection Tests...\n');

    // Wait for Redis to be ready
    console.log('⏳ Waiting for Redis connection...');
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      const health = await redisCacheService.healthCheck();
      if (health.status === 'healthy') {
        console.log('✅ Redis is ready!\n');
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
      
      if (attempts === maxAttempts) {
        console.error('❌ Redis connection timeout after 15 seconds');
        return;
      }
    }

    // Test 1: Health Check
    await this.runTest('Health Check', async () => {
      return await redisCacheService.healthCheck();
    });

    // Test 2: Basic Set/Get
    await this.runTest('Basic Set/Get', async () => {
      const testKey = 'test:connection';
      const testValue = { message: 'Hello Redis!', timestamp: Date.now() };
      
      await redisCacheService.set(testKey, testValue, 60);
      const retrieved = await redisCacheService.get(testKey);
      
      if (JSON.stringify(retrieved) !== JSON.stringify(testValue)) {
        throw new Error('Retrieved data does not match stored data');
      }
      
      return retrieved;
    });

    // Test 3: TTL functionality
    await this.runTest('TTL Functionality', async () => {
      const testKey = 'test:ttl';
      const testValue = { message: 'TTL Test' };
      
      await redisCacheService.set(testKey, testValue, 5); // 5 seconds
      const ttl = await redisCacheService.ttl(testKey);
      
      if (ttl <= 0 || ttl > 5) {
        throw new Error(`Invalid TTL: ${ttl}`);
      }
      
      return { ttl };
    });

    // Test 4: Key Existence
    await this.runTest('Key Existence', async () => {
      const testKey = 'test:exists';
      
      // Should not exist initially
      const existsBefore = await redisCacheService.exists(testKey);
      if (existsBefore) {
        throw new Error('Key should not exist initially');
      }
      
      // Set and check existence
      await redisCacheService.set(testKey, { test: true }, 60);
      const existsAfter = await redisCacheService.exists(testKey);
      if (!existsAfter) {
        throw new Error('Key should exist after setting');
      }
      
      return { existsBefore, existsAfter };
    });

    // Test 5: Pattern Deletion
    await this.runTest('Pattern Deletion', async () => {
      const keys = ['test:pattern:1', 'test:pattern:2', 'test:pattern:3'];
      
      // Set multiple keys
      for (const key of keys) {
        await redisCacheService.set(key, { value: key }, 60);
      }
      
      // Verify they exist
      const existsResults = await Promise.all(
        keys.map(key => redisCacheService.exists(key))
      );
      
      if (!existsResults.every(exists => exists)) {
        throw new Error('Not all keys were set properly');
      }
      
      // Delete by pattern
      await redisCacheService.delPattern('test:pattern:*');
      
      // Verify they're gone
      const deletedResults = await Promise.all(
        keys.map(key => redisCacheService.exists(key))
      );
      
      if (deletedResults.some(exists => exists)) {
        throw new Error('Some keys were not deleted');
      }
      
      return { keysSet: keys.length, keysDeleted: keys.length };
    });

    // Test 6: Cache Performance Test
    await this.runTest('Performance Test (100 operations)', async () => {
      const iterations = 100;
      const startTime = Date.now();
      
      // Set operations
      const setPromises = [];
      for (let i = 0; i < iterations; i++) {
        setPromises.push(
          redisCacheService.set(`perf:test:${i}`, { index: i, data: `test-${i}` }, 300)
        );
      }
      await Promise.all(setPromises);
      
      // Get operations
      const getPromises = [];
      for (let i = 0; i < iterations; i++) {
        getPromises.push(redisCacheService.get(`perf:test:${i}`));
      }
      const results = await Promise.all(getPromises);
      
      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / (iterations * 2); // Set + Get operations
      
      // Verify results
      const validResults = results.filter(result => result && result.index !== undefined);
      if (validResults.length !== iterations) {
        throw new Error(`Only ${validResults.length}/${iterations} operations succeeded`);
      }
      
      // Cleanup
      await redisCacheService.delPattern('perf:test:*');
      
      return {
        operations: iterations * 2,
        totalTime,
        avgTimePerOp: Math.round(avgTime * 100) / 100,
        opsPerSecond: Math.round((iterations * 2) / (totalTime / 1000))
      };
    });

    // Test 7: Redis Info and Stats
    await this.runTest('Redis Info and Stats', async () => {
      const info = await redisCacheService.getInfo();
      const stats = redisCacheService.getStats();
      
      return { info: info ? 'Available' : 'Not Available', stats };
    });

    // Test 8: Simulated Stock Quote Cache
    await this.runTest('Stock Quote Simulation', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA'];
      const quotes = symbols.map(symbol => ({
        symbol,
        price: Math.random() * 1000,
        change: (Math.random() - 0.5) * 20,
        timestamp: Date.now()
      }));
      
      // Cache stock quotes
      for (const quote of quotes) {
        await redisCacheService.set(`quote:${quote.symbol}`, quote, 300); // 5 min TTL
      }
      
      // Retrieve and verify
      const retrieved = [];
      for (const symbol of symbols) {
        const cached = await redisCacheService.get(`quote:${symbol}`);
        retrieved.push(cached);
      }
      
      if (retrieved.some(item => !item)) {
        throw new Error('Some quotes were not cached properly');
      }
      
      return { 
        cached: symbols.length, 
        retrieved: retrieved.length,
        avgPrice: retrieved.reduce((sum, q) => sum + q.price, 0) / retrieved.length 
      };
    });

    this.printSummary();
  }

  private printSummary(): void {
    console.log('\n📊 Test Summary:');
    console.log('================');
    
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total Time: ${totalTime}ms`);
    console.log(`📈 Success Rate: ${Math.round((passed / this.results.length) * 100)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => !r.success).forEach(test => {
        console.log(`   - ${test.name}: ${test.error}`);
      });
    }
    
    console.log('\n🎯 Redis Setup Status:');
    if (passed === this.results.length) {
      console.log('✅ Redis is properly configured and ready for Alfalyzer 3-tier cache!');
      console.log('✅ All Day 3 requirements have been met');
    } else {
      console.log('⚠️  Redis setup needs attention - some tests failed');
    }
  }
}

// Run tests
async function main() {
  const tester = new RedisConnectionTest();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
  
  // Cleanup and exit
  setTimeout(() => {
    console.log('\n👋 Disconnecting from Redis...');
    redisCacheService.disconnect();
    process.exit(0);
  }, 1000);
}

// Run immediately since this is the main module
main();