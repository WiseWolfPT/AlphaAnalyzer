#!/usr/bin/env node
/**
 * Cron job para atualização de preços em produção
 * Este script deve ser executado a cada 15 minutos via Railway.app cron jobs
 * ou qualquer outro sistema de cron
 */

import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
  process.exit(1);
}

async function runPriceUpdate() {
  console.log('🕐', new Date().toISOString(), '- Iniciando atualização de preços...');

  try {
    // Chamar Supabase Edge Function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/update-prices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'x-client-info': 'alfalyzer-cron/1.0.0'
      },
      body: JSON.stringify({
        source: 'cron-job',
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Preços atualizados com sucesso:`);
      console.log(`   • ${result.updated} símbolos atualizados`);
      console.log(`   • Símbolos: ${result.symbols?.join(', ') || 'N/A'}`);
      console.log(`   • Timestamp: ${result.timestamp}`);
    } else {
      console.error('❌ Falha na atualização:', result.error);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Erro ao executar atualização de preços:', error);
    
    // Log detalhado para debugging
    console.error('Detalhes do erro:');
    console.error('- URL:', `${SUPABASE_URL}/functions/v1/update-prices`);
    console.error('- Timestamp:', new Date().toISOString());
    
    process.exit(1);
  }
}

// Verificar se está sendo executado diretamente
if (require.main === module) {
  runPriceUpdate()
    .then(() => {
      console.log('🎉 Atualização de preços concluída');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Falha crítica na atualização:', error);
      process.exit(1);
    });
}

export { runPriceUpdate };