import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth-middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit-middleware';
import { validationSchemas, validateRequest } from '../security/security-middleware';
import { z } from 'zod';
// SECURITY FIX: Import CORS configuration for proper cross-origin handling
import cors from 'cors';
import { corsConfig } from '../security/security-middleware';

const router = Router();

// SECURITY FIX: Apply CORS configuration to all routes in this router
router.use(cors(corsConfig));

// Rate limiting específico para market data
const marketDataRateLimit = rateLimitMiddleware.endpointRateLimit('/api/market-data', {
  'free': 50,     // 50 requests per hour
  'pro': 200,     // 200 requests per hour
  'premium': 500, // 500 requests per hour
});

// Schema de validação para símbolos de ações
const stockSymbolSchema = z.object({
  symbol: z.string()
    .min(1, 'Stock symbol is required')
    .max(10, 'Stock symbol too long')
    .regex(/^[A-Z0-9]+$/, 'Stock symbol must contain only uppercase letters and numbers')
    .transform(val => val.toUpperCase()),
});

// Obter API keys do ambiente (NUNCA do frontend!)
const API_KEYS = {
  FINNHUB: process.env.FINNHUB_API_KEY,
  ALPHA_VANTAGE: process.env.ALPHA_VANTAGE_API_KEY,
  FMP: process.env.FMP_API_KEY,
  TWELVE_DATA: process.env.TWELVE_DATA_API_KEY,
};

// Verificar se as API keys estão configuradas
function checkApiKey(provider: keyof typeof API_KEYS): string {
  const key = API_KEYS[provider];
  if (!key || key === 'demo') {
    throw new Error(`${provider} API key not configured. Please set ${provider}_API_KEY environment variable.`);
  }
  return key;
}

/**
 * Finnhub Proxy Endpoints
 */
router.get('/finnhub/quote/:symbol', 
  authMiddleware.instance.authenticate(),
  marketDataRateLimit,
  validateRequest(stockSymbolSchema),
  async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const apiKey = checkApiKey('FINNHUB');
      
      // Fazer chamada segura para Finnhub com a API key do servidor
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Log para auditoria
      await db.logSecurityEvent({
        user_id: req.user!.id,
        action: 'market_data_query',
        resource: 'finnhub_quote',
        ip_address: req.ip || '',
        user_agent: req.headers['user-agent'] || '',
        success: true,
        details: { symbol, provider: 'finnhub' }
      });
      
      res.json(data);
    } catch (error) {
      console.error('Finnhub proxy error:', error);
      res.status(500).json({
        error: 'MARKET_DATA_ERROR',
        message: 'Failed to fetch market data',
      });
    }
  }
);

/**
 * Alpha Vantage Proxy Endpoints
 */
router.get('/alpha-vantage/quote/:symbol',
  authMiddleware.instance.authenticate(),
  marketDataRateLimit,
  validateRequest(stockSymbolSchema),
  async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const apiKey = checkApiKey('ALPHA_VANTAGE');
      
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Alpha Vantage proxy error:', error);
      res.status(500).json({
        error: 'MARKET_DATA_ERROR',
        message: 'Failed to fetch market data',
      });
    }
  }
);

/**
 * FMP (Financial Modeling Prep) Proxy Endpoints
 */
router.get('/fmp/quote/:symbol',
  authMiddleware.instance.authenticate(),
  marketDataRateLimit,
  validateRequest(stockSymbolSchema),
  async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const apiKey = checkApiKey('FMP');
      
      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`FMP API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('FMP proxy error:', error);
      res.status(500).json({
        error: 'MARKET_DATA_ERROR',
        message: 'Failed to fetch market data',
      });
    }
  }
);

/**
 * Twelve Data Proxy Endpoints
 */
router.get('/twelve-data/quote/:symbol',
  authMiddleware.instance.authenticate(),
  marketDataRateLimit,
  validateRequest(stockSymbolSchema),
  async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const apiKey = checkApiKey('TWELVE_DATA');
      
      const response = await fetch(
        `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`Twelve Data API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Twelve Data proxy error:', error);
      res.status(500).json({
        error: 'MARKET_DATA_ERROR',
        message: 'Failed to fetch market data',
      });
    }
  }
);

/**
 * Endpoint unificado para obter cotações com fallback automático
 */
router.get('/quote/:symbol',
  authMiddleware.instance.authenticate(),
  marketDataRateLimit,
  validateRequest(stockSymbolSchema),
  async (req: Request, res: Response) => {
    const { symbol } = req.params;
    const providers = ['FINNHUB', 'FMP', 'TWELVE_DATA', 'ALPHA_VANTAGE'] as const;
    
    // Tentar cada provider em ordem até obter sucesso
    for (const provider of providers) {
      try {
        const apiKey = API_KEYS[provider];
        if (!apiKey || apiKey === 'demo') continue;
        
        let url: string;
        switch (provider) {
          case 'FINNHUB':
            url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
            break;
          case 'FMP':
            url = `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${apiKey}`;
            break;
          case 'TWELVE_DATA':
            url = `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${apiKey}`;
            break;
          case 'ALPHA_VANTAGE':
            url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
            break;
        }
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          
          // Normalizar resposta para formato consistente
          const normalizedData = normalizeQuoteData(data, provider);
          
          return res.json({
            ...normalizedData,
            _provider: provider, // Informar qual provider foi usado
          });
        }
      } catch (error) {
        console.warn(`Provider ${provider} failed:`, error);
        continue; // Tentar próximo provider
      }
    }
    
    // Se todos falharem, retornar erro
    res.status(503).json({
      error: 'ALL_PROVIDERS_FAILED',
      message: 'Unable to fetch market data from any provider',
    });
  }
);

// Função para normalizar dados de diferentes providers
function normalizeQuoteData(data: any, provider: string): any {
  switch (provider) {
    case 'FINNHUB':
      return {
        symbol: data.symbol,
        price: data.c,
        change: data.d,
        changePercent: data.dp,
        high: data.h,
        low: data.l,
        open: data.o,
        previousClose: data.pc,
        timestamp: data.t,
      };
    
    case 'FMP':
      return data[0] ? {
        symbol: data[0].symbol,
        price: data[0].price,
        change: data[0].change,
        changePercent: data[0].changesPercentage,
        high: data[0].dayHigh,
        low: data[0].dayLow,
        open: data[0].open,
        previousClose: data[0].previousClose,
        timestamp: data[0].timestamp,
      } : null;
    
    // Adicionar outros providers conforme necessário
    default:
      return data;
  }
}

// Importar db utils
import { dbUtils } from '../db';
const db = dbUtils;

export default router;