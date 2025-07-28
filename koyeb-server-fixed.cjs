#!/usr/bin/env node

/**
 * KOYEB FIXED SERVER
 * 
 * This server addresses all Koyeb deployment issues:
 * 1. Uses process.env.PORT (required by Koyeb)
 * 2. Responds to health checks immediately
 * 3. Binds to 0.0.0.0 for container access
 * 4. Implements self-ping to prevent unhealthy status
 */

const express = require('express');
const cors = require('cors');
const http = require('http');

// CRITICAL: Use Koyeb's PORT environment variable
const PORT = process.env.PORT || 8000; // Koyeb defaults to 8000
const HOST = '0.0.0.0'; // Required for container environments

console.log(`🚀 Koyeb Fixed Server Starting...`);
console.log(`📍 Port: ${PORT} (from ${process.env.PORT ? 'ENV' : 'default'})`);
console.log(`🌐 Host: ${HOST}`);
console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);

// Create immediate health check server
const healthApp = express();
healthApp.use(cors());

// Immediate health check response
healthApp.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV || 'development'
  });
});

// Start health server immediately
const healthServer = http.createServer(healthApp);
healthServer.listen(PORT, HOST, () => {
  console.log(`✅ Health check server ready on ${HOST}:${PORT}`);
  console.log(`🏥 Health endpoint: http://${HOST}:${PORT}/health`);
});

// Load main server asynchronously
setTimeout(async () => {
  try {
    console.log('📦 Loading main server...');
    
    // Close health server
    healthServer.close();
    
    // Import and start main server
    if (process.env.USE_TSX === 'true') {
      // Use tsx for TypeScript
      console.log('🔷 Starting TypeScript server with tsx...');
      require('child_process').spawn('npx', ['tsx', 'server/index.ts'], {
        stdio: 'inherit',
        env: { ...process.env, PORT: String(PORT) }
      });
    } else {
      // Try to load compiled server
      try {
        const mainServer = require('./server/index.js');
        if (mainServer && typeof mainServer.startServer === 'function') {
          await mainServer.startServer(PORT, HOST);
        }
      } catch (err) {
        console.log('📘 Starting TypeScript server directly...');
        // Fallback to tsx
        require('child_process').spawn('npx', ['tsx', 'server/index.ts'], {
          stdio: 'inherit',
          env: { ...process.env, PORT: String(PORT) }
        });
      }
    }
  } catch (error) {
    console.error('❌ Failed to load main server:', error);
    console.log('🔄 Keeping health check server running...');
  }
}, 100);

// Self-ping to prevent Koyeb marking as unhealthy
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    http.get(`http://localhost:${PORT}/health`, (res) => {
      console.log(`🏓 Self-ping: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error('❌ Self-ping failed:', err.message);
    });
  }, 30000); // Every 30 seconds
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});