/**
 * VERCEL CRON: Process Job Queue (Cada 1 minuto)
 * Processa fila de jobs pendentes (análises, cálculos, etc.)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Configuração
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET || 'your-cron-secret';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('⚙️ Process Jobs Cron iniciado:', new Date().toISOString());

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
      jobs: [] as any[]
    };

    // Buscar jobs pendentes (se a tabela existir)
    try {
      const { data: pendingJobs, error } = await supabase
        .from('job_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10); // Processar até 10 jobs por execução

      if (error) {
        console.log('ℹ️ Tabela job_queue não existe ainda, pulando processamento de jobs');
        return res.status(200).json({
          success: true,
          message: 'Job queue table not found, skipping job processing',
          timestamp: new Date().toISOString()
        });
      }

      if (!pendingJobs || pendingJobs.length === 0) {
        console.log('✅ Nenhum job pendente encontrado');
        return res.status(200).json({
          success: true,
          message: 'No pending jobs found',
          timestamp: new Date().toISOString(),
          processed: 0
        });
      }

      console.log(`📋 Processando ${pendingJobs.length} jobs pendentes...`);

      // Processar cada job
      for (const job of pendingJobs) {
        results.processed++;
        
        try {
          // Marcar job como em processamento
          await supabase
            .from('job_queue')
            .update({ 
              status: 'processing',
              started_at: new Date().toISOString()
            })
            .eq('id', job.id);

          // Processar job baseado no tipo
          let jobResult;
          switch (job.type) {
            case 'calculate_intrinsic_value':
              jobResult = await processIntrinsicValueJob(job.payload);
              break;
            case 'update_stock_fundamentals':
              jobResult = await processStockFundamentalsJob(job.payload);
              break;
            case 'send_price_alert':
              jobResult = await processPriceAlertJob(job.payload);
              break;
            case 'cleanup_old_data':
              jobResult = await processCleanupJob(job.payload);
              break;
            default:
              throw new Error(`Unknown job type: ${job.type}`);
          }

          // Marcar job como concluído
          await supabase
            .from('job_queue')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString(),
              result: jobResult
            })
            .eq('id', job.id);

          results.successful++;
          results.jobs.push({
            id: job.id,
            type: job.type,
            status: 'completed'
          });

          console.log(`✅ Job ${job.id} (${job.type}) processado com sucesso`);
          
        } catch (error) {
          results.failed++;
          
          // Marcar job como falhado
          await supabase
            .from('job_queue')
            .update({ 
              status: 'failed',
              completed_at: new Date().toISOString(),
              error_message: error.message
            })
            .eq('id', job.id);

          results.jobs.push({
            id: job.id,
            type: job.type,
            status: 'failed',
            error: error.message
          });

          console.error(`❌ Job ${job.id} falhou:`, error.message);
        }

        // Rate limiting entre jobs
        await sleep(200);
      }

    } catch (tableError) {
      console.log('ℹ️ Job queue não configurado ainda:', tableError.message);
    }

    console.log(`⚙️ Process Jobs completado: ${results.successful}/${results.processed} sucessos`);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      processed: results.processed,
      successful: results.successful,
      failed: results.failed,
      jobs: results.jobs
    });

  } catch (error) {
    console.error('💥 Erro fatal no Process Jobs cron:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Processadores de jobs específicos
async function processIntrinsicValueJob(payload: any) {
  console.log(`🧮 Calculando valor intrínseco para ${payload.symbol}...`);
  
  // Simular cálculo de valor intrínseco
  // Em implementação real, chamaria service de cálculo
  const mockResult = {
    symbol: payload.symbol,
    intrinsicValue: Math.random() * 200 + 50,
    upside: Math.random() * 100 - 50,
    calculatedAt: new Date().toISOString()
  };
  
  return mockResult;
}

async function processStockFundamentalsJob(payload: any) {
  console.log(`📊 Atualizando fundamentais para ${payload.symbol}...`);
  
  // Simular atualização de fundamentais
  const mockResult = {
    symbol: payload.symbol,
    updatedFields: ['pe', 'eps', 'marketCap'],
    updatedAt: new Date().toISOString()
  };
  
  return mockResult;
}

async function processPriceAlertJob(payload: any) {
  console.log(`🚨 Processando alerta de preço para ${payload.symbol}...`);
  
  // Simular envio de alerta
  const mockResult = {
    alertId: payload.alertId,
    symbol: payload.symbol,
    sent: true,
    sentAt: new Date().toISOString()
  };
  
  return mockResult;
}

async function processCleanupJob(payload: any) {
  console.log(`🧹 Executando limpeza: ${payload.type}...`);
  
  // Simular limpeza de dados antigos
  const mockResult = {
    type: payload.type,
    recordsDeleted: Math.floor(Math.random() * 1000),
    cleanedAt: new Date().toISOString()
  };
  
  return mockResult;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}