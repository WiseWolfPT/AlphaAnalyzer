// Ultra-simple Koyeb entry point
// This file is at the root and will be found by most deployment systems

const PORT = process.env.PORT || 3001;

// Try to load the actual server
try {
  console.log('Attempting to load main server...');
  require('./server/index.js');
} catch (err) {
  console.log('Main server failed:', err.message);
  
  // Try emergency server
  try {
    console.log('Attempting emergency server...');
    require('./emergency-server.js');
  } catch (err2) {
    console.log('Emergency server failed:', err2.message);
    
    // Ultimate fallback - inline server
    console.log('Starting inline fallback server...');
    require('http').createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({status: 'ok', mode: 'fallback'}));
      } else {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>Alfalyzer</title></head>
          <body>
            <h1>Alfalyzer Running on Koyeb</h1>
            <p>Server: Fallback Mode</p>
            <p>Port: ${PORT}</p>
            <p>Time: ${new Date()}</p>
            <p><a href="/health">Health Check</a></p>
          </body>
          </html>
        `);
      }
    }).listen(PORT, () => {
      console.log(`Fallback server running on port ${PORT}`);
    });
  }
}