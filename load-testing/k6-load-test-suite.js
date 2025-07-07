/**
 * ALFALYZER LOAD TESTING SUITE
 * Progressive Load Testing from 1 user to 200 user spike
 * 
 * CRITICAL FINDINGS FROM ANALYSIS:
 * - Rate limits: 5-30 req/min (will trigger at 10 users)
 * - SQLite bottleneck at 20-30 concurrent writes
 * - Memory grows linearly with connections
 * - Complex middleware stack adds 20-50ms latency
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';

// Custom metrics for detailed analysis
export const responseTime = new Trend('response_time', true);
export const errorRate = new Rate('error_rate');
export const rateLimitHits = new Counter('rate_limit_hits');
export const dbErrorRate = new Rate('db_error_rate');
export const concurrentUsers = new Gauge('concurrent_users');

// Test configuration based on analysis findings
export const options = {
  scenarios: {
    // BASELINE: 1 User Control Test
    baseline: {
      executor: 'constant-vus',
      vus: 1,
      duration: '2m',
      tags: { test_type: 'baseline' },
      exec: 'baselineTest',
    },
    
    // PHASE 1: 10 Users - Expect rate limit issues
    phase1_10users: {
      executor: 'constant-vus',
      vus: 10,
      duration: '10m',
      startTime: '3m',
      tags: { test_type: 'phase1_10users' },
      exec: 'standardUserFlow',
    },
    
    // PHASE 2: 50 Users - Expect severe bottlenecks
    phase2_50users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '10m', target: 50 },
        { duration: '2m', target: 0 },
      ],
      startTime: '15m',
      tags: { test_type: 'phase2_50users' },
      exec: 'standardUserFlow',
    },
    
    // PHASE 3: 100 Users - Target capacity test
    phase3_100users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '3m', target: 100 },
        { duration: '15m', target: 100 },
        { duration: '3m', target: 0 },
      ],
      startTime: '30m',
      tags: { test_type: 'phase3_100users' },
      exec: 'lightUserFlow', // Lighter flow to avoid immediate rate limits
    },
    
    // PHASE 4: 200 User Spike Test
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 200 }, // Sudden spike
        { duration: '5m', target: 200 },   // Sustained spike
        { duration: '1m', target: 0 },     // Quick recovery
      ],
      startTime: '52m',
      tags: { test_type: 'spike_test' },
      exec: 'lightUserFlow',
    },
    
    // PHASE 5: 50 User Soak Test (2 hours)
    soak_test: {
      executor: 'constant-vus',
      vus: 50,
      duration: '2h',
      startTime: '60m',
      tags: { test_type: 'soak_test' },
      exec: 'soakTestFlow',
    },
  },
  
  thresholds: {
    // Performance thresholds based on analysis
    http_req_duration: ['p(95)<2000'], // 95% under 2s
    http_req_failed: ['rate<0.1'],     // Less than 10% errors
    response_time: ['p(90)<1500'],     // 90% under 1.5s
    error_rate: ['rate<0.05'],         // Less than 5% error rate
    rate_limit_hits: ['count<100'],    // Expect some rate limiting
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const API_KEY = __ENV.API_KEY || 'test-key';

// Test data for realistic scenarios
const STOCK_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'BRK.B'];
const SEARCH_TERMS = ['apple', 'microsoft', 'tech', 'energy', 'finance'];

// BASELINE TEST: Establish performance baseline with single user
export function baselineTest() {
  const startTime = Date.now();
  
  // Health check
  let response = http.get(`${BASE_URL}/health`);
  recordMetrics(response, 'health');
  
  // Basic stock list
  response = http.get(`${BASE_URL}/api/stocks?limit=20`);
  recordMetrics(response, 'stocks_list');
  
  // Individual stock lookup
  const symbol = STOCK_SYMBOLS[Math.floor(Math.random() * STOCK_SYMBOLS.length)];
  response = http.get(`${BASE_URL}/api/stocks/${symbol}`);
  recordMetrics(response, 'stock_detail');
  
  // Market indices (simulated real-time data)
  response = http.get(`${BASE_URL}/api/market-indices`);
  recordMetrics(response, 'market_indices');
  
  sleep(2); // Realistic user behavior
}

// STANDARD USER FLOW: Typical user interaction pattern
export function standardUserFlow() {
  const startTime = Date.now();
  concurrentUsers.add(1);
  
  try {
    // 1. Landing page health check
    let response = http.get(`${BASE_URL}/health`);
    recordMetrics(response, 'health');
    
    if (response.status !== 200) {
      console.error(`Health check failed: ${response.status}`);
      return;
    }
    
    sleep(1);
    
    // 2. Load stock dashboard
    response = http.get(`${BASE_URL}/api/stocks?limit=50`);
    recordMetrics(response, 'dashboard_stocks');
    
    if (isRateLimited(response)) {
      rateLimitHits.add(1);
      sleep(Math.random() * 10); // Random backoff
      return;
    }
    
    sleep(2);
    
    // 3. Search for stocks (triggers complex database queries)
    const searchTerm = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
    response = http.get(`${BASE_URL}/api/stocks/search?q=${searchTerm}&limit=10`);
    recordMetrics(response, 'stock_search');
    
    if (isRateLimited(response)) {
      rateLimitHits.add(1);
      sleep(Math.random() * 10);
      return;
    }
    
    sleep(1);
    
    // 4. View specific stock details
    const symbol = STOCK_SYMBOLS[Math.floor(Math.random() * STOCK_SYMBOLS.length)];
    response = http.get(`${BASE_URL}/api/stocks/${symbol}`);
    recordMetrics(response, 'stock_detail');
    
    sleep(2);
    
    // 5. Check market indices
    response = http.get(`${BASE_URL}/api/market-indices`);
    recordMetrics(response, 'market_data');
    
    sleep(3);
    
    // 6. Load earnings data
    response = http.get(`${BASE_URL}/api/earnings?limit=20`);
    recordMetrics(response, 'earnings_data');
    
    if (isRateLimited(response)) {
      rateLimitHits.add(1);
    }
    
  } catch (error) {
    console.error(`User flow error: ${error}`);
    errorRate.add(1);
  } finally {
    concurrentUsers.add(-1);
    sleep(Math.random() * 5); // Random user think time
  }
}

// LIGHT USER FLOW: Reduced load for higher concurrency tests
export function lightUserFlow() {
  const startTime = Date.now();
  concurrentUsers.add(1);
  
  try {
    // Lighter flow to avoid immediate rate limiting
    let response = http.get(`${BASE_URL}/health`);
    recordMetrics(response, 'health');
    
    sleep(3);
    
    // Single stock lookup only
    const symbol = STOCK_SYMBOLS[Math.floor(Math.random() * STOCK_SYMBOLS.length)];
    response = http.get(`${BASE_URL}/api/stocks/${symbol}`);
    recordMetrics(response, 'stock_detail');
    
    if (isRateLimited(response)) {
      rateLimitHits.add(1);
    }
    
  } catch (error) {
    errorRate.add(1);
  } finally {
    concurrentUsers.add(-1);
    sleep(Math.random() * 10); // Longer think time
  }
}

// SOAK TEST FLOW: Long-running test for memory leaks
export function soakTestFlow() {
  const startTime = Date.now();
  
  // Very light operations for endurance testing
  const response = http.get(`${BASE_URL}/health`);
  recordMetrics(response, 'soak_health');
  
  // Monitor for memory leaks and performance degradation
  const duration = Date.now() - startTime;
  if (duration > 60000) { // After 1 minute, add stock checks
    const symbol = STOCK_SYMBOLS[Math.floor(Math.random() * STOCK_SYMBOLS.length)];
    const stockResponse = http.get(`${BASE_URL}/api/stocks/${symbol}`);
    recordMetrics(stockResponse, 'soak_stock');
  }
  
  sleep(5); // Gentle load for endurance
}

// UTILITY FUNCTIONS
function recordMetrics(response, endpoint) {
  const duration = response.timings.duration;
  responseTime.add(duration, { endpoint });
  
  const success = check(response, {
    [`${endpoint}_status_200`]: (r) => r.status === 200,
    [`${endpoint}_response_time_ok`]: (r) => r.timings.duration < 5000,
  });
  
  if (!success) {
    errorRate.add(1, { endpoint });
    
    // Check for database errors
    if (response.body && response.body.includes('database')) {
      dbErrorRate.add(1, { endpoint });
    }
  }
  
  // Log slow responses for analysis
  if (duration > 2000) {
    console.warn(`Slow response: ${endpoint} took ${duration}ms`);
  }
}

function isRateLimited(response) {
  return response.status === 429 || 
         (response.body && response.body.includes('rate limit')) ||
         (response.body && response.body.includes('Too many requests'));
}

// Test teardown
export function teardown(data) {
  console.log('=== LOAD TEST SUMMARY ===');
  console.log(`Test Duration: ${__ENV.TEST_DURATION || 'Variable'}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log('Expected Issues Based on Analysis:');
  console.log('- Rate limiting at 10+ users (5-30 req/min limits)');
  console.log('- SQLite bottleneck at 20-30 concurrent writes');
  console.log('- Memory growth with WebSocket connections');
  console.log('- Middleware latency accumulation');
}