#!/usr/bin/env node

const https = require('https');

// Wait a bit for the server to restart
setTimeout(() => {
  testProductionStocks();
}, 3000);

async function testProductionStocks() {
  console.log('🧪 Testing production find-stocks page...\n');
  
  const problemSymbols = ['BAC', 'WFC', 'BRK.B', 'PFE'];
  const allSymbols = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA',
    'JPM', 'V', 'MA', 'BAC', 'WFC', 'BRK.B',
    'JNJ', 'UNH', 'PFE'
  ];
  
  try {
    // Test API endpoint
    console.log('📊 Testing API endpoint...');
    const apiResponse = await fetchData(`https://128.140.45.28.sslip.io/api/market-data/quotes/batch?symbols=${allSymbols.join(',')}`);
    
    if (apiResponse.quotes) {
      console.log(`✅ API returned ${apiResponse.quotes.length} quotes\n`);
      
      // Check problem symbols
      console.log('🔍 Checking problematic symbols:');
      problemSymbols.forEach(symbol => {
        const quote = apiResponse.quotes.find(q => q.symbol === symbol);
        if (quote) {
          const status = quote.price > 0 ? '✅' : '❌';
          console.log(`${status} ${symbol}: $${quote.price} (${quote.provider})`);
        } else {
          console.log(`❌ ${symbol}: Not found in response`);
        }
      });
      
      console.log('\n📊 All symbols status:');
      apiResponse.quotes.forEach(quote => {
        const status = quote.price > 0 ? '✅' : '❌';
        console.log(`${status} ${quote.symbol}: $${quote.price}`);
      });
      
      // Summary
      const zeroPrice = apiResponse.quotes.filter(q => !q.price || q.price === 0);
      console.log(`\n📈 Summary:`);
      console.log(`Total symbols: ${apiResponse.quotes.length}`);
      console.log(`With valid prices: ${apiResponse.quotes.length - zeroPrice.length}`);
      console.log(`With $0.00: ${zeroPrice.length}`);
      
      if (zeroPrice.length > 0) {
        console.log('\n⚠️ Symbols still showing $0.00:');
        zeroPrice.forEach(q => console.log(`  - ${q.symbol}`));
      } else {
        console.log('\n✅ All stocks showing valid prices!');
      }
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

function fetchData(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { rejectUnauthorized: false }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}