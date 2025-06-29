#!/usr/bin/env node

/**
 * EMERGENCY SERVER - ULTRATHINK PARALLEL EXECUTION
 * 
 * This server implements multiple binding strategies to ensure
 * the application starts reliably regardless of network configuration.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { createServer } = require('http');

// Load environment variables
require('dotenv').config();

const app = express();

// Basic middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve static files
const clientPath = path.join(__dirname, '..', 'client');
const publicPath = path.join(clientPath, 'public');
const distPath = path.join(__dirname, '..', 'dist', 'public');

// Try to serve from multiple locations
if (fs.existsSync(distPath)) {
  console.log('✅ Serving built files from:', distPath);
  app.use(express.static(distPath));
} else if (fs.existsSync(publicPath)) {
  console.log('✅ Serving public files from:', publicPath);
  app.use(express.static(publicPath));
} else {
  console.log('⚠️  No static files found, creating minimal index');
  app.get('/', (req, res) => {
    res.send(`
      <html>
        <head><title>Alfalyzer - Emergency Server</title></head>
        <body>
          <h1>🚀 Alfalyzer Emergency Server</h1>
          <p>Server is running on port ${process.env.PORT || 3001}</p>
          <p>Status: <strong>ACTIVE</strong></p>
          <p>Time: ${new Date().toISOString()}</p>
          <a href="/api/health">Check API Health</a>
        </body>
      </html>
    `);
  });
}

// Basic API routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: 'emergency-server',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 3001,
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/stocks', (req, res) => {
  res.json({
    message: 'Emergency server active',
    data: [
      { symbol: 'AAPL', price: 150.25, change: '+2.15' },
      { symbol: 'GOOGL', price: 2800.50, change: '-5.75' },
      { symbol: 'MSFT', price: 300.75, change: '+1.25' }
    ],
    timestamp: new Date().toISOString()
  });
});

// Catch all route
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    // Try to serve index.html or create a minimal response
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.send(`
        <html>
          <head><title>Alfalyzer</title></head>
          <body>
            <h1>🚀 Alfalyzer</h1>
            <p>Emergency server is running</p>
            <script>
              console.log('Emergency server active');
              // Try to load the main app
              if (window.location.pathname !== '/') {
                window.location.href = '/';
              }
            </script>
          </body>
        </html>
      `);
    }
  }
});

// Multiple binding strategies
const PORT = process.env.PORT || 3001;
const server = createServer(app);

// Strategy 1: Try 127.0.0.1 (IPv4 loopback)
function tryBind127() {
  return new Promise((resolve) => {
    const testServer = createServer(app);
    testServer.listen(PORT, '127.0.0.1', () => {
      console.log(`✅ STRATEGY 1: Server bound to 127.0.0.1:${PORT}`);
      testServer.close();
      resolve('127.0.0.1');
    });
    testServer.on('error', () => {
      resolve(null);
    });
  });
}

// Strategy 2: Try localhost
function tryBindLocalhost() {
  return new Promise((resolve) => {
    const testServer = createServer(app);
    testServer.listen(PORT, 'localhost', () => {
      console.log(`✅ STRATEGY 2: Server bound to localhost:${PORT}`);
      testServer.close();
      resolve('localhost');
    });
    testServer.on('error', () => {
      resolve(null);
    });
  });
}

// Strategy 3: Try 0.0.0.0 (all interfaces)
function tryBind0000() {
  return new Promise((resolve) => {
    const testServer = createServer(app);
    testServer.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ STRATEGY 3: Server bound to 0.0.0.0:${PORT}`);
      testServer.close();
      resolve('0.0.0.0');
    });
    testServer.on('error', () => {
      resolve(null);
    });
  });
}

// Strategy 4: Try without host specification
function tryBindAny() {
  return new Promise((resolve) => {
    const testServer = createServer(app);
    testServer.listen(PORT, () => {
      console.log(`✅ STRATEGY 4: Server bound to any interface:${PORT}`);
      testServer.close();
      resolve('any');
    });
    testServer.on('error', () => {
      resolve(null);
    });
  });
}

// Execute all strategies in parallel
async function startServerWithFallback() {
  console.log('🔄 ULTRATHINK PARALLEL EXECUTION: Testing all binding strategies...');
  
  const strategies = await Promise.all([
    tryBind127(),
    tryBindLocalhost(),
    tryBind0000(),
    tryBindAny()
  ]);
  
  console.log('📊 Strategy Results:', strategies);
  
  // Find the first working strategy
  const workingStrategy = strategies.find(s => s !== null);
  
  if (!workingStrategy) {
    console.error('❌ ALL STRATEGIES FAILED');
    process.exit(1);
  }
  
  // Start the server with the working strategy
  const hostMap = {
    '127.0.0.1': '127.0.0.1',
    'localhost': 'localhost',
    '0.0.0.0': '0.0.0.0',
    'any': undefined
  };
  
  const host = hostMap[workingStrategy];
  
  if (host) {
    server.listen(PORT, host, () => {
      console.log(`🚀 EMERGENCY SERVER ACTIVE!`);
      console.log(`📱 Local:    http://localhost:${PORT}`);
      console.log(`🌐 Network:  http://${host}:${PORT}`);
      console.log(`🔧 API:      http://localhost:${PORT}/api/health`);
    });
  } else {
    server.listen(PORT, () => {
      console.log(`🚀 EMERGENCY SERVER ACTIVE!`);
      console.log(`📱 Local:    http://localhost:${PORT}`);
      console.log(`🔧 API:      http://localhost:${PORT}/api/health`);
    });
  }
  
  server.on('error', (err) => {
    console.error('❌ Server error:', err);
    console.log('🔄 Trying next available port...');
    
    // Try next port
    const nextPort = parseInt(PORT) + 1;
    server.listen(nextPort, host, () => {
      console.log(`🚀 EMERGENCY SERVER ACTIVE on alternate port!`);
      console.log(`📱 Local:    http://localhost:${nextPort}`);
      console.log(`🔧 API:      http://localhost:${nextPort}/api/health`);
    });
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

// Start the server
startServerWithFallback().catch(console.error);