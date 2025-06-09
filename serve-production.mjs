import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 8080;

// Serve static files from the dist/public directory
app.use(express.static(path.join(__dirname, 'dist', 'public')));

// API routes - simple mock data for now
app.get('/api/stocks', (req, res) => {
  res.json([
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: '175.43',
      change: '2.34',
      changePercent: '1.35',
      sector: 'Technology',
      marketCap: '$2.8T',
      eps: '6.13',
      peRatio: '28.6'
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      price: '378.85',
      change: '-1.23',
      changePercent: '-0.32',
      sector: 'Technology',
      marketCap: '$2.8T',
      eps: '9.65',
      peRatio: '39.2'
    }
  ]);
});

app.get('/api/stocks/:symbol', (req, res) => {
  const { symbol } = req.params;
  res.json({
    symbol: symbol.toUpperCase(),
    name: 'Company Name',
    price: '175.43',
    change: '2.34',
    changePercent: '1.35',
    sector: 'Technology',
    marketCap: '$2.8T',
    eps: '6.13',
    peRatio: '28.6',
    logo: null
  });
});

app.get('/api/watchlists', (req, res) => {
  res.json([]);
});

app.get('/api/earnings', (req, res) => {
  res.json([]);
});

// Fallback for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'public', 'index.html'));
});

const server = app.listen(port, 'localhost', () => {
  console.log(`🚀 Production Stock Analysis App running on:`);
  console.log(`   http://localhost:${port}`);
  console.log('');
  console.log('✅ Available pages:');
  console.log('   📊 Insights: http://localhost:8080/insights');
  console.log('   📈 Stock Detail: http://localhost:8080/stock/AAPL');
  console.log('   📋 Watchlists: http://localhost:8080/watchlists');
  console.log('   📅 Earnings: http://localhost:8080/earnings');
  console.log('');
  console.log('🔧 API endpoints:');
  console.log('   http://localhost:8080/api/stocks');
  console.log('   http://localhost:8080/api/stocks/AAPL');
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Server shutting down...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});