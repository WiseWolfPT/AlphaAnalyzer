/**
 * Optimized Koyeb Server
 * Handles health checks and proper binding for container deployment
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8000;
const HOST = '0.0.0.0'; // CRITICAL: Must bind to 0.0.0.0 for Koyeb

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());

// Health check route - Koyeb needs this
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Alfalyzer Backend',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV,
    endpoints: [
      '/health',
      '/api/health',
      '/api/market-data/test',
      '/api/alerts/notifications'
    ]
  });
});

// Import and register routes with error handling
async function setupRoutes() {
  try {
    // Import routes
    const { registerRoutes } = await import('./server/routes.js');
    const server = await import('http').then(m => m.createServer(app));
    
    // Register all routes
    await registerRoutes(app, server);
    
    console.log('✅ Routes registered successfully');
  } catch (error) {
    console.error('❌ Error setting up routes:', error);
    
    // Fallback routes if main routes fail
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', message: 'Fallback health check' });
    });
    
    app.get('/api/market-data/test', (req, res) => {
      res.json({ status: 'ok', message: 'Market data test endpoint' });
    });
    
    app.get('/api/alerts/notifications', (req, res) => {
      res.json({ notifications: [], message: 'No notifications' });
    });
  }
}

// Setup routes
setupRoutes().then(() => {
  // Start server - MUST bind to 0.0.0.0 for Koyeb
  app.listen(PORT, HOST, () => {
    console.log(`✅ Server running on http://${HOST}:${PORT}`);
    console.log(`🔗 Health check: http://${HOST}:${PORT}/health`);
    console.log(`📍 Environment: ${process.env.NODE_ENV}`);
    console.log(`📍 Allowed origins: ${process.env.ALLOWED_ORIGINS}`);
  });
}).catch(error => {
  console.error('❌ Failed to setup routes:', error);
  
  // Start server anyway with basic routes
  app.listen(PORT, HOST, () => {
    console.log(`⚠️ Server running with basic routes on http://${HOST}:${PORT}`);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit - try to keep server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - try to keep server running
});