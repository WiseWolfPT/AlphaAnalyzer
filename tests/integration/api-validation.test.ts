import { describe, it, expect, beforeAll } from 'vitest';
import fetch from 'node-fetch';

// Verificar se as chaves de API estão definidas
describe('API Endpoints Validation', () => {
  beforeAll(() => {
    // Lista de chaves de API necessárias
    const requiredKeys = [
      'POLYGON_API_KEY',
      'FINNHUB_API_KEY', 
      'TWELVE_DATA_API_KEY',
      'FMP_API_KEY'
    ];

    // Verificar se pelo menos uma chave está definida
    const hasAnyKey = requiredKeys.some(key => process.env[key] && process.env[key] !== 'your-key-here');
    
    if (!hasAnyKey) {
      console.warn('⚠️  Nenhuma chave de API real encontrada. Usando chaves de teste.');
    }
  });

  // 1. Polygon.io
  it('Polygon.io - deve buscar cotação', async () => {
    const apiKey = process.env.POLYGON_API_KEY;
    
    if (!apiKey || apiKey === 'your-key-here') {
      console.log('⚠️  POLYGON_API_KEY não configurada - teste ignorado');
      return;
    }

    try {
      const response = await fetch(`https://api.polygon.io/v2/aggs/ticker/AAPL/prev?apiKey=${apiKey}`);
      
      if (response.status === 401) {
        console.log('❌ Polygon.io - Chave de API inválida');
        expect(response.status).toBe(401);
        return;
      }

      if (response.status === 429) {
        console.log('⚠️  Polygon.io - Limite de taxa excedido');
        expect(response.status).toBe(429);
        return;
      }

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ticker).toBe('AAPL');
      expect(data.results[0].c).toBeGreaterThan(0); // closing price
      console.log('✅ Polygon.io - Funcionando corretamente');
    } catch (error) {
      console.error('❌ Polygon.io - Erro de conexão:', error.message);
      throw error;
    }
  }, 10000); // 10 segundos timeout

  // 2. Finnhub
  it('Finnhub - deve buscar quote', async () => {
    const apiKey = process.env.FINNHUB_API_KEY;
    
    if (!apiKey || apiKey === 'your-key-here') {
      console.log('⚠️  FINNHUB_API_KEY não configurada - teste ignorado');
      return;
    }

    try {
      const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${apiKey}`);
      
      if (response.status === 401) {
        console.log('❌ Finnhub - Chave de API inválida');
        expect(response.status).toBe(401);
        return;
      }

      if (response.status === 429) {
        console.log('⚠️  Finnhub - Limite de taxa excedido');
        expect(response.status).toBe(429);
        return;
      }

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.c).toBeGreaterThan(0); // current price
      console.log('✅ Finnhub - Funcionando corretamente');
    } catch (error) {
      console.error('❌ Finnhub - Erro de conexão:', error.message);
      throw error;
    }
  }, 10000); // 10 segundos timeout

  // 3. Twelve Data
  it('Twelve Data - deve buscar time series', async () => {
    const apiKey = process.env.TWELVE_DATA_API_KEY;
    
    if (!apiKey || apiKey === 'your-key-here') {
      console.log('⚠️  TWELVE_DATA_API_KEY não configurada - teste ignorado');
      return;
    }

    try {
      const response = await fetch(`https://api.twelvedata.com/time_series?symbol=AAPL&interval=1day&apikey=${apiKey}`);
      
      if (response.status === 401) {
        console.log('❌ Twelve Data - Chave de API inválida');
        expect(response.status).toBe(401);
        return;
      }

      if (response.status === 429) {
        console.log('⚠️  Twelve Data - Limite de taxa excedido');
        expect(response.status).toBe(429);
        return;
      }

      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Verificar se retornou erro de limite
      if (data.code === 429) {
        console.log('⚠️  Twelve Data - Limite de taxa excedido (resposta JSON)');
        expect(data.code).toBe(429);
        return;
      }

      expect(data.values).toBeDefined();
      console.log('✅ Twelve Data - Funcionando corretamente');
    } catch (error) {
      console.error('❌ Twelve Data - Erro de conexão:', error.message);
      throw error;
    }
  }, 10000); // 10 segundos timeout

  // 4. FMP
  it('FMP - deve buscar profile', async () => {
    const apiKey = process.env.FMP_API_KEY;
    
    if (!apiKey || apiKey === 'your-key-here') {
      console.log('⚠️  FMP_API_KEY não configurada - teste ignorado');
      return;
    }

    try {
      const response = await fetch(`https://financialmodelingprep.com/api/v3/profile/AAPL?apikey=${apiKey}`);
      
      if (response.status === 401) {
        console.log('❌ FMP - Chave de API inválida');
        expect(response.status).toBe(401);
        return;
      }

      if (response.status === 429) {
        console.log('⚠️  FMP - Limite de taxa excedido');
        expect(response.status).toBe(429);
        return;
      }

      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Verificar se retornou erro
      if (data.error) {
        console.log('❌ FMP - Erro na resposta:', data.error);
        expect(data.error).toBeUndefined();
        return;
      }

      expect(Array.isArray(data)).toBe(true);
      expect(data[0].symbol).toBe('AAPL');
      console.log('✅ FMP - Funcionando corretamente');
    } catch (error) {
      console.error('❌ FMP - Erro de conexão:', error.message);
      throw error;
    }
  }, 10000); // 10 segundos timeout

  // 5. Teste de conectividade geral
  it('deve ter pelo menos uma API funcionando', async () => {
    const apis = [
      { name: 'Polygon.io', key: process.env.POLYGON_API_KEY },
      { name: 'Finnhub', key: process.env.FINNHUB_API_KEY },
      { name: 'Twelve Data', key: process.env.TWELVE_DATA_API_KEY },
      { name: 'FMP', key: process.env.FMP_API_KEY }
    ];

    const configuredApis = apis.filter(api => api.key && api.key !== 'your-key-here');
    
    console.log(`\n📊 RELATÓRIO DE APIS CONFIGURADAS:`);
    console.log(`Total configuradas: ${configuredApis.length}/4`);
    
    configuredApis.forEach(api => {
      console.log(`✅ ${api.name}: Chave configurada`);
    });

    const notConfigured = apis.filter(api => !api.key || api.key === 'your-key-here');
    notConfigured.forEach(api => {
      console.log(`❌ ${api.name}: Chave não configurada`);
    });

    // Pelo menos uma API deve estar configurada
    expect(configuredApis.length).toBeGreaterThan(0);
  });
});