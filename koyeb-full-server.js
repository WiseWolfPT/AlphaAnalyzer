/**
 * Full Koyeb Server with Market Data Routes
 * This server includes all the backend functionality including caching
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import marketDataRoutes from './server/routes/market-data.ts';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow all origins in production for now
    callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'alfalyzer-backend-full',
    port: PORT,
    uptime: process.uptime()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'alfalyzer-backend-full',
    port: PORT,
    uptime: process.uptime(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      hasSupabase: !!process.env.SUPABASE_URL,
      hasApiKeys: {
        alphaVantage: !!process.env.ALPHA_VANTAGE_API_KEY,
        finnhub: !!process.env.FINNHUB_API_KEY,
        fmp: !!process.env.FMP_API_KEY,
        twelveData: !!process.env.TWELVE_DATA_API_KEY,
        polygon: !!process.env.POLYGON_API_KEY
      }
    }
  });
});

// Mount market data routes
app.use('/api/market-data', marketDataRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Alfalyzer Backend',
    status: 'running',
    endpoints: [
      '/health',
      '/api/health',
      '/api/market-data/health',
      '/api/market-data/config',
      '/api/market-data/quote/:symbol',
      '/api/market-data/quotes',
      '/api/market-data/chart/:symbol/:period',
      '/api/market-data/market-status',
      '/api/market-data/search'
    ],
    message: 'Full backend service with caching enabled'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Full backend server running on 0.0.0.0:${PORT}`);
  console.log(`🔗 Health check: http://0.0.0.0:${PORT}/api/health`);
  console.log(`🔗 Market data: http://0.0.0.0:${PORT}/api/market-data/config`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 API Keys configured: ${Object.entries(process.env).filter(([k]) => k.includes('API_KEY')).length}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});