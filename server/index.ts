// CRITICAL: Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

// Validate environment variables
import { env, isProduction, isDevelopment } from './config/env';

import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import path from "path";
import { createServer, type Server } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";

// Extend Express Request interface
declare module 'express-serve-static-core' {
  interface Request {
    csrfToken?: () => string;
    requestId?: string;
  }
}

import { 
  securityHeaders, 
  rateLimiters, 
  sanitizeInput, 
  auditLogger, 
  financialDataSecurity, 
  corsConfig, 
  securityErrorHandler 
} from "./security/security-middleware";
import { AuditLogger } from "./security/compliance-audit";
// BROKEN IMPORTS - WebSocket package removed, CSRF disabled
// SECURITY FIX: Import WebSocket and JWT for secure real-time connections
// import { WebSocketServer } from 'ws';  // BROKEN: ws package removed
import jwt from 'jsonwebtoken';
import { parse } from 'url';
import { validateJWTForWebSocket, extractTokenFromHeaders } from './utils/jwt-validator';
// SECURITY FIX: CSRF protection disabled after package removal
// import csrf from 'csurf';  // BROKEN: csurf package removed
// SECURITY FIX: Import crypto for request IDs
import crypto from 'crypto';
// SECURITY FIX: Import log retention policy
import logRetention from './security/log-retention-policy';
// PRIORITY 1: Import market data services for API activation
import { getUnifiedAPIService } from './services/unified-api';
import { FinnhubProvider } from './services/unified-api/providers/finnhub.provider';
import { AlphaVantageProvider } from './services/unified-api/providers/alpha-vantage.provider';
import { FMPProvider } from './services/unified-api/providers/fmp.provider';
import { TwelveDataProvider } from './services/unified-api/providers/twelve-data.provider';
import * as schema from '@shared/schema';
// ROADMAP V4: Import global back-off middleware for 429 responses
import { globalBackoffMiddleware } from './middleware/global-backoff';
// ROADMAP V4: Import TTFB middleware for X-Edge-TTFB header
import { ttfbMiddleware } from './middleware/ttfb-middleware';
// ROADMAP V4: Import Upstash rate limiting middleware (30 req/min IP using contador KV)
import { upstashRateLimiters } from './middleware/upstash-rate-limit';
// ROADMAP V4: Import Supabase authentication middleware
import { requireAuth, requireAdmin, optionalAuth } from './middleware/supabase-auth';

const app = express();
const APP_VERSION = process.env.npm_package_version || '1.0.0';

// CRITICAL: Health check endpoint MUST be before ALL middleware
app.get('/health', (req, res) => {
  console.log(`Health check requested from ${req.ip}`);
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    uptime: process.uptime(),
    environment: env.NODE_ENV
  });
});

// Production security headers using helmet
if (isProduction) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "https:"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));
} else {
  // Use custom security headers in development
  app.use(securityHeaders);
}

// Enable compression for all responses
app.use(compression({
  filter: (req, res) => {
    // Don't compress responses with this request header
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Fallback to standard filter function
    return compression.filter(req, res);
  },
  level: 6 // Balanced compression level
}));

// CORS configuration
app.use(cors(corsConfig));

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Body parsing middleware with different limits
// Standard JSON parsing with 1MB limit
app.use('/api', express.json({ 
  limit: '1mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    if (req.originalUrl.includes('/stripe/webhook')) {
      (req as any).rawBody = buf.toString('utf8');
    }
  }
}));

// Raw body parser for Stripe webhooks
app.use('/api/stripe/webhook', express.raw({ 
  type: 'application/json',
  limit: '5mb' // Stripe can send larger payloads
}));

// URL encoded for form submissions
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// BROKEN: CSRF protection disabled (csurf package removed)
// SECURITY FIX: Enable CSRF protection for state-changing operations (production only)
// Configure CSRF with cookie-based tokens
const csrfProtection = null; // BROKEN: csurf package removed
// const csrfProtection = process.env.NODE_ENV === 'production' ? csrf({ 
//   cookie: {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === 'production',
//     sameSite: 'strict'
//   }
// }) : null;

// Add request ID and logging middleware
app.use((req, res, next) => {
  // Generate unique request ID
  const requestId = crypto.randomUUID();
  req.requestId = requestId;
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-API-Version', APP_VERSION);
  
  // Log request start
  const startTime = Date.now();
  
  // Capture response for logging
  const originalSend = res.send;
  res.send = function(data) {
    res.locals.responseBody = data;
    return originalSend.call(this, data);
  };
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    };
    
    if (isProduction) {
      // Structured logging in production
      console.log(JSON.stringify(logData));
    } else {
      // Human-readable logging in development
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  
  next();
});

// ROADMAP V4: TTFB middleware for X-Edge-TTFB header (must be early in chain)
app.use(ttfbMiddleware());

// ROADMAP V4: Global back-off middleware for 429 responses
app.use(globalBackoffMiddleware());

// Security middleware
app.use(auditLogger);
app.use(sanitizeInput);

// ROADMAP V4: Apply Upstash rate limiting based on endpoint sensitivity (30 req/min IP using contador KV)
app.use('/api/auth', upstashRateLimiters.auth);        // 5 req/min for auth
app.use('/api/admin', upstashRateLimiters.admin);      // 10 req/min for admin  
app.use('/api/search', upstashRateLimiters.api);       // 20 req/min for search
app.use('/api/stocks', upstashRateLimiters.api);       // 20 req/min for financial data
app.use('/api/health', upstashRateLimiters.public);    // 60 req/min for health checks
app.use('/api', upstashRateLimiters.general);          // 30 req/min general (as specified in roadmap)

// SECURITY FIX: Add endpoint to get CSRF token for frontend (production only)
if (process.env.NODE_ENV === 'production' && csrfProtection) {
  app.get('/api/csrf-token', csrfProtection, (req, res) => {
    try {
      // Ensure CSRF middleware has run and csrfToken function is available
      if (typeof req.csrfToken === 'function') {
        const token = req.csrfToken();
        res.json({ 
          csrfToken: token,
          timestamp: new Date().toISOString(),
          requestId: (req as any).requestId 
        });
      } else {
        // Fallback if CSRF middleware hasn't properly initialized
        res.status(500).json({ 
          error: 'CSRF protection not properly initialized',
          requestId: (req as any).requestId 
        });
      }
    } catch (error) {
      console.error('CSRF token generation error:', error);
      res.status(500).json({ 
        error: 'Failed to generate CSRF token',
        requestId: (req as any).requestId 
      });
    }
  });
}

// SECURITY FIX: Robust CSRF protection with proper token validation (production only)
if (process.env.NODE_ENV === 'production' && csrfProtection) {
  app.use((req, res, next) => {
    // Skip CSRF for GET requests and WebSocket upgrade
    if (req.method === 'GET' || req.headers.upgrade === 'websocket') {
      return next();
    }
    
    // SECURITY FIX: Use centralized JWT validation for CSRF bypass
    if (req.headers.authorization?.startsWith('Bearer ')) {
      const token = req.headers.authorization.replace('Bearer ', '');
      
      try {
        const validation = validateJWTForWebSocket(token); // Use WebSocket validator for API tokens
        
        if (validation.success && validation.payload?.type === 'api_access') {
          // Valid API token - can bypass CSRF for machine-to-machine communication
          return next();
        } else {
          // Invalid token or wrong type - apply CSRF protection
          csrfProtection(req, res, next);
        }
      } catch (error) {
        // Invalid JWT - apply CSRF protection
        csrfProtection(req, res, next);
      }
    } else {
      // No Bearer token - apply CSRF protection for cookie-based sessions
      csrfProtection(req, res, next);
    }
  });
}

// PRIORITY 1: Initialize Market Data Services with all providers
async function initializeMarketDataServices() {
  console.log('🔧 Initializing Market Data Services...');
  
  try {
    const unifiedAPI = getUnifiedAPIService();
    
    // Initialize providers based on available API keys
    const providers = [];
    
    // Check and initialize each provider
    if (process.env.FINNHUB_API_KEY && process.env.FINNHUB_API_KEY !== 'demo') {
      try {
        const finnhub = new FinnhubProvider();
        await finnhub.initialize();
        providers.push(finnhub);
        console.log('✅ Finnhub provider initialized');
      } catch (error) {
        console.warn('⚠️ Finnhub provider failed to initialize:', error);
      }
    }
    
    if (process.env.ALPHA_VANTAGE_API_KEY && process.env.ALPHA_VANTAGE_API_KEY !== 'demo') {
      try {
        const alphaVantage = new AlphaVantageProvider();
        await alphaVantage.initialize();
        providers.push(alphaVantage);
        console.log('✅ Alpha Vantage provider initialized');
      } catch (error) {
        console.warn('⚠️ Alpha Vantage provider failed to initialize:', error);
      }
    }
    
    if (process.env.FMP_API_KEY && process.env.FMP_API_KEY !== 'demo') {
      try {
        const fmp = new FMPProvider();
        await fmp.initialize();
        providers.push(fmp);
        console.log('✅ FMP provider initialized');
      } catch (error) {
        console.warn('⚠️ FMP provider failed to initialize:', error);
      }
    }
    
    if (process.env.TWELVE_DATA_API_KEY && process.env.TWELVE_DATA_API_KEY !== 'demo') {
      try {
        const twelveData = new TwelveDataProvider();
        await twelveData.initialize();
        providers.push(twelveData);
        console.log('✅ Twelve Data provider initialized');
      } catch (error) {
        console.warn('⚠️ Twelve Data provider failed to initialize:', error);
      }
    }
    
    // Initialize the unified API service with available providers
    if (providers.length > 0) {
      await unifiedAPI.initialize(providers);
      console.log(`🚀 Market Data Services active with ${providers.length} provider(s)`);
      console.log(`📊 Available providers: ${providers.map(p => p.name).join(', ')}`);
    } else {
      console.warn('⚠️ No API providers available - market data will use fallback mode');
    }
    
  } catch (error) {
    console.error('❌ Failed to initialize market data services:', error);
    throw error;
  }
}

// (Request logging is now handled by the request ID middleware above)

(async () => {
  try {
    // Create HTTP server early
    const server = createServer(app);

    // Serve static assets from client/public BEFORE API routes in development
    if (process.env.NODE_ENV === "development") {
      const currentDir = path.dirname(new URL(import.meta.url).pathname);
      const publicPath = path.resolve(decodeURIComponent(currentDir), "..", "client", "public");
      app.use("/assets", express.static(path.join(publicPath, "assets")));
      console.log('✅ Static assets configured for /assets route');
    }

    // Register API routes SECOND
    await registerRoutes(app, server);

    // ROADMAP V4: Apply Supabase authentication to protected routes
    app.use('/api/admin/**', requireAdmin);       // Admin routes require admin role
    app.use('/api/portfolio/**', requireAuth);    // Portfolio routes require authentication
    app.use('/api/watchlist/**', requireAuth);    // Watchlist routes require authentication
    
    // Apply optional auth to public routes that benefit from user context
    app.use('/api/stocks', optionalAuth);
    app.use('/api/transcripts', optionalAuth);

    // Apply financial data security to sensitive endpoints
    app.use('/api/stocks', financialDataSecurity);
    app.use('/api/intrinsic-values', financialDataSecurity);
    app.use('/api/earnings', financialDataSecurity);

    // Global error handling middleware
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      // Log error details
      const errorLog = {
        requestId: req.requestId,
        error: err.message,
        stack: isProduction ? undefined : err.stack,
        method: req.method,
        path: req.path,
        timestamp: new Date().toISOString()
      };
      
      console.error(isProduction ? JSON.stringify(errorLog) : errorLog);
      
      // Determine status code
      const statusCode = err.statusCode || err.status || 500;
      
      // Send appropriate error response
      res.status(statusCode).json({
        error: {
          message: isProduction ? 'An error occurred' : err.message,
          code: err.code || 'INTERNAL_ERROR',
          statusCode,
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    });

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        error: {
          message: 'Resource not found',
          code: 'NOT_FOUND',
          statusCode: 404,
          requestId: req.requestId,
          path: req.path,
          timestamp: new Date().toISOString()
        }
      });
    });

    // Setup Vite AFTER everything else
    // if (process.env.NODE_ENV === "development") {
    //   console.log('Setting up Vite development server...');
    //   await setupVite(app, server);
    // } else {
    //   serveStatic(app);
    // }

    const port = Number(env.PORT) || 3001;
    
    // ULTRATHINK PARALLEL EXECUTION: Multiple binding strategies
    const bindingStrategies = [
      { host: '127.0.0.1', name: 'IPv4 Loopback' },
      { host: 'localhost', name: 'Localhost' },
      { host: '0.0.0.0', name: 'All Interfaces' },
      { host: undefined, name: 'Default' }
    ];

    let serverStarted = false;
    let currentStrategy = 0;

    function tryNextStrategy() {
      if (currentStrategy >= bindingStrategies.length) {
        console.error('❌ ALL BINDING STRATEGIES FAILED!');
        console.log('🔄 Trying alternative ports...');
        tryAlternativePorts();
        return;
      }

      const strategy = bindingStrategies[currentStrategy];
      console.log(`🔄 STRATEGY ${currentStrategy + 1}: Trying ${strategy.name} (${strategy.host || 'default'})...`);

      const serverInstance = createServer(app);
      
      serverInstance.on('error', (err: any) => {
        console.log(`❌ Strategy ${currentStrategy + 1} failed:`, err.code || err.message);
        currentStrategy++;
        tryNextStrategy();
      });

      if (strategy.host) {
        serverInstance.listen(port, strategy.host, () => {
          if (!serverStarted) {
            serverStarted = true;
            onServerSuccess(serverInstance, port, strategy.host);
          }
        });
      } else {
        serverInstance.listen(port, () => {
          if (!serverStarted) {
            serverStarted = true;
            onServerSuccess(serverInstance, port, 'default');
          }
        });
      }
    }

    function tryAlternativePorts() {
      const alternativePorts = [3001, 3002, 8080, 8081, 5000, 5001];
      let portIndex = 0;

      function tryNextPort() {
        if (portIndex >= alternativePorts.length) {
          console.error('❌ ALL PORTS EXHAUSTED! Starting emergency servers...');
          startEmergencyServers();
          return;
        }

        const altPort = alternativePorts[portIndex];
        console.log(`🔄 Trying alternative port: ${altPort}`);

        const serverInstance = createServer(app);
        
        serverInstance.on('error', (err: any) => {
          console.log(`❌ Port ${altPort} failed:`, err.code || err.message);
          portIndex++;
          tryNextPort();
        });

        serverInstance.listen(altPort, '127.0.0.1', () => {
          if (!serverStarted) {
            serverStarted = true;
            onServerSuccess(serverInstance, altPort, '127.0.0.1');
          }
        });
      }

      tryNextPort();
    }

    function onServerSuccess(serverInstance: any, finalPort: number, host: string) {
      console.log(`🚀 MAIN SERVER ACTIVE!`);
      console.log(`📱 Local:    http://localhost:${finalPort}`);
      console.log(`🌐 Network:  http://${host}:${finalPort}`);
      console.log(`🔧 API:      http://localhost:${finalPort}/api/stocks`);
      console.log(`🔧 Health:   http://localhost:${finalPort}/api/health`);
      console.log('');
      console.log('✅ Ready to accept connections...');
      
      // SECURITY FIX: Initialize log retention policy
      logRetention.initializeLogRetention();
      
      // Initialize Market Data APIs
      initializeMarketDataServices().catch(error => {
        console.warn('⚠️ Market data services initialization failed:', error);
      });
      
      // Debug: Check if server is really listening
      const address = serverInstance.address();
      console.log('🔍 Server address:', address);
      
      // Test the server internally
      console.log('🔍 Testing internal connection...');
      import('node:http').then(http => {
        http.get(`http://localhost:${finalPort}/health`, (res) => {
          console.log('✅ Internal test successful, status:', res.statusCode);
        }).on('error', (err) => {
          console.log('⚠️  Internal test note:', err.message);
        });
      });

      // Replace the global server reference
      Object.assign(server, serverInstance);
    }

    function startEmergencyServers() {
      console.error('🚨 STARTING EMERGENCY SERVERS...');
      
      // Try to start emergency Node.js server
      try {
        const { spawn } = require('child_process');
        const emergencyJs = spawn('node', ['server/emergency-server.cjs'], { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        console.log('🔄 Emergency Node.js server started');
      } catch (error) {
        console.error('❌ Could not start emergency Node.js server:', error);
      }

      // Try to start Python server
      try {
        const { spawn } = require('child_process');
        const emergencyPy = spawn('python3', ['server/emergency-python-server.py'], { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        console.log('🔄 Emergency Python server started');
      } catch (error) {
        console.error('❌ Could not start emergency Python server:', error);
      }

      console.log('💡 You can also manually start servers:');
      console.log('   node server/emergency-server.js');
      console.log('   python3 server/emergency-python-server.py');
      console.log('   php -S localhost:3001 server/emergency-php-server.php');
    }

    // SIMPLIFIED: Start with single server instance
    console.log(`🔄 Starting server on localhost:${port}...`);
    server.listen(port, '127.0.0.1', () => {
      console.log(`🚀 MAIN SERVER ACTIVE!`);
      console.log(`📱 Local:    http://localhost:${port}`);
      console.log(`🔧 API:      http://localhost:${port}/api/stocks`);
      console.log(`🔧 Health:   http://localhost:${port}/health`);
      console.log('✅ Ready to accept connections...');
      
      // Test the server internally
      console.log('🔍 Testing internal connection...');
      import('node:http').then(http => {
        http.get(`http://localhost:${port}/health`, (res) => {
          console.log('✅ Internal test successful, status:', res.statusCode);
        }).on('error', (err) => {
          console.log('⚠️  Internal test note:', err.message);
        });
      });
    });
    
    // Keep the complex binding logic as backup
    // tryNextStrategy();

    // BROKEN: WebSocket server reference (ws package removed)
    // let wss: WebSocketServer | null = null;
    let wss: any = null;
    
    // BROKEN: WebSocket server completely disabled (ws package removed)
    // SECURITY FIX: Enhanced secure WebSocket server (completely disabled to avoid HTTP conflicts)
    if (false && process.env.NODE_ENV === 'production') {
      // BROKEN: WebSocketServer not available
      // wss = new WebSocketServer({ 
      //   server,
      //   // SECURITY FIX: Additional verification callback for origin checking
      //   verifyClient: (info) => {
      //     // Verify origin for additional security
      //     const origin = info.origin;
      //     const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:8080').split(',');
      //     
      //     if (origin && !allowedOrigins.includes(origin)) {
      //       console.warn(`WebSocket connection rejected from unauthorized origin: ${origin}`);
      //       return false;
      //     }
      //     return true;
      //   }
      // });
    
    // BROKEN: WebSocket connection handling disabled (ws package removed)
    // SECURITY FIX: Enhanced connection tracking with user-based limits
    // const wsConnectionCounts = new Map<string, number>();
    // const wsUserConnections = new Map<string, Set<any>>();
    // const WS_MAX_CONNECTIONS_PER_IP = 5;
    // const WS_MAX_CONNECTIONS_PER_USER = 3;
    
    // BROKEN: Entire WebSocket connection handling block disabled (ws package removed)
    // [WebSocket connection handling code removed - approximately 300 lines]
    // This included connection tracking, authentication, message handling, and cleanup
    // Will need to be re-implemented when WebSocket support is restored
    
    } // Close the production WebSocket block

    // Enhanced graceful shutdown handling
    let isShuttingDown = false;
    const shutdownTimeout = 30000; // 30 seconds
    
    const gracefulShutdown = (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      
      console.log(`\n${signal} received, starting graceful shutdown...`);
      
      // Stop accepting new connections
      server.close((err) => {
        if (err) {
          console.error('Error during server close:', err);
        }
        console.log('HTTP server closed');
      });
      
      // Close WebSocket connections if they exist
      if (wss && wss.clients) {
        console.log(`Closing ${wss.clients.size} WebSocket connections...`);
        wss.clients.forEach((ws) => {
          ws.close(1001, 'Server shutting down');
        });
        wss.close(() => {
          console.log('WebSocket server closed');
        });
      }
      
      // Close database connections
      try {
        // For better-sqlite3, we don't have a destroy method
        // The connection will be closed when the process exits
        console.log('Database connections will close on exit');
      } catch (error) {
        console.error('Error closing database:', error);
      }
      
      // Force shutdown after timeout
      const forceShutdown = setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, shutdownTimeout);
      
      // Clear the timeout if we finish before it triggers
      server.on('close', () => {
        clearTimeout(forceShutdown);
        console.log('Graceful shutdown completed');
        process.exit(0);
      });
    };
    
    // Handle various shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon
    
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();
