# 🔒 Security Testing Guide - Alfalyzer

## Overview

This document describes the automated security testing suite for the Alfalyzer project. The tests validate critical security measures including authentication, authorization, input validation, rate limiting, and more.

## Test Files

- `security-tests.test.ts` - Main security test suite
- `jest.config.js` - Jest configuration for testing
- `jest.setup.js` - Test environment setup

## Installation

Install the required testing dependencies:

```bash
npm install --save-dev jest @types/jest supertest @types/supertest ts-jest @types/jsonwebtoken
```

## Running Tests

### All Security Tests
```bash
npm run test:security
```

### All Tests with Coverage
```bash
npm run test:coverage
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### CI/CD Mode
```bash
npm run test:ci
```

## Test Categories

### 🛡️ Security Headers Tests
Validates that all required security headers are present:
- `X-Frame-Options: DENY`
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy`
- `Referrer-Policy`
- `X-DNS-Prefetch-Control: off`

### 🔐 JWT Authentication Tests
- Rejects requests without JWT tokens
- Validates JWT signature verification
- Tests token expiration handling
- Validates JWT format and structure
- Tests blacklisted token rejection

### 🛡️ CSRF Protection Tests
- Ensures POST/PUT/DELETE requests require CSRF tokens
- Validates CSRF token verification
- Tests CSRF token generation endpoint

### ⚡ Rate Limiting Tests
- General endpoint rate limiting (100 req/min)
- Financial API rate limiting (10 req/min)
- Authenticated user rate limiting (500 req/min)
- Per-IP rate limiting validation
- Rate limit header verification

### 🔍 Input Validation Tests
- SQL injection prevention
- XSS attack prevention
- Input format validation
- Input length validation
- Special character handling

### 🌐 CORS Tests
- Whitelisted origin validation
- Malicious origin rejection
- Preflight request handling
- CORS header verification

### 🔐 API Key Security Tests
- API key exposure prevention
- API key format validation
- Secret information protection

### 🔒 Session Security Tests
- Secure cookie configuration
- Session timeout implementation
- HttpOnly and Secure flags

### 📊 Error Handling Tests
- Stack trace prevention in production
- Sensitive information protection
- Generic error messages

### 🔍 Security Monitoring Tests
- Security event logging
- Brute force detection
- Attack attempt monitoring

## Test Configuration

### Environment Variables
The tests use these environment variables:
```bash
NODE_ENV=test
JWT_SECRET=test-jwt-secret-key
ALPHA_VANTAGE_API_KEY=test-key
FINNHUB_API_KEY=test-key
DATABASE_URL=:memory:
CORS_ORIGIN=http://localhost:3000,https://alfalyzer.vercel.app
```

### Jest Configuration
- Test environment: Node.js
- TypeScript support via ts-jest
- 30-second timeout for long-running tests
- Coverage thresholds: 80% minimum
- Automatic mock clearing between tests

## Test Utilities

The test suite includes utility functions:

- `createTestJWT()` - Generate test JWT tokens
- `simulateConcurrentRequests()` - Test rate limiting
- `generateSQLInjectionPatterns()` - SQL injection test cases
- `generateXSSPayloads()` - XSS attack test cases

## Coverage Requirements

Minimum coverage thresholds:
- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

## Common Issues & Solutions

### Test Failures

1. **JWT Secret Not Set**
   ```bash
   Error: JWT_SECRET environment variable not set
   ```
   **Solution:** Ensure `JWT_SECRET` is set in test environment

2. **Rate Limiting False Positives**
   ```bash
   Expected rate limiting but requests succeeded
   ```
   **Solution:** Increase the number of concurrent requests or check rate limit configuration

3. **CORS Test Failures**
   ```bash
   CORS headers not matching expected values
   ```
   **Solution:** Verify CORS whitelist configuration in security middleware

### Mock Issues

1. **External API Calls**
   - All external APIs are mocked in `jest.setup.js`
   - Mock responses can be customized per test

2. **Database Connections**
   - Tests use SQLite in-memory database
   - Database is reset between test suites

## Best Practices

### Writing Security Tests

1. **Test Both Positive and Negative Cases**
   ```typescript
   // Good: Test both allowed and blocked scenarios
   test('Should allow whitelisted origins', async () => {
     // Test allowed origin
   });
   
   test('Should reject non-whitelisted origins', async () => {
     // Test blocked origin
   });
   ```

2. **Use Realistic Attack Vectors**
   ```typescript
   const sqlInjectionPayloads = [
     "'; DROP TABLE users; --",
     "1' OR '1'='1",
     "admin'; --"
   ];
   ```

3. **Validate Security Headers**
   ```typescript
   expect(response.headers['x-frame-options']).toBe('DENY');
   expect(response.headers['strict-transport-security']).toMatch(/max-age=\d+/);
   ```

### Test Organization

- Group related tests in `describe` blocks
- Use descriptive test names
- Include both unit and integration tests
- Test error conditions and edge cases

## Continuous Integration

### GitHub Actions Example
```yaml
name: Security Tests
on: [push, pull_request]
jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run security tests
        run: npm run test:security
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

## Security Test Checklist

- [ ] All security headers implemented and tested
- [ ] JWT authentication properly validated
- [ ] CSRF protection active and tested
- [ ] Rate limiting functional and tested
- [ ] Input validation prevents injection attacks
- [ ] CORS properly configured
- [ ] API keys not exposed in responses
- [ ] Session security properly implemented
- [ ] Error handling doesn't leak information
- [ ] Security monitoring and logging active

## Reporting Security Issues

If tests reveal security vulnerabilities:

1. **Document the issue** in `SECURITY_LOG.md`
2. **Create a fix** immediately for critical issues
3. **Update tests** to prevent regression
4. **Re-run full test suite** to ensure fix works
5. **Update security documentation**

## Future Enhancements

Planned security test improvements:

- [ ] Automated penetration testing integration
- [ ] Performance impact testing of security measures
- [ ] Security compliance testing (OWASP, SOC2)
- [ ] Automated dependency vulnerability scanning
- [ ] Real-time security monitoring tests

---

*For questions about security testing, refer to the security team or check the main project documentation.*