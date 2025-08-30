import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer, type Server } from "http";
import { nanoid } from "nanoid";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server?: Server) {
  // Dynamic import for Vite - only loaded in development
  const { createServer: createViteServer, createLogger } = await import("vite");
  const viteConfig = await import("../vite.config");
  const viteLogger = createLogger();
  const serverOptions: any = {
    middlewareMode: true,
    allowedHosts: true,
  };
  
  // Disable HMR in middleware mode to avoid port conflicts
  // HMR will be handled by the standalone Vite server on port 3000
  serverOptions.hmr = false;

  const vite = await createViteServer({
    ...viteConfig.default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // Apply Vite middlewares first, but exclude API routes and assets
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/assets/')) {
      return next();
    }
    vite.middlewares(req, res, next);
  });
  
  // Fallback for client-side routing (only for non-API routes and non-assets)
  app.use("*", async (req, res, next) => {
    if (req.originalUrl.startsWith('/api/') || req.originalUrl.startsWith('/assets/')) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        decodeURIComponent(path.dirname(new URL(import.meta.url).pathname)),
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  console.log('🔍 Setting up static file serving...');
  console.log('📍 Current directory:', process.cwd());
  console.log('🌍 Environment:', process.env.NODE_ENV);
  
  // Try multiple possible paths for the build output
  const possiblePaths = [
    path.resolve(process.cwd(), 'dist', 'public'),
    path.resolve('/app', 'dist', 'public'),
    path.resolve(process.cwd(), 'client', 'dist', 'public'),
    path.resolve('/app', 'client', 'dist', 'public')
  ];

  let staticPath: string | null = null;
  let indexPath: string | null = null;

  // Find the correct path where index.html exists
  for (const testPath of possiblePaths) {
    const testIndexPath = path.join(testPath, 'index.html');
    console.log(`🔍 Checking: ${testIndexPath} - ${fs.existsSync(testIndexPath) ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    
    if (fs.existsSync(testIndexPath)) {
      staticPath = testPath;
      indexPath = testIndexPath;
      console.log(`✅ Found index.html at: ${indexPath}`);
      console.log(`📁 Will serve static files from: ${staticPath}`);
      break;
    }
  }

  if (!staticPath || !indexPath) {
    console.error('❌ Could not find index.html in any expected location!');
    console.error('❌ Build may have failed or files are in unexpected location');
    
    // Create a fallback handler that returns proper error
    app.use((req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      res.status(500).send('Build files not found. Please check server logs.');
    });
    return;
  }

  // Log static files in the directory
  try {
    const files = fs.readdirSync(staticPath);
    console.log(`📂 Static directory contents: ${files.slice(0, 10).join(', ')}${files.length > 10 ? '...' : ''}`);
    
    const assetsPath = path.join(staticPath, 'assets');
    if (fs.existsSync(assetsPath)) {
      const assetFiles = fs.readdirSync(assetsPath);
      console.log(`📂 Assets directory contains ${assetFiles.length} files`);
      console.log(`📂 First 5 asset files: ${assetFiles.slice(0, 5).join(', ')}`);
    } else {
      console.error(`❌ CRITICAL: Assets directory NOT FOUND at: ${assetsPath}`);
      console.error(`❌ This explains the 500 errors - assets are missing!`);
      
      // Try to find where assets might be
      console.log(`🔍 Searching for assets in parent directories...`);
      const parentDir = path.dirname(staticPath);
      const parentFiles = fs.readdirSync(parentDir);
      console.log(`📂 Parent directory (${parentDir}) contains: ${parentFiles.join(', ')}`);
    }
  } catch (e) {
    console.error('❌ Error listing directory contents:', e);
  }

  // Serve static files with proper configuration
  app.use(express.static(staticPath, {
    extensions: ['html', 'js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico'],
    index: false, // Don't serve index.html automatically
    setHeaders: (res, filePath) => {
      // Set proper MIME types
      if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
        res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=UTF-8');
      }
      
      // Set cache headers for production
      if (process.env.NODE_ENV === 'production') {
        // Cache immutable assets (with hash in filename) for 1 year
        if (path.basename(filePath).match(/\.[a-f0-9]{8,}\./)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          // Cache other files for 1 hour
          res.setHeader('Cache-Control', 'public, max-age=3600');
        }
      }
    }
  }));

  // TEMPORARY FIX: Try to serve assets from parent directory if not found
  const parentPath = path.dirname(staticPath);
  if (fs.existsSync(path.join(parentPath, 'assets'))) {
    console.log(`🔧 TEMPORARY FIX: Also serving assets from parent: ${parentPath}`);
    app.use('/assets', express.static(path.join(parentPath, 'assets'), {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
          res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
        } else if (filePath.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css; charset=UTF-8');
        }
      }
    }));
  }

  // CRITICAL: Ensure API routes are NOT intercepted by SPA fallback
  // This must be the LAST route handler
  app.get('*', (req, res, next) => {
    // Skip ALL API routes, health checks, and asset requests
    if (req.path.startsWith('/api/') || 
        req.path.startsWith('/health') ||
        req.path.includes('/assets/') ||
        req.path.includes('.js') ||
        req.path.includes('.css') ||
        req.path.includes('.json')) {
      console.log(`🚫 NOT serving index.html for: ${req.path} (API/asset route)`);
      return next();
    }
    
    console.log(`📄 Serving index.html for SPA route: ${req.path}`);
    res.sendFile(indexPath);
  });
}
