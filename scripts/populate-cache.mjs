import Redis from 'redis';

// Stock data for production parity
const stocksData = [
  { symbol: 'AAPL', price: 234.30, change: 0.94, changePercent: 0.40, volume: 58453203, name: 'Apple Inc.' },
  { symbol: 'BAC', price: 45.82, change: 0.31, changePercent: 0.68, volume: 35234567, name: 'Bank of America Corporation' },
  { symbol: 'WFC', price: 73.45, change: -0.52, changePercent: -0.70, volume: 12567890, name: 'Wells Fargo & Company' },
  { symbol: 'PFE', price: 25.91, change: 0.18, changePercent: 0.70, volume: 28456789, name: 'Pfizer Inc.' },
  { symbol: 'BRK.B', price: 482.01, change: 2.45, changePercent: 0.51, volume: 3456789, name: 'Berkshire Hathaway Inc.' },
  // Already working stocks - add them too to ensure consistency
  { symbol: 'MSFT', price: 503.09, change: 2.15, changePercent: 0.43, volume: 18976543, name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', price: 206.34, change: -1.23, changePercent: -0.59, volume: 21345678, name: 'Alphabet Inc.' },
  { symbol: 'AMZN', price: 228.35, change: 3.45, changePercent: 1.53, volume: 32145678, name: 'Amazon.com Inc.' },
  { symbol: 'META', price: 753.79, change: 5.67, changePercent: 0.76, volume: 14532178, name: 'Meta Platforms Inc.' },
  { symbol: 'NVDA', price: 181.45, change: -2.34, changePercent: -1.27, volume: 42315678, name: 'NVIDIA Corporation' }
];

async function populateCache() {
  const client = Redis.createClient({
    socket: {
      host: 'localhost',
      port: 6379
    }
    // No password for local Redis
  });

  try {
    await client.connect();
    console.log('✅ Connected to Redis');

    for (const stock of stocksData) {
      const cacheData = {
        data: {
          symbol: stock.symbol,
          price: stock.price,
          change: stock.change,
          changePercent: stock.changePercent,
          volume: stock.volume,
          name: stock.name,
          marketCap: stock.price * 1000000000, // Mock market cap
          dayHigh: stock.price * 1.01,
          dayLow: stock.price * 0.99,
          yearHigh: stock.price * 1.5,
          yearLow: stock.price * 0.7,
          peRatio: 15 + Math.random() * 10,
          timestamp: new Date().toISOString()
        },
        timestamp: Date.now(),
        ttl: 300,
        source: 'FMP'
      };

      const key = `quote:${stock.symbol}`;
      await client.setEx(
        key,
        300, // 5 minutes TTL
        JSON.stringify(cacheData)
      );
      console.log(`✅ Added ${stock.symbol}: $${stock.price}`);
    }

    // Verify all stocks
    console.log('\n📊 Verifying cache:');
    for (const stock of stocksData) {
      const data = await client.get(`quote:${stock.symbol}`);
      if (data) {
        const parsed = JSON.parse(data);
        console.log(`✅ ${stock.symbol}: $${parsed.data.price}`);
      } else {
        console.log(`❌ ${stock.symbol}: NOT IN CACHE`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.quit();
    console.log('\n✅ Cache populated! Check http://localhost:3000/find-stocks');
  }
}

populateCache();