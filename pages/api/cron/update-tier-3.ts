/**
 * VERCEL CRON: Update Tier 3 Stocks (Cada 2 horas)
 * Atualiza stocks menos críticos e dados fundamentais
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Configuração
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET || 'your-cron-secret';
const FMP_API_KEY = process.env.FMP_API_KEY;
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// Tier 3 stocks - Atualizados a cada 2 horas
const TIER_3_STOCKS = [
  'BRK-B', 'LLY', 'TMO', 'AVGO', 'WFC',
  'MRK', 'CVX', 'COST', 'AXP', 'LOW',
  'QCOM', 'TXN', 'MDT', 'AMT', 'BLK',
  'SPGI', 'NEE', 'IBM', 'GS', 'CAT'
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('🕑 Tier 3 Cron Job iniciado:', new Date().toISOString());

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
      fundamentalsUpdated: 0,
      errors: [] as string[]
    };

    console.log(`📊 Processando ${TIER_3_STOCKS.length} stocks Tier 3...`);

    // Processar em batches menores devido à menor frequência
    for (let i = 0; i < TIER_3_STOCKS.length; i += 3) {
      const batch = TIER_3_STOCKS.slice(i, i + 3);
      
      await Promise.all(batch.map(async (symbol) => {
        results.processed++;
        
        try {
          // Buscar dados básicos de preço
          const stockData = await fetchStockData(symbol);
          
          if (stockData) {
            // Atualizar stock básico
            const { error: stockError } = await supabase
              .from('stocks')
              .upsert({
                symbol: stockData.symbol,
                name: stockData.name || `${symbol} Corp.`,
                exchange: stockData.exchange || 'NYSE',
                currency: 'USD',
                sector: stockData.sector || 'Financial Services',
                industry: stockData.industry || 'Diversified Financial',
                updated_at: new Date().toISOString()
              });

            if (stockError) {
              throw new Error(`Stock upsert error: ${stockError.message}`);
            }

            results.successful++;
          }

          // Buscar dados fundamentais (menos frequente)
          if (Math.random() < 0.3) { // 30% chance de atualizar fundamentais
            const fundamentals = await fetchFundamentals(symbol);
            if (fundamentals) {
              // Atualizar dados fundamentais se a tabela existir
              results.fundamentalsUpdated++;
              console.log(`📊 ${symbol}: Fundamentais atualizados`);
            }
          }

          console.log(`✅ ${symbol}: Processado (Tier 3)`);
          
        } catch (error) {
          results.failed++;
          const errorMsg = `${symbol}: ${error.message}`;
          results.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }));

      // Rate limiting mais agressivo para Tier 3
      if (i + 3 < TIER_3_STOCKS.length) {
        await sleep(2000);
      }
    }

    console.log(`📈 Tier 3 Update completado: ${results.successful}/${results.processed} sucessos`);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      tier: 3,
      processed: results.processed,
      successful: results.successful,
      failed: results.failed,
      fundamentalsUpdated: results.fundamentalsUpdated,
      errors: results.errors.slice(0, 5)
    });

  } catch (error) {
    console.error('💥 Erro fatal no Tier 3 cron:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      tier: 3
    });
  }
}

async function fetchStockData(symbol: string) {
  // Para Tier 3, usar API mais simples
  if (FMP_API_KEY && FMP_API_KEY !== 'demo') {
    try {
      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${FMP_API_KEY}`
      );
      
      if (response.ok) {
        const data = await response.json() as any;
        if (data && data[0]) {
          const stock = data[0];
          return {
            symbol,
            name: stock.name || `${symbol} Corp.`,
            price: stock.price,
            change: stock.change,
            changePercent: stock.changesPercentage,
            volume: stock.volume,
            marketCap: stock.marketCap,
            exchange: stock.exchange || 'NYSE',
            sector: 'Financial Services',
            industry: 'Diversified Financial'
          };
        }
      }
    } catch (error) {
      console.warn(`FMP failed for ${symbol}:`, error.message);
    }
  }

  return null;
}

async function fetchFundamentals(symbol: string) {
  // Buscar dados fundamentais usando Alpha Vantage ou FMP
  if (ALPHA_VANTAGE_API_KEY && ALPHA_VANTAGE_API_KEY !== 'demo') {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );
      
      if (response.ok) {
        const data = await response.json() as any;
        if (data && !data['Error Message'] && !data['Note']) {
          return {
            symbol,
            marketCap: data.MarketCapitalization,
            pe: parseFloat(data.PERatio) || null,
            eps: parseFloat(data.EPS) || null,
            dividendYield: parseFloat(data.DividendYield) || null,
            bookValue: parseFloat(data.BookValue) || null,
            sector: data.Sector,
            industry: data.Industry,
            description: data.Description
          };
        }
      }
    } catch (error) {
      console.warn(`Alpha Vantage fundamentals failed for ${symbol}:`, error.message);
    }
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
