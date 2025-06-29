import express from 'express';
import { createServer } from 'http';

console.log('Starting diagnostic server...');

const app = express();
const port = 8080;

// Most basic possible route
app.get('/', (req, res) => {
  res.send('Diagnostic server is working!');
});

// Create and start server without any middleware
const server = createServer(app);

// Try different binding approaches
console.log('Attempting to bind to port', port);

server.listen(port, () => {
  const addr = server.address();
  console.log('Server address:', addr);
  console.log(`Diagnostic server running on port ${port}`);
});

// Handle errors
server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use`);
  } else if (err.code === 'EACCES') {
    console.error(`Permission denied to use port ${port}`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

// Keep process alive
process.stdin.resume();