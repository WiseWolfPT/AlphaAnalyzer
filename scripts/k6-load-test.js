/**
 * K6 Load Testing Script for Alfalyzer
 * Tests the system with 200+ concurrent users
 * Simulates real user behaviors including authentication, API calls, and navigation
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
export let errorRate = new Rate('errors');
export let responseTime = new Trend('response_time', true);
export let apiCalls = new Counter('api_calls');
export let authFailures = new Rate('auth_failures');

// Test configuration
export const options = {
  stages: [
    // Ramp up to 50 users over 2 minutes
    { duration: '2m', target: 50 },
    // Ramp up to 200 users over 5 minutes
    { duration: '5m', target: 200 },
    // Stay at 200 users for 10 minutes (main load test)
    { duration: '10m', target: 200 },
    // Peak test: surge to 300 users for 2 minutes
    { duration: '2m', target: 300 },
    // Back to 200 users for 5 minutes
    { duration: '5m', target: 200 },
    // Ramp down to 0 over 2 minutes
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    // Error rate should be below 1%
    'errors': ['rate<0.01'],
    // 95% of requests should be below 2000ms
    'http_req_duration': ['p(95)<2000'],
    // 99% of requests should be below 5000ms
    'http_req_duration': ['p(99)<5000'],
    // Average response time should be below 1000ms
    'response_time': ['avg<1000'],
    // Authentication failure rate should be below 0.1%
    'auth_failures': ['rate<0.001'],
  },
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = __ENV.API_URL || 'http://localhost:3001';

// Test data
const TEST_USERS = [
  { email: 'user1@test.com', password: 'testpass123' },
  { email: 'user2@test.com', password: 'testpass123' },
  { email: 'user3@test.com', password: 'testpass123' },
  { email: 'admin@test.com', password: 'adminpass123' },
];

const STOCK_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'AMD'];

// Helper functions
function getRandomUser() {
  return TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
}

function getRandomSymbol() {
  return STOCK_SYMBOLS[Math.floor(Math.random() * STOCK_SYMBOLS.length)];
}

function authenticateUser(user) {
  const loginResponse = http.post(`${API_URL}/api/auth/login`, JSON.stringify({
    email: user.email,
    password: user.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const success = check(loginResponse, {
    'login successful': (r) => r.status === 200,
    'login response time < 2s': (r) => r.timings.duration < 2000,
  });

  if (!success) {
    authFailures.add(1);
    return null;
  }

  let token = null;
  try {
    const loginData = JSON.parse(loginResponse.body);
    token = loginData.access_token || loginData.token;
  } catch (e) {
    console.error('Failed to parse login response:', e);
    authFailures.add(1);
    return null;
  }

  return token;
}

function makeAuthenticatedRequest(url, token, method = 'GET', body = null) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  let response;
  const startTime = new Date().getTime();

  try {
    if (method === 'POST') {
      response = http.post(url, body ? JSON.stringify(body) : '', params);
    } else {
      response = http.get(url, params);
    }
    
    const endTime = new Date().getTime();
    responseTime.add(endTime - startTime);
    apiCalls.add(1);

    if (response.status >= 400) {
      errorRate.add(1);
    }

  } catch (e) {
    console.error(`Request failed: ${e}`);
    errorRate.add(1);
    return null;
  }

  return response;
}

// Main test scenario
export default function() {
  const user = getRandomUser();
  let token = null;

  group('User Authentication', function() {
    token = authenticateUser(user);
    if (!token) {
      console.log(`Authentication failed for ${user.email}`);
      return;
    }
    sleep(1);
  });

  if (!token) return; // Skip test if authentication failed

  group('Dashboard Access', function() {
    const dashboardResponse = makeAuthenticatedRequest(`${API_URL}/api/dashboard/stats`, token);
    check(dashboardResponse, {
      'dashboard loaded': (r) => r && r.status === 200,
      'dashboard response time < 1s': (r) => r && r.timings.duration < 1000,
    });
    sleep(2);
  });

  group('Stock Data Requests', function() {
    const symbol = getRandomSymbol();
    
    // Get stock basic info
    const stockResponse = makeAuthenticatedRequest(`${API_URL}/api/stocks/${symbol}`, token);
    check(stockResponse, {
      'stock data retrieved': (r) => r && r.status === 200,
      'stock response time < 2s': (r) => r && r.timings.duration < 2000,
    });

    sleep(1);

    // Get price data
    const priceResponse = makeAuthenticatedRequest(`${API_URL}/api/stocks/${symbol}/price`, token);
    check(priceResponse, {
      'price data retrieved': (r) => r && r.status === 200,
      'price response time < 3s': (r) => r && r.timings.duration < 3000,
    });

    sleep(1);
  });

  group('Portfolio Operations', function() {
    // Get user portfolios
    const portfoliosResponse = makeAuthenticatedRequest(`${API_URL}/api/portfolios`, token);
    check(portfoliosResponse, {
      'portfolios loaded': (r) => r && r.status === 200,
      'portfolios response time < 1s': (r) => r && r.timings.duration < 1000,
    });

    sleep(1);

    // Create a test portfolio (simulate user activity)
    if (Math.random() < 0.1) { // 10% chance to create portfolio
      const createPortfolioResponse = makeAuthenticatedRequest(
        `${API_URL}/api/portfolios`, 
        token, 
        'POST',
        {
          name: `Test Portfolio ${Math.floor(Math.random() * 1000)}`,
          description: 'Load test portfolio',
        }
      );
      check(createPortfolioResponse, {
        'portfolio created': (r) => r && (r.status === 200 || r.status === 201),
      });
    }

    sleep(1);
  });

  group('Watchlist Operations', function() {
    // Get watchlists
    const watchlistsResponse = makeAuthenticatedRequest(`${API_URL}/api/watchlists`, token);
    check(watchlistsResponse, {
      'watchlists loaded': (r) => r && r.status === 200,
      'watchlists response time < 1s': (r) => r && r.timings.duration < 1000,
    });

    sleep(1);

    // Add symbol to watchlist (simulate user activity)
    if (Math.random() < 0.2) { // 20% chance to add to watchlist
      const symbol = getRandomSymbol();
      const addToWatchlistResponse = makeAuthenticatedRequest(
        `${API_URL}/api/watchlists/items`, 
        token, 
        'POST',
        {
          symbol: symbol,
          watchlist_id: 1, // Assume default watchlist exists
        }
      );
      check(addToWatchlistResponse, {
        'symbol added to watchlist': (r) => r && (r.status === 200 || r.status === 201),
      });
    }

    sleep(1);
  });

  group('API Cache Performance', function() {
    // Test cached vs non-cached responses
    const symbol = getRandomSymbol();
    
    // First request (likely cache miss)
    const firstResponse = makeAuthenticatedRequest(`${API_URL}/api/stocks/${symbol}/fundamentals`, token);
    const firstTime = firstResponse ? firstResponse.timings.duration : 0;
    
    sleep(0.5);
    
    // Second request (should be cached)
    const secondResponse = makeAuthenticatedRequest(`${API_URL}/api/stocks/${symbol}/fundamentals`, token);
    const secondTime = secondResponse ? secondResponse.timings.duration : 0;
    
    check({ firstTime, secondTime }, {
      'cache improves performance': ({ firstTime, secondTime }) => secondTime <= firstTime,
      'cached response < 500ms': ({ secondTime }) => secondTime < 500,
    });

    sleep(1);
  });

  group('Admin Functions', function() {
    // Only test admin functions for admin users
    if (user.email.includes('admin')) {
      const adminStatsResponse = makeAuthenticatedRequest(`${API_URL}/api/admin/system-stats`, token);
      check(adminStatsResponse, {
        'admin stats accessible': (r) => r && r.status === 200,
      });

      sleep(1);

      const usersResponse = makeAuthenticatedRequest(`${API_URL}/api/admin/users`, token);
      check(usersResponse, {
        'admin users list accessible': (r) => r && r.status === 200,
      });

      sleep(1);
    }
  });

  group('Error Handling', function() {
    // Test invalid stock symbol
    const invalidResponse = makeAuthenticatedRequest(`${API_URL}/api/stocks/INVALID123`, token);
    check(invalidResponse, {
      'invalid stock handled gracefully': (r) => r && (r.status === 404 || r.status === 400),
    });

    sleep(1);

    // Test rate limiting (make many quick requests)
    for (let i = 0; i < 5; i++) {
      makeAuthenticatedRequest(`${API_URL}/api/stocks/AAPL/price`, token);
      sleep(0.1);
    }
  });

  // Random think time to simulate real user behavior
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

// Setup function (runs once per VU)
export function setup() {
  console.log(`Starting load test against ${BASE_URL} and ${API_URL}`);
  console.log('Test configuration:');
  console.log('- Max users: 300');
  console.log('- Main load: 200 users for 10 minutes');
  console.log('- Thresholds: <1% error rate, p95 < 2s, avg < 1s');
  
  // Test connectivity
  const healthCheck = http.get(`${API_URL}/api/health`);
  if (healthCheck.status !== 200) {
    console.error(`Health check failed: ${healthCheck.status}`);
    throw new Error('Backend is not responding');
  }
  
  console.log('Health check passed. Starting load test...');
}

// Teardown function (runs once after all VUs complete)
export function teardown(data) {
  console.log('Load test completed');
  console.log('Check the metrics for detailed results');
}

// Options for different test scenarios
export const lightLoad = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '2m', target: 10 },
    { duration: '1m', target: 0 },
  ],
};

export const heavyLoad = {
  stages: [
    { duration: '3m', target: 100 },
    { duration: '5m', target: 500 },
    { duration: '10m', target: 500 },
    { duration: '3m', target: 0 },
  ],
  thresholds: {
    'errors': ['rate<0.05'], // Allow higher error rate for stress test
    'http_req_duration': ['p(95)<5000'],
  },
};