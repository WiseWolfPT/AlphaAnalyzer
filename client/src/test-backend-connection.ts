// Test script to verify backend connection

async function testBackendConnection() {
  // Use relative path to go through Vercel proxy
  const BACKEND_URL = '';
  
  console.log('🧪 Testing backend connection...');
  console.log(`📍 Backend URL: ${BACKEND_URL}`);
  
  // Test 1: Health endpoint
  try {
    console.log('\n1️⃣ Testing /api/health endpoint...');
    const healthResponse = await fetch(`${BACKEND_URL}/api/health`);
    console.log(`   Status: ${healthResponse.status} ${healthResponse.statusText}`);
    
    if (healthResponse.ok) {
      const data = await healthResponse.json();
      console.log('   ✅ Health check passed:', data);
    } else {
      console.error('   ❌ Health check failed');
    }
  } catch (error) {
    console.error('   ❌ Health check error:', error.message);
  }
  
  // Test 2: Market data quotes endpoint
  try {
    console.log('\n2️⃣ Testing /api/market-data/quotes/batch endpoint...');
    const quotesResponse = await fetch(`${BACKEND_URL}/api/market-data/quotes/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbols: ['AAPL', 'MSFT', 'GOOGL'] }),
    });
    
    console.log(`   Status: ${quotesResponse.status} ${quotesResponse.statusText}`);
    
    if (quotesResponse.ok) {
      const data = await quotesResponse.json();
      console.log('   ✅ Quotes fetched:', {
        quotesCount: data.quotes?.length || 0,
        hasErrors: Object.keys(data.errors || {}).length > 0,
      });
      
      if (data.quotes && data.quotes.length > 0) {
        console.log('   Sample quote:', data.quotes[0]);
      }
    } else {
      const errorText = await quotesResponse.text();
      console.error('   ❌ Quotes request failed:', errorText);
    }
  } catch (error) {
    console.error('   ❌ Quotes request error:', error.message);
  }
  
  // Test 3: Single quote via batch endpoint
  try {
    console.log('\n3️⃣ Testing single quote via /api/market-data/quotes/batch endpoint...');
    const quoteResponse = await fetch(`${BACKEND_URL}/api/market-data/quotes/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbols: ['AAPL'] }),
    });
    console.log(`   Status: ${quoteResponse.status} ${quoteResponse.statusText}`);
    
    if (quoteResponse.ok) {
      const data = await quoteResponse.json();
      if (data.quotes && data.quotes.length > 0) {
        console.log('   ✅ Single quote fetched:', data.quotes[0]);
      } else {
        console.log('   ⚠️ No quote data returned');
      }
    } else {
      console.error('   ❌ Single quote request failed');
    }
  } catch (error) {
    console.error('   ❌ Single quote error:', error.message);
  }
  
  console.log('\n✅ Backend connection test completed');
}

// Run the test
testBackendConnection();