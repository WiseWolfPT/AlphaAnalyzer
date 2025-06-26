import express from 'express';
import { createServer } from 'http';

const app = express();
const port = 8080;

// Add basic logging
console.log('Creating minimal test server...');

// Add a simple route
app.get('/', (req, res) => {
  console.log('Received request to /');
  res.send('Test server is working!');
});

app.get('/api/test', (req, res) => {
  console.log('Received request to /api/test');
  res.json({ message: 'API is working!' });
});

// Create the server
const server = createServer(app);

// Add error handling
server.on('error', (err) => {
  console.error('Server error:', err);
});

// Listen with more explicit options
server.listen(port, '0.0.0.0', () => {
  console.log(`Test server is running on port ${port}`);
  console.log(`Try: http://localhost:${port}`);
  console.log(`Try: http://127.0.0.1:${port}`);
  console.log(`Try: http://0.0.0.0:${port}`);
  
  const address = server.address();
  console.log('Server address:', address);
});

// Keep the process alive
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});