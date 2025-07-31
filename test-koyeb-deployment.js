#!/usr/bin/env node

/**
 * Test script to verify Koyeb deployment
 * Run this after deploying to check all endpoints
 */

const axios = require('axios').default;

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://jsg00k40sgo0k4swsoc4gcsg.128.140.45.28.sslip.io';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://alfalyzerpro4.vercel.app';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Test endpoints
const endpoints = [
  { path: '/health', method: 'GET', description: 'Health Check' },
  { path: '/api/health', method: 'GET', description: 'API Health Check' },
  { path: '/api/market-data/test', method: 'GET', description: 'Market Data Test' },
  { path: '/api/alerts/notifications', method: 'GET', description: 'Alerts Notifications' },
  { path: '/', method: 'GET', description: 'Root Endpoint' }
];

async function testEndpoint(endpoint) {
  const url = `${BACKEND_URL}${endpoint.path}`;
  console.log(`\n${colors.blue}Testing: ${endpoint.description}${colors.reset}`);
  console.log(`URL: ${url}`);
  
  try {
    const response = await axios({
      method: endpoint.method,
      url: url,
      timeout: 10000,
      headers: {
        'Origin': FRONTEND_URL,
        'Accept': 'application/json'
      }
    });
    
    console.log(`${colors.green}✅ Success${colors.reset} - Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Failed${colors.reset}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log('Error:', error.response.data);
    } else if (error.request) {
      console.log('No response received:', error.message);
    } else {
      console.log('Error:', error.message);
    }
    return false;
  }
}

async function testCORS() {
  console.log(`\n${colors.blue}Testing CORS Configuration${colors.reset}`);
  const url = `${BACKEND_URL}/api/health`;
  
  try {
    // Test preflight request
    const response = await axios({
      method: 'OPTIONS',
      url: url,
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type'
      }
    });
    
    const corsHeaders = {
      'access-control-allow-origin': response.headers['access-control-allow-origin'],
      'access-control-allow-credentials': response.headers['access-control-allow-credentials'],
      'access-control-allow-methods': response.headers['access-control-allow-methods']
    };
    
    console.log(`${colors.green}✅ CORS Headers Present${colors.reset}`);
    console.log('CORS Configuration:', corsHeaders);
    
    if (corsHeaders['access-control-allow-origin'] === '*' || 
        corsHeaders['access-control-allow-origin']?.includes(FRONTEND_URL)) {
      console.log(`${colors.green}✅ Frontend URL allowed${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️  Frontend URL might not be allowed${colors.reset}`);
    }
    
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ CORS test failed${colors.reset}`);
    console.log('Error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log(`${colors.blue}=== Koyeb Deployment Test ===${colors.reset}`);
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);
  
  let successCount = 0;
  let totalTests = endpoints.length + 1; // +1 for CORS test
  
  // Test CORS first
  if (await testCORS()) {
    successCount++;
  }
  
  // Test each endpoint
  for (const endpoint of endpoints) {
    if (await testEndpoint(endpoint)) {
      successCount++;
    }
  }
  
  // Summary
  console.log(`\n${colors.blue}=== Test Summary ===${colors.reset}`);
  console.log(`Total tests: ${totalTests}`);
  console.log(`${colors.green}Passed: ${successCount}${colors.reset}`);
  console.log(`${colors.red}Failed: ${totalTests - successCount}${colors.reset}`);
  
  if (successCount === totalTests) {
    console.log(`\n${colors.green}🎉 All tests passed! Deployment is working correctly.${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}⚠️  Some tests failed. Check the logs above.${colors.reset}`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});