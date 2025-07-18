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

  let indexPath: string | null = null;
  let staticPath: string | null = null;

  for (const testPath of indexPaths) {
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
    
    for (const altPath of alternativePaths) {
      const altIndexPath = path.resolve(altPath, "index.html");
      if (fs.existsSync(altIndexPath)) {
        indexPath = altIndexPath;
        staticPath = altPath;
        console.log(`✅ Found index.html at: ${indexPath}`);
        break;
      }
    }
  }

  if (!indexPath || !staticPath) {
    throw new Error(
      `Could not find index.html. Searched in: ${indexPaths.join(", ")}`,
    );
  }

  console.log(`📁 Serving static files from: ${staticPath}`);
  app.use(express.static(staticPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(indexPath);
  });
}
