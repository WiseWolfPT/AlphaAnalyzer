import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api/v2/market-data';

async function testMarketDataAPI() {
  console.log('🧪 Testing Market Data V2 API...\n');

  try {
    // Test 1: Get real-time price
    console.log('1️⃣ Testing real-time price endpoint...');
    const priceResponse = await axios.get(`${API_BASE_URL}/stocks/AAPL/price`);
    console.log('✅ Price data:', priceResponse.data);
    console.log(`   Price: $${priceResponse.data.data.price}`);
    console.log(`   Change: ${priceResponse.data.data.change} (${priceResponse.data.data.changePercent}%)`);
    console.log(`   Provider: ${priceResponse.data.data.provider}`);
    console.log(`   Cached: ${priceResponse.data.cached}\n`);

    // Test 2: Get company info
    console.log('2️⃣ Testing company info endpoint...');
    const companyResponse = await axios.get(`${API_BASE_URL}/stocks/MSFT/company`);
    console.log('✅ Company data:', companyResponse.data.data);
    console.log(`   Name: ${companyResponse.data.data.name}`);
    console.log(`   Sector: ${companyResponse.data.data.sector}\n`);

    // Test 3: Get fundamentals
    console.log('3️⃣ Testing fundamentals endpoint...');
    const fundamentalsResponse = await axios.get(`${API_BASE_URL}/stocks/GOOGL/fundamentals`);
    console.log('✅ Fundamentals:', fundamentalsResponse.data.data);
    console.log(`   Market Cap: $${(fundamentalsResponse.data.data.marketCap / 1e9).toFixed(2)}B`);
    console.log(`   P/E Ratio: ${fundamentalsResponse.data.data.pe}\n`);

    // Test 4: Get news
    console.log('4️⃣ Testing news endpoint...');
    const newsResponse = await axios.get(`${API_BASE_URL}/stocks/TSLA/news?limit=3`);
    console.log('✅ News items:', newsResponse.data.data.items.length);
    newsResponse.data.data.items.forEach((item: any, index: number) => {
      console.log(`   ${index + 1}. ${item.headline}`);
      console.log(`      Source: ${item.source} | Sentiment: ${item.sentiment}`);
    });
    console.log('');

    // Test 5: Batch prices
    console.log('5️⃣ Testing batch prices endpoint...');
    const batchResponse = await axios.post(`${API_BASE_URL}/stocks/batch/prices`, {
      symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN']
    });
    console.log('✅ Batch prices:', batchResponse.data.requested, 'requested,', batchResponse.data.returned, 'returned');
    batchResponse.data.data.forEach((stock: any) => {
      console.log(`   ${stock.symbol}: $${stock.price}`);
    });
    console.log('');

    // Test 6: Check quota status
    console.log('6️⃣ Testing quota status endpoint...');
    const quotaResponse = await axios.get(`${API_BASE_URL}/quota/status`);
    console.log('✅ Quota usage:');
    Object.entries(quotaResponse.data.data.usage).forEach(([provider, usage]: [string, any]) => {
      console.log(`   ${provider}: ${usage.today} calls today, ${usage.lastMinute} in last minute`);
      if (usage.quotaRemaining.daily) {
        console.log(`      Daily remaining: ${usage.quotaRemaining.daily}`);
      }
    });
    console.log('');

    // Test 7: Check system status
    console.log('7️⃣ Testing system status endpoint...');
    const systemResponse = await axios.get(`${API_BASE_URL}/system/status`);
    console.log('✅ System status:', systemResponse.data.data.initialized ? 'Operational' : 'Not ready');
    console.log(`   Providers: ${systemResponse.data.data.providers.length}`);
    console.log(`   Cache: ${systemResponse.data.data.cache?.size || 0} items\n`);

    // Test 8: Check metrics
    console.log('8️⃣ Testing metrics endpoint...');
    const metricsResponse = await axios.get(`${API_BASE_URL}/metrics`);
    const metrics = metricsResponse.data.data;
    console.log('✅ Metrics summary:');
    console.log(`   Total API calls: ${metrics.counters.api_calls_total?.count || 0}`);
    console.log(`   Cache hits: ${metrics.counters.api_calls_cache_hit?.count || 0}`);
    console.log(`   Cache misses: ${metrics.counters.api_calls_cache_miss?.count || 0}`);
    
    // Test cache by making same request again
    console.log('\n9️⃣ Testing cache behavior...');
    const cachedPriceResponse = await axios.get(`${API_BASE_URL}/stocks/AAPL/price`);
    console.log('✅ Second request cached:', cachedPriceResponse.data.cached);

    console.log('\n✅ All tests completed successfully!');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run the tests
testMarketDataAPI();