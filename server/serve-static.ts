import express, { type Express } from 'express';
import fs from 'fs';
import path from 'path';

export function serveStatic(app: Express) {
  console.log('🔍 Setting up static file serving...');
  console.log('📍 Current directory:', process.cwd());
  console.log('🌍 Environment:', process.env.NODE_ENV);

  const possiblePaths = [
    path.resolve(process.cwd(), 'dist', 'public'),
    path.resolve('/app', 'dist', 'public'),
    path.resolve(process.cwd(), 'client', 'dist', 'public'),
    path.resolve('/app', 'client', 'dist', 'public'),
  ];

  let staticPath: string | null = null;
  let indexPath: string | null = null;

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
    app.use((req, res) => {
      if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API endpoint not found' });
      res.status(500).send('Build files not found. Please check server logs.');
    });
    return;
  }

  try {
    const files = fs.readdirSync(staticPath);
    console.log(`📂 Static directory contents: ${files.slice(0, 10).join(', ')}${files.length > 10 ? '...' : ''}`);
    const assetsPath = path.join(staticPath, 'assets');
    if (fs.existsSync(assetsPath)) {
      const assetFiles = fs.readdirSync(assetsPath);
      console.log(`📂 Assets directory contains ${assetFiles.length} files`);
      console.log(`📂 First 5 asset files: ${assetFiles.slice(0, 5).join(', ')}`);
    }
  } catch (e) {
    console.error('❌ Error listing directory contents:', e);
  }

  app.use(
    express.static(staticPath, {
      extensions: ['html', 'js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico'],
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
        else if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css; charset=UTF-8');
        if (process.env.NODE_ENV === 'production') {
          if (path.basename(filePath).match(/\.[a-f0-9]{8,}\./)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          else res.setHeader('Cache-Control', 'public, max-age=3600');
        }
      },
    })
  );

  const parentPath = path.dirname(staticPath);
  if (fs.existsSync(path.join(parentPath, 'assets'))) {
    console.log(`🔧 TEMPORARY FIX: Also serving assets from parent: ${parentPath}`);
    app.use(
      '/assets',
      express.static(path.join(parentPath, 'assets'), {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
          else if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css; charset=UTF-8');
        },
      })
    );
  }

  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api/') ||
      req.path.startsWith('/health') ||
      req.path.includes('/assets/') ||
      req.path.includes('.js') ||
      req.path.includes('.css') ||
      req.path.includes('.json')
    ) {
      console.log(`🚫 NOT serving index.html for: ${req.path} (API/asset route)`);
      return next();
    }
    console.log(`📄 Serving index.html for SPA route: ${req.path}`);
    res.sendFile(indexPath!);
  });
}

