import Redis from 'redis';

const redis = Redis.createClient({
  socket: {
    host: 'localhost',
    port: 6379
  },
  database: 1 // Use database 1 like the backend
});

const testData = {
  'AAPL': { symbol: 'AAPL', price: 248.50, change: 2.35, changePercent: 0.95, volume: 45234567 },
  'MSFT': { symbol: 'MSFT', price: 421.78, change: -1.22, changePercent: -0.29, volume: 23456789 },
  'GOOGL': { symbol: 'GOOGL', price: 178.65, change: 3.45, changePercent: 1.97, volume: 18234567 },
  'AMZN': { symbol: 'AMZN', price: 185.32, change: 4.12, changePercent: 2.27, volume: 34567890 },
  'META': { symbol: 'META', price: 512.34, change: -8.76, changePercent: -1.68, volume: 12345678 },
  'NVDA': { symbol: 'NVDA', price: 132.45, change: 5.67, changePercent: 4.47, volume: 234567890 },
  'JPM': { symbol: 'JPM', price: 198.76, change: 1.23, changePercent: 0.62, volume: 9876543 },
  'V': { symbol: 'V', price: 276.89, change: -2.34, changePercent: -0.84, volume: 6543210 },
  'MA': { symbol: 'MA', price: 456.78, change: 3.21, changePercent: 0.71, volume: 4567890 },
  'BAC': { symbol: 'BAC', price: 35.67, change: 0.45, changePercent: 1.28, volume: 45678901 },
  'WFC': { symbol: 'WFC', price: 58.90, change: -0.67, changePercent: -1.12, volume: 23456789 },
  'BRK.B': { symbol: 'BRK.B', price: 412.34, change: 2.56, changePercent: 0.63, volume: 3456789 },
  'JNJ': { symbol: 'JNJ', price: 156.78, change: -1.23, changePercent: -0.78, volume: 7890123 },
  'UNH': { symbol: 'UNH', price: 523.45, change: 4.56, changePercent: 0.88, volume: 2345678 },
  'PFE': { symbol: 'PFE', price: 28.90, change: -0.34, changePercent: -1.16, volume: 34567890 }
};

async function populateCache() {
  try {
    await redis.connect();
    console.log('✅ Connected to Redis');
    
    for (const [symbol, data] of Object.entries(testData)) {
      const cacheData = {
        data: {
          symbol: data.symbol,
          price: data.price,
          change: data.change,
          changePercent: data.changePercent,
          volume: data.volume,
          timestamp: Date.now()
        },
        cached: true,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      };
      
      await redis.set(
        `quote:${symbol}`,
        JSON.stringify(cacheData),
        { EX: 300 } // 5 minutes
      );
      
      console.log(`✅ Cached ${symbol} at $${data.price}`);
    }
    
    console.log('\n📊 Cache populated with', Object.keys(testData).length, 'stocks');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await redis.quit();
  }
}

populateCache();