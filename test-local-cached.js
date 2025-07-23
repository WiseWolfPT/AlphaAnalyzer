// Test cached endpoints locally
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:3001';
const CACHED_BASE_URL = `${API_BASE_URL}/api/cached`;

async function testLocalCached() {
  console.log('🧪 Testing Local Cached Endpoints');
  console.log(`📍 API Base URL: ${API_BASE_URL}`);
  console.log(`🗄️ Cached Base URL: ${CACHED_BASE_URL}`);
  console.log('');

  // First, test if server is running
  console.log('0️⃣ Testing server connectivity');
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Server is ${data.status || 'running'}`);
    console.log('   ✅ Server is accessible');
  } catch (error) {
    console.error('   ❌ Server not running:', error.message);
    console.log('\n⚠️  Please start the backend server first with: npm run backend');
    return;
  }
  console.log('');

  // Test cached endpoints
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
    console.log(`   Response:`, data);
    console.log('   ✅ Batch quotes endpoint tested');
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }

  console.log('\n✅ Local test completed!');
}

// Run the test
testLocalCached().catch(console.error);