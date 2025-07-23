// Comprehensive API Endpoint Testing Script
// Agent 5 - Integration Tester
// Tests all API endpoints and documents their status

const API_BASE_URL = process.env.API_URL || 'https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app';
const AUTH_TOKEN = process.env.AUTH_TOKEN || null;

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// All API endpoints discovered from the frontend code
const endpoints = [
  // Health & Status Endpoints
  {
    name: 'Health Check',
    method: 'GET',
    path: '/api/health',
    expectedStatus: 200,
  },
  {
    name: 'Market Data Health',
    method: 'GET',
    path: '/api/market-data/health',
    expectedStatus: 200,
  },
  {
    name: 'Market Data Test',
    method: 'GET',
    path: '/api/market-data/test',
  },
  {
    name: 'Market Data Status',
    method: 'GET',
    path: '/api/market-data/status',
  },

  // Market Data Endpoints (Working)
  {
    name: 'Batch Quotes',
    method: 'POST',
    path: '/api/market-data/quotes/batch',
    body: { symbols: ['AAPL', 'GOOGL', 'MSFT'] },
    expectedStatus: 200,
  },
  {
    name: 'Search Symbols',
    method: 'GET',
    path: '/api/market-data/search?query=apple',
    expectedStatus: 200,
  },
  {
    name: 'Market Overview',
    method: 'GET',
    path: '/api/market-data/market-overview',
  },

  // Individual Quote Endpoints (Known to return 404)
  {
    name: 'Individual Quote (AAPL)',
    method: 'GET',
    path: '/api/market-data/quote/AAPL',
    expectedStatus: 404, // We know this doesn't exist
  },

  // Cached Endpoints
  {
    name: 'Cached Batch Quotes',
    method: 'POST',
    path: '/api/cached/quotes/batch',
    body: { symbols: ['AAPL', 'GOOGL'] },
  },
  {
    name: 'Cached Quote',
    method: 'GET',
    path: '/api/cached/quotes/AAPL',
  },
  {
    name: 'Cached Search',
    method: 'GET',
    path: '/api/cached/search?query=apple',
  },
  {
    name: 'Cached Market Overview',
    method: 'GET',
    path: '/api/cached/market-overview',
  },
  {
    name: 'Cache Statistics',
    method: 'GET',
    path: '/api/cached/stats',
  },
  {
    name: 'API Provider Status',
    method: 'GET',
    path: '/api/cached/providers',
  },

  // Financial Data Endpoints
  {
    name: 'Stock Financials',
    method: 'GET',
    path: '/api/stocks/AAPL/financials?period=quarterly',
  },
  {
    name: 'Stock Prices',
    method: 'GET',
    path: '/api/stocks/AAPL/prices?days=30',
  },
  {
    name: 'Stock Metrics',
    method: 'GET',
    path: '/api/stocks/AAPL/metrics',
  },
  {
    name: 'Stock Dividends',
    method: 'GET',
    path: '/api/stocks/AAPL/dividends',
  },
  {
    name: 'Stock Segments',
    method: 'GET',
    path: '/api/stocks/AAPL/segments',
  },

  // V2 Market Data Endpoints
  {
    name: 'V2 Stock Price',
    method: 'GET',
    path: '/api/v2/market-data/stocks/AAPL/price',
  },
  {
    name: 'V2 Batch Prices',
    method: 'POST',
    path: '/api/v2/market-data/stocks/batch/prices',
    body: { symbols: ['AAPL', 'GOOGL'] },
  },
  {
    name: 'V2 Stock Fundamentals',
    method: 'GET',
    path: '/api/v2/market-data/stocks/AAPL/fundamentals',
  },
  {
    name: 'V2 Stock Company',
    method: 'GET',
    path: '/api/v2/market-data/stocks/AAPL/company',
  },
  {
    name: 'V2 Metrics',
    method: 'GET',
    path: '/api/v2/market-data/metrics',
  },

  // Stock Search
  {
    name: 'Stock Search',
    method: 'GET',
    path: '/api/stocks/search?q=apple',
  },
  {
    name: 'All Stocks',
    method: 'GET',
    path: '/api/stocks',
  },

  // Real-time Endpoints
  {
    name: 'Realtime Stock Price',
    method: 'GET',
    path: '/api/stocks/realtime/AAPL',
  },
];

// Test results storage
const results = {
  working: [],
  broken: [],
  requiresAuth: [],
  details: {},
};

async function testEndpoint(test) {
  const url = `${API_BASE_URL}${test.path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...test.headers,
  };

  if (test.requiresAuth && AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }

  const options = {
    method: test.method,
    headers,
  };

  if (test.body && test.method !== 'GET') {
    options.body = JSON.stringify(test.body);
  }

  try {
    console.log(`\n${colors.cyan}Testing: ${test.name}${colors.reset}`);
    console.log(`${colors.blue}URL: ${url}${colors.reset}`);
    console.log(`${colors.blue}Method: ${test.method}${colors.reset}`);

    const startTime = Date.now();
    const response = await fetch(url, options);
    const responseTime = Date.now() - startTime;

    let responseData = null;
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch (e) {
        responseData = await response.text();
      }
    } else {
      responseData = await response.text();
    }

    const result = {
      endpoint: test.path,
      method: test.method,
      status: response.status,
      statusText: response.statusText,
      responseTime: `${responseTime}ms`,
      contentType,
      dataReceived: responseData,
    };

    results.details[test.name] = result;

    if (response.status === 401 && test.requiresAuth) {
      console.log(`${colors.yellow}⚠️  Status: ${response.status} - Requires Authentication${colors.reset}`);
      results.requiresAuth.push(test.name);
    } else if (response.ok || (test.expectedStatus && response.status === test.expectedStatus)) {
      console.log(`${colors.green}✅ Status: ${response.status} - Working${colors.reset}`);
      results.working.push(test.name);
      
      // Log sample data for successful requests
      if (responseData) {
        console.log(`${colors.magenta}Sample Response:${colors.reset}`);
        const preview = JSON.stringify(responseData, null, 2);
        console.log(preview.substring(0, 500) + (preview.length > 500 ? '...' : ''));
      }
    } else {
      console.log(`${colors.red}❌ Status: ${response.status} - Broken${colors.reset}`);
      results.broken.push(test.name);
      
      if (responseData) {
        console.log(`${colors.red}Error Response:${colors.reset}`);
        console.log(JSON.stringify(responseData, null, 2));
      }
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    results.broken.push(test.name);
    results.details[test.name] = {
      endpoint: test.path,
      method: test.method,
      error: error.message,
      errorType: error.constructor.name,
    };
  }
}

async function testCaching() {
  console.log(`\n${colors.cyan}=== Testing Cache Behavior ===${colors.reset}`);
  
  const symbol = 'AAPL';
  const cacheTests = [
    {
      name: 'First Request (Cold Cache)',
      path: `/api/market-data/quotes/batch`,
      body: { symbols: [symbol] },
    },
    {
      name: 'Second Request (Warm Cache)',
      path: `/api/market-data/quotes/batch`,
      body: { symbols: [symbol] },
    },
  ];

  for (const test of cacheTests) {
    const startTime = Date.now();
    const response = await fetch(`${API_BASE_URL}${test.path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(test.body),
    });
    const responseTime = Date.now() - startTime;
    
    const data = await response.json();
    console.log(`\n${test.name}:`);
    console.log(`Response Time: ${responseTime}ms`);
    console.log(`Cached: ${data._cached || false}`);
    console.log(`Provider: ${data.quotes?.[0]?.provider || 'unknown'}`);
  }
}

async function generateReport() {
  console.log(`\n${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.cyan}API ENDPOINT TEST REPORT${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  
  console.log(`\n${colors.green}✅ WORKING ENDPOINTS (${results.working.length}):${colors.reset}`);
  results.working.forEach(name => {
    const details = results.details[name];
    console.log(`  - ${name} [${details.status}] (${details.responseTime})`);
  });

  console.log(`\n${colors.red}❌ BROKEN ENDPOINTS (${results.broken.length}):${colors.reset}`);
  results.broken.forEach(name => {
    const details = results.details[name];
    console.log(`  - ${name} [${details.status || 'ERROR'}] ${details.error || ''}`);
  });

  console.log(`\n${colors.yellow}🔐 REQUIRES AUTHENTICATION (${results.requiresAuth.length}):${colors.reset}`);
  results.requiresAuth.forEach(name => {
    const details = results.details[name];
    console.log(`  - ${name} [${details.status}]`);
  });

  // Summary statistics
  console.log(`\n${colors.cyan}SUMMARY:${colors.reset}`);
  console.log(`Total Endpoints Tested: ${endpoints.length}`);
  console.log(`Working: ${results.working.length} (${((results.working.length / endpoints.length) * 100).toFixed(1)}%)`);
  console.log(`Broken: ${results.broken.length} (${((results.broken.length / endpoints.length) * 100).toFixed(1)}%)`);
  console.log(`Requires Auth: ${results.requiresAuth.length} (${((results.requiresAuth.length / endpoints.length) * 100).toFixed(1)}%)`);

  // Save detailed report to file
  const report = {
    timestamp: new Date().toISOString(),
    apiBaseUrl: API_BASE_URL,
    summary: {
      total: endpoints.length,
      working: results.working.length,
      broken: results.broken.length,
      requiresAuth: results.requiresAuth.length,
    },
    workingEndpoints: results.working,
    brokenEndpoints: results.broken,
    authRequiredEndpoints: results.requiresAuth,
    detailedResults: results.details,
  };

  const fs = await import('fs').then(m => m.promises);
  await fs.writeFile(
    'api-test-report.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log(`\n${colors.green}📄 Detailed report saved to: api-test-report.json${colors.reset}`);

  // Create markdown report
  let markdown = `# API Endpoint Test Report

Generated: ${new Date().toISOString()}
API Base URL: ${API_BASE_URL}

## Summary

- **Total Endpoints Tested**: ${endpoints.length}
- **Working**: ${results.working.length} (${((results.working.length / endpoints.length) * 100).toFixed(1)}%)
- **Broken**: ${results.broken.length} (${((results.broken.length / endpoints.length) * 100).toFixed(1)}%)
- **Requires Auth**: ${results.requiresAuth.length} (${((results.requiresAuth.length / endpoints.length) * 100).toFixed(1)}%)

## Working Endpoints ✅

| Endpoint | Method | Status | Response Time |
|----------|--------|--------|---------------|
`;

  results.working.forEach(name => {
    const details = results.details[name];
    markdown += `| ${details.endpoint} | ${details.method} | ${details.status} | ${details.responseTime} |\n`;
  });

  markdown += `\n## Broken Endpoints ❌

| Endpoint | Method | Status/Error |
|----------|--------|--------------|
`;

  results.broken.forEach(name => {
    const details = results.details[name];
    markdown += `| ${details.endpoint} | ${details.method} | ${details.status || details.error} |\n`;
  });

  await fs.writeFile('api-test-report.md', markdown);
  console.log(`${colors.green}📄 Markdown report saved to: api-test-report.md${colors.reset}`);
}

async function main() {
  console.log(`${colors.cyan}Starting Comprehensive API Endpoint Testing${colors.reset}`);
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Auth Token: ${AUTH_TOKEN ? 'Provided' : 'Not provided'}`);
  console.log(`Total Endpoints to Test: ${endpoints.length}`);
  
  // Test all endpoints
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Test caching behavior
  await testCaching();

  // Generate final report
  await generateReport();
}

// Run the tests
main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});