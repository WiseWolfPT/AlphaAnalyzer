/**
 * Script to test Vercel proxy authentication
 * 
 * Usage: npm run test:vercel-proxy
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3000';
const PROXY_SECRET = process.env.VERCEL_PROXY_SECRET;

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

async function runTest(
  name: string, 
  testFn: () => Promise<{ passed: boolean; message: string; details?: any }>
) {
  console.log(`\n🧪 Running test: ${name}`);
  try {
    const result = await testFn();
    results.push({ test: name, ...result });
    console.log(result.passed ? `✅ PASSED` : `❌ FAILED`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   Details:`, result.details);
    }
  } catch (error) {
    results.push({
      test: name,
      passed: false,
      message: `Test threw error: ${error}`,
    });
    console.log(`❌ ERROR: ${error}`);
  }
}

// Test 1: Request without proxy headers
async function testWithoutProxyHeaders() {
  const response = await fetch(`${API_URL}/api/market-data/AAPL`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return {
    passed: response.status === 401,
    message: `Expected 401 without proxy headers, got ${response.status}`,
    details: { status: response.status },
  };
}

// Test 2: Request with Vercel proxy headers but no secret
async function testWithProxyHeadersNoSecret() {
  const response = await fetch(`${API_URL}/api/market-data/AAPL`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-vercel-id': 'test-request-id',
      'x-vercel-deployment-url': 'test.vercel.app',
      'x-forwarded-for': '1.2.3.4',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'test.vercel.app',
    },
  });

  const expectSuccess = !process.env.VERCEL_PROXY_REQUIRE_SECRET;
  return {
    passed: expectSuccess ? response.ok : response.status === 403,
    message: expectSuccess
      ? `Expected success without secret, got ${response.status}`
      : `Expected 403 when secret required, got ${response.status}`,
    details: { status: response.status },
  };
}

// Test 3: Request with proxy headers and valid secret
async function testWithProxyHeadersAndSecret() {
  if (!PROXY_SECRET) {
    return {
      passed: false,
      message: 'VERCEL_PROXY_SECRET not configured',
    };
  }

  const response = await fetch(`${API_URL}/api/market-data/AAPL`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-vercel-id': 'test-request-id',
      'x-vercel-deployment-url': 'test.vercel.app',
      'x-vercel-proxy-secret': PROXY_SECRET,
      'x-forwarded-for': '1.2.3.4',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'test.vercel.app',
    },
  });

  return {
    passed: response.ok,
    message: `Expected success with valid secret, got ${response.status}`,
    details: { 
      status: response.status,
      data: response.ok ? await response.json() : null,
    },
  };
}

// Test 4: Request with invalid deployment
async function testWithInvalidDeployment() {
  const allowedDeployments = process.env.VERCEL_ALLOWED_DEPLOYMENTS;
  if (!allowedDeployments || allowedDeployments.includes('*')) {
    return {
      passed: true,
      message: 'Deployment restrictions not configured or allows all',
    };
  }

  const response = await fetch(`${API_URL}/api/market-data/AAPL`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-vercel-id': 'test-request-id',
      'x-vercel-deployment-url': 'invalid.vercel.app',
      'x-vercel-proxy-secret': PROXY_SECRET || '',
      'x-forwarded-for': '1.2.3.4',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'invalid.vercel.app',
    },
  });

  return {
    passed: response.status === 403,
    message: `Expected 403 for invalid deployment, got ${response.status}`,
    details: { status: response.status },
  };
}

// Test 5: Rate limiting
async function testRateLimiting() {
  const requests = [];
  const deployment = 'rate-test.vercel.app';
  
  // Make 100 rapid requests
  for (let i = 0; i < 100; i++) {
    requests.push(
      fetch(`${API_URL}/api/market-data/AAPL`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-vercel-id': `test-request-${i}`,
          'x-vercel-deployment-url': deployment,
          'x-vercel-proxy-secret': PROXY_SECRET || '',
          'x-forwarded-for': '1.2.3.4',
          'x-forwarded-proto': 'https',
          'x-forwarded-host': deployment,
        },
      })
    );
  }

  const responses = await Promise.all(requests);
  const rateLimited = responses.some(r => r.status === 429);

  return {
    passed: true, // Rate limiting is optional
    message: rateLimited
      ? 'Rate limiting is active'
      : 'Rate limiting not triggered (may be disabled or limit not reached)',
    details: {
      totalRequests: responses.length,
      successfulRequests: responses.filter(r => r.ok).length,
      rateLimitedRequests: responses.filter(r => r.status === 429).length,
    },
  };
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Testing Vercel Proxy Authentication');
  console.log('=====================================');
  console.log(`API URL: ${API_URL}`);
  console.log(`Proxy Secret Configured: ${!!PROXY_SECRET}`);
  console.log(`Proxy Auth Enabled: ${process.env.ENABLE_VERCEL_PROXY_AUTH}`);
  console.log(`Proxy Bypass Auth: ${process.env.VERCEL_PROXY_BYPASS_AUTH}`);
  console.log(`Require Secret: ${process.env.VERCEL_PROXY_REQUIRE_SECRET}`);
  console.log('=====================================');

  await runTest('Without proxy headers', testWithoutProxyHeaders);
  await runTest('With proxy headers (no secret)', testWithProxyHeadersNoSecret);
  await runTest('With proxy headers and secret', testWithProxyHeadersAndSecret);
  await runTest('With invalid deployment', testWithInvalidDeployment);
  await runTest('Rate limiting', testRateLimiting);

  // Summary
  console.log('\n📊 Test Summary');
  console.log('=====================================');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Total tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`- ${r.test}: ${r.message}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});