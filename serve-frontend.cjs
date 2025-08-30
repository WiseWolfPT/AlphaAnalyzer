const express = require('express');
const path = require('path');

const app = express();
const PORT = 8080;

// Proxy API requests to simple backend
app.use('/api', (req, res) => {
  const http = require('http');
  
  // Keep the full /api path when forwarding
  const fullPath = '/api' + req.url;
  
  const options = {
    hostname: 'localhost',
    port: 3002,
    path: fullPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: 'localhost:3002'
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
  console.log(`🚀 Frontend server running at http://localhost:${PORT}`);
  console.log(`📡 Proxying /api requests to http://localhost:3002`);
  console.log(`📂 Serving frontend from client/dist/public`);
});