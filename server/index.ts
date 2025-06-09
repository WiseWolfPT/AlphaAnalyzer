import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

    // Error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error('App Error:', err);
      res.status(status).json({ message });
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
