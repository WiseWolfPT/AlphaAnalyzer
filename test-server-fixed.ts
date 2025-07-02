import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Enable CORS
app.use(cors());

// CRITICAL: Health check MUST be before any other middleware
app.get('/health', (req, res) => {
  console.log(`Health check requested from ${req.ip}`);
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  console.log(`API health check requested from ${req.ip}`);
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Add other middleware AFTER health checks
app.use(express.json());

// Default route
app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ Test server running on http://localhost:${PORT}`);
  console.log(`🔍 Test health: curl -I http://localhost:${PORT}/health`);
  console.log(`🔍 Test API health: curl -I http://localhost:${PORT}/api/health`);
});