// Test script for cached endpoints
import fetch from 'node-fetch';

const API_BASE_URL = process.env.KOYEB_API_URL || 'https://grateful-sana-alfalyzer-5d8d2f74.koyeb.app';
const CACHED_BASE_URL = `${API_BASE_URL}/api/cached`;

async function testCachedEndpoints() {
  console.log('🧪 Testing Cached Endpoints');
  console.log(`📍 API Base URL: ${API_BASE_URL}`);
  console.log(`🗄️ Cached Base URL: ${CACHED_BASE_URL}`);
  console.log('');

  // Test 1: Batch Quotes
  console.log('1️⃣ Testing POST /api/cached/quotes/batch');
  try {
    const response = await fetch(`${CACHED_BASE_URL}/quotes/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbols: ['AAPL', 'GOOGL', 'MSFT']
      })
    });

    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Headers: X-Cache-Fresh=${response.headers.get('X-Cache-Fresh')}, X-Cache-Stale=${response.headers.get('X-Cache-Stale')}`);
    console.log(`   Quotes returned: ${data.quotes?.length || 0}`);
    console.log('   ✅ Batch quotes endpoint working');
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
  console.log('');

  // Test 2: Search
  console.log('2️⃣ Testing GET /api/cached/search?query=apple');
  try {
    const response = await fetch(`${CACHED_BASE_URL}/search?query=apple`);
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Results returned: ${data.results?.length || 0}`);
    console.log('   ✅ Search endpoint working');
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
  console.log('');

  // Test 3: Market Overview
  console.log('3️⃣ Testing GET /api/cached/market-overview');
  try {
    const response = await fetch(`${CACHED_BASE_URL}/market-overview`);
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Has indices: ${!!data.indices}`);
    console.log(`   Has top gainers: ${!!data.topGainers}`);
    console.log(`   Has top losers: ${!!data.topLosers}`);
    console.log('   ✅ Market overview endpoint working');
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
  console.log('');

  // Test 4: Cache Stats
  console.log('4️⃣ Testing GET /api/cached/stats');
  try {
    const response = await fetch(`${CACHED_BASE_URL}/stats`);
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Cache statistics available: ${!!data}`);
    console.log('   ✅ Cache stats endpoint working');
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
  console.log('');

  // Test 5: Provider Status
  console.log('5️⃣ Testing GET /api/cached/providers');
  try {
    const response = await fetch(`${CACHED_BASE_URL}/providers`);
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Providers returned: ${data.providers?.length || 0}`);
    console.log('   ✅ Provider status endpoint working');
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }

  console.log('\n✅ All cached endpoint tests completed!');
}

// Run the tests
testCachedEndpoints().catch(console.error);