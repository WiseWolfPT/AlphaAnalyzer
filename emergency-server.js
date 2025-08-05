#!/usr/bin/env node

/**
 * Emergency Coolify Server
 * Minimal server that will definitely work on Coolify
 * This bypasses all build steps and runs directly
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Try to find and run the actual server
function findAndRunServer() {
  const possiblePaths = [
    './server/index.js',
    './server/server.js',
    './dist/index.js',
    './dist/server.js',
    './build/index.js',
    './build/server.js',
    './index.js',
    './app.js',
    './server.js'
  ];
  
  for (const serverPath of possiblePaths) {
    if (fs.existsSync(serverPath)) {
      console.log(`✅ Found server at ${serverPath}, attempting to run...`);
      try {
        require(path.resolve(serverPath));
        return true;
      } catch (err) {
        console.error(`❌ Failed to run ${serverPath}:`, err.message);
      }
    }
  }
  
  return false;
}

// If no server found, create emergency server
if (!findAndRunServer()) {
  console.log('⚠️  No server file found, starting emergency server...');
  
  const server = http.createServer((req, res) => {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Alfalyzer - Emergency Mode</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .status { 
      background: #fff3cd; 
      border: 1px solid #ffeaa7; 
      padding: 15px; 
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .info {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin: 10px 0;
      font-family: monospace;
    }
    h1 { color: #333; }
    .emergency { color: #e74c3c; }
    button {
      background: #007bff;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      margin: 5px;
    }
    button:hover { background: #0056b3; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚨 Alfalyzer <span class="emergency">Emergency Mode</span></h1>
    
    <div class="status">
      <strong>⚠️ Server Status:</strong> Running in emergency fallback mode
    </div>
    
    <h2>Deployment Information:</h2>
    <div class="info">
      <strong>Port:</strong> ${process.env.PORT || 3001}<br>
      <strong>Node Version:</strong> ${process.version}<br>
      <strong>Current Directory:</strong> ${process.cwd()}<br>
      <strong>Server Time:</strong> ${new Date().toISOString()}
    </div>
    
    <h2>Quick Actions:</h2>
    <button onclick="window.location.href='/debug'">View Debug Info</button>
    <button onclick="window.location.href='/health'">Check Health</button>
    
    <h2>What's Happening?</h2>
    <p>The main application server couldn't be found or started. This emergency server is running to provide basic functionality and debugging information.</p>
    
    <h2>Deployment Checklist:</h2>
    <ul>
      <li>✓ Node.js is running</li>
      <li>✓ HTTP server is responding</li>
      <li>✓ Port ${process.env.PORT || 3001} is bound</li>
      <li>${fs.existsSync('./package.json') ? '✓' : '✗'} package.json found</li>
      <li>${fs.existsSync('./server') ? '✓' : '✗'} server directory found</li>
      <li>${fs.existsSync('./client') ? '✓' : '✗'} client directory found</li>
    </ul>
  </div>
</body>
</html>
    `;
    
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } else if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', mode: 'emergency', timestamp: new Date().toISOString() }));
    } else if (req.url === '/debug') {
      const debugInfo = {
        cwd: process.cwd(),
        env: Object.keys(process.env).filter(k => !k.includes('SECRET')),
        files: fs.readdirSync('.'),
        nodeVersion: process.version
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(debugInfo, null, 2));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });
  
  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`🚨 Emergency server running on port ${PORT}`);
    console.log(`📍 Visit http://localhost:${PORT} to see status`);
  });
}