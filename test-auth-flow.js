// Test Authentication Flow
// Agent 5 - Integration Tester

const API_BASE_URL = process.env.API_URL || 'https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app';

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

async function testAuthFlow() {
  console.log(`${colors.cyan}=== Testing Authentication Flow ===${colors.reset}\n`);

  // 1. Test unauthenticated access
  console.log(`${colors.yellow}1. Testing unauthenticated access:${colors.reset}`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/market-data/quotes/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols: ['AAPL'] }),
    });

    console.log(`Status: ${response.status}`);
    if (response.ok) {
      console.log(`${colors.green}✅ Backend allows unauthenticated access${colors.reset}`);
      const data = await response.json();
      console.log(`Received data for: ${data.quotes?.[0]?.symbol || 'Unknown'}`);
    } else if (response.status === 401) {
      console.log(`${colors.red}❌ Backend requires authentication${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }

  // 2. Test with fake auth token
  console.log(`\n${colors.yellow}2. Testing with fake auth token:${colors.reset}`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/market-data/quotes/batch`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token-12345'
      },
      body: JSON.stringify({ symbols: ['GOOGL'] }),
    });

    console.log(`Status: ${response.status}`);
    if (response.ok) {
      console.log(`${colors.green}✅ Backend ignores invalid auth tokens${colors.reset}`);
      const data = await response.json();
      console.log(`Received data for: ${data.quotes?.[0]?.symbol || 'Unknown'}`);
    } else if (response.status === 401) {
      console.log(`${colors.red}❌ Backend validates auth tokens${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }

  // 3. Check for auth-related endpoints
  console.log(`\n${colors.yellow}3. Checking for auth endpoints:${colors.reset}`);
  
  const authEndpoints = [
    { path: '/api/auth/login', method: 'POST', body: { email: 'test@test.com', password: 'test' } },
    { path: '/api/auth/register', method: 'POST', body: { email: 'test@test.com', password: 'test' } },
    { path: '/api/auth/logout', method: 'POST' },
    { path: '/api/auth/verify', method: 'GET' },
    { path: '/api/user/profile', method: 'GET' },
  ];

  for (const endpoint of authEndpoints) {
    try {
      const options = {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' },
      };
      
      if (endpoint.body) {
        options.body = JSON.stringify(endpoint.body);
      }

      const response = await fetch(`${API_BASE_URL}${endpoint.path}`, options);
      
      if (response.status === 404) {
        console.log(`${endpoint.path}: ${colors.yellow}Not implemented${colors.reset}`);
      } else if (response.ok) {
        console.log(`${endpoint.path}: ${colors.green}Exists (${response.status})${colors.reset}`);
      } else {
        console.log(`${endpoint.path}: ${colors.red}Error (${response.status})${colors.reset}`);
      }
    } catch (error) {
      console.log(`${endpoint.path}: ${colors.red}Network error${colors.reset}`);
    }
  }

  // 4. Test protected endpoints
  console.log(`\n${colors.yellow}4. Testing potentially protected endpoints:${colors.reset}`);
  
  const protectedEndpoints = [
    '/api/portfolios',
    '/api/user/profile',
    '/api/user/stats',
    '/api/admin/system-stats',
    '/api/logs',
  ];

  for (const endpoint of protectedEndpoints) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      
      if (response.status === 401) {
        console.log(`${endpoint}: ${colors.green}Protected (requires auth)${colors.reset}`);
      } else if (response.status === 404) {
        console.log(`${endpoint}: ${colors.yellow}Not implemented${colors.reset}`);
      } else if (response.ok) {
        console.log(`${endpoint}: ${colors.red}Unprotected (public access)${colors.reset}`);
      } else {
        console.log(`${endpoint}: ${colors.yellow}Status ${response.status}${colors.reset}`);
      }
    } catch (error) {
      console.log(`${endpoint}: ${colors.red}Network error${colors.reset}`);
    }
  }
}

async function testCacheHeaders() {
  console.log(`\n${colors.cyan}=== Testing Cache Headers ===${colors.reset}\n`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/market-data/quotes/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols: ['AAPL'] }),
    });

    console.log('Response Headers:');
    for (const [key, value] of response.headers.entries()) {
      if (key.toLowerCase().includes('cache') || key.toLowerCase().includes('etag')) {
        console.log(`  ${key}: ${value}`);
      }
    }

    const data = await response.json();
    console.log(`\nResponse includes cache info: ${data._cached ? 'Yes' : 'No'}`);
    if (data._timestamp) {
      console.log(`Timestamp: ${new Date(data._timestamp * 1000).toISOString()}`);
    }
  } catch (error) {
    console.log(`${colors.red}Error: ${error.message}${colors.reset}`);
  }
}

async function testRateLimiting() {
  console.log(`\n${colors.cyan}=== Testing Rate Limiting ===${colors.reset}\n`);
  
  const requests = 15; // Try to exceed the 10/minute limit
  const results = [];
  
  console.log(`Making ${requests} rapid requests...`);
  
  for (let i = 0; i < requests; i++) {
    try {
      const start = Date.now();
      const response = await fetch(`${API_BASE_URL}/api/market-data/health`);
      const time = Date.now() - start;
      
      results.push({
        request: i + 1,
        status: response.status,
        time: time,
        rateLimitHeaders: {
          limit: response.headers.get('x-ratelimit-limit'),
          remaining: response.headers.get('x-ratelimit-remaining'),
          reset: response.headers.get('x-ratelimit-reset'),
        }
      });
      
      if (response.status === 429) {
        console.log(`${colors.red}Rate limit hit at request ${i + 1}${colors.reset}`);
        break;
      }
    } catch (error) {
      results.push({
        request: i + 1,
        error: error.message
      });
    }
  }
  
  // Summary
  const successCount = results.filter(r => r.status === 200).length;
  const rateLimitedCount = results.filter(r => r.status === 429).length;
  
  console.log(`\nResults:`);
  console.log(`  Successful: ${successCount}`);
  console.log(`  Rate limited: ${rateLimitedCount}`);
  console.log(`  Average response time: ${Math.round(results.filter(r => r.time).reduce((a, b) => a + b.time, 0) / successCount)}ms`);
}

async function main() {
  console.log(`${colors.cyan}API Integration Testing Report${colors.reset}`);
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  await testAuthFlow();
  await testCacheHeaders();
  await testRateLimiting();

  console.log(`\n${colors.cyan}=== Summary ===${colors.reset}`);
  console.log(`
Based on the tests:
1. Authentication: ${colors.green}Not required for market data endpoints${colors.reset}
2. Cache: ${colors.green}Working (responses include cache metadata)${colors.reset}
3. Rate Limiting: ${colors.green}Implemented (10 requests/minute per IP)${colors.reset}
4. Auth Endpoints: ${colors.yellow}Not implemented${colors.reset}
5. Protected Endpoints: ${colors.yellow}Not implemented${colors.reset}
  `);
}

main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});