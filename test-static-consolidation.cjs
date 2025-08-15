const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Serve static files
const staticPath = path.join(__dirname, 'dist', 'public');
console.log('Serving static files from:', staticPath);
console.log('Index exists:', fs.existsSync(path.join(staticPath, 'index.html')));

app.use(express.static(staticPath));

// API health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Consolidation working!' });
});

// Fallback for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  
  // Test endpoints
  const http = require('http');
  
  console.log('\n=== TESTING CONSOLIDATION ===');
  
  // Test health
  http.get(`http://localhost:${PORT}/api/health`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Health:', data));
  });
  
  // Test root
  http.get(`http://localhost:${PORT}/`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Root HTML:', data.substring(0, 100) + '...'));
  });
  
  // Test asset
  http.get(`http://localhost:${PORT}/favicon.png`, (res) => {
    console.log('Favicon Status:', res.statusCode, res.headers['content-type']);
  });
});