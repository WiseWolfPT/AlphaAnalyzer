// Minimal version of main server to debug 426 issue
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

const app = express();

// CRITICAL: Health check endpoint MUST be before ALL middleware
app.get('/health', (req, res) => {
  console.log('Health check requested from ' + req.ip);
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    environment: 'development'
  });
});

// Basic CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Basic JSON parsing
app.use(express.json());

// Test API endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API endpoint working', timestamp: new Date() });
});

// Create HTTP server
const server = createServer(app);

// Start server
const port = 3002;
server.listen(port, '127.0.0.1', () => {
  console.log('Minimal server running on http://localhost:' + port);
  console.log('Health: http://localhost:' + port + '/health');
  console.log('API: http://localhost:' + port + '/api/test');
});
EOF < /dev/null