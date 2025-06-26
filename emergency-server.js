#!/usr/bin/env node

/**
 * EMERGENCY SERVER - MINIMAL CONFIGURATION
 * Use this when the main server has connectivity issues
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Minimal middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'client/dist')));

// Basic routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Emergency Alfalyzer Server Running!',
    timestamp: new Date().toISOString(),
    port: PORT,
    status: 'healthy'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/stocks', (req, res) => {
  res.json([
    { symbol: 'AAPL', price: 150.00, change: '+1.5%' },
    { symbol: 'GOOGL', price: 2500.00, change: '+0.8%' },
    { symbol: 'MSFT', price: 300.00, change: '+2.1%' }
  ]);
});

// Catch all for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Start server with extensive logging
console.log('🚀 Starting Emergency Server...');
console.log('📍 Node.js version:', process.version);
console.log('📍 Platform:', process.platform);
console.log('📍 Working directory:', process.cwd());

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ Emergency Server RUNNING!');
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🔧 API: http://localhost:${PORT}/api/health`);
  console.log('📊 Server address:', server.address());
  
  // Heartbeat to keep process alive
  setInterval(() => {
    console.log(`💓 Heartbeat: ${new Date().toISOString()}`);
  }, 30000);
});

server.on('error', (err) => {
  console.error('❌ Emergency Server Error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('🔴 Emergency Server stopped');
    process.exit(0);
  });
});