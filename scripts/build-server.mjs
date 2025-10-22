// Build server into dist/server/index.cjs using esbuild (CJS for Node runtime)
import { build } from 'esbuild';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const outdir = resolve(root, 'dist', 'server');

try {
  if (existsSync(outdir)) rmSync(outdir, { recursive: true, force: true });
  mkdirSync(outdir, { recursive: true });
  // Ensure workers subdirectory exists for worker outputs
  try { mkdirSync(resolve(outdir, 'workers'), { recursive: true }); } catch {}
} catch {}

const external = [
  // Treat all bare imports as external (node_modules)
  // Additionally, exclude dev-only modules from the bundle
  './vite',
  'vite',
  '../vite.config',
  './server/vite.ts',
];

// 1) Build main server entry (bundled CJS)
await build({
  entryPoints: [resolve(root, 'server', 'index.ts')],
  outfile: resolve(outdir, 'index.cjs'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: false,
  packages: 'external',
  external,
  logLevel: 'info',
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
});

console.log('✅ Server build complete -> dist/server/index.cjs');

// Write a minimal stub for dev-only vite module to satisfy dynamic require in production
import { writeFileSync } from 'node:fs';
try {
  const stub = `const express = require('express');
const fs = require('fs');
const path = require('path');
function serveStatic(app){
  const candidates = [
    path.resolve(process.cwd(), 'dist', 'public'),
    path.resolve('/app', 'dist', 'public'),
    path.resolve(process.cwd(), 'client', 'dist', 'public'),
    path.resolve('/app', 'client', 'dist', 'public')
  ];
  let staticPath = null; let indexPath = null;
  for(const p of candidates){
    const idx = path.join(p,'index.html');
    if (fs.existsSync(idx)){ staticPath = p; indexPath = idx; break; }
  }
  if(!staticPath||!indexPath){
    app.use((req,res)=>{ if(req.path.startsWith('/api/')) return res.status(404).json({error:'API endpoint not found'}); res.status(500).send('Build files not found');});
    return;
  }
  app.use(express.static(staticPath,{ index:false, setHeaders:(res,filePath)=>{
    if(filePath.endsWith('.js')||filePath.endsWith('.mjs')) res.setHeader('Content-Type','application/javascript; charset=UTF-8');
    else if(filePath.endsWith('.css')) res.setHeader('Content-Type','text/css; charset=UTF-8');
    if(process.env.NODE_ENV==='production'){
      if(path.basename(filePath).match(/\.[a-f0-9]{8,}\./)) res.setHeader('Cache-Control','public, max-age=31536000, immutable');
      else res.setHeader('Cache-Control','public, max-age=3600');
    }
  }}));
  const parent = path.dirname(staticPath);
  if(fs.existsSync(path.join(parent,'assets'))){
    app.use('/assets', express.static(path.join(parent,'assets')));
  }
  app.get('*',(req,res,next)=>{
    if(req.path.startsWith('/api/')||req.path.startsWith('/health')||req.path.includes('/assets/')||req.path.includes('.js')||req.path.includes('.css')||req.path.includes('.json')) return next();
    res.sendFile(indexPath);
  });
}
module.exports = { serveStatic };
`;
  writeFileSync(resolve(outdir, 'vite.js'), stub);
  console.log('🧩 Wrote vite.js stub with serveStatic for production');
} catch {}

// 2) Build workers as separate CJS bundles (externalizing node_modules)
const workerExternal = external;
const workerCommon = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: false,
  packages: 'external',
  external: workerExternal,
  logLevel: 'info',
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
};

await build({
  entryPoints: [resolve(root, 'server', 'workers', 'price-worker.ts')],
  outfile: resolve(outdir, 'workers', 'price-worker.cjs'),
  ...workerCommon,
});
await build({
  entryPoints: [resolve(root, 'server', 'workers', 'transcripts-worker.ts')],
  outfile: resolve(outdir, 'workers', 'transcripts-worker.cjs'),
  ...workerCommon,
});
await build({
  entryPoints: [resolve(root, 'server', 'workers', 'valuation-updater.ts')],
  outfile: resolve(outdir, 'workers', 'valuation-updater.cjs'),
  ...workerCommon,
});

console.log('✅ Workers build complete -> dist/server/workers/*.cjs');
