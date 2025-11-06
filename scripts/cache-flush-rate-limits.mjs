#!/usr/bin/env node
/**
 * Cache Flush Script for Rate Limit Errors
 *
 * Purpose: Flush stale HTTP 429 rate limit errors from Redis cache
 * Context: 716 stocks (86% failure rate) returning 404 due to cached rate limit errors
 *
 * What it does:
 * 1. Connects to Redis (localhost:6379 with password)
 * 2. Reads list of failing stocks from /tmp/failed-stocks-716.txt
 * 3. Deletes cache keys for: profile:*, iv:chart:*, quote:*
 * 4. Logs each deletion for audit trail
 *
 * Usage:
 *   node scripts/cache-flush-rate-limits.mjs
 *
 * Created: 2025-11-03
 */

import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';

// Redis configuration
const redis = new Redis({
  host: '127.0.0.1',
  port: 6379,
  password: 'alfalyzer2025redis',
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Stats tracking
const stats = {
  totalStocks: 0,
  profileKeysFlushed: 0,
  ivKeysFlushed: 0,
  quoteKeysFlushed: 0,
  totalKeysFlushed: 0,
  errors: 0,
  startTime: Date.now(),
};

async function loadFailingStocks() {
  const filePath = '/tmp/failed-stocks-716.txt';

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Failed stocks list not found at: ${filePath}`);
    console.error('Run the extraction command first to generate this file.');
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const stocks = content.trim().split('\n').filter(Boolean);

  console.log(`✅ Loaded ${stocks.length} failing stocks from ${filePath}`);
  return stocks;
}

async function flushStockCache(symbol) {
  const keysDeleted = [];

  try {
    // 1. Delete profile cache
    const profileKey = `profile:${symbol}`;
    const profileDeleted = await redis.del(profileKey);
    if (profileDeleted > 0) {
      keysDeleted.push(profileKey);
      stats.profileKeysFlushed += profileDeleted;
    }

    // 2. Delete all IV chart cache keys (all methods)
    const ivPattern = `iv:chart:${symbol}:*`;
    const ivKeys = await redis.keys(ivPattern);
    if (ivKeys.length > 0) {
      const ivDeleted = await redis.del(...ivKeys);
      keysDeleted.push(...ivKeys);
      stats.ivKeysFlushed += ivDeleted;
    }

    // 3. Delete quote cache
    const quoteKey = `quote:${symbol}`;
    const quoteDeleted = await redis.del(quoteKey);
    if (quoteDeleted > 0) {
      keysDeleted.push(quoteKey);
      stats.quoteKeysFlushed += quoteDeleted;
    }

    stats.totalKeysFlushed += keysDeleted.length;

    if (keysDeleted.length > 0) {
      return { symbol, keysDeleted, success: true };
    } else {
      return { symbol, keysDeleted: [], success: true, nothingToDelete: true };
    }

  } catch (error) {
    stats.errors++;
    return { symbol, error: error.message, success: false };
  }
}

async function flushAllStocks() {
  console.log('\n🚀 Starting cache flush operation...\n');

  const failingStocks = await loadFailingStocks();
  stats.totalStocks = failingStocks.length;

  console.log(`📋 Processing ${failingStocks.length} stocks\n`);

  const results = [];
  let processed = 0;

  for (const symbol of failingStocks) {
    const result = await flushStockCache(symbol);
    results.push(result);
    processed++;

    // Progress logging every 50 stocks
    if (processed % 50 === 0) {
      const progress = ((processed / failingStocks.length) * 100).toFixed(1);
      console.log(`⏳ Progress: ${processed}/${failingStocks.length} (${progress}%) - Flushed ${stats.totalKeysFlushed} keys`);
    }

    // Log individual deletions (only if keys were deleted)
    if (result.success && result.keysDeleted.length > 0) {
      console.log(`✓ ${symbol}: Deleted ${result.keysDeleted.length} keys`);
    } else if (!result.success) {
      console.error(`✗ ${symbol}: Error - ${result.error}`);
    }
  }

  return results;
}

async function printSummary(results) {
  const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(70));
  console.log('📊 CACHE FLUSH SUMMARY');
  console.log('='.repeat(70));
  console.log(`\n📈 Statistics:`);
  console.log(`   Total stocks processed:     ${stats.totalStocks}`);
  console.log(`   Profile keys flushed:       ${stats.profileKeysFlushed}`);
  console.log(`   IV chart keys flushed:      ${stats.ivKeysFlushed}`);
  console.log(`   Quote keys flushed:         ${stats.quoteKeysFlushed}`);
  console.log(`   Total keys flushed:         ${stats.totalKeysFlushed}`);
  console.log(`   Errors encountered:         ${stats.errors}`);
  console.log(`   Elapsed time:               ${elapsed}s`);

  // Stocks with most keys deleted
  const topDeletions = results
    .filter(r => r.success && r.keysDeleted.length > 0)
    .sort((a, b) => b.keysDeleted.length - a.keysDeleted.length)
    .slice(0, 5);

  if (topDeletions.length > 0) {
    console.log(`\n🏆 Top 5 stocks by keys deleted:`);
    topDeletions.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.symbol}: ${r.keysDeleted.length} keys`);
    });
  }

  // Stocks with no cached data
  const nothingToDelete = results.filter(r => r.nothingToDelete).length;
  if (nothingToDelete > 0) {
    console.log(`\n⚠️  ${nothingToDelete} stocks had no cached data to delete`);
  }

  console.log('\n✅ Cache flush completed successfully!');
  console.log('='.repeat(70) + '\n');
}

async function main() {
  try {
    // Test Redis connection
    await redis.ping();
    console.log('✅ Connected to Redis\n');

    // Run the flush operation
    const results = await flushAllStocks();

    // Print summary
    await printSummary(results);

    // Write detailed results to log file
    const logPath = `/tmp/cache-flush-results-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(logPath, JSON.stringify({ stats, results }, null, 2));
    console.log(`📝 Detailed results written to: ${logPath}\n`);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await redis.quit();
    console.log('👋 Disconnected from Redis\n');
  }
}

// Run the script
main();
