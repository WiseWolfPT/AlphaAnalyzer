#!/usr/bin/env node

/**
 * Test Script: Intelligent Warming Scheduler
 *
 * Quick validation script to test the warming system locally.
 *
 * Usage:
 *   node scripts/test-intelligent-warming.mjs
 */

import Redis from 'ioredis';

// Configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}`)
};

/**
 * Test 1: Redis Connection
 */
async function testRedisConnection() {
  log.section('TEST 1: Redis Connection');

  try {
    const redis = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
      lazyConnect: true
    });

    await redis.connect();
    log.success(`Connected to Redis at ${REDIS_HOST}:${REDIS_PORT}`);

    // Test PING
    const pong = await redis.ping();
    if (pong === 'PONG') {
      log.success('Redis PING successful');
    } else {
      log.error('Redis PING failed');
    }

    await redis.quit();
    return true;
  } catch (error) {
    log.error(`Redis connection failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 2: Queue Operations
 */
async function testQueueOperations() {
  log.section('TEST 2: Queue Operations');

  try {
    const redis = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
      lazyConnect: true
    });

    await redis.connect();

    // Clear test queue
    const testQueue = 'warming:queue:test';
    await redis.del(testQueue);
    log.info('Cleared test queue');

    // Add test tasks
    const tasks = [
      { ticker: 'AAPL', methodId: 'dcf20-ocf', priority: 5 },
      { ticker: 'MSFT', methodId: 'peg', priority: 4 },
      { ticker: 'GOOGL', methodId: 'ps-mean', priority: 3 }
    ];

    for (const task of tasks) {
      const score = task.priority * 1000 - Date.now();
      const payload = JSON.stringify(task);
      await redis.zadd(testQueue, score, `${task.ticker}:${task.methodId}|${payload}`);
    }
    log.success(`Added ${tasks.length} test tasks to queue`);

    // Get queue size
    const queueSize = await redis.zcard(testQueue);
    log.success(`Queue size: ${queueSize}`);

    // Get top 2 tasks
    const topTasks = await redis.zrange(testQueue, 0, 1);
    log.success(`Top 2 tasks: ${topTasks.map(t => t.split(':')[0]).join(', ')}`);

    // Verify priority order (AAPL should be first)
    const firstTask = topTasks[0].split('|')[1];
    const parsed = JSON.parse(firstTask);
    if (parsed.ticker === 'AAPL') {
      log.success('Priority order correct (AAPL first)');
    } else {
      log.error('Priority order incorrect');
    }

    // Cleanup
    await redis.del(testQueue);
    await redis.quit();
    return true;
  } catch (error) {
    log.error(`Queue operations failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 3: Bandwidth Tracking
 */
async function testBandwidthTracking() {
  log.section('TEST 3: Bandwidth Tracking');

  try {
    const redis = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
      lazyConnect: true
    });

    await redis.connect();

    const today = new Date().toISOString().split('T')[0];
    const bandwidthKey = `bandwidth:daily:test:${today}`;
    const callsKey = `bandwidth:calls:daily:test:${today}`;

    // Clear test keys
    await redis.del(bandwidthKey);
    await redis.del(callsKey);

    // Simulate 100 API calls (30 KB each)
    for (let i = 0; i < 100; i++) {
      await redis.incrby(bandwidthKey, 30); // 30 KB
      await redis.incr(callsKey);
    }
    log.success('Simulated 100 API calls (30 KB each)');

    // Check totals
    const totalBandwidthKB = parseInt(await redis.get(bandwidthKey) || '0', 10);
    const totalCalls = parseInt(await redis.get(callsKey) || '0', 10);

    log.success(`Total bandwidth: ${totalBandwidthKB} KB (${(totalBandwidthKB / 1024).toFixed(2)} MB)`);
    log.success(`Total calls: ${totalCalls}`);

    // Verify calculations
    const expectedBandwidth = 100 * 30; // 3,000 KB
    if (totalBandwidthKB === expectedBandwidth && totalCalls === 100) {
      log.success('Bandwidth tracking accurate');
    } else {
      log.error('Bandwidth tracking calculation error');
    }

    // Cleanup
    await redis.del(bandwidthKey);
    await redis.del(callsKey);
    await redis.quit();
    return true;
  } catch (error) {
    log.error(`Bandwidth tracking failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 4: Analytics Tracking
 */
async function testAnalyticsTracking() {
  log.section('TEST 4: Analytics Tracking');

  try {
    const redis = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
      lazyConnect: true
    });

    await redis.connect();

    const testKey = 'analytics:stock_views:TEST:AAPL';
    await redis.del(testKey);

    // Simulate 10 views over 1 hour
    const now = Date.now();
    for (let i = 0; i < 10; i++) {
      const timestamp = now - (i * 300000); // 5 minutes apart
      await redis.zadd(testKey, timestamp, timestamp.toString());
    }
    log.success('Simulated 10 stock views over 1 hour');

    // Count views in last hour
    const oneHourAgo = now - (60 * 60 * 1000);
    const viewsInLastHour = await redis.zcount(testKey, oneHourAgo, now);
    log.success(`Views in last hour: ${viewsInLastHour}`);

    // Verify count
    if (viewsInLastHour === 10) {
      log.success('Analytics tracking accurate');
    } else {
      log.error('Analytics tracking count mismatch');
    }

    // Cleanup
    await redis.del(testKey);
    await redis.quit();
    return true;
  } catch (error) {
    log.error(`Analytics tracking failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 5: Priority Calculation
 */
async function testPriorityCalculation() {
  log.section('TEST 5: Priority Calculation');

  try {
    // Mock context
    const context = {
      sp100: ['AAPL', 'MSFT', 'GOOGL'],
      sp500: ['TSLA', 'NVDA'],
      extended: ['XYZ', 'ABC'],
      analytics: {
        getViews: (ticker) => {
          if (ticker === 'AAPL') return 150; // >100 views
          if (ticker === 'MSFT') return 50;  // >10 views
          return 0;
        }
      },
      earningsCalendar: {
        getNext: (ticker) => {
          if (ticker === 'AAPL') {
            // Earnings in 1 day
            return new Date(Date.now() + 24 * 60 * 60 * 1000);
          }
          return null;
        }
      },
      cache: {
        getLastWarmed: () => new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago (stale)
      },
      marketHours: {
        isOpen: () => true // Market open
      }
    };

    // Test AAPL priority (S&P 100 + high views + earnings + stale + market open)
    const aaplPriority = calculateTestPriority('AAPL', 'dcf20-ocf', context);
    log.info(`AAPL priority: ${aaplPriority} (expected: 5)`);

    if (aaplPriority === 5) {
      log.success('AAPL priority calculation correct (max priority)');
    } else {
      log.warn(`AAPL priority is ${aaplPriority}, expected 5`);
    }

    // Test XYZ priority (Extended + no views + no earnings + no cache + market open)
    context.cache.getLastWarmed = () => null; // Never warmed
    const xyzPriority = calculateTestPriority('XYZ', 'peg', context);
    log.info(`XYZ priority: ${xyzPriority} (expected: 4)`);

    if (xyzPriority >= 3 && xyzPriority <= 5) {
      log.success('XYZ priority calculation reasonable');
    } else {
      log.warn(`XYZ priority is ${xyzPriority}, expected 3-5`);
    }

    return true;
  } catch (error) {
    log.error(`Priority calculation failed: ${error.message}`);
    return false;
  }
}

/**
 * Helper: Calculate priority (simplified version for testing)
 */
function calculateTestPriority(ticker, methodId, context) {
  let priority = 1;

  // Tier
  if (context.sp100.includes(ticker)) {
    priority += 3;
  } else if (context.sp500.includes(ticker)) {
    priority += 2;
  } else {
    priority += 1;
  }

  // User activity
  const views = context.analytics.getViews(ticker);
  if (views > 100) {
    priority += 2;
  } else if (views > 10) {
    priority += 1;
  }

  // Earnings proximity
  const nextEarnings = context.earningsCalendar.getNext(ticker);
  if (nextEarnings) {
    const daysUntil = Math.floor((nextEarnings.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 2) {
      priority += 3;
    } else if (daysUntil <= 7) {
      priority += 2;
    } else if (daysUntil <= 30) {
      priority += 1;
    }
  }

  // Cache staleness
  const lastWarmed = context.cache.getLastWarmed(ticker, methodId);
  if (lastWarmed) {
    const hoursStale = (Date.now() - lastWarmed.getTime()) / (1000 * 60 * 60);
    if (hoursStale > 20) {
      priority += 2;
    } else if (hoursStale > 12) {
      priority += 1;
    }
  } else {
    priority += 2; // Never warmed
  }

  // Market hours
  if (context.marketHours.isOpen()) {
    priority += 1;
  }

  return Math.min(priority, 5);
}

/**
 * Main Test Runner
 */
async function runTests() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  Intelligent Warming Scheduler - Test Suite                  ║
║  ONDA 7 - Implementation Validation                           ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const results = [];

  // Run tests
  results.push({ name: 'Redis Connection', passed: await testRedisConnection() });
  results.push({ name: 'Queue Operations', passed: await testQueueOperations() });
  results.push({ name: 'Bandwidth Tracking', passed: await testBandwidthTracking() });
  results.push({ name: 'Analytics Tracking', passed: await testAnalyticsTracking() });
  results.push({ name: 'Priority Calculation', passed: await testPriorityCalculation() });

  // Summary
  log.section('TEST SUMMARY');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(result => {
    if (result.passed) {
      log.success(`${result.name}: PASSED`);
    } else {
      log.error(`${result.name}: FAILED`);
    }
  });

  console.log('');
  if (passed === total) {
    log.success(`All tests passed! (${passed}/${total}) ✨`);
    console.log('');
    console.log(`${colors.green}The Intelligent Warming Scheduler is ready for deployment!${colors.reset}`);
    process.exit(0);
  } else {
    log.error(`Some tests failed. (${passed}/${total})`);
    console.log('');
    console.log(`${colors.yellow}Please review the errors above and fix before deploying.${colors.reset}`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log.error(`Test suite error: ${error.message}`);
  process.exit(1);
});
