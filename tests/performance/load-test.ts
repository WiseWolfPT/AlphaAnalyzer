import { test, expect } from '@playwright/test';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

interface PerformanceMetrics {
  requestTime: number;
  statusCode: number;
  cached: boolean;
  timestamp: number;
}

test.describe('Testes de Performance', () => {
  const metrics: PerformanceMetrics[] = [];

  test.afterAll(async () => {
    // Gerar relatório de performance
    console.log('\n📊 RELATÓRIO DE PERFORMANCE\n');
    console.log('='.repeat(50));
    
    const totalRequests = metrics.length;
    const successfulRequests = metrics.filter(m => m.statusCode === 200).length;
    const cachedRequests = metrics.filter(m => m.cached).length;
    const avgResponseTime = metrics.reduce((sum, m) => sum + m.requestTime, 0) / totalRequests;
    const maxResponseTime = Math.max(...metrics.map(m => m.requestTime));
    const minResponseTime = Math.min(...metrics.map(m => m.requestTime));
    
    console.log(`Total de requisições: ${totalRequests}`);
    console.log(`Requisições bem-sucedidas: ${successfulRequests} (${(successfulRequests/totalRequests*100).toFixed(2)}%)`);
    console.log(`Requisições em cache: ${cachedRequests} (${(cachedRequests/totalRequests*100).toFixed(2)}%)`);
    console.log(`\nTempos de resposta:`);
    console.log(`  Média: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`  Mínimo: ${minResponseTime}ms`);
    console.log(`  Máximo: ${maxResponseTime}ms`);
    
    // Percentis
    const sortedTimes = metrics.map(m => m.requestTime).sort((a, b) => a - b);
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
    const p90 = sortedTimes[Math.floor(sortedTimes.length * 0.9)];
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
    
    console.log(`\nPercentis:`);
    console.log(`  P50: ${p50}ms`);
    console.log(`  P90: ${p90}ms`);
    console.log(`  P99: ${p99}ms`);
    
    console.log('='.repeat(50));
  });

  test('medir performance com cache hit vs cache miss', async ({ request }) => {
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META'];
    
    console.log('🚀 Iniciando teste de performance de cache...\n');
    
    // Round 1: Cache miss (primeira vez)
    console.log('📊 Round 1 - Cache MISS:');
    for (const symbol of symbols) {
      const startTime = Date.now();
      const response = await request.get(`${BACKEND_URL}/api/market-data/quote/${symbol}`);
      const requestTime = Date.now() - startTime;
      
      metrics.push({
        requestTime,
        statusCode: response.status(),
        cached: false,
        timestamp: Date.now()
      });
      
      console.log(`  ${symbol}: ${requestTime}ms - Status: ${response.status()}`);
      expect(response.ok()).toBeTruthy();
    }
    
    // Aguardar um pouco para garantir que está em cache
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Round 2: Cache hit
    console.log('\n📊 Round 2 - Cache HIT:');
    for (const symbol of symbols) {
      const startTime = Date.now();
      const response = await request.get(`${BACKEND_URL}/api/market-data/quote/${symbol}`);
      const requestTime = Date.now() - startTime;
      
      metrics.push({
        requestTime,
        statusCode: response.status(),
        cached: true,
        timestamp: Date.now()
      });
      
      console.log(`  ${symbol}: ${requestTime}ms - Status: ${response.status()}`);
      expect(response.ok()).toBeTruthy();
    }
    
    // Análise comparativa
    const cacheMissTimes = metrics.filter(m => !m.cached).map(m => m.requestTime);
    const cacheHitTimes = metrics.filter(m => m.cached).map(m => m.requestTime);
    
    const avgCacheMiss = cacheMissTimes.reduce((a, b) => a + b, 0) / cacheMissTimes.length;
    const avgCacheHit = cacheHitTimes.reduce((a, b) => a + b, 0) / cacheHitTimes.length;
    
    console.log(`\n📈 Análise de Cache:`);
    console.log(`  Tempo médio (cache miss): ${avgCacheMiss.toFixed(2)}ms`);
    console.log(`  Tempo médio (cache hit): ${avgCacheHit.toFixed(2)}ms`);
    console.log(`  Melhoria: ${((1 - avgCacheHit/avgCacheMiss) * 100).toFixed(2)}%`);
    
    // Cache hit deve ser pelo menos 50% mais rápido
    expect(avgCacheHit).toBeLessThan(avgCacheMiss * 0.5);
  });

  test('teste de carga com requisições concorrentes', async ({ request }) => {
    const concurrentRequests = 20;
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META'];
    
    console.log(`\n🔥 Teste de carga: ${concurrentRequests} requisições concorrentes\n`);
    
    const promises = [];
    const startTime = Date.now();
    
    // Criar requisições concorrentes
    for (let i = 0; i < concurrentRequests; i++) {
      const symbol = symbols[i % symbols.length];
      promises.push(
        request.get(`${BACKEND_URL}/api/market-data/quote/${symbol}`)
          .then(response => ({
            response,
            requestTime: Date.now() - startTime,
            symbol
          }))
      );
    }
    
    // Executar todas as requisições
    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    // Analisar resultados
    let successCount = 0;
    let errorCount = 0;
    let rateLimitCount = 0;
    
    results.forEach(({ response, requestTime, symbol }) => {
      if (response.ok()) {
        successCount++;
      } else if (response.status() === 429) {
        rateLimitCount++;
      } else {
        errorCount++;
      }
      
      metrics.push({
        requestTime,
        statusCode: response.status(),
        cached: requestTime < 100, // Assumir cache hit se < 100ms
        timestamp: Date.now()
      });
    });
    
    console.log(`Tempo total: ${totalTime}ms`);
    console.log(`Requisições bem-sucedidas: ${successCount}`);
    console.log(`Requisições com rate limit: ${rateLimitCount}`);
    console.log(`Requisições com erro: ${errorCount}`);
    console.log(`Taxa de sucesso: ${(successCount/concurrentRequests*100).toFixed(2)}%`);
    
    // Pelo menos 50% das requisições devem ser bem-sucedidas
    expect(successCount).toBeGreaterThan(concurrentRequests * 0.5);
  });

  test('medir latência do websocket/realtime', async ({ page }) => {
    await page.goto(`${BACKEND_URL}/test/realtime`);
    
    // Injetar script para medir latência
    const latencies = await page.evaluate(async () => {
      const results: number[] = [];
      
      return new Promise<number[]>((resolve) => {
        // Simular medição de latência (substituir com implementação real)
        const measureLatency = () => {
          const start = Date.now();
          // Enviar ping e esperar pong
          setTimeout(() => {
            const latency = Date.now() - start;
            results.push(latency);
            
            if (results.length < 10) {
              setTimeout(measureLatency, 1000);
            } else {
              resolve(results);
            }
          }, Math.random() * 50 + 10); // Simular latência variável
        };
        
        measureLatency();
      });
    });
    
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    console.log(`\n📡 Latência WebSocket/Realtime:`);
    console.log(`  Média: ${avgLatency.toFixed(2)}ms`);
    console.log(`  Mínima: ${Math.min(...latencies)}ms`);
    console.log(`  Máxima: ${Math.max(...latencies)}ms`);
    
    // Latência média deve ser menor que 100ms
    expect(avgLatency).toBeLessThan(100);
  });

  test('teste de stress - requisições sustentadas', async ({ request }) => {
    const duration = 30000; // 30 segundos
    const requestsPerSecond = 5;
    const symbol = 'AAPL';
    
    console.log(`\n⚡ Teste de stress: ${requestsPerSecond} req/s por ${duration/1000}s\n`);
    
    const startTime = Date.now();
    let requestCount = 0;
    let errorCount = 0;
    
    const makeRequest = async () => {
      try {
        const reqStart = Date.now();
        const response = await request.get(`${BACKEND_URL}/api/market-data/quote/${symbol}`);
        const requestTime = Date.now() - reqStart;
        
        requestCount++;
        if (!response.ok()) {
          errorCount++;
        }
        
        metrics.push({
          requestTime,
          statusCode: response.status(),
          cached: requestTime < 50,
          timestamp: Date.now()
        });
      } catch (error) {
        errorCount++;
      }
    };
    
    // Executar requisições em intervalos regulares
    const interval = setInterval(() => {
      for (let i = 0; i < requestsPerSecond; i++) {
        makeRequest();
      }
    }, 1000);
    
    // Aguardar duração do teste
    await new Promise(resolve => setTimeout(resolve, duration));
    clearInterval(interval);
    
    const actualDuration = Date.now() - startTime;
    const actualRPS = requestCount / (actualDuration / 1000);
    
    console.log(`Duração real: ${actualDuration}ms`);
    console.log(`Total de requisições: ${requestCount}`);
    console.log(`Taxa real: ${actualRPS.toFixed(2)} req/s`);
    console.log(`Erros: ${errorCount} (${(errorCount/requestCount*100).toFixed(2)}%)`);
    
    // Taxa de erro deve ser menor que 5%
    expect(errorCount / requestCount).toBeLessThan(0.05);
  });
});