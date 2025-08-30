const express = require('express');
const path = require('path');

const app = express();
const PORT = 8080;

// Proxy API requests to backend
app.use('/api', (req, res) => {
  const http = require('http');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      'X-API-Key': 'alfalyzer-mkt-2025-secure-key',
      host: 'localhost:3001'
    }
  };

  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxy.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.status(502).json({ error: 'Backend unavailable' });
  });

  req.pipe(proxy, { end: true });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'client/dist/public')));

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/public/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Unified server running at http://localhost:${PORT}`);
  console.log(`📡 Proxying /api requests to http://localhost:3001`);
  console.log(`📂 Serving frontend from client/dist/public`);
});