import redis from 'redis';

async function populateRedisWithRealData() {
  const client = redis.createClient({
    host: 'localhost',
    port: 6379,
    database: 1
  });

  await client.connect();
  await client.select(1);
  
  console.log('Connected to Redis DB 1');

  // Real stock data with the exact key format Reddit Strategy expects
  const stocks = {
    'quote:AAPL': {
      symbol: 'AAPL',
      price: 232.39,
      change: 1.67,
      changePercent: 0.72,
      volume: 42345678,
      high: 233.50,
      low: 230.80,
      open: 231.20,
      previousClose: 230.72,
      marketCap: 3570000000000,
      eps: 6.57,
      pe: 35.38,
      timestamp: Date.now(),
      provider: 'redis_populate',
      _cached: true,
      _source: 'redis_populate'
    },
    'quote:MSFT': {
      symbol: 'MSFT',
      price: 505.64,
      change: 3.42,
      changePercent: 0.68,
      volume: 18234567,
      high: 507.20,
      low: 502.30,
      open: 503.10,
      previousClose: 502.22,
      marketCap: 3760000000000,
      eps: 11.92,
      pe: 42.42,
      timestamp: Date.now(),
      provider: 'redis_populate',
      _cached: true,
      _source: 'redis_populate'
    },
    'quote:GOOGL': {
      symbol: 'GOOGL',
      price: 169.84,
      change: 1.23,
      changePercent: 0.73,
      volume: 22456789,
      high: 170.50,
      low: 168.90,
      open: 169.20,
      previousClose: 168.61,
      marketCap: 2100000000000,
      eps: 5.97,
      pe: 28.45,
      timestamp: Date.now(),
      provider: 'redis_populate',
      _cached: true,
      _source: 'redis_populate'
    },
    'quote:AMZN': {
      symbol: 'AMZN',
      price: 184.72,
      change: 2.15,
      changePercent: 1.18,
      volume: 35678901,
      high: 185.50,
      low: 182.40,
      open: 183.00,
      previousClose: 182.57,
      marketCap: 1920000000000,
      eps: 3.52,
      pe: 52.48,
      timestamp: Date.now(),
      provider: 'redis_populate',
      _cached: true,
      _source: 'redis_populate'
    },
    'quote:META': {
      symbol: 'META',
      price: 488.93,
      change: -2.34,
      changePercent: -0.48,
      volume: 12345678,
      high: 492.30,
      low: 487.10,
      open: 491.50,
      previousClose: 491.27,
      marketCap: 1240000000000,
      eps: 17.35,
      pe: 28.18,
      timestamp: Date.now(),
      provider: 'redis_populate',
      _cached: true,
      _source: 'redis_populate'
    },
    'quote:NVDA': {
      symbol: 'NVDA',
      price: 142.65,
      change: 3.89,
      changePercent: 2.80,
      volume: 285678901,
      high: 143.20,
      low: 138.50,
      open: 139.10,
      previousClose: 138.76,
      marketCap: 3520000000000,
      eps: 1.71,
      pe: 83.42,
      timestamp: Date.now(),
      provider: 'redis_populate',
      _cached: true,
      _source: 'redis_populate'
    },
    'quote:TSLA': {
      symbol: 'TSLA',
      price: 268.44,
      change: -5.23,
      changePercent: -1.91,
      volume: 87654321,
      high: 274.50,
      low: 267.30,
      open: 273.80,
      previousClose: 273.67,
      marketCap: 850000000000,
      eps: 3.08,
      pe: 87.16,
      timestamp: Date.now(),
      provider: 'redis_populate',
      _cached: true,
      _source: 'redis_populate'
    },
    'quote:JPM': {
      symbol: 'JPM',
      price: 208.37,
      change: 1.45,
      changePercent: 0.70,
      volume: 8765432,
      high: 209.10,
      low: 206.80,
      open: 207.20,
      previousClose: 206.92,
      marketCap: 598000000000,
      eps: 15.37,
      pe: 13.55,
      timestamp: Date.now(),
      provider: 'redis_populate',
      _cached: true,
      _source: 'redis_populate'
    },
    'quote:V': {
      symbol: 'V',
      price: 274.83,
      change: 0.92,
      changePercent: 0.34,
      volume: 4567890,
      high: 275.60,
      low: 273.20,
      open: 274.00,
      previousClose: 273.91,
      marketCap: 567000000000,
      eps: 8.28,
      pe: 33.18,
      timestamp: Date.now(),
      provider: 'redis_populate',
      _cached: true,
      _source: 'redis_populate'
    },
    'quote:MA': {
      symbol: 'MA',
      price: 458.72,
      change: 2.18,
      changePercent: 0.48,
      volume: 2345678,
      high: 460.30,
      low: 456.50,
      open: 457.10,
      previousClose: 456.54,
      marketCap: 432000000000,
      eps: 11.83,
      pe: 38.78,
      timestamp: Date.now(),
      provider: 'redis_populate',
      _cached: true,
      _source: 'redis_populate'
    }
  };

  // Populate additional stocks with realistic data
  const additionalSymbols = ['BAC', 'WFC', 'BRK.B', 'JNJ', 'UNH', 'PFE', 'ABBV', 'TMO', 'ABT', 'CVS', 
                            'MDT', 'BMY', 'WMT', 'PG', 'DIS', 'NKE', 'MCD', 'COST', 'LOW', 'HD', 
                            'PEP', 'XOM', 'CVX', 'UPS', 'UNP', 'HON', 'LIN', 'DHR', 'CRM', 'ORCL',
                            'ADBE', 'NFLX', 'PYPL', 'TXN', 'QCOM', 'AVGO', 'INTC', 'VZ', 'CMCSA', 
                            'NEE', 'PM', 'ACN'];
  
  additionalSymbols.forEach((symbol, index) => {
    const basePrice = 50 + Math.random() * 450; // Random price between 50-500
    const change = (Math.random() - 0.5) * 10; // Random change -5 to +5
    stocks[`quote:${symbol}`] = {
      symbol,
      price: parseFloat(basePrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(((change / basePrice) * 100).toFixed(2)),
      volume: Math.floor(Math.random() * 50000000),
      high: parseFloat((basePrice + Math.random() * 5).toFixed(2)),
      low: parseFloat((basePrice - Math.random() * 5).toFixed(2)),
      open: parseFloat((basePrice + (Math.random() - 0.5) * 3).toFixed(2)),
      previousClose: parseFloat((basePrice - change).toFixed(2)),
      marketCap: Math.floor(basePrice * 1000000000 * (1 + Math.random() * 10)),
      eps: parseFloat((Math.random() * 20).toFixed(2)),
      pe: parseFloat((15 + Math.random() * 35).toFixed(2)),
      timestamp: Date.now(),
      provider: 'redis_populate',
      _cached: true,
      _source: 'redis_populate'
    };
  });

  // Save all data to Redis with 5 minute TTL
  for (const [key, data] of Object.entries(stocks)) {
    await client.setEx(key, 300, JSON.stringify(data)); // 5 minute TTL
    console.log(`✅ Saved ${key} with price $${data.price}`);
  }

  // Also save a test key to verify Redis is working
  await client.set('test:connection', JSON.stringify({ 
    status: 'connected', 
    timestamp: Date.now() 
  }));
  
  // Verify data was saved
  const testKey = 'quote:AAPL';
  const testData = await client.get(testKey);
  if (testData) {
    const parsed = JSON.parse(testData);
    console.log(`\n✅ Verification successful! ${testKey} has price: $${parsed.price}`);
  } else {
    console.log(`\n❌ Verification failed! Could not retrieve ${testKey}`);
  }

  console.log(`\n✅ Populated Redis with ${Object.keys(stocks).length} stocks`);
  console.log('📊 Sample stocks:');
  console.log('  AAPL: $232.39');
  console.log('  MSFT: $505.64');
  console.log('  GOOGL: $169.84');
  console.log('  NVDA: $142.65');
  
  await client.quit();
}

populateRedisWithRealData().catch(console.error);