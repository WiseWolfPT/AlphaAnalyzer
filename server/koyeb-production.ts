/**
 * Koyeb Production Configuration
 * This file contains specific configurations for running on Koyeb
 */

import express from 'express';
import { createServer } from 'http';

export function startKoyebServer(app: express.Application) {
  const port = parseInt(process.env.PORT || '8000', 10);
  const server = createServer(app);
  
  // CRITICAL: Koyeb requires binding to 0.0.0.0
  const host = '0.0.0.0';
  
  console.log('🚀 Starting Koyeb Production Server...');
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`📍 Port: ${port}`);
  console.log(`📍 Host: ${host}`);
  
  // Add Koyeb-specific middleware
  app.use((req, res, next) => {
    // Log all incoming requests for debugging
    console.log(`${new Date().toISOString()} ${req.method} ${req.path} from ${req.headers.origin || 'no-origin'}`);
    next();
  });
  
  // Health check endpoint with detailed info
  app.get('/api/health/koyeb', (req, res) => {
    res.json({
      status: 'healthy',
      platform: 'koyeb',
      timestamp: new Date().toISOString(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: port,
        KOYEB_APP_URL: process.env.KOYEB_APP_URL,
        KOYEB_SERVICE_NAME: process.env.KOYEB_SERVICE_NAME,
        KOYEB_REGION: process.env.KOYEB_REGION,
      },
      request: {
        origin: req.headers.origin,
        host: req.headers.host,
        ip: req.ip,
        protocol: req.protocol,
      }
    });
  });
  
  // Start server with error handling
  server.listen(port, host, () => {
    console.log('✅ Koyeb server started successfully!');
    console.log(`🌐 Server listening on ${host}:${port}`);
    console.log(`🔗 Health check: http://${host}:${port}/health`);
    console.log(`🔗 API health: http://${host}:${port}/api/health`);
    console.log(`🔗 Market data health: http://${host}:${port}/api/market-data/health`);
    
    // Test endpoints
    testEndpoints(port);
  });
  
  server.on('error', (error: any) => {
    console.error('❌ Server error:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use`);
    } else if (error.code === 'EACCES') {
      console.error(`Permission denied to bind to port ${port}`);
    }
    process.exit(1);
  });
  
  return server;
}

function testEndpoints(port: number) {
  // Import dynamically to avoid module loading issues
  import('http').then(http => {
    setTimeout(() => {
      console.log('🧪 Testing endpoints...');
      
      // Test health endpoint
      http.get(`http://localhost:${port}/health`, (res) => {
        console.log(`✅ /health endpoint: ${res.statusCode}`);
      }).on('error', (err) => {
        console.error('❌ /health endpoint error:', err.message);
      });
      
      // Test API health
      http.get(`http://localhost:${port}/api/health`, (res) => {
        console.log(`✅ /api/health endpoint: ${res.statusCode}`);
      }).on('error', (err) => {
        console.error('❌ /api/health endpoint error:', err.message);
      });
      
      // Test market data health
      http.get(`http://localhost:${port}/api/market-data/health`, (res) => {
        console.log(`✅ /api/market-data/health endpoint: ${res.statusCode}`);
      }).on('error', (err) => {
        console.error('❌ /api/market-data/health endpoint error:', err.message);
      });
    }, 2000); // Wait 2 seconds for server to fully start
  });
}

// Export GET endpoints for market data that were missing
export function setupMarketDataGETEndpoints(router: express.Router) {
  // GET version of batch quotes for simple testing
  router.get('/quotes', (req, res) => {
    const symbols = (req.query.symbols as string)?.split(',') || [];
    
    if (symbols.length === 0) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'No symbols provided. Use ?symbols=AAPL,GOOGL,MSFT'
      });
    }
    
    // Return mock data for testing
    const mockQuotes = symbols.map(symbol => ({
      symbol: symbol.toUpperCase(),
      price: 100 + Math.random() * 200,
      change: (Math.random() - 0.5) * 10,
      changePercent: (Math.random() - 0.5) * 5,
      volume: Math.floor(Math.random() * 10000000),
      timestamp: Date.now(),
      provider: 'mock'
    }));
    
    res.json({
      quotes: mockQuotes,
      _timestamp: Date.now(),
      _cached: false
    });
  });
  
  // Market status endpoint
  router.get('/status', (req, res) => {
    const now = new Date();
    const hour = now.getUTCHours();
    const day = now.getUTCDay();
    
    // Simple market hours check (NYSE: 9:30 AM - 4:00 PM ET, which is 14:30 - 21:00 UTC)
    const isWeekday = day >= 1 && day <= 5;
    const isMarketHours = hour >= 14 && hour < 21;
    const isOpen = isWeekday && isMarketHours;
    
    res.json({
      market: 'NYSE',
      isOpen,
      session: isOpen ? 'regular' : 'closed',
      timestamp: now.toISOString(),
      nextOpen: isOpen ? null : getNextMarketOpen(now),
      nextClose: isOpen ? getNextMarketClose(now) : null
    });
  });
}

function getNextMarketOpen(now: Date): string {
  const next = new Date(now);
  next.setUTCHours(14, 30, 0, 0);
  
  // If it's already past market open today, move to next day
  if (now.getUTCHours() >= 14) {
    next.setDate(next.getDate() + 1);
  }
  
  // Skip to Monday if it's weekend
  while (next.getUTCDay() === 0 || next.getUTCDay() === 6) {
    next.setDate(next.getDate() + 1);
  }
  
  return next.toISOString();
}

function getNextMarketClose(now: Date): string {
  const close = new Date(now);
  close.setUTCHours(21, 0, 0, 0);
  return close.toISOString();
}