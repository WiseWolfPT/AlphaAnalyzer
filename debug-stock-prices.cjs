#!/usr/bin/env node

const https = require('https');

// Símbolos problemáticos
const problemSymbols = ['BAC', 'WFC', 'BRK-B', 'PFE'];

// Função para buscar dados da API
function fetchBatchQuotes(symbols) {
  return new Promise((resolve, reject) => {
    const url = `https://128.140.45.28.sslip.io/api/market-data/quotes/batch?symbols=${symbols.join(',')}`;
    
    https.get(url, { rejectUnauthorized: false }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Simular transformação do frontend
function transformQuotes(quotesData) {
  if (!quotesData?.quotes || !Array.isArray(quotesData.quotes)) {
    console.log('❌ Quotes data not ready or invalid:', quotesData);
    return [];
  }
  
  try {
    return quotesData.quotes
      .filter(quote => quote != null)
      .map((quote, index) => ({
        id: index + 1,
        symbol: quote.symbol || 'UNKNOWN',
        price: (quote?.price != null && !isNaN(Number(quote.price))) 
          ? Number(quote.price).toFixed(2) 
          : '0.00',
        change: (quote?.change != null && !isNaN(Number(quote.change))) 
          ? Number(quote.change).toFixed(2) 
          : '0.00',
        changePercent: (quote?.changePercent != null && !isNaN(Number(quote.changePercent))) 
          ? Number(quote.changePercent).toFixed(2) 
          : '0.00',
        _isRealData: !quote._cached,
        _provider: quote.provider || 'unknown',
        _cached: quote._cached || false,
        _raw: quote // Keep raw data for debug
      }));
  } catch (err) {
    console.error('❌ Error transforming quotes data:', err);
    return [];
  }
}

// Main test
async function testStockPrices() {
  console.log('🧪 Testing stock prices for problematic symbols...\n');
  
  try {
    // Test 1: Fetch batch quotes
    console.log('📊 Test 1: Fetching batch quotes from API...');
    const apiData = await fetchBatchQuotes(problemSymbols);
    console.log(`✅ Received ${apiData.quotes?.length || 0} quotes\n`);
    
    // Test 2: Check raw data
    console.log('📊 Test 2: Raw API data for each symbol:');
    apiData.quotes?.forEach(quote => {
      console.log(`${quote.symbol}: price=${quote.price}, provider=${quote.provider}, isStale=${quote.isStale || false}`);
    });
    console.log('');
    
    // Test 3: Transform data like frontend
    console.log('📊 Test 3: Transform data like frontend does:');
    const transformed = transformQuotes(apiData);
    transformed.forEach(stock => {
      console.log(`${stock.symbol}: price=$${stock.price} (was: ${stock._raw.price})`);
    });
    console.log('');
    
    // Test 4: Check for 0.00 prices
    console.log('📊 Test 4: Check for $0.00 prices:');
    const zeroPrice = transformed.filter(s => s.price === '0.00');
    if (zeroPrice.length > 0) {
      console.log('❌ Found stocks with $0.00:');
      zeroPrice.forEach(s => {
        console.log(`  - ${s.symbol}: raw price was ${s._raw.price}`);
      });
    } else {
      console.log('✅ No stocks with $0.00 found!');
    }
    console.log('');
    
    // Test 5: Check specific symbol issues
    console.log('📊 Test 5: Check symbol-specific issues:');
    
    // Check BRK-B specifically
    const brkb = transformed.find(s => s.symbol === 'BRK-B');
    if (brkb) {
      console.log(`BRK-B details:`);
      console.log(`  - Raw price: ${brkb._raw.price}`);
      console.log(`  - Transformed price: ${brkb.price}`);
      console.log(`  - Provider: ${brkb._provider}`);
      console.log(`  - Is synthetic: ${brkb._provider === 'synthetic'}`);
    } else {
      console.log('❌ BRK-B not found in results!');
    }
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`Total symbols requested: ${problemSymbols.length}`);
    console.log(`Total quotes received: ${apiData.quotes?.length || 0}`);
    console.log(`Total transformed: ${transformed.length}`);
    console.log(`Stocks with $0.00: ${zeroPrice.length}`);
    
    // Check if any symbol is missing
    const receivedSymbols = transformed.map(s => s.symbol);
    const missingSymbols = problemSymbols.filter(s => !receivedSymbols.includes(s));
    if (missingSymbols.length > 0) {
      console.log(`❌ Missing symbols: ${missingSymbols.join(', ')}`);
    } else {
      console.log('✅ All symbols received');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test
testStockPrices();
