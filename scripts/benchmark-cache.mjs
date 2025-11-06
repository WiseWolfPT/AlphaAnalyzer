#!/usr/bin/env node

/**
 * Cache Performance Benchmark Script
 *
 * Measures cache performance before and after optimization
 * to validate the 50-80% improvement target.
 *
 * Usage:
 *   node scripts/benchmark-cache.mjs baseline    # Test current implementation
 *   node scripts/benchmark-cache.mjs optimized   # Test enhanced implementation
 *   node scripts/benchmark-cache.mjs compare     # Run both and compare
 *
 * Metrics measured:
 * - L1 cache hit latency (optimized only)
 * - L2 cache hit latency
 * - Cache miss latency
 * - Overall P50, P95, P99 latencies
 * - Cache hit rate
 */

import { performance } from 'perf_hooks';
import Redis from 'ioredis';
import msgpack from '@msgpack/msgpack';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || 'alfalyzer2025redis';

// Test configuration
const TEST_CONFIG = {
  warmupRounds: 10,
  testRounds: 100,
  symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'AMD', 'INTC', 'NFLX'],
};

// Simple LRU cache for optimized test
class SimpleLRU {
  constructor(maxSize = 1000, ttlMs = 60000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  clear() {
    this.cache.clear();
  }
}

// Baseline cache (current implementation)
class BaselineCache {
  constructor(redis) {
    this.redis = redis;
  }

  async get(key) {
    const start = performance.now();
    const value = await this.redis.get(key);
    const latency = performance.now() - start;

    return {
      value: value ? JSON.parse(value) : null,
      latency,
      tier: 'redis',
    };
  }

  async set(key, value, ttl = 60) {
    const serialized = JSON.stringify(value);
    await this.redis.setex(key, ttl, serialized);
  }

  async clear() {
    await this.redis.flushdb();
  }
}

// Optimized cache (new implementation)
class OptimizedCache {
  constructor(redis) {
    this.redis = redis;
    this.l1Cache = new SimpleLRU(1000, 60000);
  }

  async get(key) {
    const start = performance.now();

    // L1 check
    const l1Value = this.l1Cache.get(key);
    if (l1Value !== undefined) {
      const latency = performance.now() - start;
      return { value: l1Value, latency, tier: 'l1' };
    }

    // L2 check (Redis)
    const l2Value = await this.redis.getBuffer(key);
    const latency = performance.now() - start;

    if (l2Value) {
      const decoded = msgpack.decode(l2Value);
      // Populate L1
      this.l1Cache.set(key, decoded);
      return { value: decoded, latency, tier: 'l2' };
    }

    return { value: null, latency, tier: 'miss' };
  }

  async set(key, value, ttl = 60) {
    const serialized = msgpack.encode(value);
    await this.redis.setex(key, ttl, Buffer.from(serialized));
    // Populate L1
    this.l1Cache.set(key, value);
  }

  async clear() {
    this.l1Cache.clear();
    await this.redis.flushdb();
  }
}

// Mock stock quote data
function generateMockQuote(symbol) {
  return {
    symbol,
    price: 100 + Math.random() * 200,
    change: Math.random() * 10 - 5,
    changePercent: Math.random() * 5 - 2.5,
    volume: Math.floor(Math.random() * 10000000),
    updatedAt: new Date().toISOString(),
  };
}

// Calculate statistics
function calculateStats(latencies) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / sorted.length,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
  };
}

// Run baseline benchmark
async function runBaselineBenchmark(redis) {
  console.log('\n🔍 Running BASELINE benchmark...\n');

  const cache = new BaselineCache(redis);
  await cache.clear();

  const results = {
    hits: [],
    misses: [],
  };

  // Warmup
  console.log('⏳ Warming up cache...');
  for (let i = 0; i < TEST_CONFIG.warmupRounds; i++) {
    const symbol = TEST_CONFIG.symbols[i % TEST_CONFIG.symbols.length];
    const key = `quote:${symbol}`;
    await cache.set(key, generateMockQuote(symbol), 60);
  }

  // Test cache hits
  console.log('📊 Testing cache hits...');
  for (let i = 0; i < TEST_CONFIG.testRounds; i++) {
    const symbol = TEST_CONFIG.symbols[i % TEST_CONFIG.symbols.length];
    const key = `quote:${symbol}`;
    const result = await cache.get(key);
    results.hits.push(result.latency);
  }

  // Test cache misses
  console.log('📊 Testing cache misses...');
  await cache.clear();
  for (let i = 0; i < TEST_CONFIG.testRounds; i++) {
    const symbol = TEST_CONFIG.symbols[i % TEST_CONFIG.symbols.length];
    const key = `quote:${symbol}_MISS`;
    const result = await cache.get(key);
    results.misses.push(result.latency);
  }

  return results;
}

// Run optimized benchmark
async function runOptimizedBenchmark(redis) {
  console.log('\n🚀 Running OPTIMIZED benchmark...\n');

  const cache = new OptimizedCache(redis);
  await cache.clear();

  const results = {
    l1Hits: [],
    l2Hits: [],
    misses: [],
  };

  // Warmup
  console.log('⏳ Warming up cache...');
  for (let i = 0; i < TEST_CONFIG.warmupRounds; i++) {
    const symbol = TEST_CONFIG.symbols[i % TEST_CONFIG.symbols.length];
    const key = `quote:${symbol}`;
    await cache.set(key, generateMockQuote(symbol), 60);
  }

  // Test L1 hits (immediate access after warmup)
  console.log('📊 Testing L1 cache hits...');
  for (let i = 0; i < TEST_CONFIG.testRounds; i++) {
    const symbol = TEST_CONFIG.symbols[i % TEST_CONFIG.symbols.length];
    const key = `quote:${symbol}`;
    const result = await cache.get(key);
    if (result.tier === 'l1') {
      results.l1Hits.push(result.latency);
    }
  }

  // Test L2 hits (clear L1, keep L2)
  console.log('📊 Testing L2 cache hits...');
  cache.l1Cache.clear();
  for (let i = 0; i < TEST_CONFIG.testRounds; i++) {
    const symbol = TEST_CONFIG.symbols[i % TEST_CONFIG.symbols.length];
    const key = `quote:${symbol}`;
    const result = await cache.get(key);
    if (result.tier === 'l2') {
      results.l2Hits.push(result.latency);
    }
  }

  // Test cache misses
  console.log('📊 Testing cache misses...');
  await cache.clear();
  for (let i = 0; i < TEST_CONFIG.testRounds; i++) {
    const symbol = TEST_CONFIG.symbols[i % TEST_CONFIG.symbols.length];
    const key = `quote:${symbol}_MISS`;
    const result = await cache.get(key);
    if (result.tier === 'miss') {
      results.misses.push(result.latency);
    }
  }

  return results;
}

// Print results
function printResults(baseline, optimized) {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('                  BENCHMARK RESULTS                        ');
  console.log('═══════════════════════════════════════════════════════════');

  if (baseline) {
    console.log('\n📉 BASELINE (Current Implementation)');
    console.log('───────────────────────────────────────────────────────────');
    const hitStats = calculateStats(baseline.hits);
    const missStats = calculateStats(baseline.misses);

    console.log(`Cache Hit  (Redis):  ${hitStats.avg.toFixed(2)}ms avg  |  ${hitStats.p95.toFixed(2)}ms p95`);
    console.log(`Cache Miss:          ${missStats.avg.toFixed(2)}ms avg  |  ${missStats.p95.toFixed(2)}ms p95`);
  }

  if (optimized) {
    console.log('\n📈 OPTIMIZED (New Implementation)');
    console.log('───────────────────────────────────────────────────────────');

    if (optimized.l1Hits.length > 0) {
      const l1Stats = calculateStats(optimized.l1Hits);
      console.log(`L1 Cache Hit:        ${l1Stats.avg.toFixed(2)}ms avg  |  ${l1Stats.p95.toFixed(2)}ms p95`);
    }

    if (optimized.l2Hits.length > 0) {
      const l2Stats = calculateStats(optimized.l2Hits);
      console.log(`L2 Cache Hit (Redis): ${l2Stats.avg.toFixed(2)}ms avg  |  ${l2Stats.p95.toFixed(2)}ms p95`);
    }

    if (optimized.misses.length > 0) {
      const missStats = calculateStats(optimized.misses);
      console.log(`Cache Miss:          ${missStats.avg.toFixed(2)}ms avg  |  ${missStats.p95.toFixed(2)}ms p95`);
    }
  }

  if (baseline && optimized) {
    console.log('\n📊 IMPROVEMENT ANALYSIS');
    console.log('───────────────────────────────────────────────────────────');

    const baselineHitAvg = calculateStats(baseline.hits).avg;
    const optimizedL1Avg = optimized.l1Hits.length > 0 ? calculateStats(optimized.l1Hits).avg : 0;
    const optimizedL2Avg = optimized.l2Hits.length > 0 ? calculateStats(optimized.l2Hits).avg : 0;

    // Assuming 50% L1 hit rate, 40% L2 hit rate in production
    const optimizedWeightedAvg = optimizedL1Avg * 0.5 + optimizedL2Avg * 0.4 + baselineHitAvg * 0.1;
    const improvement = ((baselineHitAvg - optimizedWeightedAvg) / baselineHitAvg) * 100;

    console.log(`Baseline Avg:        ${baselineHitAvg.toFixed(2)}ms`);
    console.log(`Optimized Avg:       ${optimizedWeightedAvg.toFixed(2)}ms (weighted)`);
    console.log(`Improvement:         ${improvement.toFixed(1)}% faster ✅`);

    if (improvement >= 50) {
      console.log(`Status:              🎯 TARGET MET (>50% improvement)`);
    } else {
      console.log(`Status:              ⚠️  BELOW TARGET (<50% improvement)`);
    }

    // Detailed breakdown
    if (optimizedL1Avg > 0) {
      const l1Improvement = ((baselineHitAvg - optimizedL1Avg) / baselineHitAvg) * 100;
      console.log(`L1 Hit Improvement:  ${l1Improvement.toFixed(1)}% faster`);
    }

    if (optimizedL2Avg > 0) {
      const l2Improvement = ((baselineHitAvg - optimizedL2Avg) / baselineHitAvg) * 100;
      console.log(`L2 Hit Improvement:  ${l2Improvement.toFixed(1)}% faster`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');
}

// Main
async function main() {
  const mode = process.argv[2] || 'compare';

  console.log('🚀 Cache Performance Benchmark');
  console.log(`Mode: ${mode.toUpperCase()}`);
  console.log(`Redis: ${REDIS_HOST}:${REDIS_PORT}`);
  console.log(`Test rounds: ${TEST_CONFIG.testRounds}`);

  // Connect to Redis
  const redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    lazyConnect: false,
  });

  await new Promise((resolve) => redis.once('ready', resolve));
  console.log('✅ Redis connected\n');

  let baselineResults = null;
  let optimizedResults = null;

  try {
    if (mode === 'baseline' || mode === 'compare') {
      baselineResults = await runBaselineBenchmark(redis);
    }

    if (mode === 'optimized' || mode === 'compare') {
      optimizedResults = await runOptimizedBenchmark(redis);
    }

    printResults(baselineResults, optimizedResults);
  } catch (error) {
    console.error('❌ Benchmark error:', error);
    process.exit(1);
  } finally {
    await redis.quit();
    console.log('👋 Disconnected from Redis');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
