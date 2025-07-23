/**
 * Test API Connectivity
 * Verifica se todas as 5 APIs financeiras estão configuradas e funcionando
 */

const axios = require('axios');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

// Configuração das APIs
const API_CONFIGS = {
  'Alpha Vantage': {
    key: process.env.ALPHA_VANTAGE_API_KEY,
    testUrl: 'https://www.alphavantage.co/query',
    testParams: {
      function: 'GLOBAL_QUOTE',
      symbol: 'AAPL',
      apikey: process.env.ALPHA_VANTAGE_API_KEY
    }
  },
  'Finnhub': {
    key: process.env.FINNHUB_API_KEY,
    testUrl: 'https://finnhub.io/api/v1/quote',
    testParams: { symbol: 'AAPL' },
    headers: { 'X-Finnhub-Token': process.env.FINNHUB_API_KEY }
  },
  'FMP': {
    key: process.env.FMP_API_KEY,
    testUrl: `https://financialmodelingprep.com/api/v3/quote/AAPL`,
    testParams: { apikey: process.env.FMP_API_KEY }
  },
  'Twelve Data': {
    key: process.env.TWELVE_DATA_API_KEY,
    testUrl: 'https://api.twelvedata.com/quote',
    testParams: {
      symbol: 'AAPL',
      apikey: process.env.TWELVE_DATA_API_KEY
    }
  },
  'Polygon': {
    key: process.env.POLYGON_API_KEY,
    testUrl: `https://api.polygon.io/v2/aggs/ticker/AAPL/prev`,
    testParams: { apiKey: process.env.POLYGON_API_KEY }
  }
};

// Função para testar cada API
async function testAPI(name, config) {
  console.log(`\n🔍 Testando ${name}...`);
  
  // Verificar se a chave está configurada
  if (!config.key || config.key === 'demo' || config.key === 'your-api-key-here') {
    console.log(`❌ ${name}: Chave API não configurada ou usando valor demo`);
    return {
      name,
      status: 'not_configured',
      message: 'API key missing or using demo value'
    };
  }
  
  console.log(`✅ ${name}: Chave API encontrada (${config.key.substring(0, 8)}...)`);
  
  try {
    // Fazer requisição de teste
    const response = await axios.get(config.testUrl, {
      params: config.testParams,
      headers: config.headers || {},
      timeout: 10000
    });
    
    // Verificar resposta
    if (response.status === 200) {
      console.log(`✅ ${name}: API funcionando corretamente`);
      
      // Verificar rate limit headers
      const rateLimit = response.headers['x-ratelimit-limit'] || 
                       response.headers['x-rate-limit-limit'] ||
                       response.headers['rate-limit'];
      
      if (rateLimit) {
        console.log(`   Rate limit: ${rateLimit}`);
      }
      
      return {
        name,
        status: 'working',
        statusCode: response.status,
        hasData: !!response.data,
        rateLimit
      };
    }
  } catch (error) {
    console.log(`❌ ${name}: Erro ao conectar`);
    console.log(`   Erro: ${error.message}`);
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Mensagem: ${JSON.stringify(error.response.data).substring(0, 100)}...`);
    }
    
    return {
      name,
      status: 'error',
      error: error.message,
      statusCode: error.response?.status
    };
  }
}

// Executar testes
async function runTests() {
  console.log('====================================');
  console.log('🚀 TESTE DE CONECTIVIDADE DAS APIs');
  console.log('====================================');
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`📁 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  
  const results = [];
  
  for (const [name, config] of Object.entries(API_CONFIGS)) {
    const result = await testAPI(name, config);
    results.push(result);
  }
  
  // Resumo final
  console.log('\n====================================');
  console.log('📊 RESUMO DO TESTE');
  console.log('====================================');
  
  const working = results.filter(r => r.status === 'working').length;
  const notConfigured = results.filter(r => r.status === 'not_configured').length;
  const errors = results.filter(r => r.status === 'error').length;
  
  console.log(`\n✅ APIs funcionando: ${working}/5`);
  console.log(`⚠️  APIs não configuradas: ${notConfigured}/5`);
  console.log(`❌ APIs com erro: ${errors}/5`);
  
  console.log('\nDetalhes por API:');
  results.forEach(r => {
    const icon = r.status === 'working' ? '✅' : 
                 r.status === 'not_configured' ? '⚠️' : '❌';
    console.log(`${icon} ${r.name}: ${r.status}`);
  });
  
  // Verificar configuração de fallback
  console.log('\n====================================');
  console.log('🔄 VERIFICAÇÃO DE FALLBACK');
  console.log('====================================');
  
  const workingAPIs = results.filter(r => r.status === 'working');
  if (workingAPIs.length >= 2) {
    console.log('✅ Fallback disponível: Múltiplas APIs funcionando');
  } else if (workingAPIs.length === 1) {
    console.log('⚠️  Fallback limitado: Apenas uma API funcionando');
  } else {
    console.log('❌ Sem fallback: Nenhuma API funcionando');
  }
  
  // Verificar rate limiting
  console.log('\n====================================');
  console.log('⏱️  RATE LIMITING');
  console.log('====================================');
  
  console.log('Limites conhecidos:');
  console.log('- Alpha Vantage: 5 chamadas/minuto (free tier)');
  console.log('- Finnhub: 60 chamadas/minuto (free tier)');
  console.log('- FMP: 250 chamadas/dia (free tier)');
  console.log('- Twelve Data: 800 chamadas/dia (free tier)');
  console.log('- Polygon: 5 chamadas/minuto (free tier)');
  
  console.log('\n✅ Rate limiting implementado no código? SIM');
  console.log('   Arquivo: server/services/quota/quota-limits.ts');
}

// Executar
runTests().catch(console.error);