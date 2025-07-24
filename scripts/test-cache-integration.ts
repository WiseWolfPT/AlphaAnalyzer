#!/usr/bin/env node
import 'dotenv/config';
import { CacheService } from '../server/services/cache/cache-service';
import { ProviderManager } from '../server/services/providers/provider-manager';
import { AlphaVantageProvider } from '../server/services/providers/alpha-vantage';
import { FinnhubProvider } from '../server/services/providers/finnhub';
import { PolygonProvider } from '../server/services/providers/polygon';

async function testCacheIntegration() {
  console.log('🧪 Testing Cache + Provider Integration...\n');

  // Initialize services
  const cacheService = new CacheService();
  const providerManager = new ProviderManager();

  // Add providers
  if (process.env.ALPHA_VANTAGE_API_KEY) {
    providerManager.addProvider(new AlphaVantageProvider(process.env.ALPHA_VANTAGE_API_KEY));
  }
  if (process.env.FINNHUB_API_KEY) {
    providerManager.addProvider(new FinnhubProvider(process.env.FINNHUB_API_KEY));
  }
  if (process.env.POLYGON_API_KEY) {
    providerManager.addProvider(new PolygonProvider(process.env.POLYGON_API_KEY));
  }

  // Test symbols
  const testSymbols = ['AAPL', 'GOOGL', 'MSFT'];

  console.log('1️⃣ Testing single quote with cache...');
  for (const symbol of testSymbols) {
    try {
      // First call - should miss cache
      console.log(`\n📊 Fetching ${symbol} (first call)...`);
      const start1 = Date.now();
      const result1 = await cacheService.getStockQuote(
        symbol,
        async () => await providerManager.getQuoteWithFallback(symbol)
      );
      const time1 = Date.now() - start1;
      console.log(`✅ ${symbol}: $${result1.data.price} (${time1}ms, cached: ${result1.cached})`);

      // Second call - should hit cache
      console.log(`📊 Fetching ${symbol} (second call)...`);
      const start2 = Date.now();
      const result2 = await cacheService.getStockQuote(
        symbol,
        async () => await providerManager.getQuoteWithFallback(symbol)
      );
      const time2 = Date.now() - start2;
      console.log(`✅ ${symbol}: $${result2.data.price} (${time2}ms, cached: ${result2.cached})`);
      
      if (result2.cached && time2 < time1 / 2) {
        console.log(`🎯 Cache working! Second call was ${Math.round(time1/time2)}x faster`);
      }
    } catch (error) {
      console.error(`❌ Error fetching ${symbol}:`, error);
    }
  }

  console.log('\n2️⃣ Testing batch quotes with cache...');
  try {
    // First batch call
    console.log('\n📊 Fetching batch (first call)...');
    const startBatch1 = Date.now();
    const batchResult1 = await cacheService.getBatchQuotes(
      testSymbols,
      async () => await providerManager.getBatchQuotesWithFallback(testSymbols)
    );
    const timeBatch1 = Date.now() - startBatch1;
    console.log(`✅ Batch fetched in ${timeBatch1}ms (cached: ${batchResult1.cached})`);

    // Second batch call
    console.log('📊 Fetching batch (second call)...');
    const startBatch2 = Date.now();
    const batchResult2 = await cacheService.getBatchQuotes(
      testSymbols,
      async () => await providerManager.getBatchQuotesWithFallback(testSymbols)
    );
    const timeBatch2 = Date.now() - startBatch2;
    console.log(`✅ Batch fetched in ${timeBatch2}ms (cached: ${batchResult2.cached})`);
    
    if (batchResult2.cached && timeBatch2 < timeBatch1 / 2) {
      console.log(`🎯 Batch cache working! Second call was ${Math.round(timeBatch1/timeBatch2)}x faster`);
    }
  } catch (error) {
    console.error('❌ Error fetching batch:', error);
  }

  console.log('\n3️⃣ Getting cache statistics...');
  try {
    const stats = await cacheService.getCacheStats();
    console.log('📊 Cache Stats:', stats);
  } catch (error) {
    console.error('❌ Error getting stats:', error);
  }

  console.log('\n4️⃣ Testing provider health status...');
  const providerStatus = providerManager.getProviderStatus();
  console.log('🏥 Provider Status:');
  providerStatus.forEach(status => {
    console.log(`  ${status.healthy ? '✅' : '❌'} ${status.name}: ${status.failureCount} failures`);
  });

  console.log('\n✅ Test completed!');
}

// Run the test
testCacheIntegration().catch(console.error);