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
  console.log('🔍 Setting up static file serving...');
  console.log('📍 Current directory:', process.cwd());
  console.log('🌍 Environment:', process.env.NODE_ENV);
  
  // In production, the server runs from /app/server
  // The client dist is at /app/client/dist
  const distPath = process.env.NODE_ENV === 'production' 
    ? path.resolve(process.cwd(), "client", "dist")
    : path.resolve(import.meta.dirname || process.cwd(), "..", "client", "dist");

  // Check for index.html in various locations
  const indexPaths = [
    path.resolve(distPath, "index.html"),
    path.resolve(distPath, "public", "index.html"),
    path.resolve(process.cwd(), "dist", "index.html"),
    path.resolve("/app", "dist", "index.html"),
    path.resolve("/app", "client", "dist", "public", "index.html")
  ];

  console.log('🔍 Searching for index.html in:', indexPaths);

  let indexPath: string | null = null;
  let staticPath: string | null = null;

  for (const testPath of indexPaths) {
    console.log(`🔍 Checking: ${testPath} - ${fs.existsSync(testPath) ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    if (fs.existsSync(testPath)) {
      indexPath = testPath;
      staticPath = path.dirname(testPath);
      console.log(`✅ Found index.html at: ${indexPath}`);
      break;
    }
  }

  if (!indexPath || !staticPath) {
    // Try alternative paths for the dist directory
    const alternativePaths = [
      path.resolve(process.cwd(), "dist"),
      path.resolve(process.cwd(), "public"),
      path.resolve(process.cwd(), "..", "client", "dist"),
      path.resolve("/app", "client", "dist"),
      path.resolve("/app", "dist")
    ];
    
    console.log('🔍 Trying alternative paths:', alternativePaths);
    
    for (const altPath of alternativePaths) {
      const altIndexPath = path.resolve(altPath, "index.html");
      console.log(`🔍 Checking alt: ${altIndexPath} - ${fs.existsSync(altIndexPath) ? '✅ EXISTS' : '❌ NOT FOUND'}`);
      if (fs.existsSync(altIndexPath)) {
        indexPath = altIndexPath;
        staticPath = altPath;
        console.log(`✅ Found index.html at: ${indexPath}`);
        break;
      }
    }
  }

  if (!indexPath || !staticPath) {
    console.error('❌ Could not find index.html anywhere!');
    console.log('📂 Directory listing of /app:');
    try {
      const files = fs.readdirSync('/app');
      files.forEach(file => console.log(`  - ${file}`));
    } catch (e) {
      console.log('  (Could not list directory)');
    }
    
    throw new Error(
      `Could not find index.html. Searched in: ${indexPaths.join(", ")}`,
    );
  }

  console.log(`📁 Serving static files from: ${staticPath}`);
  
  // Serve static files for specific extensions
  app.use(express.static(staticPath, {
    extensions: ['html', 'js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico'],
    index: false // Don't serve index.html automatically
  }));

  // Log all incoming requests for debugging
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api/')) {
      console.log(`📥 Static request: ${req.method} ${req.path}`);
    }
    next();
  });

  // Serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }
    
    console.log(`📄 Serving index.html for: ${req.path}`);
    res.sendFile(indexPath);
  });
}
