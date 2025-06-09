import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 9999;

// Simple test route
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Server is working!', 
    timestamp: new Date().toISOString(),
    port: port
  });
});

// Serve static files from client directory
app.use(express.static(path.join(__dirname, 'client')));

// Fallback for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

app.listen(port, '127.0.0.1', () => {
  console.log(`🚀 Simple server running on:`);
  console.log(`   http://localhost:${port}`);
  console.log(`   http://127.0.0.1:${port}`);
  console.log(`🧪 Test: http://localhost:${port}/test`);
});