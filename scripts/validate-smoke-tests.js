#!/usr/bin/env node

import http from 'http';

async function fetchAPI(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('🧪 Running Smoke Test Validations...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: API returns real provider
  console.log('Test 1: API returns real provider (not demo)');
  try {
    const response = await fetchAPI('http://localhost:3001/api/v2/market-data/stocks/AAPL/price');
    
    if (response.success && response.data && response.data.provider) {
      const provider = response.data.provider;
      const isRealProvider = /finnhub|twelveData|fmp|alphaVantage/.test(provider);
      
      if (isRealProvider && provider !== 'demo') {
        console.log(`✅ PASS - Provider: ${provider}`);
        passed++;
      } else {
        console.log(`❌ FAIL - Invalid provider: ${provider}`);
        failed++;
      }
    } else {
      console.log('❌ FAIL - Invalid response structure');
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failed++;
  }
  
  console.log('\n---\n');
  
  // Test 2: Frontend is accessible
  console.log('Test 2: Frontend is accessible');
  try {
    await fetchAPI('http://localhost:3000/');
    console.log('✅ PASS - Frontend responding');
    passed++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failed++;
  }
  
  console.log('\n---\n');
  
  // Test 3: Health check
  console.log('Test 3: Health check endpoint');
  try {
    const health = await fetchAPI('http://localhost:3001/api/health');
    if (health.status === 'healthy') {
      console.log('✅ PASS - Health check OK');
      passed++;
    } else {
      console.log(`❌ FAIL - Health status: ${health.status}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failed++;
  }
  
  console.log('\n---\n');
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('\n✅ SMOKE TEST OK');
    process.exit(0);
  } else {
    console.log('\n❌ SMOKE TEST FAILED');
    process.exit(1);
  }
}

runTests();