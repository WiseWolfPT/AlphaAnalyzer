import express from 'express';
import cors from 'cors';
import Redis from 'redis';

const app = express();
app.use(cors());
app.use(express.json());

// Redis client
const redis = Redis.createClient({
  socket: {
    host: 'localhost',
    port: 6379
  }
});

redis.connect().then(() => {
  console.log('✅ Connected to Redis');
}).catch(err => {
  console.error('❌ Redis connection failed:', err);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});

// Get single quote - multiple patterns
app.get('/api/market-data/stocks/:symbol/quote', handleSingleQuote);
app.get('/api/market-data/quote/:symbol', handleSingleQuote);
app.get('/api/stocks/:symbol/quote', handleSingleQuote);
app.get('/api/stocks/:symbol', handleStockData);
app.get('/api/v1/stock/:symbol/quote', handleSingleQuote);

async function handleSingleQuote(req, res) {
  try {
    const { symbol } = req.params;
    const data = await redis.get(`quote:${symbol.toUpperCase()}`);
    
    if (data) {
      const parsed = JSON.parse(data);
      res.json({
        success: true,
        data: parsed.data,
        cached: true
      });
    } else {
      // Return mock data for symbols not in cache
      res.json({
        success: true,
        data: {
          symbol: symbol.toUpperCase(),
          price: Math.random() * 500,
          change: (Math.random() - 0.5) * 10,
          changePercent: (Math.random() - 0.5) * 5,
          volume: Math.floor(Math.random() * 10000000)
        },
        cached: false
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function handleStockData(req, res) {
  try {
    const { symbol } = req.params;
    const data = await redis.get(`quote:${symbol.toUpperCase()}`);
    
    if (data) {
      const parsed = JSON.parse(data);
      res.json({
        symbol: parsed.data.symbol,
        name: getStockName(parsed.data.symbol),
        sector: getStockSector(parsed.data.symbol),
        price: parsed.data.price,
        change: parsed.data.change,
        changePercent: parsed.data.changePercent,
        volume: parsed.data.volume,
        marketCap: parsed.data.price * 1000000000,
        peRatio: Math.random() * 30 + 10,
        week52High: parsed.data.price * 1.2,
        week52Low: parsed.data.price * 0.8
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Stock not found'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Batch quotes endpoints
app.get('/api/market-data/quotes/batch', handleBatchQuotes);
app.post('/api/market-data/quotes/batch', handleBatchQuotes);
app.post('/api/market-data/direct/batch', handleBatchQuotes);

async function handleBatchQuotes(req, res) {
  try {
    let symbols;
    
    if (req.method === 'POST') {
      symbols = req.body.symbols || [];
    } else {
      symbols = req.query.symbols ? req.query.symbols.split(',') : [];
    }
    
    const quotes = [];
    
    for (const symbol of symbols) {
      const data = await redis.get(`quote:${symbol.toUpperCase()}`);
      if (data) {
        const parsed = JSON.parse(data);
        quotes.push(parsed.data);
      }
    }
    
    res.json({
      success: true,
      data: {
        quotes,
        count: quotes.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Market status
app.get('/api/market-data/market/status', (req, res) => {
  res.json({
    success: true,
    data: {
      isOpen: true,
      status: 'open',
      session: 'regular',
      timestamp: Date.now()
    }
  });
});

app.get('/api/market-data/market-status', (req, res) => {
  res.json({
    success: true,
    data: {
      isOpen: true,
      status: 'open',
      session: 'regular',
      timestamp: Date.now()
    }
  });
});

// Market movers
app.get('/api/market-data/market/movers', (req, res) => {
  res.json({
    success: true,
    data: {
      gainers: [],
      losers: [],
      active: []
    }
  });
});

app.get('/api/market-data/movers/:type', (req, res) => {
  res.json({
    success: true,
    data: {
      movers: [],
      type: req.params.type
    }
  });
});

// Notifications
app.get('/api/notifications', (req, res) => {
  res.json({
    notifications: [],
    count: 0
  });
});

app.get('/api/alerts/notifications', (req, res) => {
  res.json({
    notifications: [],
    count: 0
  });
});

function getStockName(symbol) {
  const names = {
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corporation',
    'GOOGL': 'Alphabet Inc.',
    'AMZN': 'Amazon.com Inc.',
    'META': 'Meta Platforms Inc.',
    'NVDA': 'NVIDIA Corporation',
    'JPM': 'JPMorgan Chase & Co.',
    'V': 'Visa Inc.',
    'MA': 'Mastercard Inc.',
    'BAC': 'Bank of America Corp.',
    'WFC': 'Wells Fargo & Company',
    'BRK.B': 'Berkshire Hathaway Inc.',
    'JNJ': 'Johnson & Johnson',
    'UNH': 'UnitedHealth Group Inc.',
    'PFE': 'Pfizer Inc.'
  };
  return names[symbol] || symbol;
}

function getStockSector(symbol) {
  const sectors = {
    'AAPL': 'Technology',
    'MSFT': 'Technology',
    'GOOGL': 'Technology',
    'AMZN': 'Consumer Discretionary',
    'META': 'Technology',
    'NVDA': 'Technology',
    'JPM': 'Financial Services',
    'V': 'Financial Services',
    'MA': 'Financial Services',
    'BAC': 'Financial Services',
    'WFC': 'Financial Services',
    'BRK.B': 'Financial Services',
    'JNJ': 'Healthcare',
    'UNH': 'Healthcare',
    'PFE': 'Healthcare'
  };
  return sectors[symbol] || 'Unknown';
}

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`🚀 Complete backend running on http://localhost:${PORT}`);
});