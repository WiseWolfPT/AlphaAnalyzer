import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Teste E2E completo para validar solução do erro 401
 * Testa o fluxo completo desde o frontend até as APIs
 */

test.describe('Solução 401 - Fluxo Completo', () => {
  let page: Page;
  
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    
    // Intercepta requests para verificar headers
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log(`API Request: ${request.method()} ${request.url()}`);
        console.log('Headers:', request.headers());
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`API Response: ${response.status()} ${response.url()}`);
      }
    });
  });

  test('1. Página inicial carrega sem erros', async () => {
    await page.goto('http://localhost:5173');
    
    // Verifica se não há erros 401
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Aguarda carregamento
    await page.waitForLoadState('networkidle');
    
    // Verifica se não há erros 401
    const has401Error = consoleErrors.some(error => 
      error.includes('401') || error.includes('Unauthorized')
    );
    expect(has401Error).toBe(false);
    
    // Verifica elementos básicos
    await expect(page.locator('h1')).toBeVisible();
  });

  test('2. Dashboard carrega com dados reais', async () => {
    // Navega para dashboard
    await page.goto('http://localhost:5173/home');
    
    // Aguarda cards de stocks
    await page.waitForSelector('[data-testid="stock-card"]', { timeout: 10000 });
    
    // Verifica se há dados reais (não mock)
    const stockCards = await page.locator('[data-testid="stock-card"]').all();
    expect(stockCards.length).toBeGreaterThan(0);
    
    // Verifica se os preços são números reais
    const firstPrice = await page.locator('[data-testid="stock-price"]').first().textContent();
    expect(firstPrice).toMatch(/\$[\d,]+\.\d{2}/);
    
    // Verifica se não há textos de erro
    const errorTexts = await page.locator('text=/error|failed|unauthorized/i').count();
    expect(errorTexts).toBe(0);
  });

  test('3. API calls incluem headers corretos', async () => {
    const apiCalls: any[] = [];
    
    // Intercepta todas as chamadas de API
    await page.route('**/api/**', async (route, request) => {
      apiCalls.push({
        url: request.url(),
        headers: request.headers(),
        method: request.method()
      });
      await route.continue();
    });
    
    // Recarrega página para capturar calls
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verifica headers
    expect(apiCalls.length).toBeGreaterThan(0);
    
    apiCalls.forEach(call => {
      // Verifica se tem algum header de autenticação
      const hasAuthHeader = 
        call.headers['authorization'] ||
        call.headers['x-api-key'] ||
        call.headers['x-vercel-proxy-auth'];
      
      expect(hasAuthHeader).toBeTruthy();
    });
  });

  test('4. Watchlist funciona com dados reais', async () => {
    // Navega para watchlist
    await page.goto('http://localhost:5173/watchlists');
    
    // Adiciona um símbolo
    await page.click('[data-testid="add-symbol-button"]');
    await page.fill('[data-testid="symbol-input"]', 'AAPL');
    await page.click('[data-testid="save-button"]');
    
    // Verifica se foi adicionado com dados reais
    await page.waitForSelector('text=Apple Inc.');
    
    const priceElement = await page.locator('[data-testid="watchlist-price"]').first();
    const price = await priceElement.textContent();
    
    // Verifica se o preço é real (não mock)
    expect(price).toMatch(/\$[\d,]+\.\d{2}/);
    expect(price).not.toContain('123.45'); // Mock price comum
  });

  test('5. Charts carregam com dados históricos', async () => {
    // Navega para charts
    await page.goto('http://localhost:5173/stock/AAPL/charts');
    
    // Aguarda gráfico carregar
    await page.waitForSelector('canvas', { timeout: 15000 });
    
    // Verifica se o gráfico tem dados
    const canvas = await page.locator('canvas').first();
    const box = await canvas.boundingBox();
    expect(box?.width).toBeGreaterThan(100);
    expect(box?.height).toBeGreaterThan(100);
    
    // Verifica indicadores de período
    await expect(page.locator('text=/1D|5D|1M|1Y/')).toBeVisible();
  });

  test('6. Sistema de cache está funcionando', async () => {
    const timings: { [key: string]: number[] } = {};
    
    // Intercepta e mede tempo de resposta
    await page.route('**/api/stocks/*/quote', async (route, request) => {
      const start = Date.now();
      const response = await route.fetch();
      const end = Date.now();
      
      const url = request.url();
      if (!timings[url]) timings[url] = [];
      timings[url].push(end - start);
      
      await route.fulfill({ response });
    });
    
    // Primeira chamada
    await page.goto('http://localhost:5173/stock/AAPL/charts');
    await page.waitForLoadState('networkidle');
    
    // Segunda chamada (deve usar cache)
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verifica se segunda chamada foi mais rápida
    Object.entries(timings).forEach(([url, times]) => {
      if (times.length >= 2) {
        const [first, second] = times;
        console.log(`Cache performance for ${url}: ${first}ms → ${second}ms`);
        
        // Cache deve ser pelo menos 50% mais rápido
        expect(second).toBeLessThan(first * 0.5);
      }
    });
  });

  test('7. Fallback entre APIs funciona', async () => {
    // Simula falha na API primária
    await page.route('**/api/stocks/*/quote', async (route, request) => {
      const headers = request.headers();
      
      // Simula falha se for primeira tentativa
      if (!headers['x-retry-count']) {
        await route.fulfill({
          status: 503,
          body: JSON.stringify({ error: 'Service unavailable' })
        });
      } else {
        // Sucesso no retry
        await route.continue();
      }
    });
    
    // Tenta carregar dados
    await page.goto('http://localhost:5173/home');
    
    // Deve conseguir carregar mesmo com falha inicial
    await expect(page.locator('[data-testid="stock-card"]')).toBeVisible({ timeout: 15000 });
  });

  test('8. Performance dentro dos limites', async () => {
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });
    
    console.log('Performance Metrics:', metrics);
    
    // Verifica limites aceitáveis
    expect(metrics.firstContentfulPaint).toBeLessThan(3000); // 3s
    expect(metrics.domContentLoaded).toBeLessThan(5000); // 5s
    expect(metrics.loadComplete).toBeLessThan(10000); // 10s
  });

  test('9. Sem vazamento de dados sensíveis', async () => {
    // Verifica HTML da página
    const pageContent = await page.content();
    
    // Lista de strings sensíveis que não devem aparecer
    const sensitivePatterns = [
      /ALPHA_VANTAGE_API_KEY/i,
      /FINNHUB_API_KEY/i,
      /SUPABASE_SERVICE_KEY/i,
      /STRIPE_SECRET_KEY/i,
      /sk_test_/,
      /service_role/
    ];
    
    sensitivePatterns.forEach(pattern => {
      expect(pageContent).not.toMatch(pattern);
    });
    
    // Verifica console
    const consoleLogs: string[] = [];
    page.on('console', msg => consoleLogs.push(msg.text()));
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    consoleLogs.forEach(log => {
      sensitivePatterns.forEach(pattern => {
        expect(log).not.toMatch(pattern);
      });
    });
  });

  test('10. Mobile responsivo funciona', async () => {
    // Define viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('http://localhost:5173/home');
    
    // Verifica menu mobile
    const mobileMenu = await page.locator('[data-testid="mobile-menu"]');
    await expect(mobileMenu).toBeVisible();
    
    // Verifica layout responsivo
    const stockCards = await page.locator('[data-testid="stock-card"]').all();
    
    for (const card of stockCards) {
      const box = await card.boundingBox();
      expect(box?.width).toBeLessThan(375); // Não deve exceder largura da tela
    }
  });

  test.afterAll(async () => {
    await page.close();
  });
});

/**
 * Testes de Stress
 */
test.describe('Testes de Stress - 401 Solution', () => {
  test('Múltiplas requisições simultâneas', async ({ page }) => {
    const promises = [];
    const errors: any[] = [];
    
    page.on('response', response => {
      if (response.status() >= 400) {
        errors.push({
          url: response.url(),
          status: response.status()
        });
      }
    });
    
    // Faz 50 requisições simultâneas
    for (let i = 0; i < 50; i++) {
      promises.push(
        page.evaluate(async () => {
          const response = await fetch('/api/stocks/AAPL/quote');
          return response.status;
        })
      );
    }
    
    const results = await Promise.all(promises);
    
    // Verifica se todas foram bem-sucedidas
    const failures = results.filter(status => status !== 200);
    expect(failures.length).toBe(0);
    
    // Verifica se não houve 401
    const unauthorized = results.filter(status => status === 401);
    expect(unauthorized.length).toBe(0);
  });
});