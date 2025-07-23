/**
 * API Integration Test Suite for Alfalyzer
 * Can be run in browser console or as Node.js script
 */

const API_BASE = 'https://alfalyzerpro4.vercel.app/api/market-data';

// Test utilities
const testEndpoint = async (name, testFn) => {
  console.log(`\n🧪 Testing: ${name}`);
  try {
    const result = await testFn();
    console.log('✅ Success:', result);
    return { name, success: true, result };
  } catch (error) {
    console.error('❌ Failed:', error.message);
    return { name, success: false, error: error.message };
  }
};

// Test functions
const tests = {
  // 1. Health check
  healthCheck: () => testEndpoint('Health Check', async () => {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!data.status) throw new Error('Missing status field');
    
    return {
      status: data.status,
      hasRealData: data.hasRealData,
      providers: Object.keys(data.providers || {}).filter(p => data.providers[p]),
      cacheEnabled: data.cache?.enabled
    };
  }),

  // 2. Batch quotes
  batchQuotes: () => testEndpoint('Batch Quotes', async () => {
    const response = await fetch(`${API_BASE}/quotes/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols: ['AAPL', 'MSFT', 'GOOGL'] })
    });
    
    const data = await response.json();
    
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    if (!Array.isArray(data.quotes)) throw new Error('Invalid response format');
    
    return {
      quotesCount: data.quotes.length,
      symbols: data.quotes.map(q => q.symbol),
      providers: [...new Set(data.quotes.map(q => q.provider))],
      sample: data.quotes[0] ? {
        symbol: data.quotes[0].symbol,
        price: data.quotes[0].price,
        change: data.quotes[0].change,
        changePercent: data.quotes[0].changePercent
      } : null
    };
  }),

  // 3. Single symbol quote (using batch endpoint)
  singleQuote: () => testEndpoint('Single Quote', async () => {
    const response = await fetch(`${API_BASE}/quotes/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols: ['AAPL'] })
    });
    
    const data = await response.json();
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!data.quotes || data.quotes.length === 0) throw new Error('No quote returned');
    
    return data.quotes[0];
  }),

  // 4. CORS headers check
  corsCheck: () => testEndpoint('CORS Headers', async () => {
    const response = await fetch(`${API_BASE}/health`);
    
    const corsHeaders = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': response.headers.get('access-control-allow-headers')
    };
    
    if (corsHeaders['access-control-allow-origin'] !== '*') {
      throw new Error('CORS not configured for all origins');
    }
    
    return corsHeaders;
  }),

  // 5. Rate limiting check
  rateLimitCheck: () => testEndpoint('Rate Limiting', async () => {
    const results = [];
    
    // Make 5 rapid requests
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      const response = await fetch(`${API_BASE}/health`);
      const elapsed = Date.now() - start;
      
      results.push({
        request: i + 1,
        status: response.status,
        elapsed: `${elapsed}ms`,
        rateLimited: response.status === 429
      });
      
      // Small delay to be nice
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }),

  // 6. Invalid symbol handling
  invalidSymbol: () => testEndpoint('Invalid Symbol Handling', async () => {
    const response = await fetch(`${API_BASE}/quotes/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols: ['INVALID_SYMBOL_123'] })
    });
    
    const data = await response.json();
    
    return {
      status: response.status,
      hasErrors: !!data.errors && Object.keys(data.errors).length > 0,
      failed: data.failed || [],
      quotesReturned: data.quotes?.length || 0
    };
  }),

  // 7. Empty request handling
  emptyRequest: () => testEndpoint('Empty Request Handling', async () => {
    const response = await fetch(`${API_BASE}/quotes/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols: [] })
    });
    
    const data = await response.json();
    
    return {
      status: response.status,
      response: data
    };
  }),

  // 8. Performance test
  performanceTest: () => testEndpoint('Performance Test', async () => {
    const timings = [];
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META'];
    
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      
      const response = await fetch(`${API_BASE}/quotes/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols })
      });
      
      await response.json();
      const elapsed = Date.now() - start;
      timings.push(elapsed);
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return {
      requests: timings.length,
      timings: timings.map(t => `${t}ms`),
      average: `${Math.round(timings.reduce((a, b) => a + b) / timings.length)}ms`,
      min: `${Math.min(...timings)}ms`,
      max: `${Math.max(...timings)}ms`
    };
  })
};

// Run all tests
const runAllTests = async () => {
  console.log('🚀 Starting Alfalyzer API Integration Tests');
  console.log(`📍 API Base: ${API_BASE}`);
  console.log(`🕒 Started at: ${new Date().toISOString()}`);
  
  const results = [];
  
  for (const [name, testFn] of Object.entries(tests)) {
    const result = await testFn();
    results.push(result);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log('================');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / results.length) * 100)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }
  
  return results;
};

// Export for use in Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { tests, runAllTests };
} else {
  // For browser console
  window.alfalyzerTests = { tests, runAllTests };
  console.log('✨ Alfalyzer API tests loaded!');
  console.log('Run individual tests: alfalyzerTests.tests.healthCheck()');
  console.log('Run all tests: alfalyzerTests.runAllTests()');
}

// Auto-run if called directly
if (typeof require !== 'undefined' && require.main === module) {
  runAllTests().then(() => process.exit(0)).catch(() => process.exit(1));
}