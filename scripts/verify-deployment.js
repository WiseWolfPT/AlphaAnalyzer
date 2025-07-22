#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Tests all services to ensure the full stack is working correctly
 */

const https = require('https');
const http = require('http');

// Configuration
const FRONTEND_URL = 'https://alfalyzer.vercel.app';
const BACKEND_URL = 'https://alfalyzer-4rjhp-koyeb.app';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    }).on('error', reject);
  });
}

// Test functions
async function testFrontend() {
  console.log(`\n${colors.cyan}Testing Frontend (Vercel)...${colors.reset}`);
  
  try {
    const response = await makeRequest(FRONTEND_URL);
    
    if (response.statusCode === 200) {
      console.log(`${colors.green}✓ Frontend is accessible${colors.reset}`);
      console.log(`  Status: ${response.statusCode}`);
      console.log(`  Content-Type: ${response.headers['content-type']}`);
      
      // Check if it's actually serving HTML
      if (response.data.includes('<!DOCTYPE html>')) {
        console.log(`${colors.green}✓ Frontend is serving HTML content${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠ Frontend response doesn't look like HTML${colors.reset}`);
      }
    } else {
      console.log(`${colors.red}✗ Frontend returned status ${response.statusCode}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ Frontend test failed: ${error.message}${colors.reset}`);
  }
}

async function testBackendHealth() {
  console.log(`\n${colors.cyan}Testing Backend Health...${colors.reset}`);
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/health`);
    
    if (response.statusCode === 200) {
      console.log(`${colors.green}✓ Backend health check passed${colors.reset}`);
      
      try {
        const health = JSON.parse(response.data);
        console.log(`  Status: ${health.status}`);
        console.log(`  Database: ${health.database}`);
        console.log(`  Timestamp: ${new Date(health.timestamp).toLocaleString()}`);
      } catch (e) {
        console.log(`  Response: ${response.data}`);
      }
    } else {
      console.log(`${colors.red}✗ Backend health check returned status ${response.statusCode}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ Backend health test failed: ${error.message}${colors.reset}`);
  }
}

async function testStockEndpoint() {
  console.log(`\n${colors.cyan}Testing Stock Data Endpoint...${colors.reset}`);
  
  const testSymbols = ['AAPL', 'GOOGL', 'MSFT'];
  
  for (const symbol of testSymbols) {
    try {
      const response = await makeRequest(`${BACKEND_URL}/api/stocks/${symbol}`);
      
      if (response.statusCode === 200) {
        const stock = JSON.parse(response.data);
        
        if (stock.symbol === symbol && typeof stock.price === 'number') {
          console.log(`${colors.green}✓ ${symbol}: $${stock.price} (${stock.change >= 0 ? '+' : ''}${stock.change}%)${colors.reset}`);
        } else {
          console.log(`${colors.yellow}⚠ ${symbol}: Invalid data structure${colors.reset}`);
        }
      } else {
        console.log(`${colors.red}✗ ${symbol}: Status ${response.statusCode}${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}✗ ${symbol}: ${error.message}${colors.reset}`);
    }
  }
}

async function testBatchQuotes() {
  console.log(`\n${colors.cyan}Testing Batch Quotes Endpoint...${colors.reset}`);
  
  try {
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
    const url = `${BACKEND_URL}/api/stocks/batch?symbols=${symbols.join(',')}`;
    const response = await makeRequest(url);
    
    if (response.statusCode === 200) {
      const quotes = JSON.parse(response.data);
      
      if (Array.isArray(quotes) && quotes.length > 0) {
        console.log(`${colors.green}✓ Batch quotes returned ${quotes.length} stocks${colors.reset}`);
        
        // Check data quality
        const validQuotes = quotes.filter(q => q.symbol && typeof q.price === 'number');
        console.log(`  Valid quotes: ${validQuotes.length}/${quotes.length}`);
        
        if (validQuotes.length === quotes.length) {
          console.log(`${colors.green}✓ All quotes have valid data${colors.reset}`);
        } else {
          console.log(`${colors.yellow}⚠ Some quotes missing data${colors.reset}`);
        }
      } else {
        console.log(`${colors.yellow}⚠ Batch quotes returned unexpected format${colors.reset}`);
      }
    } else {
      console.log(`${colors.red}✗ Batch quotes returned status ${response.statusCode}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ Batch quotes test failed: ${error.message}${colors.reset}`);
  }
}

async function testSearchEndpoint() {
  console.log(`\n${colors.cyan}Testing Search Endpoint...${colors.reset}`);
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/search/stocks?q=apple`);
    
    if (response.statusCode === 200) {
      const results = JSON.parse(response.data);
      
      if (Array.isArray(results) && results.length > 0) {
        console.log(`${colors.green}✓ Search returned ${results.length} results${colors.reset}`);
        console.log(`  First result: ${results[0].symbol} - ${results[0].name}`);
      } else {
        console.log(`${colors.yellow}⚠ Search returned no results${colors.reset}`);
      }
    } else {
      console.log(`${colors.red}✗ Search returned status ${response.statusCode}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ Search test failed: ${error.message}${colors.reset}`);
  }
}

async function testCORS() {
  console.log(`\n${colors.cyan}Testing CORS Headers...${colors.reset}`);
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/health`);
    
    const corsHeaders = {
      'access-control-allow-origin': response.headers['access-control-allow-origin'],
      'access-control-allow-methods': response.headers['access-control-allow-methods'],
      'access-control-allow-headers': response.headers['access-control-allow-headers']
    };
    
    if (corsHeaders['access-control-allow-origin']) {
      console.log(`${colors.green}✓ CORS headers present${colors.reset}`);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        if (value) {
          console.log(`  ${key}: ${value}`);
        }
      });
    } else {
      console.log(`${colors.red}✗ CORS headers missing${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ CORS test failed: ${error.message}${colors.reset}`);
  }
}

// Main execution
async function runTests() {
  console.log(`${colors.cyan}=== Alfalyzer Deployment Verification ===${colors.reset}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Test started at: ${new Date().toLocaleString()}`);
  
  await testFrontend();
  await testBackendHealth();
  await testStockEndpoint();
  await testBatchQuotes();
  await testSearchEndpoint();
  await testCORS();
  
  console.log(`\n${colors.cyan}=== Test Summary ===${colors.reset}`);
  console.log('Check the output above for any red ✗ marks indicating failures.');
  console.log('Yellow ⚠ marks indicate warnings that may need attention.');
  console.log('Green ✓ marks indicate successful tests.');
  
  console.log(`\n${colors.cyan}Next Steps:${colors.reset}`);
  console.log('1. If backend tests fail, check Koyeb deployment status');
  console.log('2. If frontend tests fail, check Vercel deployment');
  console.log('3. If CORS issues, verify backend CORS configuration');
  console.log('4. Check browser console for any client-side errors');
}

// Run the tests
runTests().catch(console.error);