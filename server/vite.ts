import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { createServer, type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
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
  // Simplified path resolution for production
  const staticPath = path.resolve(process.cwd(), 'dist', 'public');
  const indexPath = path.resolve(staticPath, 'index.html');

  console.log(`[Static] Serving static files from: ${staticPath}`);
  console.log(`[Static] Index.html expected at: ${indexPath}`);

  // Verify index.html exists
  if (!fs.existsSync(indexPath)) {
    console.error(`[Static] ERROR: index.html not found at ${indexPath}`);
    console.error('[Static] Check build configuration (vite.config.ts) and deployment script');
    
    // Debug directory structure
    try {
      const parentDir = path.dirname(staticPath);
      console.log(`[Static] Parent directory '${parentDir}' contents:`, fs.readdirSync(parentDir));
      if (fs.existsSync(staticPath)) {
        console.log(`[Static] Static directory '${staticPath}' contents:`, fs.readdirSync(staticPath));
      }
    } catch (e) {
      console.error('[Static] Could not list directories for debugging:', e.message);
    }
    
    // Try to find index.html in alternative locations for debugging
    const searchPaths = [
      '/app/dist/public',
      '/app/dist',
      '/app/client/dist/public',
      '/app/client/dist'
    ];
    
    console.log('[Static] Searching for index.html in alternative locations:');
    for (const searchPath of searchPaths) {
      const testPath = path.join(searchPath, 'index.html');
      if (fs.existsSync(testPath)) {
        console.log(`[Static] Found index.html at: ${testPath}`);
        console.log(`[Static] Update staticPath to: ${searchPath}`);
      }
    }
    
    return; // Don't continue if essential files aren't there
  }

  // 1. Serve static assets (JS, CSS, images) from the static directory
  app.use(express.static(staticPath, {
    // Cache assets with hash in filename for 1 year
    setHeaders: (res, filePath) => {
      if (path.basename(filePath).match(/(\.[a-f0-9]{8,}\.)/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // Set proper MIME type for JavaScript
      if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
    },
  }));

  // 2. Serve index.html as fallback for all other GET routes (client-side routing)
  // This handler will only be reached if express.static above doesn't find a file
  app.get('*', (req, res, next) => {
    // Explicitly ignore API routes AND asset requests
    if (req.path.startsWith('/api/') || req.path.includes('/assets/')) {
      return next();
    }
    
    // For all other routes, serve the SPA
    console.log(`[Static] Serving index.html for SPA route: ${req.path}`);
    res.sendFile(indexPath);
  });
}
