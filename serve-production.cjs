const express = require('express');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3001', 'http://127.0.0.1:3001'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:3001', 'http://127.0.0.1:3001'],
  credentials: true
}));

app.use(express.json());

// API endpoints (simple mock for testing)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/stocks', (req, res) => {
  res.json({ stocks: [] });
});

app.get('/api/market-data/batch', async (req, res) => {
  const symbols = req.query.symbols?.split(',') || [];
  const mockData = symbols.map(symbol => ({
    symbol,
    price: Math.random() * 1000,
    change: (Math.random() - 0.5) * 10,
    changePercent: (Math.random() - 0.5) * 5,
    volume: Math.floor(Math.random() * 1000000)
  }));
  res.json(mockData);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);
  
  // Send initial connection confirmation
  socket.emit('connected', { 
    message: 'Connected to WebSocket server',
    timestamp: new Date().toISOString()
  });
  
  // Join market updates room
  socket.on('subscribe', (symbols) => {
    console.log('📊 Client subscribed to:', symbols);
    socket.join('market-updates');
    socket.emit('subscribed', { symbols });
  });
  
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// Simulate real-time price updates every 5 seconds
setInterval(() => {
  const updates = {
    AAPL: { price: 230 + Math.random() * 10, change: Math.random() - 0.5 },
    MSFT: { price: 500 + Math.random() * 20, change: Math.random() - 0.5 },
    GOOGL: { price: 210 + Math.random() * 5, change: Math.random() - 0.5 }
  };
  
  io.to('market-updates').emit('batch-quotes-updated', {
    quotes: Object.entries(updates).map(([symbol, data]) => ({
      symbol,
      ...data,
      timestamp: new Date().toISOString()
    }))
  });
  
  console.log('📡 Broadcast price update to', io.sockets.adapter.rooms.get('market-updates')?.size || 0, 'clients');
}, 5000);

// Serve static files from client dist
const clientPath = path.join(__dirname, 'client', 'dist', 'public');
console.log('📁 Serving static files from:', clientPath);

// Serve static files with proper headers
app.use(express.static(clientPath, {
  etag: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
    }
  }
}));

// Fallback to client-side routing
app.get('*', (req, res) => {
  const indexPath = path.join(clientPath, 'index.html');
  console.log('🔍 Serving index.html from:', indexPath);
  res.sendFile(indexPath);
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`
🚀 Production server running!
📱 Local:    http://localhost:${PORT}
🌐 Network:  http://127.0.0.1:${PORT}
🔌 WebSocket: ws://localhost:${PORT}

✅ Socket.IO initialized and ready for connections
📊 Real-time price updates every 5 seconds
  `);
});