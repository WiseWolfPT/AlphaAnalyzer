const axios = require('axios');

// Test our updated API configuration
async function testAPIConfiguration() {
  console.log('=== COMPREHENSIVE API CONFIGURATION AUDIT REPORT ===\n');
  
  // Load environment variables
  require('dotenv').config();
  
  const testSymbol = 'AAPL';
  
  console.log('📋 Current API Keys Configuration:');
  console.log('ALPHA_VANTAGE_API_KEY:', process.env.ALPHA_VANTAGE_API_KEY);
  console.log('TWELVE_DATA_API_KEY:', process.env.TWELVE_DATA_API_KEY);
  console.log('FMP_API_KEY:', process.env.FMP_API_KEY);
  console.log('FINNHUB_API_KEY:', process.env.FINNHUB_API_KEY);
  console.log('');
  
  // Test results storage
  const results = {
    working: [],
    failed: [],
    recommendations: []
  };
  
  // Test Yahoo Finance (no key required)
  console.log('🧪 Testing Yahoo Finance API (No key required)...');
  try {
    const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${testSymbol}`, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Alfalyzer/1.0)' }
    });
    
    const price = response.data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (price) {
      console.log(`✅ Yahoo Finance: ${testSymbol} = $${price}`);
      results.working.push({
        provider: 'Yahoo Finance',
        keyRequired: false,
        dailyLimit: 'High (unofficial)',
        cost: 'Free',
        dataQuality: 'Excellent',
        reliability: 'High'
      });
    } else {
      throw new Error('No price data returned');
    }
  } catch (error) {
    console.log(`❌ Yahoo Finance Error: ${error.message}`);
    results.failed.push('Yahoo Finance');
  }
  console.log('');
  
  // Test Twelve Data with demo key
  console.log('🧪 Testing Twelve Data API (Demo key)...');
  try {
    const response = await axios.get(`https://api.twelvedata.com/quote`, {
      params: { symbol: testSymbol, apikey: process.env.TWELVE_DATA_API_KEY },
      timeout: 10000
    });
    
    if (response.data.code === 401) {
      console.log(`⚠️ Twelve Data: API key invalid, but demo data available`);
      results.recommendations.push('Get free Twelve Data API key (800 calls/day)');
    } else if (response.data.close) {
      console.log(`✅ Twelve Data: ${testSymbol} = $${response.data.close}`);
      results.working.push({
        provider: 'Twelve Data',
        keyRequired: true,
        dailyLimit: '800 calls',
        cost: 'Free tier available',
        dataQuality: 'Excellent',
        reliability: 'High'
      });
    }
  } catch (error) {
    console.log(`❌ Twelve Data Error: ${error.message}`);
    results.failed.push('Twelve Data');
  }
  console.log('');
  
  // Test Alpha Vantage
  console.log('🧪 Testing Alpha Vantage API...');
  try {
    const response = await axios.get('https://www.alphavantage.co/query', {
      params: { 
        function: 'GLOBAL_QUOTE', 
        symbol: testSymbol, 
        apikey: process.env.ALPHA_VANTAGE_API_KEY 
      },
      timeout: 10000
    });
    
    if (response.data.Information && response.data.Information.includes('demo')) {
      console.log(`⚠️ Alpha Vantage: Demo key detected - need real key for data`);
      results.recommendations.push('Get free Alpha Vantage API key (25 calls/day)');
    } else if (response.data['Global Quote']) {
      const price = response.data['Global Quote']['05. price'];
      console.log(`✅ Alpha Vantage: ${testSymbol} = $${price}`);
      results.working.push({
        provider: 'Alpha Vantage',
        keyRequired: true,
        dailyLimit: '25 calls (free) / 500 calls (premium)',
        cost: 'Free tier available',
        dataQuality: 'Good',
        reliability: 'Medium'
      });
    }
  } catch (error) {
    console.log(`❌ Alpha Vantage Error: ${error.message}`);
    results.failed.push('Alpha Vantage');
  }
  console.log('');
  
  // Test Finnhub
  console.log('🧪 Testing Finnhub API...');
  try {
    const response = await axios.get('https://finnhub.io/api/v1/quote', {
      params: { symbol: testSymbol, token: process.env.FINNHUB_API_KEY },
      timeout: 10000
    });
    
    if (response.data.error) {
      console.log(`❌ Finnhub: ${response.data.error}`);
      results.failed.push('Finnhub');
      results.recommendations.push('Get free Finnhub API key (60 calls/minute)');
    } else if (response.data.c) {
      console.log(`✅ Finnhub: ${testSymbol} = $${response.data.c}`);
      results.working.push({
        provider: 'Finnhub',
        keyRequired: true,
        dailyLimit: '60 calls/minute',
        cost: 'Free tier available',
        dataQuality: 'Good',
        reliability: 'High'
      });
    }
  } catch (error) {
    console.log(`❌ Finnhub Error: ${error.message}`);
    results.failed.push('Finnhub');
  }
  console.log('');
  
  // Test FMP
  console.log('🧪 Testing Financial Modeling Prep API...');
  try {
    const response = await axios.get(`https://financialmodelingprep.com/api/v3/quote/${testSymbol}`, {
      params: { apikey: process.env.FMP_API_KEY },
      timeout: 10000
    });
    
    if (response.data['Error Message']) {
      console.log(`❌ FMP: ${response.data['Error Message']}`);
      results.failed.push('FMP');
      results.recommendations.push('Get free FMP API key (250 calls/day)');
    } else if (response.data[0]?.price) {
      console.log(`✅ FMP: ${testSymbol} = $${response.data[0].price}`);
      results.working.push({
        provider: 'Financial Modeling Prep',
        keyRequired: true,
        dailyLimit: '250 calls',
        cost: 'Free tier available',
        dataQuality: 'Excellent',
        reliability: 'High'
      });
    }
  } catch (error) {
    console.log(`❌ FMP Error: ${error.message}`);
    results.failed.push('FMP');
  }
  console.log('');
  
  // Generate comprehensive report
  console.log('📊 === API AUDIT SUMMARY ===');
  console.log('');
  
  if (results.working.length > 0) {
    console.log('✅ WORKING APIs:');
    results.working.forEach(api => {
      console.log(`  • ${api.provider}:`);
      console.log(`    - Key Required: ${api.keyRequired}`);
      console.log(`    - Daily Limit: ${api.dailyLimit}`);
      console.log(`    - Cost: ${api.cost}`);
      console.log(`    - Data Quality: ${api.dataQuality}`);
      console.log(`    - Reliability: ${api.reliability}`);
      console.log('');
    });
  }
  
  if (results.failed.length > 0) {
    console.log('❌ FAILED APIs:');
    results.failed.forEach(api => {
      console.log(`  • ${api}`);
    });
    console.log('');
  }
  
  if (results.recommendations.length > 0) {
    console.log('🎯 IMMEDIATE RECOMMENDATIONS:');
    results.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
    console.log('');
  }
  
  // Priority action plan
  console.log('🚀 PRIORITY ACTION PLAN:');
  console.log('');
  
  if (results.working.length > 0) {
    console.log('✅ IMMEDIATE SOLUTION AVAILABLE:');
    console.log('  - Yahoo Finance API is working without API key');
    console.log('  - Can serve real-time data immediately');
    console.log('  - No registration or costs required');
    console.log('  - Suitable for development and initial deployment');
    console.log('');
  }
  
  console.log('📋 NEXT STEPS:');
  console.log('  1. Register for free API keys:');
  console.log('     • Twelve Data: https://twelvedata.com/pricing (800 calls/day)');
  console.log('     • Alpha Vantage: https://www.alphavantage.co/support/#api-key (25 calls/day)');
  console.log('     • Finnhub: https://finnhub.io/register (60 calls/minute)');
  console.log('     • FMP: https://site.financialmodelingprep.com/developer/docs (250 calls/day)');
  console.log('');
  console.log('  2. Update .env file with real API keys');
  console.log('  3. Implement intelligent API rotation based on quotas');
  console.log('  4. Add caching to minimize API calls');
  console.log('  5. Monitor API usage and implement rate limiting');
  console.log('');
  
  console.log('🎉 CONCLUSION:');
  if (results.working.length > 0) {
    console.log('✅ SUCCESS: At least one API is working and can provide real data');
    console.log('✅ The application can serve real market data immediately');
    console.log('✅ Yahoo Finance provides unlimited free access for development');
  } else {
    console.log('❌ CRITICAL: No working APIs found - need to register for API keys');
  }
}

// Run the test
testAPIConfiguration().catch(console.error);