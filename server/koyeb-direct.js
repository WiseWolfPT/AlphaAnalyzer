// Ultra-simple direct server for Koyeb - no TypeScript, minimal dependencies
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Log startup info
console.log('🚀 Starting Koyeb Direct Server...');
console.log('📌 Port:', PORT);
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
console.log('🔑 API Keys configured:', {
  alphaVantage: !!process.env.ALPHA_VANTAGE_API_KEY,
  finnhub: !!process.env.FINNHUB_API_KEY,
  fmp: !!process.env.FMP_API_KEY
});

// Basic middleware
app.use(cors({
  origin: true,  // Allow all origins for now
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    server: 'koyeb-direct'
  });
});

// Market data health check
app.get('/api/market-data/health', (req, res) => {
  res.json({
    status: 'healthy',
    hasRealData: !!(process.env.ALPHA_VANTAGE_API_KEY || process.env.FINNHUB_API_KEY || process.env.FMP_API_KEY),
    providers: {
      alphaVantage: !!process.env.ALPHA_VANTAGE_API_KEY,
      finnhub: !!process.env.FINNHUB_API_KEY,
      fmp: !!process.env.FMP_API_KEY
    },
    server: 'koyeb-direct'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'AlphaAnalyzer API (Koyeb Direct)',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      '/api/health',
      '/api/market-data/health'
    ],
    server: 'koyeb-direct'
  });
});

// Simple echo endpoint for testing
app.get('/api/echo/:message', (req, res) => {
  res.json({
    echo: req.params.message,
    timestamp: new Date().toISOString()
  });
});

// Catch all 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Health check: http://0.0.0.0:${PORT}/api/health`);
});