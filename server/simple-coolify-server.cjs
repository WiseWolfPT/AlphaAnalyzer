#!/usr/bin/env node

/**
 * Simple Coolify Server - Minimal API for Alfalyzer
 * Provides basic endpoints for frontend connectivity
 */

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Starting Alfalyzer Backend (Simple Mode)...');
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`📍 Port: ${PORT}`);

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// Enable compression
app.use(compression());

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow all origins for now
    callback(null, true);
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
    server: 'coolify-simple',
    timestamp: new Date().toISOString()
  });
});

// Mock market data endpoints
app.get('/api/stocks/:symbol', (req, res) => {
  const { symbol } = req.params;
  res.json({
    symbol: symbol.toUpperCase(),
    name: `${symbol.toUpperCase()} Company`,
    price: 150.00,
    change: 2.50,
    changePercent: 1.67,
    volume: 1000000,
    marketCap: 2000000000,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/market-data/quote/:symbol', (req, res) => {
  const { symbol } = req.params;
  res.json({
    symbol: symbol.toUpperCase(),
    price: 150.00,
    previousClose: 147.50,
    open: 148.00,
    high: 152.00,
    low: 147.00,
    volume: 1000000,
    change: 2.50,
    changePercent: 1.67,
    timestamp: new Date().toISOString()
  });
});

// Mock portfolio endpoints
app.get('/api/portfolios', (req, res) => {
  res.json([]);
});

app.get('/api/watchlists', (req, res) => {
  res.json([]);
});

// Mock auth endpoints
app.post('/api/auth/login', (req, res) => {
  res.json({
    token: 'mock-jwt-token',
    user: {
      id: '1',
      email: 'user@example.com'
    }
  });
});

app.post('/api/auth/register', (req, res) => {
  res.json({
    message: 'Registration successful',
    user: {
      id: '1',
      email: req.body.email
    }
  });
});

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
  console.log(`📍 Available endpoints:`);
  console.log(`   - GET /api/stocks/:symbol`);
  console.log(`   - GET /api/market-data/quote/:symbol`);
  console.log(`   - GET /api/portfolios`);
  console.log(`   - GET /api/watchlists`);
  console.log(`   - POST /api/auth/login`);
  console.log(`   - POST /api/auth/register`);
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