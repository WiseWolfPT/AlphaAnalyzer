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
// SECURITY FIX: Import WebSocket and JWT for secure real-time connections
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { parse } from 'url';
import { validateJWTForWebSocket, extractTokenFromHeaders } from './utils/jwt-validator';
// SECURITY FIX: Import CSRF protection
import csrf from 'csurf';
// SECURITY FIX: Import crypto for request IDs
import crypto from 'crypto';
// SECURITY FIX: Import log retention policy
import logRetention from './security/log-retention-policy';
import * as schema from '@shared/schema';

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

// SECURITY FIX: Enable CSRF protection for state-changing operations (production only)
// Configure CSRF with cookie-based tokens
const csrfProtection = process.env.NODE_ENV === 'production' ? csrf({ 
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
}) : null;

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

// Security middleware
app.use(auditLogger);
app.use(sanitizeInput);

// Apply rate limiting based on endpoint sensitivity
app.use('/api/auth', rateLimiters.auth);
app.use('/api/search', rateLimiters.search);
app.use('/api/stocks', rateLimiters.financial);
app.use('/api', rateLimiters.general);

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

    // WebSocket server reference for graceful shutdown
    let wss: WebSocketServer | null = null;
    
    // SECURITY FIX: Enhanced secure WebSocket server (completely disabled to avoid HTTP conflicts)
    if (false && process.env.NODE_ENV === 'production') {
      wss = new WebSocketServer({ 
        server,
        // SECURITY FIX: Additional verification callback for origin checking
        verifyClient: (info) => {
          // Verify origin for additional security
          const origin = info.origin;
          const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:8080').split(',');
          
          if (origin && !allowedOrigins.includes(origin)) {
            console.warn(`WebSocket connection rejected from unauthorized origin: ${origin}`);
            return false;
          }
          return true;
        }
      });
    
    // SECURITY FIX: Enhanced connection tracking with user-based limits
    const wsConnectionCounts = new Map<string, number>();
    const wsUserConnections = new Map<string, Set<any>>();
    const WS_MAX_CONNECTIONS_PER_IP = 5;
    const WS_MAX_CONNECTIONS_PER_USER = 3;
    
    wss.on('connection', (ws, req) => {
      try {
        // SECURITY FIX: Enhanced IP detection with proxy support
        const clientIp = req.headers['x-real-ip'] as string || 
                        req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || 
                        req.connection.remoteAddress || 
                        req.socket.remoteAddress || 
                        'unknown';
        
        // SECURITY FIX: Validate IP format to prevent injection
        const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        if (clientIp !== 'unknown' && !ipRegex.test(clientIp)) {
          ws.close(1008, 'Invalid client IP');
          return;
        }
        
        // SECURITY FIX: Rate limit WebSocket connections per IP
        const currentConnections = wsConnectionCounts.get(clientIp) || 0;
        if (currentConnections >= WS_MAX_CONNECTIONS_PER_IP) {
          ws.close(1008, 'Too many connections from this IP');
          AuditLogger.securityViolation('websocket_rate_limit_ip', {
            reason: 'Too many WebSocket connections from IP',
            currentConnections,
            maxAllowed: WS_MAX_CONNECTIONS_PER_IP,
            clientIp,
          }, {
            ipAddress: clientIp,
            userAgent: req.headers['user-agent'] || 'unknown',
          }).catch(console.error);
          return;
        }
        
        // DEVELOPMENT FIX: Skip WebSocket auth in development for Vite HMR
        let decoded: any = null;
        let userId = 'dev-user';
        let subscriptionTier = 'free';

        if (process.env.NODE_ENV === 'production') {
          // SECURITY FIX: Use centralized JWT validation for WebSocket (production only)
          const parsedUrl = parse(req.url || '', true);
          const token = extractTokenFromHeaders(req.headers, parsedUrl.query);
          
          if (!token) {
            ws.close(1008, 'Authentication required');
            AuditLogger.securityViolation('websocket_auth_missing', {
              reason: 'No authentication token provided',
            }, {
              ipAddress: clientIp,
              userAgent: req.headers['user-agent'] || 'unknown',
            }).catch(console.error);
            return;
          }

          // SECURITY FIX: Use centralized JWT validation
          const validation = validateJWTForWebSocket(token);
          
          if (!validation.success) {
            ws.close(1008, 'Invalid authentication token');
            AuditLogger.securityViolation('websocket_auth_failed', {
              reason: 'JWT validation failed',
              error: validation.error || 'Unknown error',
              errorCode: validation.errorCode,
            }, {
              ipAddress: clientIp,
              userAgent: req.headers['user-agent'] || 'unknown',
            }).catch(console.error);
            return;
          }

          decoded = validation.payload!;
          userId = decoded.sub;
          subscriptionTier = decoded.subscriptionTier;
        }
        
        // SECURITY FIX: Check user connection limits
        const userConnections = wsUserConnections.get(userId) || new Set();
        if (userConnections.size >= WS_MAX_CONNECTIONS_PER_USER) {
          ws.close(1008, 'Too many connections for this user');
          AuditLogger.securityViolation('websocket_rate_limit_user', {
            reason: 'Too many WebSocket connections for user',
            userId,
            currentConnections: userConnections.size,
            maxAllowed: WS_MAX_CONNECTIONS_PER_USER,
          }, {
            ipAddress: clientIp,
            userAgent: req.headers['user-agent'] || 'unknown',
          }).catch(console.error);
          return;
        }

        // SECURITY FIX: Update connection tracking
        wsConnectionCounts.set(clientIp, currentConnections + 1);
        userConnections.add(ws);
        wsUserConnections.set(userId, userConnections);
        
        // Attach user info to WebSocket with additional security metadata
        (ws as any).userId = userId;
        (ws as any).subscriptionTier = subscriptionTier;
        (ws as any).clientIp = clientIp;
        (ws as any).connectedAt = new Date().toISOString();
        (ws as any).lastActivity = Date.now();
        
        // SECURITY FIX: Set up activity timeout for idle connections
        const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
        const activityTimer = setInterval(() => {
          const lastActivity = (ws as any).lastActivity || Date.now();
          if (Date.now() - lastActivity > IDLE_TIMEOUT) {
            ws.close(1001, 'Connection idle timeout');
            clearInterval(activityTimer);
          }
        }, 60000); // Check every minute
        
        // Log successful connection with security details
        console.log(`WebSocket authenticated for user ${userId} from IP ${clientIp}`);
        AuditLogger.securityViolation('websocket_connection_success', {
          userId: userId,
          subscriptionTier: subscriptionTier,
          clientIp,
          connectionTime: new Date().toISOString(),
        }, {
          ipAddress: clientIp,
          userAgent: req.headers['user-agent'] || 'unknown',
        }).catch(console.error);
        
        // SECURITY FIX: Enhanced message handling with validation and rate limiting
        let messageCount = 0;
        const MESSAGE_RATE_LIMIT = 100; // Max 100 messages per minute
        const messageRateWindow = 60 * 1000; // 1 minute
        let messageRateTimer = Date.now();
        
        ws.on('message', (message) => {
          try {
            // SECURITY FIX: Update last activity timestamp
            (ws as any).lastActivity = Date.now();
            
            // SECURITY FIX: Rate limit messages per connection
            const now = Date.now();
            if (now - messageRateTimer > messageRateWindow) {
              messageCount = 0;
              messageRateTimer = now;
            }
            
            messageCount++;
            if (messageCount > MESSAGE_RATE_LIMIT) {
              ws.close(1008, 'Message rate limit exceeded');
              AuditLogger.securityViolation('websocket_message_rate_limit', {
                userId: userId,
                messageCount,
                rateLimit: MESSAGE_RATE_LIMIT,
              }, {
                ipAddress: clientIp,
                userAgent: req.headers['user-agent'] || 'unknown',
              }).catch(console.error);
              return;
            }
            
            // SECURITY FIX: Validate message size and format
            const messageBuffer = Buffer.isBuffer(message) ? message : Buffer.from(message.toString());
            if (messageBuffer.length > 1024) { // Max 1KB per message
              ws.send(JSON.stringify({ error: 'Message too large' }));
              return;
            }
            
            const data = JSON.parse(message.toString());
            
            // SECURITY FIX: Validate message structure
            if (!data || typeof data !== 'object' || !data.action) {
              ws.send(JSON.stringify({ error: 'Invalid message structure' }));
              return;
            }
            
            // Handle subscription to market data based on user's tier
            if (data.action === 'subscribe' && data.symbols) {
              // SECURITY FIX: Validate symbols array
              if (!Array.isArray(data.symbols)) {
                ws.send(JSON.stringify({ error: 'Symbols must be an array' }));
                return;
              }
              
              const maxSymbols = subscriptionTier === 'premium' ? 100 : 
                                 subscriptionTier === 'pro' ? 20 : 5;
              
              // SECURITY FIX: Validate each symbol format
              const validSymbols = data.symbols
                .slice(0, maxSymbols)
                .filter((symbol: any) => 
                  typeof symbol === 'string' && 
                  /^[A-Z]{1,10}$/.test(symbol)
                );
              
              (ws as any).subscribedSymbols = validSymbols;
              
              ws.send(JSON.stringify({
                type: 'subscription_confirmed',
                symbols: validSymbols,
                tier: subscriptionTier,
                timestamp: new Date().toISOString(),
              }));
            }
          } catch (error) {
            console.error('WebSocket message error:', error);
            
            // SECURITY FIX: Enhanced error response with categorization
            let errorResponse = {
              type: 'error',
              error: 'MESSAGE_PROCESSING_ERROR',
              message: 'Failed to process message',
              timestamp: new Date().toISOString(),
            };

            // Categorize error types for better handling
            if (error instanceof SyntaxError) {
              errorResponse.error = 'INVALID_JSON';
              errorResponse.message = 'Invalid JSON format';
            } else if (error instanceof TypeError) {
              errorResponse.error = 'INVALID_MESSAGE_STRUCTURE';
              errorResponse.message = 'Invalid message structure';
            }

            // Log detailed error for monitoring
            AuditLogger.securityViolation('websocket_message_error', {
              userId: userId,
              clientIp,
              error: error instanceof Error ? error.message : 'Unknown error',
              errorType: error.constructor.name,
              timestamp: new Date().toISOString(),
            }, {
              ipAddress: clientIp,
              userAgent: req.headers['user-agent'] || 'unknown',
            }).catch(console.error);

            // Send error response to client
            try {
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify(errorResponse));
              }
            } catch (sendError) {
              console.error('Failed to send error response:', sendError);
            }
          }
        });

        // SECURITY FIX: Enhanced error handling for WebSocket
        ws.on('error', (error) => {
          console.error('WebSocket error for user', userId, ':', error);
          
          // Log error for monitoring
          AuditLogger.securityViolation('websocket_error', {
            userId: userId,
            clientIp,
            error: error.message,
            errorCode: (error as any).code || 'UNKNOWN',
            timestamp: new Date().toISOString(),
          }, {
            ipAddress: clientIp,
            userAgent: req.headers['user-agent'] || 'unknown',
          }).catch(console.error);
          
          // Attempt graceful close
          try {
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Connection error occurred',
                timestamp: new Date().toISOString(),
              }));
            }
          } catch (sendError) {
            console.error('Failed to send error message to client:', sendError);
          }
        });

        ws.on('close', (code, reason) => {
          // SECURITY FIX: Clean up all connection tracking
          console.log(`WebSocket closed for user ${userId} from IP ${clientIp}, code: ${code}, reason: ${reason}`);
          
          // Clean up timers
          clearInterval(activityTimer);
          
          // SECURITY FIX: Decrement IP connection count
          const ipCount = wsConnectionCounts.get(clientIp) || 0;
          if (ipCount > 1) {
            wsConnectionCounts.set(clientIp, ipCount - 1);
          } else {
            wsConnectionCounts.delete(clientIp);
          }
          
          // SECURITY FIX: Remove from user connections
          const userConns = wsUserConnections.get(userId) || new Set();
          userConns.delete(ws);
          if (userConns.size === 0) {
            wsUserConnections.delete(userId);
          } else {
            wsUserConnections.set(userId, userConns);
          }
          
          // Log disconnection for audit trail
          AuditLogger.securityViolation('websocket_disconnection', {
            userId: userId,
            clientIp,
            closeCode: code,
            closeReason: reason?.toString() || 'No reason provided',
            disconnectionTime: new Date().toISOString(),
            connectionDuration: Date.now() - ((ws as any).lastActivity || Date.now()),
          }, {
            ipAddress: clientIp,
            userAgent: req.headers['user-agent'] || 'unknown',
          }).catch(console.error);
        });

      } catch (error) {
        console.error('WebSocket connection error:', error);
        ws.close(1011, 'Server error');
      }
    });

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
