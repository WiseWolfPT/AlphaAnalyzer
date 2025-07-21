#!/usr/bin/env node

/**
 * Koyeb Container File Explorer
 * This script helps debug what files exist in your Koyeb container
 * Run this as your main entry point to see what's actually deployed
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Function to recursively list all files
function listFilesRecursively(dir, fileList = [], baseDir = '') {
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const relativePath = path.relative(baseDir || dir, filePath);
      
      try {
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          fileList.push({
            path: relativePath,
            type: 'directory',
            size: 0
          });
          
          // Recursively list subdirectories
          if (!filePath.includes('node_modules') && !filePath.includes('.git')) {
            listFilesRecursively(filePath, fileList, baseDir || dir);
          }
        } else {
          fileList.push({
            path: relativePath,
            type: 'file',
            size: stat.size
          });
        }
      } catch (err) {
        fileList.push({
          path: relativePath,
          type: 'error',
          error: err.message
        });
      }
    });
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err);
  }
  
  return fileList;
}

// Create HTTP server to display file information
const server = http.createServer((req, res) => {
  if (req.url === '/') {
    const cwd = process.cwd();
    const files = listFilesRecursively(cwd);
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Koyeb Container Debug</title>
  <style>
    body { font-family: monospace; padding: 20px; }
    .file { color: #0066cc; }
    .directory { color: #009900; font-weight: bold; }
    .error { color: #cc0000; }
    .info { background: #f0f0f0; padding: 10px; margin: 20px 0; }
    pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>Koyeb Container File System Debug</h1>
  
  <div class="info">
    <h2>Environment Info:</h2>
    <p><strong>Current Directory:</strong> ${cwd}</p>
    <p><strong>Node Version:</strong> ${process.version}</p>
    <p><strong>Platform:</strong> ${process.platform}</p>
    <p><strong>Architecture:</strong> ${process.arch}</p>
    <p><strong>Port:</strong> ${process.env.PORT || 3001}</p>
  </div>
  
  <div class="info">
    <h2>Environment Variables:</h2>
    <pre>${JSON.stringify(Object.keys(process.env).reduce((acc, key) => {
      if (!key.includes('SECRET') && !key.includes('KEY') && !key.includes('PASSWORD')) {
        acc[key] = process.env[key];
      }
      return acc;
    }, {}), null, 2)}</pre>
  </div>
  
  <h2>Files in Container:</h2>
  <ul>
    ${files.map(file => {
      const className = file.type === 'directory' ? 'directory' : 
                       file.type === 'error' ? 'error' : 'file';
      const display = file.type === 'error' ? 
                     `${file.path} (ERROR: ${file.error})` :
                     `${file.path} (${file.size} bytes)`;
      return `<li class="${className}">${display}</li>`;
    }).join('\n')}
  </ul>
  
  <h2>Package.json Content:</h2>
  <pre>${fs.existsSync('./package.json') ? 
    fs.readFileSync('./package.json', 'utf8') : 
    'package.json not found in current directory'}</pre>
  
  <h2>Server Files Check:</h2>
  <ul>
    <li>server/index.js exists: ${fs.existsSync('./server/index.js')}</li>
    <li>server/server.js exists: ${fs.existsSync('./server/server.js')}</li>
    <li>dist/index.js exists: ${fs.existsSync('./dist/index.js')}</li>
    <li>build/index.js exists: ${fs.existsSync('./build/index.js')}</li>
    <li>index.js exists: ${fs.existsSync('./index.js')}</li>
    <li>app.js exists: ${fs.existsSync('./app.js')}</li>
  </ul>
</body>
</html>
    `;
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } else if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🔍 Debug server running on port ${PORT}`);
  console.log(`📁 Current directory: ${process.cwd()}`);
  console.log(`📦 Files in current directory:`);
  
  fs.readdirSync('.').forEach(file => {
    console.log(`  - ${file}`);
  });
});