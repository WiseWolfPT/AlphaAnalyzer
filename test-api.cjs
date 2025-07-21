const axios = require('axios');

async function testAPIs() {
  const baseURL = 'http://localhost:3001';
  
  console.log('🔍 Testing Alfalyzer API Configuration...\n');
  
  try {
    // 1. Test health endpoint
    console.log('1. Testing health endpoint...');
    const health = await axios.get(`${baseURL}/health`);
    console.log('✅ Health check:', health.data);
    console.log('');
    
    // 2. Test market data health (public endpoint)
    console.log('2. Testing market data health endpoint...');
    try {
      const marketHealth = await axios.get(`${baseURL}/api/market-data/health`);
      console.log('✅ Market data health:', marketHealth.data);
    } catch (error) {
      console.log('❌ Market data health error:', error.response?.data || error.message);
    }
    console.log('');
    
    // 3. Test API diagnostics (might require auth)
    console.log('3. Testing API diagnostics...');
    try {
      const diagnostics = await axios.get(`${baseURL}/api/market-data/diagnostics`);
      console.log('✅ API diagnostics:', diagnostics.data);
    } catch (error) {
      console.log('❌ API diagnostics error:', error.response?.data || error.message);
    }
    console.log('');
    
    // 4. Test direct quote fetch
    console.log('4. Testing direct quote fetch for AAPL...');
    try {
      const quote = await axios.get(`${baseURL}/api/market-data/quote/AAPL`);
      console.log('✅ AAPL quote:', quote.data);
    } catch (error) {
      console.log('❌ Quote fetch error:', error.response?.data || error.message);
    }
    console.log('');
    
    // 5. Check which APIs are configured
    console.log('5. Checking API configuration from environment...');
    const apiKeys = {
      FINNHUB: process.env.FINNHUB_API_KEY ? '✅ Configured' : '❌ Not configured',
      ALPHA_VANTAGE: process.env.ALPHA_VANTAGE_API_KEY ? '✅ Configured' : '❌ Not configured',
      FMP: process.env.FMP_API_KEY ? '✅ Configured' : '❌ Not configured',
      TWELVE_DATA: process.env.TWELVE_DATA_API_KEY ? '✅ Configured' : '❌ Not configured',
      POLYGON: process.env.POLYGON_API_KEY ? '✅ Configured' : '❌ Not configured',
    };
    console.log('API Keys status:');
    Object.entries(apiKeys).forEach(([key, status]) => {
      console.log(`  ${key}: ${status}`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Load environment variables
require('dotenv').config();

// Run tests
testAPIs();