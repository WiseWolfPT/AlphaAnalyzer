// Test script to verify backend connection

async function testBackendConnection() {
  const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app';
  
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
  
  // Test 3: Individual quote endpoint
  try {
    console.log('\n3️⃣ Testing /api/market-data/quote/AAPL endpoint...');
    const quoteResponse = await fetch(`${BACKEND_URL}/api/market-data/quote/AAPL`);
    console.log(`   Status: ${quoteResponse.status} ${quoteResponse.statusText}`);
    
    if (quoteResponse.ok) {
      const data = await quoteResponse.json();
      console.log('   ✅ Individual quote fetched:', data);
    } else {
      console.error('   ❌ Individual quote failed');
    }
  } catch (error) {
    console.error('   ❌ Individual quote error:', error.message);
  }
  
  console.log('\n✅ Backend connection test completed');
}

// Run the test
testBackendConnection();