#!/usr/bin/env tsx

/**
 * Script para testar deployment no Koyeb
 * Valida cold start, performance e disponibilidade
 */

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Configurações
const KOYEB_URL = process.env.KOYEB_URL || 'https://alfalyzer-antoniofrancisco-7cc86c67.koyeb.app';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

// Cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function measureColdStart() {
  log('\n❄️  Medindo Cold Start...', 'cyan');
  
  const startTime = Date.now();
  try {
    const response = await axios.get(`${KOYEB_URL}/api/health`, {
      timeout: 30000 // 30 segundos para cold start
    });
    
    const duration = Date.now() - startTime;
    
    if (response.status === 200) {
      log(`✅ Health endpoint respondeu em ${duration}ms`, 'green');
      
      if (duration > 5000) {
        log('⚠️  Possível cold start detectado (> 5s)', 'yellow');
      } else {
        log('🔥 Instância já estava quente', 'green');
      }
      
      return { success: true, duration, coldStart: duration > 5000 };
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    log(`❌ Erro ao acessar health: ${error.message} (${duration}ms)`, 'red');
    return { success: false, duration, error: error.message };
  }
}

async function testMarketDataAPI() {
  log('\n📊 Testando API de Market Data...', 'cyan');
  
  const symbols = ['AAPL', 'GOOGL', 'MSFT'];
  const results = [];
  
  for (const symbol of symbols) {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${KOYEB_URL}/api/market-data/quote/${symbol}`, {
        timeout: 10000
      });
      
      const duration = Date.now() - startTime;
      
      if (response.status === 200 && response.data) {
        log(`✅ ${symbol}: ${duration}ms - Preço: $${response.data.price}`, 'green');
        results.push({ symbol, duration, success: true, price: response.data.price });
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      log(`❌ ${symbol}: Erro após ${duration}ms - ${error.message}`, 'red');
      results.push({ symbol, duration, success: false, error: error.message });
    }
  }
  
  // Estatísticas
  const successful = results.filter(r => r.success).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  
  log(`\n📈 Resumo: ${successful}/${results.length} bem-sucedidas`, successful === results.length ? 'green' : 'yellow');
  log(`⏱️  Tempo médio: ${avgDuration.toFixed(0)}ms`, 'blue');
  
  return results;
}

async function testRealtimeConnection() {
  log('\n📡 Testando Conexão Realtime...', 'cyan');
  
  return new Promise((resolve) => {
    let connected = false;
    let messageReceived = false;
    
    const channel = supabase
      .channel('koyeb-test')
      .on('presence', { event: 'sync' }, () => {
        connected = true;
        log('✅ Conectado ao canal realtime', 'green');
      })
      .on('broadcast', { event: 'test' }, (payload) => {
        messageReceived = true;
        log(`✅ Mensagem recebida: ${JSON.stringify(payload)}`, 'green');
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          log('📤 Enviando mensagem de teste...', 'blue');
          
          // Enviar mensagem de teste
          await channel.send({
            type: 'broadcast',
            event: 'test',
            payload: { message: 'Koyeb test', timestamp: Date.now() }
          });
          
          // Aguardar resposta
          setTimeout(() => {
            channel.unsubscribe();
            resolve({
              connected,
              messageReceived,
              success: connected && messageReceived
            });
          }, 3000);
        }
      });
    
    // Timeout de segurança
    setTimeout(() => {
      channel.unsubscribe();
      resolve({
        connected,
        messageReceived,
        success: false,
        error: 'Timeout'
      });
    }, 10000);
  });
}

async function performanceStressTest() {
  log('\n⚡ Teste de Performance (10 requisições simultâneas)...', 'cyan');
  
  const promises = [];
  const startTime = Date.now();
  
  for (let i = 0; i < 10; i++) {
    promises.push(
      axios.get(`${KOYEB_URL}/api/market-data/quote/AAPL`, { timeout: 5000 })
        .then(() => ({ success: true }))
        .catch((error) => ({ success: false, error: error.message }))
    );
  }
  
  const results = await Promise.all(promises);
  const totalTime = Date.now() - startTime;
  
  const successful = results.filter(r => r.success).length;
  log(`\n✅ ${successful}/10 requisições bem-sucedidas`, successful === 10 ? 'green' : 'yellow');
  log(`⏱️  Tempo total: ${totalTime}ms`, 'blue');
  log(`📊 Taxa: ${(10000 / totalTime).toFixed(2)} req/s`, 'blue');
  
  return { successful, totalTime, rate: 10000 / totalTime };
}

async function checkCORS() {
  log('\n🔒 Verificando CORS...', 'cyan');
  
  try {
    const response = await axios.options(`${KOYEB_URL}/api/health`, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET'
      }
    });
    
    const corsHeaders = {
      'access-control-allow-origin': response.headers['access-control-allow-origin'],
      'access-control-allow-methods': response.headers['access-control-allow-methods'],
      'access-control-allow-headers': response.headers['access-control-allow-headers']
    };
    
    if (corsHeaders['access-control-allow-origin']) {
      log('✅ CORS configurado corretamente', 'green');
      log(`   Origin: ${corsHeaders['access-control-allow-origin']}`, 'blue');
      log(`   Methods: ${corsHeaders['access-control-allow-methods']}`, 'blue');
    } else {
      log('⚠️  CORS pode não estar configurado', 'yellow');
    }
    
    return { success: true, headers: corsHeaders };
  } catch (error: any) {
    log(`❌ Erro ao verificar CORS: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function generateReport(results: any) {
  log('\n' + '='.repeat(50), 'blue');
  log('📋 RELATÓRIO FINAL - TESTE KOYEB', 'cyan');
  log('='.repeat(50), 'blue');
  
  const allSuccess = Object.values(results).every((r: any) => r.success !== false);
  
  if (allSuccess) {
    log('\n✅ TODOS OS TESTES PASSARAM!', 'green');
  } else {
    log('\n⚠️  ALGUNS TESTES FALHARAM', 'yellow');
  }
  
  // Recomendações
  log('\n💡 Recomendações:', 'magenta');
  
  if (results.coldStart.coldStart) {
    log('- Considere usar um serviço de "keep-alive" para evitar cold starts', 'yellow');
  }
  
  if (results.performance.rate < 50) {
    log('- Performance abaixo do ideal. Verificar configuração do Koyeb', 'yellow');
  }
  
  if (!results.realtime.success) {
    log('- Conexão realtime não funcionou. Verificar configuração WebSocket', 'yellow');
  }
  
  log('\n📊 URL testada: ' + KOYEB_URL, 'blue');
  log('⏰ Teste executado em: ' + new Date().toLocaleString(), 'blue');
}

// Executar todos os testes
async function runAllTests() {
  log('🚀 Iniciando Testes do Koyeb...', 'cyan');
  log('📍 URL: ' + KOYEB_URL, 'blue');
  
  const results = {
    coldStart: await measureColdStart(),
    marketData: await testMarketDataAPI(),
    realtime: await testRealtimeConnection(),
    performance: await performanceStressTest(),
    cors: await checkCORS()
  };
  
  await generateReport(results);
  
  // Exit com código apropriado
  const hasFailures = Object.values(results).some((r: any) => r.success === false);
  process.exit(hasFailures ? 1 : 0);
}

// Executar se chamado diretamente
if (require.main === module) {
  runAllTests().catch(error => {
    log(`\n❌ Erro fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}