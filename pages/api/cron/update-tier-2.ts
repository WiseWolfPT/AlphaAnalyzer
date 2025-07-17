/**
 * VERCEL CRON: Update Tier 2 Stocks (Cada 30 minutos)
 * Atualiza os próximos 20 stocks importantes
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Configuração
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET || 'your-cron-secret';
const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;

// Tier 2 stocks (Next 20) - Atualizados a cada 30 minutos
const TIER_2_STOCKS = [
  'WMT', 'PG', 'UNH', 'DIS', 'MA',
  'HD', 'PYPL', 'BAC', 'NFLX', 'ADBE',
  'CRM', 'CSCO', 'KO', 'PFE', 'XOM',
  'INTC', 'VZ', 'CMCSA', 'ABT', 'T'
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('🕕 Tier 2 Cron Job iniciado:', new Date().toISOString());

  // Verificar autenticação do cron
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    console.error('❌ Cron não autorizado');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
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

    console.log(`📊 Processando ${TIER_2_STOCKS.length} stocks Tier 2...`);

    // Processar em batches de 5 para não sobrecarregar as APIs
    for (let i = 0; i < TIER_2_STOCKS.length; i += 5) {
      const batch = TIER_2_STOCKS.slice(i, i + 5);
      
      await Promise.all(batch.map(async (symbol) => {
        results.processed++;
        
        try {
          const stockData = await fetchStockData(symbol);
          
          if (!stockData) {
            throw new Error(`No data found for ${symbol}`);
          }

          // Atualizar stock na base de dados
          const { error: stockError } = await supabase
            .from('stocks')
            .upsert({
              symbol: stockData.symbol,
              name: stockData.name || `${symbol} Inc.`,
              exchange: stockData.exchange || 'NYSE',
              currency: 'USD',
              sector: stockData.sector || 'Consumer Staples',
              industry: stockData.industry || 'Retail',
              updated_at: new Date().toISOString()
            });

          if (stockError) {
            throw new Error(`Stock upsert error for ${symbol}: ${stockError.message}`);
          }

          results.successful++;
          console.log(`✅ ${symbol}: $${stockData.price} (${stockData.changePercent > 0 ? '+' : ''}${stockData.changePercent.toFixed(2)}%)`);
          
        } catch (error) {
          results.failed++;
          const errorMsg = `${symbol}: ${error.message}`;
          results.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }));

      // Rate limiting entre batches
      if (i + 5 < TIER_2_STOCKS.length) {
        await sleep(1000);
      }
    }

    console.log(`📈 Tier 2 Update completado: ${results.successful}/${results.processed} sucessos`);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      tier: 2,
      processed: results.processed,
      successful: results.successful,
      failed: results.failed,
      errors: results.errors.slice(0, 5)
    });

  } catch (error) {
    console.error('💥 Erro fatal no Tier 2 cron:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      tier: 2
    });
  }
}

async function fetchStockData(symbol: string) {
  // Usar mesma lógica do Tier 1, mas com rate limiting mais conservador
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
            exchange: data.exchange || 'NYSE',
            sector: 'Consumer Staples',
            industry: 'Retail'
          };
        }
      }
    } catch (error) {
      console.warn(`Twelve Data failed for ${symbol}:`, error.message);
    }
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}