#!/usr/bin/env node
/**
 * Cache Diagnostics Script
 * Tests cache population and hit rate for Alfalyzer backend
 *
 * Usage:
 *   node scripts/test-cache-diagnostics.mjs [URL]
 *
 * Example:
 *   node scripts/test-cache-diagnostics.mjs http://localhost:3001
 *   node scripts/test-cache-diagnostics.mjs https://128.140.45.28.sslip.io
 */

import { createClient } from 'redis';

const TARGET_URL = process.argv[2] || 'http://localhost:3001';
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

console.log('='.repeat(80));
console.log('CACHE DIAGNOSTICS - Alfalyzer Backend');
console.log('='.repeat(80));
console.log(`Target URL: ${TARGET_URL}`);
console.log(`Redis: ${REDIS_HOST}:${REDIS_PORT}`);
console.log('');

// Initialize Redis client
const redis = createClient({
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT,
  },
  password: REDIS_PASSWORD,
});

redis.on('error', (err) => console.error('Redis error:', err));

async function main() {
  try {
    await redis.connect();
    console.log('✅ Redis connected\n');

    // Step 1: Check current cache state
    console.log('━'.repeat(80));
    console.log('STEP 1: Current Cache State');
    console.log('━'.repeat(80));

    const dbSize = await redis.dbSize();
    console.log(`Total keys: ${dbSize}`);

    const quoteKeys = await redis.keys('quote:*');
    const ivCalcKeys = await redis.keys('iv:calc:*');
    const ivMethodKeys = await redis.keys('iv:method:*');
    const ivKeys = await redis.keys('iv:*');
    const sectorKeys = await redis.keys('sector:*');
    const gTermKeys = await redis.keys('g_term_region:*');
    const mrpKeys = await redis.keys('mrp:*');
    const rfKeys = await redis.keys('rf:*');

    console.log(`\nCache Key Breakdown:`);
    console.log(`  quote:* (stock quotes) ............. ${quoteKeys.length}`);
    console.log(`  iv:calc:* (intrinsic value) ........ ${ivCalcKeys.length}`);
    console.log(`  iv:method:* (method-level cache) ... ${ivMethodKeys.length}`);
    console.log(`  iv:* (all IV keys) ................. ${ivKeys.length}`);
    console.log(`  sector:* (sector growth) ........... ${sectorKeys.length}`);
    console.log(`  g_term_region:* (terminal growth) .. ${gTermKeys.length}`);
    console.log(`  mrp:* (market risk premium) ........ ${mrpKeys.length}`);
    console.log(`  rf:* (risk-free rate) .............. ${rfKeys.length}`);

    // Sample quote keys (if any)
    if (quoteKeys.length > 0) {
      console.log(`\n  Sample quote keys:`);
      for (const key of quoteKeys.slice(0, 5)) {
        const ttl = await redis.ttl(key);
        console.log(`    ${key} (TTL: ${ttl}s)`);
      }
    }

    // Sample IV keys (if any)
    if (ivCalcKeys.length > 0) {
      console.log(`\n  Sample IV keys:`);
      for (const key of ivCalcKeys.slice(0, 5)) {
        const ttl = await redis.ttl(key);
        console.log(`    ${key} (TTL: ${ttl}s)`);
      }
    }

    // Step 2: Test cache write behavior
    console.log('\n' + '━'.repeat(80));
    console.log('STEP 2: Test Cache Write Behavior');
    console.log('━'.repeat(80));

    const testSymbol = 'AAPL';
    const testKey = `quote:${testSymbol}`;

    // Clear test key
    await redis.del(testKey);
    console.log(`\n1. Cleared test key: ${testKey}`);

    // Write test data
    const testData = {
      symbol: testSymbol,
      price: 150.0,
      change: 2.5,
      changePercent: 1.7,
      volume: 50000000,
      updatedAt: new Date().toISOString(),
    };

    await redis.set(testKey, JSON.stringify(testData), { EX: 60 });
    console.log(`2. Wrote test data to Redis`);

    // Verify write
    const retrieved = await redis.get(testKey);
    if (retrieved) {
      const parsed = JSON.parse(retrieved);
      console.log(`3. ✅ Verified write successful:`, parsed);
    } else {
      console.log(`3. ❌ Write verification failed`);
    }

    // Check TTL
    const ttl = await redis.ttl(testKey);
    console.log(`4. TTL: ${ttl} seconds (expected ~60)`);

    // Cleanup
    await redis.del(testKey);
    console.log(`5. Cleaned up test key`);

    // Step 3: Redis Stats
    console.log('\n' + '━'.repeat(80));
    console.log('STEP 3: Redis Statistics');
    console.log('━'.repeat(80));

    const info = await redis.info('stats');
    const statsLines = info.split('\n');

    console.log('');
    for (const line of statsLines) {
      if (line.includes('total_connections') ||
          line.includes('total_commands') ||
          line.includes('expired_keys') ||
          line.includes('evicted_keys') ||
          line.includes('keyspace_hits') ||
          line.includes('keyspace_misses')) {
        console.log(`  ${line}`);
      }
    }

    // Calculate hit rate from Redis stats
    const hitsMatch = info.match(/keyspace_hits:(\d+)/);
    const missesMatch = info.match(/keyspace_misses:(\d+)/);

    if (hitsMatch && missesMatch) {
      const hits = parseInt(hitsMatch[1], 10);
      const misses = parseInt(missesMatch[1], 10);
      const total = hits + misses;
      const hitRate = total > 0 ? (hits / total * 100).toFixed(2) : '0.00';

      console.log(`\n  Cache Hit Rate: ${hitRate}% (${hits} hits / ${total} total)`);
    }

    // Step 4: Memory Usage
    console.log('\n' + '━'.repeat(80));
    console.log('STEP 4: Memory Usage');
    console.log('━'.repeat(80));

    const memoryInfo = await redis.info('memory');
    const memoryLines = memoryInfo.split('\n');

    console.log('');
    for (const line of memoryLines) {
      if (line.includes('used_memory_human') ||
          line.includes('used_memory_peak_human') ||
          line.includes('maxmemory_human') ||
          line.includes('mem_fragmentation_ratio')) {
        console.log(`  ${line}`);
      }
    }

    // Step 5: Recommendations
    console.log('\n' + '━'.repeat(80));
    console.log('STEP 5: Diagnosis & Recommendations');
    console.log('━'.repeat(80));
    console.log('');

    if (quoteKeys.length === 0) {
      console.log('❌ ISSUE: No quote cache keys found');
      console.log('   Possible causes:');
      console.log('   1. API endpoints not being called (no requests)');
      console.log('   2. Cache writes failing silently');
      console.log('   3. TTL expiring immediately (check TTL config)');
      console.log('   4. Redis connection issues from app server');
      console.log('');
      console.log('   Action: Make API request to populate cache:');
      console.log(`   curl ${TARGET_URL}/api/market-data/quote/AAPL`);
    } else {
      console.log(`✅ Quote cache populated (${quoteKeys.length} keys)`);
    }

    if (ivCalcKeys.length === 0 && ivMethodKeys.length === 0) {
      console.log('\n❌ ISSUE: No IV cache keys found');
      console.log('   Possible causes:');
      console.log('   1. Intrinsic value endpoints not being called');
      console.log('   2. IV calculation failing (returns invalid values)');
      console.log('   3. Defensive caching blocking writes (iv <= 0 || !isFinite)');
      console.log('');
      console.log('   Action: Make IV request to populate cache:');
      console.log(`   curl ${TARGET_URL}/api/iv/AAPL/chart`);
    } else {
      console.log(`\n✅ IV cache populated (${ivCalcKeys.length + ivMethodKeys.length} keys)`);
    }

    if (sectorKeys.length > 0 && quoteKeys.length === 0) {
      console.log('\n⚠️  WARNING: Macro data cached but real-time data missing');
      console.log('   This suggests:');
      console.log('   1. Valuation calculations are running (populating sector cache)');
      console.log('   2. Quote caching is not working properly');
      console.log('   3. Different cache services or key prefixes in use');
    }

    console.log('\n' + '='.repeat(80));
    console.log('END OF DIAGNOSTICS');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error during diagnostics:', error);
    process.exit(1);
  } finally {
    await redis.disconnect();
  }
}

main();
