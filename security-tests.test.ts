/**
 * 🔒 SECURITY TESTS - ALFALYZER PROJECT
 * 
 * Automated security validation tests for:
 * - Security headers presence and configuration
 * - JWT authentication enforcement
 * - CSRF protection
 * - Rate limiting functionality
 * - API endpoint security
 * 
 * Run with: npm test
 * Dependencies needed: npm install --save-dev jest @types/jest supertest @types/supertest
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Express } from 'express';
import { createServer } from '../server/index';

describe('🔒 Security Tests - Alfalyzer', () => {
  let app: Express;
  let server: any;
  let validJWT: string;
  let invalidJWT: string;

  beforeAll(async () => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.ALPHA_VANTAGE_API_KEY = 'test-key';
    process.env.FINNHUB_API_KEY = 'test-key';
    
    // Create test server instance
    app = await createServer();
    server = app.listen(0); // Random port for testing
    
    // Generate test JWTs
    validJWT = jwt.sign(
      { userId: 'test-user', email: 'test@example.com' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
    
    invalidJWT = 'invalid.jwt.token';
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('🛡️ Security Headers Tests', () => {
    
    test('Should include X-Frame-Options header', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    test('Should include Strict-Transport-Security header', async () => {
      const response = await request(app)
        .get('/');
      
      expect(response.headers['strict-transport-security']).toMatch(/max-age=\d+/);
    });

    test('Should include X-Content-Type-Options header', async () => {
      const response = await request(app)
        .get('/');
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('Should include X-XSS-Protection header', async () => {
      const response = await request(app)
        .get('/');
      
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    test('Should include Content-Security-Policy header', async () => {
      const response = await request(app)
        .get('/');
      
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toMatch(/default-src/);
    });

    test('Should include Referrer-Policy header', async () => {
      const response = await request(app)
        .get('/');
      
      expect(response.headers['referrer-policy']).toBeDefined();
    });

    test('Should include X-DNS-Prefetch-Control header', async () => {
      const response = await request(app)
        .get('/');
      
      expect(response.headers['x-dns-prefetch-control']).toBe('off');
    });

    test('Should not expose sensitive server information', async () => {
      const response = await request(app)
        .get('/');
      
      expect(response.headers['x-powered-by']).toBeUndefined();
      expect(response.headers['server']).toBeUndefined();
    });
  });

  describe('🔐 JWT Authentication Tests', () => {
    
    test('Should reject requests to protected endpoints without JWT', async () => {
      const protectedEndpoints = [
        '/api/portfolio',
        '/api/watchlist',
        '/api/user/profile',
        '/api/admin/users'
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app)
          .get(endpoint);
        
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
      }
    });

    test('Should reject requests with invalid JWT', async () => {
      const response = await request(app)
        .get('/api/portfolio')
        .set('Authorization', `Bearer ${invalidJWT}`);
      
      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/token|unauthorized/i);
    });

    test('Should accept requests with valid JWT', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${validJWT}`);
      
      // Should not be 401 (could be 200, 404, etc. depending on implementation)
      expect(response.status).not.toBe(401);
    });

    test('Should reject expired JWT tokens', async () => {
      const expiredJWT = jwt.sign(
        { userId: 'test-user', email: 'test@example.com' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/api/portfolio')
        .set('Authorization', `Bearer ${expiredJWT}`);
      
      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/token|expired|unauthorized/i);
    });

    test('Should reject JWT with wrong signature', async () => {
      const wrongSignatureJWT = jwt.sign(
        { userId: 'test-user', email: 'test@example.com' },
        'wrong-secret-key',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/portfolio')
        .set('Authorization', `Bearer ${wrongSignatureJWT}`);
      
      expect(response.status).toBe(401);
    });

    test('Should validate JWT format', async () => {
      const malformedTokens = [
        'Bearer',
        'Bearer ',
        'Bearer malformed',
        'Bearer eyJhbGciOiJIUzI1NiJ9.invalid',
        ''
      ];

      for (const token of malformedTokens) {
        const response = await request(app)
          .get('/api/portfolio')
          .set('Authorization', token);
        
        expect(response.status).toBe(401);
      }
    });
  });

  describe('🛡️ CSRF Protection Tests', () => {
    
    test('Should reject POST requests without CSRF token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/csrf|forbidden/i);
    });

    test('Should reject PUT requests without CSRF token', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${validJWT}`)
        .send({
          name: 'Test User'
        });
      
      expect(response.status).toBe(403);
    });

    test('Should reject DELETE requests without CSRF token', async () => {
      const response = await request(app)
        .delete('/api/watchlist/1')
        .set('Authorization', `Bearer ${validJWT}`);
      
      expect(response.status).toBe(403);
    });

    test('Should accept requests with valid CSRF token', async () => {
      // First get CSRF token
      const csrfResponse = await request(app)
        .get('/api/csrf-token');
      
      const csrfToken = csrfResponse.body.csrfToken;
      
      const response = await request(app)
        .post('/api/auth/register')
        .set('X-CSRF-Token', csrfToken)
        .send({
          email: 'newuser@example.com',
          password: 'securepassword123',
          name: 'New User'
        });
      
      // Should not be 403 (CSRF error)
      expect(response.status).not.toBe(403);
    });

    test('Should reject requests with invalid CSRF token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-CSRF-Token', 'invalid-csrf-token')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(403);
    });
  });

  describe('⚡ Rate Limiting Tests', () => {
    
    test('Should implement rate limiting on general endpoints', async () => {
      const requests = [];
      
      // Send multiple requests rapidly
      for (let i = 0; i < 105; i++) { // Exceed limit of 100/min
        requests.push(
          request(app)
            .get('/api/market-data/AAPL')
            .set('X-Forwarded-For', '127.0.0.1')
        );
      }
      
      const responses = await Promise.all(requests);
      
      // At least one request should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('Should implement stricter rate limiting on financial APIs', async () => {
      const requests = [];
      
      // Send multiple requests to financial endpoint
      for (let i = 0; i < 15; i++) { // Exceed limit of 10/min for financial APIs
        requests.push(
          request(app)
            .get('/api/market-data/quote/AAPL')
            .set('X-Forwarded-For', '192.168.1.1')
        );
      }
      
      const responses = await Promise.all(requests);
      
      // Should hit rate limit
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('Should include rate limit headers', async () => {
      const response = await request(app)
        .get('/api/market-data/TSLA');
      
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    test('Should implement per-user rate limiting for authenticated requests', async () => {
      const requests = [];
      
      // Send multiple authenticated requests
      for (let i = 0; i < 505; i++) { // Exceed limit of 500/min for authenticated users
        requests.push(
          request(app)
            .get('/api/portfolio')
            .set('Authorization', `Bearer ${validJWT}`)
        );
      }
      
      const responses = await Promise.all(requests);
      
      // Should hit rate limit
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('Should differentiate rate limits by IP address', async () => {
      // Test with different IP addresses
      const ip1Requests = [];
      const ip2Requests = [];
      
      for (let i = 0; i < 60; i++) {
        ip1Requests.push(
          request(app)
            .get('/api/market-data/SPY')
            .set('X-Forwarded-For', '10.0.0.1')
        );
        
        ip2Requests.push(
          request(app)
            .get('/api/market-data/SPY')
            .set('X-Forwarded-For', '10.0.0.2')
        );
      }
      
      const [ip1Responses, ip2Responses] = await Promise.all([
        Promise.all(ip1Requests),
        Promise.all(ip2Requests)
      ]);
      
      // Both IPs should be able to make requests independently
      const ip1Success = ip1Responses.filter(r => r.status === 200).length;
      const ip2Success = ip2Responses.filter(r => r.status === 200).length;
      
      expect(ip1Success).toBeGreaterThan(0);
      expect(ip2Success).toBeGreaterThan(0);
    });
  });

  describe('🔍 Input Validation Tests', () => {
    
    test('Should sanitize SQL injection attempts', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'/*",
        "1; DELETE FROM portfolio; --"
      ];

      for (const input of maliciousInputs) {
        const response = await request(app)
          .get(`/api/market-data/${encodeURIComponent(input)}`)
          .set('Authorization', `Bearer ${validJWT}`);
        
        // Should either reject (400/422) or sanitize (not 500)
        expect(response.status).not.toBe(500);
        if (response.status === 200) {
          // If accepted, response should not contain SQL keywords
          expect(JSON.stringify(response.body)).not.toMatch(/DROP|DELETE|INSERT|UPDATE/i);
        }
      }
    });

    test('Should prevent XSS attacks in inputs', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        '"><script>alert(String.fromCharCode(88,83,83))</script>'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/watchlist')
          .set('Authorization', `Bearer ${validJWT}`)
          .set('X-CSRF-Token', 'valid-csrf-token') // Assume valid for XSS test
          .send({
            symbol: payload,
            name: 'Test Stock'
          });
        
        if (response.status === 200 || response.status === 201) {
          // If accepted, should be sanitized
          expect(JSON.stringify(response.body)).not.toMatch(/<script|javascript:|onerror=/i);
        }
      }
    });

    test('Should validate input formats and lengths', async () => {
      const invalidInputs = [
        { symbol: '', name: 'Test' }, // Empty symbol
        { symbol: 'A'.repeat(20), name: 'Test' }, // Too long symbol
        { symbol: 'AAPL', name: '' }, // Empty name
        { symbol: 'AAPL', name: 'A'.repeat(200) }, // Too long name
        { symbol: '123!@#', name: 'Test' }, // Invalid characters
      ];

      for (const input of invalidInputs) {
        const response = await request(app)
          .post('/api/watchlist')
          .set('Authorization', `Bearer ${validJWT}`)
          .send(input);
        
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('🌐 CORS Tests', () => {
    
    test('Should allow requests from whitelisted origins', async () => {
      const allowedOrigins = [
        'http://localhost:3000',
        'https://alfalyzer.vercel.app',
        'https://www.alfalyzer.com'
      ];

      for (const origin of allowedOrigins) {
        const response = await request(app)
          .get('/api/market-data/AAPL')
          .set('Origin', origin);
        
        expect(response.headers['access-control-allow-origin']).toBe(origin);
      }
    });

    test('Should reject requests from non-whitelisted origins', async () => {
      const maliciousOrigins = [
        'https://evil.com',
        'http://malicious-site.com',
        'https://phishing-alfalyzer.com'
      ];

      for (const origin of maliciousOrigins) {
        const response = await request(app)
          .get('/api/market-data/AAPL')
          .set('Origin', origin);
        
        expect(response.headers['access-control-allow-origin']).not.toBe(origin);
      }
    });

    test('Should include proper CORS headers for preflight requests', async () => {
      const response = await request(app)
        .options('/api/portfolio')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Authorization, Content-Type');
      
      expect(response.headers['access-control-allow-methods']).toMatch(/POST/);
      expect(response.headers['access-control-allow-headers']).toMatch(/Authorization/);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('🔐 API Key Security Tests', () => {
    
    test('Should not expose API keys in responses', async () => {
      const response = await request(app)
        .get('/api/market-data/AAPL');
      
      const responseString = JSON.stringify(response.body);
      
      // Should not contain common API key patterns
      expect(responseString).not.toMatch(/[A-Z0-9]{32,}/); // Typical API key format
      expect(responseString).not.toMatch(/api[_-]?key/i);
      expect(responseString).not.toMatch(/secret/i);
      expect(responseString).not.toMatch(/token.*[A-Z0-9]{20,}/i);
    });

    test('Should validate API key format before use', async () => {
      // This test would require mocking the API key validation
      // Implementation depends on your API key validation logic
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('🔒 Session Security Tests', () => {
    
    test('Should use secure session configuration', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      if (response.headers['set-cookie']) {
        const cookieHeader = response.headers['set-cookie'][0];
        
        expect(cookieHeader).toMatch(/Secure/);
        expect(cookieHeader).toMatch(/HttpOnly/);
        expect(cookieHeader).toMatch(/SameSite/);
      }
    });

    test('Should implement session timeout', async () => {
      // Test that tokens expire after the configured time
      // This would typically be tested with time manipulation or shorter expiry for tests
      expect(true).toBe(true); // Placeholder - depends on implementation
    });
  });

  describe('📊 Error Handling Security Tests', () => {
    
    test('Should not expose stack traces in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/nonexistent-endpoint');
      
      expect(response.status).toBe(404);
      expect(JSON.stringify(response.body)).not.toMatch(/Error:|at Object\.|at Function\./);
      
      process.env.NODE_ENV = originalEnv;
    });

    test('Should not expose sensitive error information', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
      // Should not reveal whether email exists or not
      expect(response.body.error).not.toMatch(/user not found|invalid email/i);
      expect(response.body.error).toMatch(/invalid credentials|unauthorized/i);
    });
  });

  describe('🔍 Security Monitoring Tests', () => {
    
    test('Should log security events', async () => {
      // Test that security events are being logged
      // This would require access to your logging system
      expect(true).toBe(true); // Placeholder
    });

    test('Should detect and respond to brute force attempts', async () => {
      const attempts = [];
      
      // Simulate multiple failed login attempts
      for (let i = 0; i < 10; i++) {
        attempts.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'test@example.com',
              password: 'wrongpassword'
            })
        );
      }
      
      const responses = await Promise.all(attempts);
      
      // Later attempts should be blocked or throttled
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse.status).toBe(429); // Rate limited
    });
  });
});

/**
 * 🔧 Test Utilities
 */

// Helper function to create test JWT with custom payload
function createTestJWT(payload: any, secret?: string, options?: any) {
  return jwt.sign(
    payload,
    secret || process.env.JWT_SECRET!,
    options || { expiresIn: '1h' }
  );
}

// Helper function to simulate concurrent requests
async function simulateConcurrentRequests(app: Express, endpoint: string, count: number, headers: any = {}) {
  const requests = [];
  
  for (let i = 0; i < count; i++) {
    requests.push(
      request(app)
        .get(endpoint)
        .set(headers)
    );
  }
  
  return Promise.all(requests);
}

// Helper function to test SQL injection patterns
function generateSQLInjectionPatterns() {
  return [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "admin'; --",
    "1' UNION SELECT * FROM users --",
    "'; INSERT INTO users VALUES('hacker','password'); --",
    "1' AND (SELECT COUNT(*) FROM users) > 0 --"
  ];
}

// Helper function to generate XSS payloads
function generateXSSPayloads() {
  return [
    '<script>alert("xss")</script>',
    '<img src="x" onerror="alert(1)">',
    'javascript:alert("xss")',
    '<svg onload="alert(1)">',
    '"><script>alert(String.fromCharCode(88,83,83))</script>',
    '<iframe src="javascript:alert(`xss`)"></iframe>'
  ];
}

export {
  createTestJWT,
  simulateConcurrentRequests,
  generateSQLInjectionPatterns,
  generateXSSPayloads
};