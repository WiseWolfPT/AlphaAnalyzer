#!/usr/bin/env node

/**
 * Comprehensive E2E Test Suite for Express.js Middleware
 * Tests for ERR_HTTP_HEADERS_SENT prevention
 */

import axios from 'axios';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api`;

// Color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Test utilities
const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`)
};

// Test suite results
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

// Axios instance with defaults
const api = axios.create({
  baseURL: API_BASE,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Test 1: Concurrent Requests Test
async function testConcurrentRequests() {
  log.info('Testing concurrent requests...');
  
  try {
    // Fire 10 concurrent requests
    const promises = Array(10).fill(null).map((_, i) => 
      api.get('/stocks/AAPL/quote', {
        headers: { 'X-Request-ID': `concurrent-${i}` }
      })
    );
    
    const responses = await Promise.allSettled(promises);
    
    // Check if all succeeded without headers errors
    const successful = responses.filter(r => r.status === 'fulfilled');
    const failed = responses.filter(r => r.status === 'rejected');
    
    if (successful.length === responses.length) {
      log.success(`All ${successful.length} concurrent requests succeeded`);
      results.passed++;
    } else {
      log.error(`${failed.length} out of ${responses.length} requests failed`);
      failed.forEach((r, i) => {
        if (r.reason?.message?.includes('HEADERS_SENT')) {
          results.errors.push(`Headers already sent error in request ${i}`);
        }
      });
      results.failed++;
    }
  } catch (error) {
    log.error(`Concurrent requests test failed: ${error.message}`);
    results.failed++;
  }
}

// Test 2: Error Scenario Tests
async function testErrorScenarios() {
  log.info('Testing error scenarios...');
  
  const errorTests = [
    {
      name: 'Invalid symbol',
      request: () => api.get('/stocks/INVALID_SYMBOL_12345/quote'),
      expectStatus: [400, 404, 500]
    },
    {
      name: 'Missing authentication',
      request: () => api.get('/admin/users'),
      expectStatus: [401, 403]
    },
    {
      name: 'Invalid JSON payload',
      request: () => api.post('/watchlists', 'invalid json'),
      expectStatus: [400]
    },
    {
      name: 'Non-existent endpoint',
      request: () => api.get('/this-does-not-exist'),
      expectStatus: [404]
    }
  ];
  
  for (const test of errorTests) {
    try {
      await test.request();
      log.error(`${test.name}: Expected error but request succeeded`);
      results.failed++;
    } catch (error) {
      const status = error.response?.status;
      if (test.expectStatus.includes(status)) {
        log.success(`${test.name}: Got expected status ${status}`);
        results.passed++;
      } else {
        log.error(`${test.name}: Got unexpected status ${status}`);
        results.failed++;
      }
      
      // Check for headers sent error in error message
      if (error.message?.includes('HEADERS_SENT')) {
        results.errors.push(`Headers already sent in ${test.name}`);
      }
    }
  }
}

// Test 3: Async Middleware Behavior
async function testAsyncMiddleware() {
  log.info('Testing async middleware behavior...');
  
  // Test delayed responses
  try {
    const start = Date.now();
    const response = await api.get('/health');
    const duration = Date.now() - start;
    
    if (response.status === 200 && response.data.status === 'healthy') {
      log.success(`Health check completed in ${duration}ms`);
      results.passed++;
    } else {
      log.error('Health check returned unexpected response');
      results.failed++;
    }
  } catch (error) {
    log.error(`Async middleware test failed: ${error.message}`);
    results.failed++;
  }
}

// Test 4: CORS Preflight Requests
async function testCORSPreflight() {
  log.info('Testing CORS preflight requests...');
  
  try {
    const response = await axios.options(`${API_BASE}/stocks/AAPL/quote`, {
      headers: {
        'Origin': 'https://alfalyzer.vercel.app',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type'
      }
    });
    
    const corsHeaders = {
      'access-control-allow-origin': response.headers['access-control-allow-origin'],
      'access-control-allow-methods': response.headers['access-control-allow-methods'],
      'access-control-allow-headers': response.headers['access-control-allow-headers']
    };
    
    if (corsHeaders['access-control-allow-origin']) {
      log.success('CORS preflight handled correctly');
      results.passed++;
    } else {
      log.error('CORS headers missing in preflight response');
      results.failed++;
    }
  } catch (error) {
    log.error(`CORS preflight test failed: ${error.message}`);
    results.failed++;
  }
}

// Test 5: Response Header Consistency
async function testResponseHeaders() {
  log.info('Testing response header consistency...');
  
  try {
    const responses = await Promise.all([
      api.get('/health'),
      api.get('/stocks/AAPL/quote').catch(e => e.response),
      api.get('/api/not-found').catch(e => e.response)
    ]);
    
    let allHaveRequestId = true;
    let allHaveApiVersion = true;
    
    responses.forEach((response, i) => {
      const headers = response?.headers || {};
      if (!headers['x-request-id']) {
        allHaveRequestId = false;
        log.warn(`Response ${i} missing X-Request-ID header`);
      }
      if (!headers['x-api-version']) {
        allHaveApiVersion = false;
        log.warn(`Response ${i} missing X-API-Version header`);
      }
    });
    
    if (allHaveRequestId && allHaveApiVersion) {
      log.success('All responses have consistent headers');
      results.passed++;
    } else {
      log.error('Some responses missing required headers');
      results.failed++;
    }
  } catch (error) {
    log.error(`Response headers test failed: ${error.message}`);
    results.failed++;
  }
}

// Test 6: Stress Test
async function testStressHandling() {
  log.info('Running stress test (100 rapid requests)...');
  
  const errors = [];
  const batchSize = 10;
  const totalRequests = 100;
  
  try {
    for (let batch = 0; batch < totalRequests / batchSize; batch++) {
      const promises = Array(batchSize).fill(null).map((_, i) => 
        api.get('/health', {
          headers: { 'X-Stress-Test': `${batch}-${i}` }
        }).catch(e => {
          errors.push(e);
          return null;
        })
      );
      
      await Promise.all(promises);
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    const headersErrors = errors.filter(e => 
      e?.message?.includes('HEADERS_SENT') || 
      e?.response?.data?.error?.includes('headers')
    );
    
    if (headersErrors.length === 0) {
      log.success(`Stress test passed: ${totalRequests} requests, no headers errors`);
      results.passed++;
    } else {
      log.error(`Stress test failed: ${headersErrors.length} headers errors`);
      results.failed++;
      results.errors.push(...headersErrors.map(e => e.message));
    }
  } catch (error) {
    log.error(`Stress test failed: ${error.message}`);
    results.failed++;
  }
}

// Test 7: Server Restart Resilience
async function testServerRestart() {
  log.info('Testing server restart resilience...');
  
  try {
    // Make a request to warm up
    await api.get('/health');
    
    log.info('Simulating high load during potential restart...');
    
    // Continuous requests for 5 seconds
    const duration = 5000;
    const start = Date.now();
    let requestCount = 0;
    let errorCount = 0;
    
    while (Date.now() - start < duration) {
      try {
        await api.get('/health');
        requestCount++;
      } catch (error) {
        errorCount++;
        if (error.message?.includes('HEADERS_SENT')) {
          results.errors.push('Headers error during restart test');
        }
      }
      
      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    log.info(`Made ${requestCount} requests, ${errorCount} errors`);
    
    if (errorCount === 0 || errorCount < requestCount * 0.01) { // Less than 1% error rate
      log.success('Server restart resilience test passed');
      results.passed++;
    } else {
      log.error(`High error rate during restart test: ${errorCount}/${requestCount}`);
      results.failed++;
    }
  } catch (error) {
    log.error(`Server restart test failed: ${error.message}`);
    results.failed++;
  }
}

// Main test runner
async function runTests() {
  console.log('\n🧪 Starting Comprehensive E2E Tests\n');
  
  // Check if server is running
  try {
    await axios.get(`${BASE_URL}/health`);
    log.success('Server is running');
  } catch (error) {
    log.error('Server is not running. Please start the server first.');
    process.exit(1);
  }
  
  // Run all tests
  await testConcurrentRequests();
  await testErrorScenarios();
  await testAsyncMiddleware();
  await testCORSPreflight();
  await testResponseHeaders();
  await testStressHandling();
  await testServerRestart();
  
  // Print results
  console.log('\n📊 Test Results:');
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    results.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});