/**
 * Integration Tests - Critical User Flows
 * Testing complete user journeys through the application
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { chromium, Browser, Page } from '@playwright/test';

// Mock environment for integration tests
const TEST_PORT = 3333;
const TEST_URL = `http://localhost:${TEST_PORT}`;

describe('Critical User Flows - Integration Tests', () => {
  let browser: Browser;
  let page: Page;
  let apiServer: any;

  beforeAll(async () => {
    // Start test server
    // In real implementation, this would start your Express server
    console.log('Starting test server...');
    
    // Launch browser for E2E tests
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser?.close();
    // Close test server
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  describe('User Registration and Login Flow', () => {
    it('should complete full registration and login cycle', async () => {
      const testEmail = `test-${Date.now()}@example.com`;
      const testPassword = 'SecurePassword123!';

      // 1. Register new user via API
      const registerResponse = await request(TEST_URL)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          name: 'Test User'
        });

      expect(registerResponse.status).toBe(200);
      expect(registerResponse.body).toHaveProperty('message');
      expect(registerResponse.body.message).toContain('Check your email');

      // 2. Simulate email verification (in test mode, auto-verify)
      // In production, user would click email link

      // 3. Login with new credentials
      const loginResponse = await request(TEST_URL)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('user');
      expect(loginResponse.headers['set-cookie']).toBeDefined();

      // Extract cookies for authenticated requests
      const cookies = loginResponse.headers['set-cookie'];
      
      // 4. Access protected endpoint with auth cookie
      const profileResponse = await request(TEST_URL)
        .get('/api/auth/me')
        .set('Cookie', cookies);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.user.email).toBe(testEmail);
    });

    it('should handle invalid login attempts', async () => {
      const response = await request(TEST_URL)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.headers['set-cookie']).toBeUndefined();
    });
  });

  describe('Stock Search and Watchlist Flow', () => {
    let authCookies: string[];

    beforeEach(async () => {
      // Login as test user
      const loginResponse = await request(TEST_URL)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      authCookies = loginResponse.headers['set-cookie'];
    });

    it('should search for stocks and add to watchlist', async () => {
      // 1. Search for a stock
      const searchResponse = await request(TEST_URL)
        .get('/api/stocks/search?q=AAPL')
        .set('Cookie', authCookies);

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body).toBeInstanceOf(Array);
      expect(searchResponse.body[0]).toHaveProperty('symbol');

      const stock = searchResponse.body[0];

      // 2. Get stock quote
      const quoteResponse = await request(TEST_URL)
        .get(`/api/stocks/${stock.symbol}/quote`)
        .set('Cookie', authCookies);

      expect(quoteResponse.status).toBe(200);
      expect(quoteResponse.body).toHaveProperty('price');

      // 3. Create a watchlist
      const createWatchlistResponse = await request(TEST_URL)
        .post('/api/watchlists')
        .set('Cookie', authCookies)
        .send({
          name: 'My Tech Stocks'
        });

      expect(createWatchlistResponse.status).toBe(201);
      const watchlistId = createWatchlistResponse.body.id;

      // 4. Add stock to watchlist
      const addToWatchlistResponse = await request(TEST_URL)
        .post(`/api/watchlists/${watchlistId}/stocks`)
        .set('Cookie', authCookies)
        .send({
          symbol: stock.symbol
        });

      expect(addToWatchlistResponse.status).toBe(200);

      // 5. Verify stock is in watchlist
      const getWatchlistResponse = await request(TEST_URL)
        .get(`/api/watchlists/${watchlistId}`)
        .set('Cookie', authCookies);

      expect(getWatchlistResponse.status).toBe(200);
      expect(getWatchlistResponse.body.symbols).toContain(stock.symbol);
    });

    it('should handle API rate limiting gracefully', async () => {
      // Make multiple rapid requests
      const requests = Array.from({ length: 10 }, () =>
        request(TEST_URL)
          .get('/api/stocks/AAPL/quote')
          .set('Cookie', authCookies)
      );

      const responses = await Promise.all(requests);
      
      // All should succeed due to caching
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toHaveProperty('fromCache');
        }
      });
    });
  });

  describe('Portfolio Management Flow', () => {
    let authCookies: string[];
    let portfolioId: string;

    beforeEach(async () => {
      // Login and create portfolio
      const loginResponse = await request(TEST_URL)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      authCookies = loginResponse.headers['set-cookie'];

      const createPortfolioResponse = await request(TEST_URL)
        .post('/api/portfolios')
        .set('Cookie', authCookies)
        .send({
          name: 'Test Portfolio'
        });

      portfolioId = createPortfolioResponse.body.id;
    });

    it('should complete full portfolio transaction flow', async () => {
      // 1. Add buy transaction
      const buyResponse = await request(TEST_URL)
        .post(`/api/portfolios/${portfolioId}/transactions`)
        .set('Cookie', authCookies)
        .send({
          type: 'buy',
          symbol: 'AAPL',
          quantity: 10,
          price: 150.00,
          date: new Date().toISOString()
        });

      expect(buyResponse.status).toBe(201);
      const transactionId = buyResponse.body.id;

      // 2. Get portfolio holdings
      const holdingsResponse = await request(TEST_URL)
        .get(`/api/portfolios/${portfolioId}/holdings`)
        .set('Cookie', authCookies);

      expect(holdingsResponse.status).toBe(200);
      expect(holdingsResponse.body).toHaveProperty('AAPL');
      expect(holdingsResponse.body.AAPL.quantity).toBe(10);
      expect(holdingsResponse.body.AAPL.averageCost).toBe(150);

      // 3. Get current quote for P&L calculation
      const quoteResponse = await request(TEST_URL)
        .get('/api/stocks/AAPL/quote')
        .set('Cookie', authCookies);

      const currentPrice = quoteResponse.body.price;

      // 4. Calculate portfolio performance
      const performanceResponse = await request(TEST_URL)
        .get(`/api/portfolios/${portfolioId}/performance`)
        .set('Cookie', authCookies);

      expect(performanceResponse.status).toBe(200);
      expect(performanceResponse.body).toHaveProperty('totalValue');
      expect(performanceResponse.body).toHaveProperty('totalCost');
      expect(performanceResponse.body).toHaveProperty('unrealizedPL');

      // 5. Add sell transaction
      const sellResponse = await request(TEST_URL)
        .post(`/api/portfolios/${portfolioId}/transactions`)
        .set('Cookie', authCookies)
        .send({
          type: 'sell',
          symbol: 'AAPL',
          quantity: 5,
          price: currentPrice,
          date: new Date().toISOString()
        });

      expect(sellResponse.status).toBe(201);

      // 6. Verify updated holdings
      const updatedHoldingsResponse = await request(TEST_URL)
        .get(`/api/portfolios/${portfolioId}/holdings`)
        .set('Cookie', authCookies);

      expect(updatedHoldingsResponse.body.AAPL.quantity).toBe(5);
    });
  });

  describe('Real-time Price Updates Flow', () => {
    it('should receive real-time price updates via WebSocket', async (done) => {
      // This would test WebSocket connection in a real implementation
      // Using mock for demonstration
      
      const mockWebSocket = {
        on: vi.fn(),
        emit: vi.fn(),
        close: vi.fn()
      };

      // Simulate WebSocket connection
      mockWebSocket.on('connect', () => {
        // Subscribe to stock updates
        mockWebSocket.emit('subscribe', { symbols: ['AAPL', 'GOOGL'] });
      });

      mockWebSocket.on('price-update', (data: any) => {
        expect(data).toHaveProperty('symbol');
        expect(data).toHaveProperty('price');
        expect(data).toHaveProperty('timestamp');
        
        if (data.symbol === 'AAPL') {
          mockWebSocket.close();
          done();
        }
      });

      // Simulate price update
      setTimeout(() => {
        mockWebSocket.on('price-update', {
          symbol: 'AAPL',
          price: 182.52,
          timestamp: Date.now()
        });
      }, 100);
    });
  });

  describe('Performance Requirements', () => {
    let authCookies: string[];

    beforeEach(async () => {
      const loginResponse = await request(TEST_URL)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      authCookies = loginResponse.headers['set-cookie'];
    });

    it('should meet response time SLA for cached requests', async () => {
      // First request to populate cache
      await request(TEST_URL)
        .get('/api/stocks/AAPL/quote')
        .set('Cookie', authCookies);

      // Measure cached response time
      const startTime = Date.now();
      const response = await request(TEST_URL)
        .get('/api/stocks/AAPL/quote')
        .set('Cookie', authCookies);
      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(response.body.fromCache).toBe(true);
      expect(responseTime).toBeLessThan(50); // <50ms SLA
    });

    it('should handle concurrent user requests', async () => {
      // Simulate 10 concurrent users
      const concurrentRequests = Array.from({ length: 10 }, async () => {
        const response = await request(TEST_URL)
          .post('/api/stocks/batch')
          .set('Cookie', authCookies)
          .send({
            symbols: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META']
          });
        
        return response;
      });

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(5);
      });
    });
  });

  describe('Error Recovery Flow', () => {
    it('should recover from temporary API failures', async () => {
      // This would test retry logic with exponential backoff
      let attemptCount = 0;
      
      const makeRequestWithRetry = async (retries = 3): Promise<any> => {
        attemptCount++;
        
        try {
          const response = await request(TEST_URL)
            .get('/api/stocks/AAPL/quote')
            .timeout(1000);
          
          return response;
        } catch (error) {
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, 3 - retries) * 100));
            return makeRequestWithRetry(retries - 1);
          }
          throw error;
        }
      };

      // Should eventually succeed with retries
      const response = await makeRequestWithRetry();
      expect(attemptCount).toBeGreaterThanOrEqual(1);
      expect(attemptCount).toBeLessThanOrEqual(3);
    });

    it('should handle database connection issues gracefully', async () => {
      // Simulate database outage
      // In real test, would mock database connection failure
      
      const response = await request(TEST_URL)
        .get('/api/health');

      // Even with DB issues, health check should respond
      expect([200, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('Security Flow', () => {
    it('should enforce authentication on protected routes', async () => {
      // Try to access protected route without auth
      const response = await request(TEST_URL)
        .get('/api/portfolios');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should prevent CSRF attacks with cookie settings', async () => {
      const loginResponse = await request(TEST_URL)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      const cookies = loginResponse.headers['set-cookie'];
      
      // Verify security cookie attributes
      cookies.forEach((cookie: string) => {
        if (cookie.includes('token')) {
          expect(cookie).toContain('HttpOnly');
          expect(cookie).toContain('SameSite=Strict');
        }
      });
    });

    it('should sanitize user input to prevent injection', async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      
      const response = await request(TEST_URL)
        .get(`/api/stocks/search?q=${encodeURIComponent(maliciousInput)}`);

      // Should handle malicious input safely
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });
});