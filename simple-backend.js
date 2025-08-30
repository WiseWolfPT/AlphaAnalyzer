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

// Get single quote - multiple route patterns
app.get('/api/market-data/stocks/:symbol/quote', handleSingleQuote);
app.get('/api/market-data/quote/:symbol', handleSingleQuote);
app.get('/api/stocks/:symbol/quote', handleSingleQuote);
app.get('/api/stocks/:symbol', handleStockData);
app.get('/api/v1/stock/:symbol/quote', handleSingleQuote);

async function handleStockData(req, res) {
  try {
    const { symbol } = req.params;
    const data = await redis.get(`quote:${symbol.toUpperCase()}`);
    
    if (data) {
      const parsed = JSON.parse(data);
      // Return in the format expected by the frontend
      res.json({
        symbol: parsed.data.symbol,
        name: getStockName(parsed.data.symbol),
        sector: getStockSector(parsed.data.symbol),
        price: parsed.data.price,
        change: parsed.data.change,
        changePercent: parsed.data.changePercent,
        volume: parsed.data.volume,
        marketCap: parsed.data.price * 1000000000, // Mock market cap
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
      res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Get batch quotes (both GET and POST)
const handleBatchQuotes = async (req, res) => {
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
};

app.get('/api/market-data/quotes/batch', handleBatchQuotes);
app.post('/api/market-data/quotes/batch', handleBatchQuotes);

// Direct batch endpoint (alias for quotes/batch)
app.post('/api/market-data/direct/batch', handleBatchQuotes);

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

// Market movers (mock)
app.get('/api/market-data/movers/:type', (req, res) => {
  res.json({
    success: true,
    data: {
      movers: [],
      type: req.params.type
    }
  });
});

// Market movers without type
app.get('/api/market-data/market/movers', (req, res) => {
  res.json({
    success: true,
    data: {
      gainers: [],
      losers: [],
      mostActive: []
    }
  });
});

// Notifications (mock)
app.get('/api/alerts/notifications', (req, res) => {
  res.json({
    notifications: [],
    count: 0
  });
});

// Notifications (mock)
app.get('/api/notifications', (req, res) => {
  res.json({
    notifications: [],
    count: 0
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Simple backend running on http://localhost:${PORT}`);
});