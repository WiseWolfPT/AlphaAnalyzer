#!/usr/bin/env node

/**
 * Simple health endpoint test
 * Usage: node test-health-endpoint.js [port]
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const DEFAULT_PORT = process.env.PORT || 3001;
const port = process.argv[2] || DEFAULT_PORT;
const healthUrl = `http://localhost:${port}/health`;

console.log(`\n🔍 Testing health endpoint at ${healthUrl}\n`);

function testEndpoint(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = client.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'Health-Test/1.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

async function runTests() {
  const tests = [
    {
      name: 'GET /health returns 200 OK',
      url: `http://localhost:${port}/health`,
      expectedStatus: 200
    },
    {
      name: 'GET /api/health returns 200 OK',
      url: `http://localhost:${port}/api/health`,
      expectedStatus: 200
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await testEndpoint(test.url);
      
      if (result.status === test.expectedStatus) {
        console.log(`✅ PASS: ${test.name}`);
        console.log(`   Status: ${result.status}`);
        
        // Ensure it's not 426 Upgrade Required
        if (result.status === 426) {
          console.log(`❌ FAIL: Received 426 Upgrade Required!`);
          failed++;
        } else {
          passed++;
        }
        
        // Parse and display response
        try {
          const json = JSON.parse(result.body);
          console.log(`   Response:`, JSON.stringify(json, null, 2));
        } catch (e) {
          console.log(`   Response: ${result.body.substring(0, 100)}...`);
        }
      } else {
        console.log(`❌ FAIL: ${test.name}`);
        console.log(`   Expected: ${test.expectedStatus}, Got: ${result.status}`);
        console.log(`   Response: ${result.body}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ FAIL: ${test.name}`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
    console.log('');
  }
  
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Check if server is running first
http.get(healthUrl, (res) => {
  runTests();
}).on('error', (err) => {
  console.error(`❌ Server not running on port ${port}`);
  console.error(`   Please start the server first with: npm run dev`);
  console.error(`   Error: ${err.message}\n`);
  process.exit(1);
});