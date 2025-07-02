#!/usr/bin/env node

/**
 * API Connection Test Script
 * Tests the backend API connectivity and CORS configuration
 */

import http from 'http';
import https from 'https';

const API_BASE = 'http://localhost:3001';
const TEST_ENDPOINTS = [
  '/api/health',
  '/api/stocks', 
  '/api/watchlists',
  '/api/market-indices'
];

async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const url = `${API_BASE}${endpoint}`;
    console.log(`🔍 Testing: ${url}`);
    
    const startTime = Date.now();
    const req = http.get(url, (res) => {
      const duration = Date.now() - startTime;
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = {
          endpoint,
          status: res.statusCode,
          duration: `${duration}ms`,
          success: res.statusCode >= 200 && res.statusCode < 300,
          headers: res.headers,
          hasData: data.length > 0
        };
        
        console.log(`${result.success ? '✅' : '❌'} ${endpoint}: ${result.status} (${result.duration})`);
        if (result.success && result.hasData) {
          try {
            const json = JSON.parse(data);
            console.log(`   📊 Data: ${Array.isArray(json) ? `${json.length} items` : 'Object'}`);
          } catch {
            console.log(`   📊 Data: ${data.length} bytes`);
          }
        }
        
        resolve(result);
      });
    });
    
    req.on('error', (error) => {
      const duration = Date.now() - startTime;
      console.log(`❌ ${endpoint}: Error - ${error.message} (${duration}ms)`);
      resolve({
        endpoint,
        status: 0,
        duration: `${duration}ms`,
        success: false,
        error: error.message
      });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      console.log(`⏰ ${endpoint}: Timeout after 5s`);
      resolve({
        endpoint,
        status: 0,
        duration: '5000ms+',
        success: false,
        error: 'Timeout'
      });
    });
  });
}

async function testCORS() {
  return new Promise((resolve) => {
    console.log('\n🔒 Testing CORS configuration...');
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/health',
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    };
    
    const req = http.request(options, (res) => {
      const corsHeaders = {
        'access-control-allow-origin': res.headers['access-control-allow-origin'],
        'access-control-allow-credentials': res.headers['access-control-allow-credentials'],
        'access-control-allow-methods': res.headers['access-control-allow-methods'],
        'access-control-allow-headers': res.headers['access-control-allow-headers']
      };
      
      console.log('🔒 CORS Headers:', corsHeaders);
      
      const corsWorking = corsHeaders['access-control-allow-origin'] === 'http://localhost:3000' || 
                         corsHeaders['access-control-allow-origin'] === '*';
      
      console.log(`${corsWorking ? '✅' : '❌'} CORS: ${corsWorking ? 'Working' : 'Not configured properly'}`);
      
      resolve({ success: corsWorking, headers: corsHeaders });
    });
    
    req.on('error', (error) => {
      console.log(`❌ CORS test failed: ${error.message}`);
      resolve({ success: false, error: error.message });
    });
    
    req.end();
  });
}

async function main() {
  console.log('🚀 API Connection Test Starting...\n');
  console.log(`📍 Backend URL: ${API_BASE}`);
  console.log(`📍 Frontend URL: http://localhost:3000\n`);
  
  // Test basic server connectivity
  console.log('📡 Testing Backend Connectivity...');
  const results = [];
  
  for (const endpoint of TEST_ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
  }
  
  // Test CORS
  await testCORS();
  
  // Summary
  console.log('\n📊 Test Summary:');
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  
  if (successful === total) {
    console.log('\n🎉 All tests passed! Backend is ready.');
    console.log('💡 You can now start the frontend with: npm run frontend');
  } else {
    console.log('\n⚠️  Some tests failed. Check backend configuration.');
    console.log('💡 Make sure the backend is running: npm run backend');
  }
  
  // Configuration recommendations
  console.log('\n🔧 Configuration Status:');
  console.log('   📌 Frontend Port: 3000 (Vite)');
  console.log('   📌 Backend Port: 3001 (Express)');
  console.log('   📌 Proxy: /api/* -> http://localhost:3001');
  console.log('   📌 CORS: localhost:3000 allowed');
}

// Run the main function
main().catch(console.error);

export { testEndpoint, testCORS };