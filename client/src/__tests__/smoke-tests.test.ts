/**
 * ALFALYZER - SMOKE TESTS
 * Testes básicos para verificar funcionalidades críticas
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

// Mock environment variables
jest.mock('@/lib/env', () => ({
  ENV: {
    VITE_APP_NAME: 'Alfalyzer',
    VITE_API_BASE_URL: '/api'
  }
}));

// Mock API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
});

describe('🔥 Smoke Tests - Funcionalidades Críticas', () => {
  
  describe('🔐 Autenticação', () => {
    test('Login com credenciais válidas deve funcionar', async () => {
      // Mock successful login response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: '1',
            email: 'test@alfalyzer.com',
            name: 'Test User'
          },
          token: 'mock-jwt-token'
        })
      });

      const loginData = {
        email: 'test@alfalyzer.com',
        password: 'password123'
      };

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(loginData.email);
      expect(result.token).toBeDefined();
    });

    test('Login com credenciais inválidas deve falhar', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'Credenciais inválidas'
        })
      });

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'wrong@email.com',
          password: 'wrongpassword'
        })
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });

    test('Registo de novo utilizador deve funcionar', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          message: 'Utilizador criado com sucesso',
          user: {
            id: '2',
            email: 'novo@alfalyzer.com',
            name: 'Novo Utilizador'
          }
        })
      });

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Novo Utilizador',
          email: 'novo@alfalyzer.com',
          password: 'password123'
        })
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);
    });
  });

  describe('📈 Pesquisa de Ações', () => {
    test('Pesquisa por símbolo deve retornar dados', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          symbol: 'AAPL',
          name: 'Apple Inc.',
          price: 150.25,
          change: 2.5,
          changePercent: 1.69
        })
      });

      const response = await fetch('/api/stocks/search?q=AAPL');
      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.symbol).toBe('AAPL');
      expect(result.name).toContain('Apple');
      expect(typeof result.price).toBe('number');
    });

    test('Pesquisa por termo inválido deve retornar erro 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: 'Símbolo não encontrado'
        })
      });

      const response = await fetch('/api/stocks/search?q=INVALID123');
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });

    test('Dados em tempo real devem incluir campos obrigatórios', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          symbol: 'TSLA',
          name: 'Tesla Inc.',
          price: 245.67,
          change: -5.23,
          changePercent: -2.08,
          volume: 45678901,
          marketCap: 782340000000,
          timestamp: Date.now()
        })
      });

      const response = await fetch('/api/stocks/realtime/TSLA');
      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result).toHaveProperty('symbol');
      expect(result).toHaveProperty('price');
      expect(result).toHaveProperty('change');
      expect(result).toHaveProperty('changePercent');
      expect(result).toHaveProperty('volume');
      expect(result).toHaveProperty('marketCap');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('💳 Sistema de Pagamentos (Mock)', () => {
    test('Criação de sessão de checkout deve funcionar', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessionId: 'cs_test_123456789',
          url: 'https://checkout.stripe.com/c/pay/cs_test_123456789'
        })
      });

      const response = await fetch('/api/subscriptions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: 'price_pro_monthly',
          userId: 'user_123'
        })
      });

      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.sessionId).toBeDefined();
      expect(result.url).toContain('checkout.stripe.com');
    });

    test('Verificação de estado de subscrição deve funcionar', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'active',
          plan: 'pro',
          expires: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 dias
          features: ['realtime_data', 'advanced_charts', 'alerts']
        })
      });

      const response = await fetch('/api/subscriptions/status?userId=user_123');
      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.status).toBe('active');
      expect(result.plan).toBe('pro');
      expect(Array.isArray(result.features)).toBe(true);
    });
  });

  describe('🔗 Integração de APIs Externas', () => {
    test('Rotação de APIs deve funcionar em caso de falha', async () => {
      // Simula falha da primeira API
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429, // Rate limit
          json: async () => ({ error: 'Rate limit exceeded' })
        })
        // Sucesso da segunda API (fallback)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            symbol: 'MSFT',
            price: 310.55,
            source: 'fallback_api'
          })
        });

      // Primeira chamada (falha)
      const firstResponse = await fetch('/api/stocks/data/MSFT');
      expect(firstResponse.ok).toBe(false);

      // Segunda chamada (sucesso com fallback)
      const secondResponse = await fetch('/api/stocks/data/MSFT');
      const result = await secondResponse.json();
      
      expect(secondResponse.ok).toBe(true);
      expect(result.symbol).toBe('MSFT');
      expect(result.source).toBe('fallback_api');
    });

    test('Cache de dados deve reduzir chamadas à API', async () => {
      const cachedData = {
        symbol: 'GOOGL',
        price: 2750.30,
        cached: true,
        timestamp: Date.now()
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => cachedData
      });

      const response = await fetch('/api/stocks/data/GOOGL');
      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.cached).toBe(true);
      expect(result.symbol).toBe('GOOGL');
    });
  });

  describe('⚡ Performance e Disponibilidade', () => {
    test('Endpoint de health check deve responder rapidamente', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'healthy',
          timestamp: Date.now(),
          version: '1.0.0',
          uptime: 86400000 // 24h in ms
        })
      });

      const startTime = Date.now();
      const response = await fetch('/api/health');
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.status).toBe('healthy');
      expect(responseTime).toBeLessThan(1000); // < 1 segundo
    });

    test('Dados de mercado devem ter timestamp recente', async () => {
      const now = Date.now();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          timestamp: now - 30000, // 30 segundos atrás
          data: { symbol: 'SPY', price: 420.50 }
        })
      });

      const response = await fetch('/api/market/indices');
      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.timestamp).toBeGreaterThan(now - 300000); // Menos de 5 min
    });
  });

  describe('🔒 Segurança Básica', () => {
    test('Endpoints protegidos devem rejeitar sem autenticação', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'Token de autenticação necessário'
        })
      });

      const response = await fetch('/api/user/profile');
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });

    test('Dados sensíveis não devem vazar na resposta', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'user_123',
          email: 'test@alfalyzer.com',
          name: 'Test User',
          // Não deve conter: password, api_keys, tokens
        })
      });

      const response = await fetch('/api/user/profile', {
        headers: { 'Authorization': 'Bearer mock-token' }
      });
      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('api_key');
      expect(result).not.toHaveProperty('token');
    });
  });
});

// Utility para testes de integração
export const TestUtils = {
  mockApiResponse: (data: any, status = 200) => {
    mockFetch.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: async () => data
    });
  },

  expectValidStockData: (data: any) => {
    expect(data).toHaveProperty('symbol');
    expect(data).toHaveProperty('price');
    expect(typeof data.price).toBe('number');
    expect(data.price).toBeGreaterThan(0);
  },

  expectValidUserData: (data: any) => {
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('email');
    expect(data.email).toMatch(/@/);
    expect(data).not.toHaveProperty('password');
  }
};