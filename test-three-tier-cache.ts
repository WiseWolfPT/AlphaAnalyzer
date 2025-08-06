#!/usr/bin/env tsx

/**
 * Three-Tier Cache Test
 * Demonstrates the Memory → Redis → Supabase cache strategy
 * 
 * Usage: tsx test-three-tier-cache.ts
 */

import { threeTierCache } from './server/cache/three-tier-cache.js';

async function demonstrateThreeTierCache() {
  console.log('🎯 Three-Tier Cache Demonstration\n');
  
  try {
    // Test data
    const testData = {
      symbol: 'AAPL',
      price: 150.25,
      change: 2.15,
      timestamp: Date.now()
    };
    
    const key = 'quote:AAPL';
    
    console.log('📊 Initial State:');
    const initialHealth = await threeTierCache.healthCheck();
    console.log(`Memory: ${initialHealth.memory.status} (${initialHealth.memory.size} items)`);
    console.log(`Redis: ${initialHealth.redis.status}`);
    console.log(`Supabase: ${initialHealth.supabase.status}`);
    console.log(`Overall: ${initialHealth.overall}\n`);
    
    // Step 1: Cache miss (all layers empty)
    console.log('1️⃣ Testing Complete Cache Miss:');
    const missResult = await threeTierCache.get(key, 'quotes');
    console.log(`Result: ${missResult}\n`);
    
    // Step 2: Set data (populates all layers)
    console.log('2️⃣ Populating All Cache Layers:');
    await threeTierCache.set(key, testData, 'quotes');
    console.log('✅ Data cached in all layers\n');
    
    // Step 3: Memory hit (fastest)
    console.log('3️⃣ Testing Memory Layer Hit:');
    const memoryHit = await threeTierCache.get(key, 'quotes');
    console.log(`Retrieved from memory: ${JSON.stringify(memoryHit)}\n`);
    
    // Step 4: Simulate memory expiry, test Redis hit
    console.log('4️⃣ Testing Redis Layer Hit (after memory expiry):');
    // Clear memory layer only
    (threeTierCache as any).memoryCache.clear();
    const redisHit = await threeTierCache.get(key, 'quotes');
    console.log(`Retrieved from Redis: ${JSON.stringify(redisHit)}\n`);
    
    // Step 5: Test cache invalidation
    console.log('5️⃣ Testing Cache Invalidation:');
    await threeTierCache.invalidate(key);
    const afterInvalidation = await threeTierCache.get(key, 'quotes');
    console.log(`After invalidation: ${afterInvalidation}\n`);
    
    // Step 6: Batch operations
    console.log('6️⃣ Testing Batch Operations:');
    const batchData = [
      { key: 'quote:GOOGL', value: { symbol: 'GOOGL', price: 2800.50 }, dataType: 'quotes' as const },
      { key: 'quote:MSFT', value: { symbol: 'MSFT', price: 420.75 }, dataType: 'quotes' as const },
      { key: 'quote:TSLA', value: { symbol: 'TSLA', price: 250.30 }, dataType: 'quotes' as const }
    ];
    
    await threeTierCache.setBatch(batchData);
    
    // Retrieve batch
    for (const item of batchData) {
      const result = await threeTierCache.get(item.key, 'quotes');
      console.log(`${item.key}: ${JSON.stringify(result)}`);
    }
    console.log();
    
    // Step 7: Pattern invalidation
    console.log('7️⃣ Testing Pattern Invalidation:');
    await threeTierCache.invalidatePattern('quote:');
    
    const afterPatternInvalidation = await threeTierCache.get('quote:GOOGL', 'quotes');
    console.log(`After pattern invalidation: ${afterPatternInvalidation}\n`);
    
    // Step 8: Performance and stats
    console.log('8️⃣ Cache Statistics:');
    const stats = threeTierCache.getStats();
    console.log(JSON.stringify(stats, null, 2));
    console.log();
    
    // Step 9: Health check
    console.log('9️⃣ Final Health Check:');
    const finalHealth = await threeTierCache.healthCheck();
    console.log(JSON.stringify(finalHealth, null, 2));
    
    console.log('\n✅ Three-tier cache demonstration completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
    setTimeout(() => {
      console.log('\n👋 Cleaning up and exiting...');
      process.exit(0);
    }, 1000);
  }
}

// Run the demonstration
demonstrateThreeTierCache();