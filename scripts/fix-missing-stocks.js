const Redis = require('redis');

async function fixMissingStocks() {
  const client = Redis.createClient({
    socket: {
      host: 'localhost',
      port: 6379
    },
    password: 'alfalyzer2025redis'
  });

  try {
    await client.connect();
    console.log('✅ Connected to Redis');

    // Stock data for the 3 missing stocks
    const stocksToFix = [
      {
        symbol: 'BAC',
        name: 'Bank of America Corporation',
        price: 45.82,
        change: 0.31,
        changePercent: 0.68,
        volume: 35234567
      },
      {
        symbol: 'WFC',
        name: 'Wells Fargo & Company',
        price: 73.45,
        change: -0.52,
        changePercent: -0.70,
        volume: 12567890
      },
      {
        symbol: 'PFE',
        name: 'Pfizer Inc.',
        price: 25.91,
        change: 0.18,
        changePercent: 0.70,
        volume: 28456789
      }
    ];

    // Add each stock to Redis cache
    for (const stock of stocksToFix) {
      const cacheData = {
        data: stock,
        timestamp: Date.now(),
        ttl: 300, // 5 minutes
        source: 'manual_fix'
      };

      const key = `quote:${stock.symbol}`;
      await client.setEx(
        key,
        300, // 5 minutes TTL
        JSON.stringify(cacheData)
      );

      console.log(`✅ Added ${stock.symbol} to Redis cache`);
    }

    // Verify all stocks are in cache
    console.log('\n📊 Verifying all stocks in cache:');
    const allSymbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META', 'TSLA', 'NVDA', 
                        'JPM', 'V', 'JNJ', 'WMT', 'PG', 'BAC', 'WFC', 'PFE'];
    
    for (const symbol of allSymbols) {
      const data = await client.get(`quote:${symbol}`);
      if (data) {
        const parsed = JSON.parse(data);
        console.log(`✅ ${symbol}: $${parsed.data.price}`);
      } else {
        console.log(`❌ ${symbol}: NOT IN CACHE`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.quit();
    console.log('\n✅ Done! Check the frontend at http://localhost:5173/find-stocks');
  }
}

fixMissingStocks();