// Ultra-simple server for Coolify - Pure JavaScript, no TypeScript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(cors({
  origin: '*', // Allow all origins for simplicity
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    uptime: process.uptime()
  });
});

// Market data health check
app.get('/api/market-data/health', (req, res) => {
  const hasRealData = !!(
    process.env.ALPHA_VANTAGE_API_KEY ||
    process.env.FINNHUB_API_KEY ||
    process.env.FMP_API_KEY
  );
  
  res.json({
    status: 'healthy',
    hasRealData,
    providers: {
      alphaVantage: !!process.env.ALPHA_VANTAGE_API_KEY,
      finnhub: !!process.env.FINNHUB_API_KEY,
      fmp: !!process.env.FMP_API_KEY,
      fiscalAI: !!process.env.FISCAL_AI_API_KEY
    }
  });
});

// Stock quote endpoint - simplified without cache
app.get('/api/market-data/quote/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }
  
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
    );
    const data = await response.json();
    
    if (data['Global Quote']) {
      const quote = data['Global Quote'];
      res.json({
        symbol: quote['01. symbol'],
        name: `${quote['01. symbol']} Corp`,
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        volume: parseInt(quote['06. volume']),
        latestTradingDay: quote['07. latest trading day'],
        source: 'api'
      });
    } else {
      res.status(404).json({ error: 'Stock not found' });
    }
  } catch (error) {
    console.error('Error fetching stock data:', error);
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'AlphaAnalyzer API',
    version: '1.0.0',
    status: 'running',
    port: PORT,
    endpoints: [
      '/api/health',
      '/api/market-data/health',
      '/api/market-data/quote/:symbol'
    ]
  });
});

// Catch all
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});