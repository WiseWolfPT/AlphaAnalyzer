import { Router } from 'express';
import { MarketDataOrchestrator } from '../../client/src/services/api/market-data-orchestrator';
import { authMiddleware } from '../middleware/auth-middleware';

const router = Router();
const orchestrator = new MarketDataOrchestrator();

// Get real-time quote
router.get('/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const quote = await orchestrator.getRealTimeQuote(symbol);
    
    if (!quote) {
      return res.status(404).json({ error: 'Symbol not found' });
    }
    
    res.json(quote);
  } catch (error) {
    console.error('Quote error:', error);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// Get batch quotes
router.post('/quotes/batch', async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ error: 'Invalid symbols array' });
    }
    
    const quotes = await orchestrator.getBatchQuotes(symbols);
    res.json(quotes);
  } catch (error) {
    console.error('Batch quotes error:', error);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// Get fundamentals
router.get('/fundamentals/:symbol', authMiddleware, async (req, res) => {
  try {
    const { symbol } = req.params;
    const fundamentals = await orchestrator.getFundamentals(symbol);
    
    if (!fundamentals) {
      return res.status(404).json({ error: 'Fundamentals not found' });
    }
    
    res.json(fundamentals);
  } catch (error) {
    console.error('Fundamentals error:', error);
    res.status(500).json({ error: 'Failed to fetch fundamentals' });
  }
});

// Get historical data
router.get('/historical/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1day', outputsize = '30' } = req.query;
    
    const data = await orchestrator.getHistoricalData(
      symbol,
      interval as any,
      parseInt(outputsize as string)
    );
    
    if (!data) {
      return res.status(404).json({ error: 'Historical data not found' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Historical data error:', error);
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
});

// Get API quota status
router.get('/quota/status', authMiddleware, (req, res) => {
  try {
    const quotaStatus = Array.from(orchestrator.getQuotaStatus().entries());
    res.json(quotaStatus);
  } catch (error) {
    console.error('Quota status error:', error);
    res.status(500).json({ error: 'Failed to fetch quota status' });
  }
});

// Warm cache for popular stocks
router.post('/cache/warm', authMiddleware, async (req, res) => {
  try {
    const popularSymbols = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA',
      'META', 'NVDA', 'JPM', 'V', 'JNJ'
    ];
    
    await orchestrator.warmCache(popularSymbols);
    res.json({ message: 'Cache warmed successfully' });
  } catch (error) {
    console.error('Cache warming error:', error);
    res.status(500).json({ error: 'Failed to warm cache' });
  }
});

export { router as marketDataRouter };