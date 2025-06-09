import express from 'express';

const app = express();
const port = 4000;

app.get('/', (req, res) => {
  res.send('<h1>Test Server Working!</h1><p>If you can see this, the server is accessible.</p>');
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working', timestamp: new Date().toISOString() });
});

const server = app.listen(port, '127.0.0.1', () => {
  console.log(`🚀 Minimal test server running on:`);
  console.log(`   http://localhost:${port}`);
  console.log(`   http://127.0.0.1:${port}`);
  console.log(`🧪 Test API: http://localhost:${port}/api/test`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

// Keep server running
process.on('SIGINT', () => {
  console.log('\n🛑 Server shutting down...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});