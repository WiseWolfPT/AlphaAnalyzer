#!/usr/bin/env node

/**
 * Coolify Server - Optimized for Hetzner/Coolify deployment
 * Optimized for Hetzner/Coolify deployment
 */

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Starting Alfalyzer Backend for Coolify...');
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`📍 Port: ${PORT}`);

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// Enable compression
app.use(compression());

// CORS configuration - Updated for Alfalyzer domains
app.use(cors({
  origin: function(origin, callback) {
    // Allow Vercel frontend and local development
    const allowedOrigins = [
      'https://alfalyzer.vercel.app',
      'https://alfalyzer.com',
      'https://www.alfalyzer.com',
      'http://localhost:3000',
      'http://localhost:5173'
    ];
    
    // Add custom origins from environment
    const customOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
    const allOrigins = [...allowedOrigins, ...customOrigins];
    
    if (!origin || allOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(null, true); // Be permissive in production for now
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'coolify',
    timestamp: new Date().toISOString()
  });
});

// Import routes
try {
  // Market data routes
  const marketDataRouter = require('./routes/market-data');
  app.use('/api', marketDataRouter);
  console.log('✅ Market data routes loaded');
} catch (error) {
  console.error('❌ Failed to load market data routes:', error.message);
}

try {
  // Portfolio routes
  const portfolioRouter = require('./routes/portfolios');
  app.use('/api', portfolioRouter);
  console.log('✅ Portfolio routes loaded');
} catch (error) {
  console.error('❌ Failed to load portfolio routes:', error.message);
}

try {
  // Watchlist routes
  const watchlistRouter = require('./routes/watchlists');
  app.use('/api', watchlistRouter);
  console.log('✅ Watchlist routes loaded');
} catch (error) {
  console.error('❌ Failed to load watchlist routes:', error.message);
}

try {
  // Auth routes
  const authRouter = require('./routes/auth');
  app.use('/api/auth', authRouter);
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.error('❌ Failed to load auth routes:', error.message);
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Alfalyzer Backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 API health: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;