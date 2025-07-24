#!/usr/bin/env node
import 'dotenv/config';
import { ProviderManager } from '../server/services/providers/provider-manager';
import { AlphaVantageProvider } from '../server/services/providers/alpha-vantage';
import { FinnhubProvider } from '../server/services/providers/finnhub';
import { PolygonProvider } from '../server/services/providers/polygon';
import { TwelveDataProvider } from '../server/services/providers/twelve-data';
import { FMPProvider } from '../server/services/providers/fmp';

async function testProvidersDirectly() {
  console.log('🧪 Testing Providers Directly (No Cache)...\n');

  // Initialize provider manager
  const providerManager = new ProviderManager();

  // Add all providers
  const providers = [
    { name: 'AlphaVantage', key: process.env.ALPHA_VANTAGE_API_KEY, Provider: AlphaVantageProvider },
    { name: 'Finnhub', key: process.env.FINNHUB_API_KEY, Provider: FinnhubProvider },
    { name: 'Polygon', key: process.env.POLYGON_API_KEY, Provider: PolygonProvider },
    { name: 'TwelveData', key: process.env.TWELVE_DATA_API_KEY, Provider: TwelveDataProvider },
    { name: 'FMP', key: process.env.FMP_API_KEY, Provider: FMPProvider }
  ];

  console.log('📋 Available Providers:');
  providers.forEach(({ name, key, Provider }) => {
    if (key) {
      providerManager.addProvider(new Provider(key));
      console.log(`✅ ${name}: API key configured`);
    } else {
      console.log(`❌ ${name}: No API key`);
    }
  });

  console.log('\n📊 Testing Individual Providers...\n');

  // Test individual providers
  for (const { name, key, Provider } of providers) {
    if (!key) continue;

    console.log(`\n🔍 Testing ${name}...`);
    const provider = new Provider(key);
    
    try {
      const start = Date.now();
      const quote = await provider.getQuote('AAPL');
      const time = Date.now() - start;
      
      console.log(`✅ ${name} Quote for AAPL:`);
      console.log(`   Price: $${quote.price}`);
      console.log(`   Change: ${quote.change} (${quote.change_percent}%)`);
      console.log(`   Volume: ${quote.volume.toLocaleString()}`);
      console.log(`   Time: ${time}ms`);
    } catch (error: any) {
      console.error(`❌ ${name} Error:`, error.message);
    }
  }

  console.log('\n📊 Testing Provider Manager with Fallback...\n');

  // Test symbols
  const testSymbols = ['AAPL', 'GOOGL', 'TSLA', 'INVALID_SYMBOL'];

  for (const symbol of testSymbols) {
    try {
      console.log(`\n🔍 Fetching ${symbol}...`);
      const start = Date.now();
      const quote = await providerManager.getQuoteWithFallback(symbol);
      const time = Date.now() - start;
      
      console.log(`✅ ${symbol} Quote (via ${quote.provider || 'unknown'}):`);
      console.log(`   Price: $${quote.price}`);
      console.log(`   Change: ${quote.change} (${quote.change_percent}%)`);
      console.log(`   Time: ${time}ms`);
    } catch (error: any) {
      console.error(`❌ ${symbol} Error:`, error.message);
    }
  }

  console.log('\n📊 Testing Batch Quotes...\n');

  const batchSymbols = ['AAPL', 'GOOGL', 'MSFT'];
  try {
    const start = Date.now();
    const quotes = await providerManager.getBatchQuotesWithFallback(batchSymbols);
    const time = Date.now() - start;
    
    console.log(`✅ Batch quotes fetched in ${time}ms:`);
    batchSymbols.forEach(symbol => {
      const quote = quotes[symbol];
      if (quote) {
        console.log(`   ${symbol}: $${quote.price} (${quote.change_percent > 0 ? '+' : ''}${quote.change_percent}%)`);
      }
    });
  } catch (error: any) {
    console.error('❌ Batch Error:', error.message);
  }

  console.log('\n🏥 Provider Health Status:');
  const status = providerManager.getProviderStatus();
  status.forEach(s => {
    console.log(`   ${s.healthy ? '✅' : '❌'} ${s.name}: ${s.failureCount} failures`);
  });

  console.log('\n✅ Test completed!');
}

// Run the test
testProvidersDirectly().catch(console.error);