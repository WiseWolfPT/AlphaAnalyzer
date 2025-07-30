/**
 * Test script to verify middleware fixes for ERR_HTTP_HEADERS_SENT
 * Run with: node test-middleware-fixes.js
 */

import express from 'express';
import { authLoggingMiddleware, corsLoggingMiddleware, proxyLoggingMiddleware } from './server/middleware/auth-logging.js';
import { corsDebugMiddleware, forceCorsHeaders, enforceJsonContentType } from './server/middleware/cors-debug.js';
import { securityLoggingMiddleware } from './server/middleware/api-security.js';

const app = express();
const port = 3999;

// Apply all middleware
app.use(authLoggingMiddleware);
app.use(corsLoggingMiddleware);
app.use(corsDebugMiddleware);
app.use(forceCorsHeaders);
app.use(enforceJsonContentType);
app.use((req, res, next) => {
  // Simulate authenticated user
  req.user = { id: 'test-user', email: 'test@example.com', role: 'user' };
  next();
});
app.use(securityLoggingMiddleware);
app.use(proxyLoggingMiddleware);

// Test endpoints
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'Normal response' });
});

app.get('/api/error', (req, res) => {
  res.status(400).json({ error: 'Bad request test' });
});

app.get('/api/proxy/test', (req, res) => {
  res.json({ proxy: true, data: 'Proxy response test' });
});

// Test multiple middleware trying to modify response
app.get('/api/multiple', (req, res, next) => {
  // First middleware sets a header
  res.setHeader('X-Test-1', 'value1');
  next();
}, (req, res, next) => {
  // Second middleware sets another header
  res.setHeader('X-Test-2', 'value2');
  next();
}, (req, res) => {
  // Final handler sends response
  res.json({ test: 'multiple middleware' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const server = app.listen(port, () => {
  console.log(`Test server running on port ${port}`);
  console.log('Running tests...\n');
  
  // Run tests
  runTests().then(() => {
    console.log('\nAll tests completed!');
    server.close();
    process.exit(0);
  }).catch(err => {
    console.error('Test failed:', err);
    server.close();
    process.exit(1);
  });
});

async function runTests() {
  const baseUrl = `http://localhost:${port}`;
  
  // Test 1: Normal API request
  console.log('Test 1: Normal API request');
  const res1 = await fetch(`${baseUrl}/api/test`);
  const data1 = await res1.json();
  console.log('✅ Response:', res1.status, data1);
  
  // Test 2: Error response
  console.log('\nTest 2: Error response');
  const res2 = await fetch(`${baseUrl}/api/error`);
  const data2 = await res2.json();
  console.log('✅ Response:', res2.status, data2);
  
  // Test 3: Proxy endpoint
  console.log('\nTest 3: Proxy endpoint');
  const res3 = await fetch(`${baseUrl}/api/proxy/test`);
  const data3 = await res3.json();
  console.log('✅ Response:', res3.status, data3);
  
  // Test 4: Multiple middleware
  console.log('\nTest 4: Multiple middleware');
  const res4 = await fetch(`${baseUrl}/api/multiple`);
  const data4 = await res4.json();
  console.log('✅ Response:', res4.status, data4);
  
  // Test 5: CORS headers
  console.log('\nTest 5: CORS headers');
  const res5 = await fetch(`${baseUrl}/api/test`, {
    headers: {
      'Origin': 'http://localhost:5173'
    }
  });
  console.log('✅ CORS headers present:', {
    'access-control-allow-origin': res5.headers.get('access-control-allow-origin'),
    'access-control-allow-credentials': res5.headers.get('access-control-allow-credentials')
  });
}