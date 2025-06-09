import http from 'http';

function tryPort(port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head><title>Debug Server</title></head>
          <body>
            <h1>🚀 Server Working on Port ${port}!</h1>
            <p>If you can see this, the connection is working.</p>
            <p>Request URL: ${req.url}</p>
            <p>Time: ${new Date().toISOString()}</p>
          </body>
        </html>
      `);
    });

    server.on('error', (err) => {
      console.log(`❌ Port ${port} failed: ${err.message}`);
      reject(err);
    });

    server.listen(port, 'localhost', () => {
      console.log(`✅ Server successfully listening on localhost:${port}`);
      console.log(`🔗 Open: http://localhost:${port}`);
      resolve(server);
    });
  });
}

// Try multiple ports
const ports = [8080, 8000, 9000, 3333, 7777];

console.log('🔍 Testing multiple ports...');

for (const port of ports) {
  try {
    await tryPort(port);
    console.log(`🎉 Successfully started server on port ${port}`);
    break;
  } catch (err) {
    console.log(`⚠️ Port ${port} not available, trying next...`);
  }
}

// Keep running
process.stdin.resume();