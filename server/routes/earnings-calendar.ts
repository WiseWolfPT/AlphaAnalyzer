/**
 * Earnings Calendar Routes - Fase 3.7 Implementation
 * 
 * Rotas para dados reais de earnings usando Alpha Vantage e FMP
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth-middleware';

const router = Router();

// Validation schemas
const earningsCalendarSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
});

const symbolSchema = z.object({
  symbol: z.string().min(1).max(10).regex(/^[A-Z]+$/, 'Símbolo deve conter apenas letras maiúsculas'),
  limit: z.coerce.number().min(1).max(50).optional().default(4)
});

// Interface para evento de earnings
interface EarningsEvent {
  symbol: string;
  companyName: string;
  reportDate: string;
  time: 'before_open' | 'after_close' | 'during_market';
  estimatedEPS?: number;
  actualEPS?: number;
  estimatedRevenue?: number;
  actualRevenue?: number;
  fiscalQuarter?: string;
  fiscalYear?: number;
  source: 'alpha_vantage' | 'fmp' | 'cache';
  lastUpdated: string;
}

// Cache em memória (24 horas)
const earningsCache: Map<string, { data: any; timestamp: number }> = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

// Apply optional authentication for rate limiting
router.use(authMiddleware.instance.optionalAuth());

/**
 * GET /api/earnings/calendar
 * Busca earnings calendar para um período específico
 */
router.get('/calendar', async (req: Request, res: Response) => {
  try {
    const validatedQuery = earningsCalendarSchema.parse(req.query);
    const { from, to } = validatedQuery;
    
    const cacheKey = `calendar_${from}_${to}`;
    
    // Verificar cache primeiro
    const cached = earningsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`📊 Cache hit para earnings calendar: ${from} - ${to}`);
      return res.json({
        success: true,
        data: {
          events: cached.data,
          totalCount: cached.data.length,
          fromCache: true,
          source: 'cache',
          lastUpdated: new Date(cached.timestamp).toISOString()
        },
        timestamp: new Date().toISOString()
      });
    }

    console.log(`🔄 Buscando earnings calendar: ${from} até ${to}`);
    
    // Tentar Alpha Vantage primeiro
    let events: EarningsEvent[] = [];
    let source = 'alpha_vantage';
    
    try {
      events = await fetchFromAlphaVantage(from, to);
      console.log(`✅ Alpha Vantage: ${events.length} eventos encontrados`);
    } catch (alphaError) {
      console.warn('⚠️ Alpha Vantage falhou, tentando FMP:', alphaError);
      
      try {
        events = await fetchFromFMP(from, to);
        source = 'fmp';
        console.log(`✅ FMP: ${events.length} eventos encontrados`);
      } catch (fmpError) {
        console.error('🚨 Ambas APIs falharam:', fmpError);
        throw new Error('Serviço de earnings temporariamente indisponível. Tente novamente em alguns minutos.');
      }
    }

    // Cache por 24 horas
    earningsCache.set(cacheKey, { data: events, timestamp: Date.now() });

    res.json({
      success: true,
      data: {
        events,
        totalCount: events.length,
        fromCache: false,
        source,
        lastUpdated: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro na rota earnings calendar:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros inválidos',
        details: error.errors,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/earnings/symbol/:symbol
 * Busca earnings históricos para um símbolo específico
 */
router.get('/symbol/:symbol', async (req: Request, res: Response) => {
  try {
    const validatedParams = symbolSchema.parse({
      symbol: req.params.symbol.toUpperCase(),
      limit: req.query.limit
    });
    
    const { symbol, limit } = validatedParams;
    const cacheKey = `symbol_${symbol}_${limit}`;
    
    // Verificar cache
    const cached = earningsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`📊 Cache hit para earnings de ${symbol}`);
      return res.json({
        success: true,
        data: { events: cached.data },
        timestamp: new Date().toISOString()
      });
    }

    console.log(`🔄 Buscando earnings para símbolo: ${symbol}`);
    
    let events: EarningsEvent[] = [];
    
    try {
      events = await fetchSymbolEarningsFromAlphaVantage(symbol, limit);
    } catch (error) {
      console.error(`❌ Erro ao buscar earnings para ${symbol}:`, error);
      throw new Error(`Dados de earnings para ${symbol} temporariamente indisponíveis. Tente novamente em alguns minutos.`);
    }

    // Cache por 24 horas
    earningsCache.set(cacheKey, { data: events, timestamp: Date.now() });

    res.json({
      success: true,
      data: { events },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro na rota earnings symbol:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros inválidos',
        details: error.errors,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/earnings/status
 * Verifica status da conexão com APIs
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = {
      alphaVantage: false,
      fmp: false,
      lastCheck: new Date().toISOString()
    };

    // Testar Alpha Vantage
    try {
      const testDate = new Date().toISOString().split('T')[0];
      await fetchFromAlphaVantage(testDate, testDate);
      status.alphaVantage = true;
    } catch (error) {
      console.warn('Alpha Vantage status check falhou:', error);
    }

    // Testar FMP
    try {
      const testDate = new Date().toISOString().split('T')[0];
      await fetchFromFMP(testDate, testDate);
      status.fmp = true;
    } catch (error) {
      console.warn('FMP status check falhou:', error);
    }

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro no status check:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar status',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/earnings/cache
 * Limpa cache de earnings (admin only)
 */
router.delete('/cache', authMiddleware.instance.requirePermissions(['admin:access']), async (req: Request, res: Response) => {
  try {
    earningsCache.clear();
    console.log('🗑️ Cache de earnings limpo por admin');
    
    res.json({
      success: true,
      message: 'Cache limpo com sucesso',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Erro ao limpar cache:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao limpar cache',
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// FUNÇÕES DE INTEGRAÇÃO COM APIs
// ============================================================================

/**
 * Busca dados do Alpha Vantage
 */
async function fetchFromAlphaVantage(from: string, to: string): Promise<EarningsEvent[]> {
  const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
  
  if (!API_KEY || API_KEY === 'demo') {
    throw new Error('Alpha Vantage API key não configurada');
  }

  // Alpha Vantage Earnings Calendar endpoint
  const url = `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&horizon=3month&apikey=${API_KEY}`;
  
  console.log('🔄 Chamando Alpha Vantage Earnings Calendar...');
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }

  const csvData = await response.text();
  
  if (csvData.includes('Thank you for using Alpha Vantage')) {
    throw new Error('Alpha Vantage rate limit exceeded');
  }

  return parseAlphaVantageCSV(csvData, from, to);
}

/**
 * Busca dados do FMP (Financial Modeling Prep)
 */
async function fetchFromFMP(from: string, to: string): Promise<EarningsEvent[]> {
  const API_KEY = process.env.FMP_API_KEY;
  
  if (!API_KEY || API_KEY === 'demo') {
    throw new Error('FMP API key não configurada');
  }

  const url = `https://financialmodelingprep.com/api/v3/earning_calendar?from=${from}&to=${to}&apikey=${API_KEY}`;
  
  console.log('🔄 Chamando FMP Earnings Calendar...');
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`FMP API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`FMP error: ${data.error}`);
  }

  return parseFMPResponse(data);
}

/**
 * Busca earnings de símbolo específico do Alpha Vantage
 */
async function fetchSymbolEarningsFromAlphaVantage(symbol: string, limit: number): Promise<EarningsEvent[]> {
  const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
  
  if (!API_KEY || API_KEY === 'demo') {
    throw new Error('Alpha Vantage API key não configurada');
  }

  const url = `https://www.alphavantage.co/query?function=EARNINGS&symbol=${symbol}&apikey=${API_KEY}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data['Error Message'] || data['Note']) {
    throw new Error(data['Error Message'] || data['Note']);
  }

  return parseAlphaVantageEarnings(data, symbol, limit);
}

// ============================================================================
// FUNÇÕES DE PARSING
// ============================================================================

/**
 * Parse CSV do Alpha Vantage
 */
function parseAlphaVantageCSV(csvData: string, from: string, to: string): EarningsEvent[] {
  const lines = csvData.split('\n');
  const events: EarningsEvent[] = [];
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = line.split(',');
    if (columns.length < 6) continue;
    
    const [symbol, name, reportDate, fiscalDateEnding, estimate, currency] = columns;
    
    // Filtrar por período
    if (reportDate >= from && reportDate <= to) {
      events.push({
        symbol: symbol.replace(/"/g, ''),
        companyName: name.replace(/"/g, ''),
        reportDate,
        time: 'after_close', // Alpha Vantage não especifica horário
        estimatedEPS: estimate && estimate !== 'None' ? parseFloat(estimate) : undefined,
        source: 'alpha_vantage',
        lastUpdated: new Date().toISOString()
      });
    }
  }
  
  return events;
}

/**
 * Parse resposta do FMP
 */
function parseFMPResponse(data: any[]): EarningsEvent[] {
  return data.map(item => ({
    symbol: item.symbol,
    companyName: item.name || item.symbol,
    reportDate: item.date,
    time: item.time || 'after_close',
    estimatedEPS: item.epsEstimated,
    actualEPS: item.eps,
    estimatedRevenue: item.revenueEstimated,
    actualRevenue: item.revenue,
    fiscalQuarter: item.fiscalQuarter,
    fiscalYear: item.fiscalYear,
    source: 'fmp' as const,
    lastUpdated: new Date().toISOString()
  }));
}

/**
 * Parse earnings históricos do Alpha Vantage
 */
function parseAlphaVantageEarnings(data: any, symbol: string, limit: number): EarningsEvent[] {
  const quarterlyEarnings = data.quarterlyEarnings || [];
  
  return quarterlyEarnings.slice(0, limit).map((earning: any) => ({
    symbol,
    companyName: symbol,
    reportDate: earning.reportedDate,
    time: 'after_close' as const,
    actualEPS: parseFloat(earning.reportedEPS),
    estimatedEPS: parseFloat(earning.estimatedEPS),
    source: 'alpha_vantage' as const,
    lastUpdated: new Date().toISOString()
  }));
}

// ============================================================================
// DADOS MOCK PARA FALLBACK
// ============================================================================

function getMockEarningsForPeriod(from: string, to: string): EarningsEvent[] {
  const startDate = new Date(from);
  const endDate = new Date(to);
  
  const mockEvents: EarningsEvent[] = [
    {
      symbol: 'AAPL',
      companyName: 'Apple Inc.',
      reportDate: getDateInRange(startDate, endDate, 1),
      time: 'after_close',
      estimatedEPS: 2.11,
      source: 'alpha_vantage',
      lastUpdated: new Date().toISOString()
    },
    {
      symbol: 'MSFT',
      companyName: 'Microsoft Corporation',
      reportDate: getDateInRange(startDate, endDate, 2),
      time: 'after_close',
      estimatedEPS: 2.78,
      source: 'alpha_vantage',
      lastUpdated: new Date().toISOString()
    },
    {
      symbol: 'GOOGL',
      companyName: 'Alphabet Inc.',
      reportDate: getDateInRange(startDate, endDate, 2),
      time: 'before_open',
      estimatedEPS: 1.45,
      source: 'alpha_vantage',
      lastUpdated: new Date().toISOString()
    }
  ];
  
  return mockEvents.filter(event => event.reportDate >= from && event.reportDate <= to);
}

function getMockEarningsForSymbol(symbol: string, limit: number): EarningsEvent[] {
  return Array.from({ length: Math.min(limit, 4) }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (i * 3)); // Quarters
    
    return {
      symbol,
      companyName: symbol,
      reportDate: date.toISOString().split('T')[0],
      time: 'after_close' as const,
      estimatedEPS: 1.5 + Math.random() * 2,
      actualEPS: 1.5 + Math.random() * 2,
      source: 'alpha_vantage' as const,
      lastUpdated: new Date().toISOString()
    };
  });
}

function getDateInRange(startDate: Date, endDate: Date, dayOffset: number): string {
  const date = new Date(startDate);
  date.setDate(date.getDate() + (dayOffset - 1));
  
  if (date > endDate) {
    date.setTime(endDate.getTime());
  }
  
  return date.toISOString().split('T')[0];
}

export default router;