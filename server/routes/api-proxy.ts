/**
 * API PROXY ROUTES - WAVE 4 Implementation
 * 
 * Secure proxy endpoints for Alpha Vantage APIs
 * Centralizes API key management and implements rate limiting
 */

import express from 'express';
import axios from 'axios';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for API proxy endpoints
const apiProxyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many API requests',
    message: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all proxy routes
router.use(apiProxyLimiter);

// Environment variables for API keys
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// Validation middleware
const validateApiKeys = (_req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!ALPHA_VANTAGE_API_KEY) {
    return res.status(500).json({
      error: 'Alpha Vantage API key not configured',
      provider: 'alphavantage'
    });
  }
  
  next();
};

/**
 * ALPHA VANTAGE PROXY ENDPOINTS
 */

// Alpha Vantage company overview proxy
router.get('/alphavantage/overview/:symbol', validateApiKeys, async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'OVERVIEW',
        symbol: symbol.toUpperCase(),
        apikey: ALPHA_VANTAGE_API_KEY
      },
      timeout: 15000
    });

    // Alpha Vantage returns error in the data itself
    if (response.data['Error Message'] || response.data['Note']) {
      return res.status(429).json({
        error: 'Alpha Vantage API error',
        message: response.data['Error Message'] || response.data['Note'],
        provider: 'alphavantage'
      });
    }

    res.json({
      success: true,
      data: response.data,
      provider: 'alphavantage',
      symbol,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Alpha Vantage overview proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Alpha Vantage overview request failed',
      message: error.message,
      provider: 'alphavantage'
    });
  }
});

// Alpha Vantage earnings proxy
router.get('/alphavantage/earnings/:symbol', validateApiKeys, async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'EARNINGS',
        symbol: symbol.toUpperCase(),
        apikey: ALPHA_VANTAGE_API_KEY
      },
      timeout: 15000
    });

    // Check for API errors
    if (response.data['Error Message'] || response.data['Note']) {
      return res.status(429).json({
        error: 'Alpha Vantage API error',
        message: response.data['Error Message'] || response.data['Note'],
        provider: 'alphavantage'
      });
    }

    res.json({
      success: true,
      data: response.data,
      provider: 'alphavantage',
      symbol,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Alpha Vantage earnings proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Alpha Vantage earnings request failed',
      message: error.message,
      provider: 'alphavantage'
    });
  }
});

// Alpha Vantage time series proxy
router.get('/alphavantage/timeseries/:symbol', validateApiKeys, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { function: fn = 'TIME_SERIES_DAILY', outputsize = 'compact' } = req.query;
    
    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: fn,
        symbol: symbol.toUpperCase(),
        outputsize,
        apikey: ALPHA_VANTAGE_API_KEY
      },
      timeout: 20000
    });

    // Check for API errors
    if (response.data['Error Message'] || response.data['Note']) {
      return res.status(429).json({
        error: 'Alpha Vantage API error',
        message: response.data['Error Message'] || response.data['Note'],
        provider: 'alphavantage'
      });
    }

    res.json({
      success: true,
      data: response.data,
      provider: 'alphavantage',
      symbol,
      function: fn,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Alpha Vantage timeseries proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Alpha Vantage timeseries request failed',
      message: error.message,
      provider: 'alphavantage'
    });
  }
});

/**
 * HEALTH CHECK ENDPOINT
 */
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    providers: {
      alphavantage: {
        configured: !!ALPHA_VANTAGE_API_KEY,
        status: ALPHA_VANTAGE_API_KEY ? 'ready' : 'missing_key'
      }
    }
  };

  res.json(health);
});

export default router;
