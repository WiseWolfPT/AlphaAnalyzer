// Minimal test server to debug the 426 issue
import express from 'express';

const app = express();

// Basic health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

const server = app.listen(3002, '127.0.0.1', () => {
  console.log('Test server running on http://localhost:3002');
  console.log('Health: http://localhost:3002/health');
  console.log('Test: http://localhost:3002/test');
});
TESTEOF < /dev/null