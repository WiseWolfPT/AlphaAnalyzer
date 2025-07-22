#!/usr/bin/env node

const https = require('https');
const http = require('http');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m'
};

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const TIMEOUT = 10000; // 10 seconds

console.log(`${colors.blue}=== Alfalyzer Connectivity Verification ===${colors.reset}\n`);
console.log(`Backend URL: ${colors.yellow}${BACKEND_URL}${colors.reset}\n`);

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = protocol.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: TIMEOUT
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data,
          headers: res.headers
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test functions
async function testBackendHealth() {
  console.log(`${colors.dim}Testing backend health...${colors.reset}`);
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/health`);
    
    if (response.status === 200) {
      console.log(`${colors.green}✓ Backend is healthy${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}✗ Backend returned status ${response.status}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Backend health check failed: ${error.message}${colors.reset}`);
    return false;
  }
}

async function testMarketDataEndpoint() {
  console.log(`\n${colors.dim}Testing /api/market-data/test endpoint...${colors.reset}`);
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/market-data/test`);
    
    if (response.status === 200) {
      const data = JSON.parse(response.data);
      console.log(`${colors.green}✓ Test endpoint working${colors.reset}`);
      console.log(`  Response: ${colors.dim}${JSON.stringify(data, null, 2)}${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}✗ Test endpoint returned status ${response.status}${colors.reset}`);
      console.log(`  Response: ${colors.dim}${response.data}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Test endpoint failed: ${error.message}${colors.reset}`);
    return false;
  }
}

async function testBatchQuotesEndpoint() {
  console.log(`\n${colors.dim}Testing /api/market-data/quotes/batch endpoint with AAPL...${colors.reset}`);
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/market-data/quotes/batch?symbols=AAPL`);
    
    if (response.status === 200) {
      const data = JSON.parse(response.data);
      console.log(`${colors.green}✓ Batch quotes endpoint working${colors.reset}`);
      
      if (data.AAPL) {
        console.log(`  AAPL Data:`);
        console.log(`    Symbol: ${colors.yellow}${data.AAPL.symbol}${colors.reset}`);
        console.log(`    Price: ${colors.yellow}$${data.AAPL.price}${colors.reset}`);
        console.log(`    Change: ${colors.yellow}${data.AAPL.change} (${data.AAPL.changePercent}%)${colors.reset}`);
        console.log(`    Volume: ${colors.yellow}${data.AAPL.volume?.toLocaleString() || 'N/A'}${colors.reset}`);
      }
      
      return true;
    } else {
      console.log(`${colors.red}✗ Batch quotes endpoint returned status ${response.status}${colors.reset}`);
      console.log(`  Response: ${colors.dim}${response.data}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Batch quotes endpoint failed: ${error.message}${colors.reset}`);
    return false;
  }
}

async function testCORS() {
  console.log(`\n${colors.dim}Testing CORS headers...${colors.reset}`);
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/market-data/test`, {
      headers: {
        'Origin': 'http://localhost:5173'
      }
    });
    
    const corsHeader = response.headers['access-control-allow-origin'];
    if (corsHeader) {
      console.log(`${colors.green}✓ CORS headers present${colors.reset}`);
      console.log(`  Access-Control-Allow-Origin: ${colors.yellow}${corsHeader}${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.yellow}⚠ CORS headers not found in response${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ CORS test failed: ${error.message}${colors.reset}`);
    return false;
  }
}

// Main execution
async function main() {
  let allTestsPassed = true;
  
  // Run all tests
  const healthOk = await testBackendHealth();
  allTestsPassed = allTestsPassed && healthOk;
  
  if (healthOk) {
    const testEndpointOk = await testMarketDataEndpoint();
    allTestsPassed = allTestsPassed && testEndpointOk;
    
    const batchQuotesOk = await testBatchQuotesEndpoint();
    allTestsPassed = allTestsPassed && batchQuotesOk;
    
    const corsOk = await testCORS();
    allTestsPassed = allTestsPassed && corsOk;
  } else {
    console.log(`\n${colors.yellow}⚠ Skipping further tests since backend is not healthy${colors.reset}`);
  }
  
  // Summary
  console.log(`\n${colors.blue}=== Summary ===${colors.reset}`);
  if (allTestsPassed) {
    console.log(`${colors.green}✓ All tests passed!${colors.reset}`);
    console.log(`\nYour Alfalyzer backend is properly configured and accessible.`);
    process.exit(0);
  } else {
    console.log(`${colors.red}✗ Some tests failed${colors.reset}`);
    console.log(`\nTroubleshooting tips:`);
    console.log(`1. Make sure the backend is running: ${colors.yellow}npm run server${colors.reset}`);
    console.log(`2. Check the backend URL: ${colors.yellow}${BACKEND_URL}${colors.reset}`);
    console.log(`3. Verify API keys are configured in the backend .env file`);
    console.log(`4. Check backend logs for any errors`);
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(`${colors.red}Unexpected error: ${error.message}${colors.reset}`);
  process.exit(1);
});

// Run the verification
main();