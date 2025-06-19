import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
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

const app = express();

// Apply security headers first
app.use(securityHeaders);

// CORS configuration
app.use(cors(corsConfig));

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Request parsing with size limits for security
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Security middleware
app.use(auditLogger);
app.use(sanitizeInput);

// Rate limiting by route type
app.use('/api/auth', rateLimiters.auth);
app.use('/api/search', rateLimiters.search);
app.use('/api/stocks', rateLimiters.financial);
app.use('/api', rateLimiters.general);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const server = await registerRoutes(app);

    // Apply financial data security to financial endpoints
    app.use('/api/stocks', financialDataSecurity);
    app.use('/api/intrinsic-values', financialDataSecurity);
    app.use('/api/earnings', financialDataSecurity);

    // Security error handler
    app.use(securityErrorHandler);

    // General error handler
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      // Log security-related errors
      console.error('App Error:', err);
      
      // Audit critical errors
      if (status >= 400) {
        AuditLogger.securityViolation('application_error', {
          error: message,
          status,
          path: req.path,
          method: req.method,
        }, {
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
        }).catch(console.error);
      }
      
      res.status(status).json({ 
        message: process.env.NODE_ENV === 'development' ? message : 'Internal Server Error',
        requestId: (req as any).requestId,
        timestamp: new Date().toISOString(),
      });
    });

    // Setup Vite in development mode
    if (process.env.NODE_ENV === "development") {
      console.log('Setting up Vite development server...');
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const port = Number(process.env.PORT) || 8080;
    
    server.on('error', (err) => {
      console.error('❌ Server error:', err);
    });

    server.listen(port, 'localhost', () => {
      console.log(`🚀 Stock Analysis App is running!`);
      console.log(`📱 Local:    http://localhost:${port}`);
      console.log(`🌐 Network:  http://127.0.0.1:${port}`);
      console.log(`🔧 API:      http://localhost:${port}/api/stocks`);
      console.log('');
      console.log('Ready to accept connections...');
      console.log('🔧 Try these URLs in your browser:');
      console.log(`   http://localhost:${port}`);
      console.log(`   http://127.0.0.1:${port}`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();
