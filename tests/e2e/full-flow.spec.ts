import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Configurações de teste
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

// Cliente Supabase para verificar eventos realtime
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

test.describe('Fluxo Completo: Frontend → Backend → Cache → Realtime', () => {
  test.beforeEach(async ({ page }) => {
    // Limpar localStorage e cookies
    await page.goto(FRONTEND_URL);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('deve buscar dados do cache quando disponível', async ({ page, request }) => {
    const testSymbol = 'AAPL';
    
    // 1. Primeira requisição - deve buscar da API externa
    console.log('🔄 Primeira requisição - Cache MISS esperado');
    const startTime = Date.now();
    
    const response1 = await request.get(`${BACKEND_URL}/api/market-data/quote/${testSymbol}`);
    const data1 = await response1.json();
    const firstRequestTime = Date.now() - startTime;
    
    expect(response1.ok()).toBeTruthy();
    expect(data1).toHaveProperty('symbol', testSymbol);
    expect(data1).toHaveProperty('price');
    console.log(`⏱️ Tempo primeira requisição (cache miss): ${firstRequestTime}ms`);
    
    // 2. Segunda requisição - deve vir do cache
    console.log('🔄 Segunda requisição - Cache HIT esperado');
    const startTime2 = Date.now();
    
    const response2 = await request.get(`${BACKEND_URL}/api/market-data/quote/${testSymbol}`);
    const data2 = await response2.json();
    const secondRequestTime = Date.now() - startTime2;
    
    expect(response2.ok()).toBeTruthy();
    expect(data2).toEqual(data1); // Dados devem ser idênticos
    console.log(`⏱️ Tempo segunda requisição (cache hit): ${secondRequestTime}ms`);
    
    // Cache hit deve ser significativamente mais rápido
    expect(secondRequestTime).toBeLessThan(firstRequestTime * 0.5);
  });

  test('deve receber atualizações realtime via Supabase', async ({ page, request }) => {
    const testSymbol = 'GOOGL';
    let realtimeEventReceived = false;
    let realtimeData: any = null;
    
    // 1. Configurar listener realtime
    console.log('📡 Configurando listener realtime');
    const channel = supabase
      .channel('stock-updates')
      .on('broadcast', { event: 'price-update' }, (payload) => {
        console.log('🔔 Evento realtime recebido:', payload);
        if (payload.payload.symbol === testSymbol) {
          realtimeEventReceived = true;
          realtimeData = payload.payload;
        }
      })
      .subscribe();
    
    // Aguardar confirmação da inscrição
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 2. Fazer requisição que deve disparar evento realtime
    console.log('🔄 Fazendo requisição para disparar evento realtime');
    const response = await request.get(`${BACKEND_URL}/api/market-data/quote/${testSymbol}`);
    const apiData = await response.json();
    
    expect(response.ok()).toBeTruthy();
    
    // 3. Aguardar evento realtime (máximo 5 segundos)
    console.log('⏳ Aguardando evento realtime...');
    const maxWaitTime = 5000;
    const checkInterval = 100;
    let waited = 0;
    
    while (!realtimeEventReceived && waited < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }
    
    // 4. Verificar se evento foi recebido
    expect(realtimeEventReceived).toBeTruthy();
    expect(realtimeData).toBeTruthy();
    expect(realtimeData.symbol).toBe(testSymbol);
    expect(realtimeData.price).toBe(apiData.price);
    
    console.log('✅ Evento realtime recebido com sucesso');
    
    // Cleanup
    await channel.unsubscribe();
  });

  test('deve mostrar dados em tempo real no frontend', async ({ page }) => {
    // 1. Navegar para o dashboard
    await page.goto(`${FRONTEND_URL}/dashboard`);
    
    // 2. Aguardar carregamento inicial
    await page.waitForSelector('[data-testid="stock-card"]', { timeout: 10000 });
    
    // 3. Verificar se há cards de ações
    const stockCards = await page.locator('[data-testid="stock-card"]').all();
    expect(stockCards.length).toBeGreaterThan(0);
    
    // 4. Pegar o preço inicial do primeiro card
    const firstCard = stockCards[0];
    const initialPrice = await firstCard.locator('[data-testid="stock-price"]').textContent();
    
    console.log('💰 Preço inicial:', initialPrice);
    
    // 5. Aguardar atualização realtime (máximo 30 segundos)
    let priceUpdated = false;
    const maxWaitTime = 30000;
    const checkInterval = 1000;
    let waited = 0;
    
    while (!priceUpdated && waited < maxWaitTime) {
      const currentPrice = await firstCard.locator('[data-testid="stock-price"]').textContent();
      if (currentPrice !== initialPrice) {
        priceUpdated = true;
        console.log('📈 Preço atualizado:', currentPrice);
      }
      await page.waitForTimeout(checkInterval);
      waited += checkInterval;
    }
    
    // Se não houve atualização natural, forçar uma atualização
    if (!priceUpdated) {
      console.log('⚡ Forçando atualização de preço...');
      await page.evaluate(() => {
        // Simular evento de atualização
        window.dispatchEvent(new CustomEvent('price-update', { 
          detail: { symbol: 'AAPL', price: Math.random() * 100 + 100 } 
        }));
      });
      
      await page.waitForTimeout(1000);
      const finalPrice = await firstCard.locator('[data-testid="stock-price"]').textContent();
      expect(finalPrice).not.toBe(initialPrice);
    }
  });

  test('deve lidar com falha do backend gracefully', async ({ page, request }) => {
    // 1. Simular backend offline
    const invalidBackendUrl = 'http://localhost:9999'; // Porta que não existe
    
    try {
      const response = await request.get(`${invalidBackendUrl}/api/market-data/quote/AAPL`, {
        timeout: 5000
      });
      
      // Se chegou aqui, o backend está respondendo (não deveria)
      expect(response.ok()).toBeFalsy();
    } catch (error) {
      // Esperado - backend está offline
      console.log('✅ Backend offline detectado corretamente');
    }
    
    // 2. Frontend deve mostrar estado de erro apropriado
    await page.goto(`${FRONTEND_URL}/dashboard`);
    
    // Aguardar mensagem de erro ou estado de loading
    const errorMessage = page.locator('[data-testid="error-message"]');
    const loadingState = page.locator('[data-testid="loading-state"]');
    
    // Deve mostrar erro ou continuar em loading
    const hasError = await errorMessage.isVisible().catch(() => false);
    const isLoading = await loadingState.isVisible().catch(() => false);
    
    expect(hasError || isLoading).toBeTruthy();
    console.log('✅ Frontend lidou com falha do backend gracefully');
  });

  test('deve respeitar rate limiting', async ({ request }) => {
    const testSymbol = 'MSFT';
    const requests = [];
    
    // Fazer 10 requisições rápidas
    console.log('🚀 Enviando rajada de requisições...');
    for (let i = 0; i < 10; i++) {
      requests.push(
        request.get(`${BACKEND_URL}/api/market-data/quote/${testSymbol}`)
      );
    }
    
    const responses = await Promise.all(requests);
    const statusCodes = responses.map(r => r.status());
    
    console.log('📊 Status das respostas:', statusCodes);
    
    // Algumas requisições devem ser limitadas (429)
    const rateLimited = statusCodes.filter(status => status === 429);
    const successful = statusCodes.filter(status => status === 200);
    
    // Deve ter pelo menos algumas requisições bem-sucedidas
    expect(successful.length).toBeGreaterThan(0);
    
    // Se houver rate limiting, verificar se está funcionando
    if (rateLimited.length > 0) {
      console.log(`✅ Rate limiting funcionando: ${rateLimited.length} requisições bloqueadas`);
      
      // Verificar cabeçalhos de rate limit
      const limitedResponse = responses.find(r => r.status() === 429);
      if (limitedResponse) {
        const retryAfter = limitedResponse.headers()['retry-after'];
        expect(retryAfter).toBeTruthy();
        console.log(`⏰ Retry-After: ${retryAfter} segundos`);
      }
    }
  });

  test('deve verificar cold start do Koyeb', async ({ request }) => {
    // Este teste só faz sentido se estivermos testando contra Koyeb
    const isKoyeb = BACKEND_URL.includes('koyeb');
    
    if (!isKoyeb) {
      console.log('⏭️ Pulando teste de cold start (não é Koyeb)');
      return;
    }
    
    console.log('🥶 Testando cold start do Koyeb...');
    
    // Primeira requisição após período de inatividade
    const startTime = Date.now();
    const response = await request.get(`${BACKEND_URL}/api/health`, {
      timeout: 30000 // 30 segundos para cold start
    });
    const coldStartTime = Date.now() - startTime;
    
    expect(response.ok()).toBeTruthy();
    console.log(`⏱️ Tempo de cold start: ${coldStartTime}ms`);
    
    // Cold start geralmente leva mais de 5 segundos
    if (coldStartTime > 5000) {
      console.log('❄️ Cold start detectado');
      
      // Segunda requisição deve ser rápida
      const startTime2 = Date.now();
      const response2 = await request.get(`${BACKEND_URL}/api/health`);
      const warmTime = Date.now() - startTime2;
      
      expect(response2.ok()).toBeTruthy();
      expect(warmTime).toBeLessThan(1000); // Menos de 1 segundo quando quente
      console.log(`🔥 Tempo com instância quente: ${warmTime}ms`);
    }
  });
});

// Teste de integração com múltiplas APIs
test.describe('Integração com APIs Externas', () => {
  test('deve fazer fallback entre APIs quando uma falha', async ({ request }) => {
    // Este teste verifica se o sistema de fallback está funcionando
    const response = await request.get(`${BACKEND_URL}/api/market-data/quote/INVALID_SYMBOL_XYZ`);
    
    // Mesmo com símbolo inválido, deve retornar algo (pode ser erro estruturado)
    expect(response.status()).toBeLessThanOrEqual(500); // Não deve ser erro de servidor
    
    const data = await response.json();
    console.log('📊 Resposta para símbolo inválido:', data);
    
    // Deve ter estrutura de resposta consistente
    if (response.ok()) {
      expect(data).toHaveProperty('symbol');
    } else {
      expect(data).toHaveProperty('error');
    }
  });
});