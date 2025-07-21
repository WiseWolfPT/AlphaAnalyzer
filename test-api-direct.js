// Test API directly without proxy

async function testAPI() {
  console.log('Testing API endpoints directly...\n');
  
  // Test health endpoint
  try {
    console.log('1. Testing /api/health:');
    const healthRes = await fetch('http://localhost:3001/api/health');
    console.log(`   Status: ${healthRes.status}`);
    console.log(`   Headers:`, healthRes.headers.raw());
    const healthData = await healthRes.text();
    console.log(`   Response: ${healthData}\n`);
  } catch (error) {
    console.error('   Error:', error.message, '\n');
  }
  
  // Test market data endpoint
  try {
    console.log('2. Testing /api/market-data/quotes/batch:');
    const quotesRes = await fetch('http://localhost:3001/api/market-data/quotes/batch?symbols=AAPL,MSFT,GOOGL');
    console.log(`   Status: ${quotesRes.status}`);
    console.log(`   Headers:`, quotesRes.headers.raw());
    const quotesData = await quotesRes.text();
    console.log(`   Response: ${quotesData.substring(0, 200)}...\n`);
  } catch (error) {
    console.error('   Error:', error.message, '\n');
  }
  
  // Test with demo auth header
  try {
    console.log('3. Testing with demo auth header:');
    const authRes = await fetch('http://localhost:3001/api/market-data/quotes/batch?symbols=AAPL', {
      headers: {
        'Authorization': 'Bearer demo-token'
      }
    });
    console.log(`   Status: ${authRes.status}`);
    console.log(`   Headers:`, authRes.headers.raw());
    const authData = await authRes.text();
    console.log(`   Response: ${authData.substring(0, 200)}...\n`);
  } catch (error) {
    console.error('   Error:', error.message, '\n');
  }
  
  // Test root endpoint
  try {
    console.log('4. Testing root /:');
    const rootRes = await fetch('http://localhost:3001/');
    console.log(`   Status: ${rootRes.status}`);
    console.log(`   Headers:`, rootRes.headers.raw());
    const rootData = await rootRes.text();
    console.log(`   Response: ${rootData.substring(0, 100)}...\n`);
  } catch (error) {
    console.error('   Error:', error.message, '\n');
  }
}

testAPI();