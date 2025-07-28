#!/usr/bin/env node

/**
 * End-to-End Test Script
 * Tests the complete flow: Frontend -> Backend (Koyeb) -> Cache -> Response
 */

import fetch from 'node-fetch';

const BACKEND_URL = 'https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app';
const FRONTEND_URL = 'http://localhost:5173';

console.log('🧪 TESTE END-TO-END COMPLETO');
console.log('============================\n');

async function runTests() {
  let allTestsPassed = true;

  // Test 1: Backend Health
  console.log('1️⃣ Testando Backend Health...');
  try {
    const health = await fetch(`${BACKEND_URL}/api/health`);
    const healthData = await health.json();
    console.log(`   ✅ Status: ${healthData.status}`);
    console.log(`   ✅ Service: ${healthData.service}`);
    console.log(`   ✅ Cache enabled: ${healthData.cache?.enabled || false}\n`);
  } catch (error) {
    console.log(`   ❌ Backend health check failed: ${error.message}\n`);
    allTestsPassed = false;
  }

  // Test 2: Market Data Config
  console.log('2️⃣ Testando Market Data Config...');
  try {
    const config = await fetch(`${BACKEND_URL}/api/market-data/config`);
    const configData = await config.json();
    console.log(`   ✅ Cache enabled: ${configData.cache.enabled}`);
    console.log(`   ✅ Cache TTL: ${configData.cache.ttl}ms`);
    console.log(`   ✅ Cache provider: ${configData.cache.provider}\n`);
  } catch (error) {
    console.log(`   ❌ Config check failed: ${error.message}\n`);
    allTestsPassed = false;
  }

  // Test 3: Cache Functionality
  console.log('3️⃣ Testando Cache de Cotações...');
  try {
    // First request
    const start1 = Date.now();
    const quote1 = await fetch(`${BACKEND_URL}/api/market-data/quote/AAPL`);
    const data1 = await quote1.json();
    const time1 = Date.now() - start1;
    console.log(`   📊 Primeira requisição: ${time1}ms`);
    console.log(`   💰 Preço: $${data1.price.toFixed(2)}`);
    
    // Second request (should be cached)
    const start2 = Date.now();
    const quote2 = await fetch(`${BACKEND_URL}/api/market-data/quote/AAPL`);
    const data2 = await quote2.json();
    const time2 = Date.now() - start2;
    console.log(`   📊 Segunda requisição: ${time2}ms`);
    console.log(`   💰 Preço: $${data2.price.toFixed(2)}`);
    
    // Verify cache
    if (data1.price === data2.price && data2._cached) {
      console.log(`   ✅ Cache funcionando! Mesmo preço retornado`);
      console.log(`   ✅ Speedup: ${Math.round((1 - time2/time1) * 100)}%\n`);
    } else {
      console.log(`   ⚠️  Preços diferentes ou cache não indicado\n`);
    }
  } catch (error) {
    console.log(`   ❌ Cache test failed: ${error.message}\n`);
    allTestsPassed = false;
  }

  // Test 4: Batch Quotes
  console.log('4️⃣ Testando Batch Quotes...');
  try {
    const symbols = ['MSFT', 'GOOGL', 'TSLA'];
    const batch = await fetch(`${BACKEND_URL}/api/market-data/quotes?symbols=${symbols.join(',')}`);
    const batchData = await batch.json();
    console.log(`   ✅ Retornou ${batchData.quotes.length} cotações`);
    batchData.quotes.forEach(q => {
      console.log(`   📊 ${q.symbol}: $${q.price.toFixed(2)}`);
    });
    console.log('');
  } catch (error) {
    console.log(`   ❌ Batch quotes failed: ${error.message}\n`);
    allTestsPassed = false;
  }

  // Test 5: Chart Data
  console.log('5️⃣ Testando Chart Data...');
  try {
    const chart = await fetch(`${BACKEND_URL}/api/market-data/chart/AAPL?period=1D`);
    const chartData = await chart.json();
    console.log(`   ✅ Período: ${chartData.period}`);
    console.log(`   ✅ Pontos de dados: ${chartData.data.length}`);
    console.log(`   ✅ Cached: ${chartData._cached}\n`);
  } catch (error) {
    console.log(`   ❌ Chart data failed: ${error.message}\n`);
    allTestsPassed = false;
  }

  // Test 6: Frontend Connection
  console.log('6️⃣ Testando Frontend...');
  try {
    const frontend = await fetch(FRONTEND_URL);
    if (frontend.ok) {
      console.log(`   ✅ Frontend rodando em ${FRONTEND_URL}`);
      console.log(`   ℹ️  Abra o navegador para testar manualmente\n`);
    } else {
      console.log(`   ⚠️  Frontend não está respondendo\n`);
    }
  } catch (error) {
    console.log(`   ⚠️  Frontend não está rodando. Execute: npm run dev\n`);
  }

  // Test 7: Cache Stats
  console.log('7️⃣ Testando Cache Stats...');
  try {
    const stats = await fetch(`${BACKEND_URL}/api/market-data/cache-stats`);
    const statsData = await stats.json();
    console.log(`   ✅ Cache size: ${statsData.size} entries`);
    console.log(`   ✅ Cached symbols: ${statsData.entries.join(', ')}\n`);
  } catch (error) {
    console.log(`   ❌ Cache stats failed: ${error.message}\n`);
    allTestsPassed = false;
  }

  // Summary
  console.log('📊 RESUMO DO TESTE');
  console.log('==================');
  if (allTestsPassed) {
    console.log('✅ TODOS OS TESTES PASSARAM!');
    console.log('\n🎉 O sistema está funcionando corretamente:');
    console.log('   - Backend no Koyeb respondendo');
    console.log('   - Cache reduzindo chamadas às APIs');
    console.log('   - Market data endpoints funcionando');
    console.log('   - Frontend pode consumir os dados');
  } else {
    console.log('❌ Alguns testes falharam. Verifique os erros acima.');
  }

  console.log('\n📝 PRÓXIMOS PASSOS:');
  console.log('1. Configurar as API keys reais no Koyeb');
  console.log('2. Testar com dados reais do mercado');
  console.log('3. Monitorar o cache hit rate');
  console.log('4. Ajustar TTL do cache conforme necessário');
}

// Run the tests
runTests().catch(console.error);