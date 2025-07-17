/**
 * VERCEL CRON: Update Tier 1 Stocks (Cada 15 minutos)
 * Atualiza os 10 stocks mais importantes com dados em tempo real
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Configuração
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET || 'your-cron-secret';
const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;

// Top 10 stocks (Tier 1) - Atualizados a cada 15 minutos
const TIER_1_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA',
  'META', 'NVDA', 'JPM', 'V', 'JNJ'
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('🕐 Tier 1 Cron Job iniciado:', new Date().toISOString());

  // Verificar autenticação do cron
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    console.error('❌ Cron não autorizado');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Verificar variáveis obrigatórias
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    console.log(`📊 Processando ${TIER_1_STOCKS.length} stocks Tier 1...`);

    // Processar cada stock do Tier 1
    for (const symbol of TIER_1_STOCKS) {
      results.processed++;
      
      try {
        // Buscar dados atuais
        const stockData = await fetchStockData(symbol);
        
        if (!stockData) {
          throw new Error(`No data found for ${symbol}`);
        }

        // Atualizar ou inserir stock na tabela stocks
        const { error: stockError } = await supabase
          .from('stocks')
          .upsert({
            symbol: stockData.symbol,
            name: stockData.name || `${symbol} Inc.`,
            exchange: stockData.exchange || 'NASDAQ',
            currency: 'USD',
            sector: stockData.sector || 'Technology',
            industry: stockData.industry || 'Software',
            updated_at: new Date().toISOString()
          });

        if (stockError) {
          throw new Error(`Stock upsert error for ${symbol}: ${stockError.message}`);
        }

        // Inserir dados de preço em tempo real
        const { error: priceError } = await supabase
          .from('stock_prices')
          .insert({
            symbol: stockData.symbol,
            price: stockData.price,
            change: stockData.change,
            change_percent: stockData.changePercent,
            volume: stockData.volume,
            market_cap: stockData.marketCap,
            timestamp: new Date().toISOString()
          });

        // Ignorar erros de duplicação (dados já existem)
        if (priceError && !priceError.message.includes('duplicate')) {
          console.warn(`⚠️ Price insert warning for ${symbol}:`, priceError.message);
        }

        results.successful++;
        console.log(`✅ ${symbol}: $${stockData.price} (${stockData.changePercent > 0 ? '+' : ''}${stockData.changePercent.toFixed(2)}%)`);
        
        // Rate limiting
        await sleep(100);
        
      } catch (error) {
        results.failed++;
        const errorMsg = `${symbol}: ${error.message}`;
        results.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    // Log do resultado final
    console.log(`📈 Tier 1 Update completado: ${results.successful}/${results.processed} sucessos`);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      tier: 1,
      processed: results.processed,
      successful: results.successful,
      failed: results.failed,
      errors: results.errors.slice(0, 5), // Apenas os primeiros 5 erros
      duration: Date.now()
    });

  } catch (error) {
    console.error('💥 Erro fatal no Tier 1 cron:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      tier: 1
    });
  }
}

async function fetchStockData(symbol: string) {
  // Tentar Polygon.io primeiro
  if (POLYGON_API_KEY && POLYGON_API_KEY !== 'demo') {
    try {
      const response = await fetch(
        `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apikey=${POLYGON_API_KEY}`
      );
      
      if (response.ok) {
        const data = await response.json() as any;
        if (data.results && data.results[0]) {
          const result = data.results[0];
          return {
            symbol,
            name: `${symbol} Inc.`,
            price: result.c,
            change: result.c - result.o,
            changePercent: ((result.c - result.o) / result.o) * 100,
            volume: result.v,
            marketCap: null,
            exchange: 'NASDAQ',
            sector: 'Technology',
            industry: 'Software'
          };
        }
      }
    } catch (error) {
      console.warn(`Polygon failed for ${symbol}:`, error.message);
    }
  }

  // Fallback para Twelve Data
  if (TWELVE_DATA_API_KEY && TWELVE_DATA_API_KEY !== 'demo') {
    try {
      const response = await fetch(
        `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${TWELVE_DATA_API_KEY}`
      );
      
      if (response.ok) {
        const data = await response.json() as any;
        if (data && !data.error) {
          return {
            symbol,
            name: data.name || `${symbol} Inc.`,
            price: parseFloat(data.close),
            change: parseFloat(data.change),
            changePercent: parseFloat(data.percent_change),
            volume: parseInt(data.volume || '0'),
            marketCap: null,
            exchange: data.exchange || 'NASDAQ',
            sector: 'Technology',
            industry: 'Software'
          };
        }
      }
    } catch (error) {
      console.warn(`Twelve Data failed for ${symbol}:`, error.message);
    }
  }

  // Se todas as APIs falharam, retornar null
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}