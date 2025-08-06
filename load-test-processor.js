/**
 * Artillery Load Test Processor
 * Provides dynamic data and custom functions for load testing
 */

// Popular stock symbols for testing
const STOCK_SYMBOLS = [
  'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM',
  'V', 'JNJ', 'WMT', 'PG', 'UNH', 'DIS', 'MA', 'HD', 'PYPL', 'BAC',
  'VZ', 'ADBE', 'NFLX', 'CMCSA', 'PFE', 'KO', 'PEP', 'TMO', 'CSCO',
  'ABT', 'CRM', 'ABBV', 'NKE', 'CVX', 'ACN', 'COST', 'WFC', 'MCD',
  'NEE', 'TXN', 'DHR', 'UPS', 'BMY', 'UNP', 'RTX', 'LIN', 'QCOM',
  'LOW', 'ORCL', 'HON', 'AMT', 'IBM', 'SPGI', 'GS', 'INTU', 'BLK'
];

// Company names for search testing
const COMPANY_NAMES = [
  'Apple', 'Google', 'Microsoft', 'Amazon', 'Tesla', 'Meta', 'Netflix',
  'Disney', 'Nike', 'Coca Cola', 'Pepsi', 'Johnson', 'Walmart', 'Visa',
  'PayPal', 'Adobe', 'Oracle', 'Intel', 'AMD', 'Nvidia'
];

// User IDs for portfolio testing (simulated)
const USER_IDS = Array.from({ length: 100 }, (_, i) => `user${i + 1}`);

/**
 * Before request hook - adds random data to context
 */
function setRandomData(requestParams, context, ee, next) {
  // Add random stock symbol
  context.vars.randomSymbol = STOCK_SYMBOLS[Math.floor(Math.random() * STOCK_SYMBOLS.length)];
  
  // Add random company name
  context.vars.randomCompany = COMPANY_NAMES[Math.floor(Math.random() * COMPANY_NAMES.length)];
  
  // Add random user ID
  context.vars.randomUserId = USER_IDS[Math.floor(Math.random() * USER_IDS.length)];
  
  // Add batch of random symbols (5-10 stocks)
  const batchSize = Math.floor(Math.random() * 6) + 5;
  const shuffled = [...STOCK_SYMBOLS].sort(() => Math.random() - 0.5);
  context.vars.randomBatch = shuffled.slice(0, batchSize).join(',');
  
  // Add timestamp for tracking
  context.vars.timestamp = Date.now();
  
  return next();
}

/**
 * After response hook - log slow requests
 */
function logSlowRequests(requestParams, response, context, ee, next) {
  const responseTime = Date.now() - context.vars.timestamp;
  
  // Log requests taking more than 1 second
  if (responseTime > 1000) {
    console.log(`⚠️ Slow request detected: ${requestParams.url} took ${responseTime}ms`);
  }
  
  // Track cache hits
  if (response.headers && response.headers['x-cache-hit']) {
    context.vars.cacheHits = (context.vars.cacheHits || 0) + 1;
  }
  
  return next();
}

/**
 * Generate random portfolio data
 */
function generatePortfolioData(context, events, done) {
  // Create a random portfolio
  const portfolioSize = Math.floor(Math.random() * 10) + 5;
  const portfolio = [];
  
  for (let i = 0; i < portfolioSize; i++) {
    portfolio.push({
      symbol: STOCK_SYMBOLS[Math.floor(Math.random() * STOCK_SYMBOLS.length)],
      shares: Math.floor(Math.random() * 100) + 1,
      avgPrice: Math.random() * 500 + 50
    });
  }
  
  context.vars.portfolio = portfolio;
  return done();
}

/**
 * Custom metrics collection
 */
function collectMetrics(requestParams, response, context, ee, next) {
  // Emit custom metrics
  if (response.statusCode === 200) {
    ee.emit('counter', 'api.success', 1);
  } else if (response.statusCode === 429) {
    ee.emit('counter', 'api.rate_limited', 1);
    console.log('🚫 Rate limit hit!');
  } else if (response.statusCode >= 500) {
    ee.emit('counter', 'api.server_error', 1);
    console.log(`❌ Server error: ${response.statusCode} at ${requestParams.url}`);
  }
  
  // Track cache performance
  if (response.headers && response.headers['x-cache-hit'] === 'true') {
    ee.emit('counter', 'cache.hits', 1);
  } else {
    ee.emit('counter', 'cache.misses', 1);
  }
  
  return next();
}

/**
 * Simulate market hours behavior
 */
function isMarketHours() {
  const now = new Date();
  const hours = now.getUTCHours();
  const day = now.getUTCDay();
  
  // NYSE hours: 9:30 AM - 4:00 PM ET (14:30 - 21:00 UTC)
  // Monday = 1, Friday = 5
  return day >= 1 && day <= 5 && hours >= 14 && hours <= 21;
}

/**
 * Adjust load based on market hours
 */
function adjustLoadForMarketHours(context, events, done) {
  if (isMarketHours()) {
    // During market hours, increase activity
    context.vars.thinkTime = Math.random() * 3 + 1; // 1-4 seconds
  } else {
    // Outside market hours, decrease activity
    context.vars.thinkTime = Math.random() * 10 + 5; // 5-15 seconds
  }
  
  return done();
}

// Export all functions for Artillery (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
  setRandomData,
  logSlowRequests,
  generatePortfolioData,
  collectMetrics,
  adjustLoadForMarketHours,
  
  // Export data for direct use if needed
  STOCK_SYMBOLS,
  COMPANY_NAMES,
  USER_IDS
  };
}