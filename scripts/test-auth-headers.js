#!/usr/bin/env node

/**
 * Test script to verify auth header workaround
 * Usage: node scripts/test-auth-headers.js [environment]
 * Environment: development | production
 */

const https = require('https');
const http = require('http');

const environments = {
  development: {
    hostname: 'localhost',
    port: 3001,
    protocol: 'http:',
  },
  production: {
    hostname: 'jsg00k40sgo0k4swsoc4gcsg.128.140.45.28.sslip.io',
    port: 80,
    protocol: 'http:',
  },
};

const testToken = 'test-token-12345';

async function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const client = options.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function testAuthHeaders(env = 'development') {
  const config = environments[env];
  
  if (!config) {
    console.error(`❌ Invalid environment: ${env}`);
    console.log('Valid environments: development, production');
    return;
  }
  
  console.log(`\n🧪 Testing Auth Headers in ${env.toUpperCase()} environment`);
  console.log(`📍 Target: ${config.protocol}//${config.hostname}:${config.port}`);
  console.log('━'.repeat(50));
  
  // Test 1: Authorization header
  console.log('\n1️⃣ Testing Authorization header:');
  try {
    const authOptions = {
      hostname: config.hostname,
      port: config.port,
      path: '/api/market-data/health',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json',
      },
    };
    
    const authResult = await makeRequest(authOptions);
    console.log(`   Status: ${authResult.statusCode}`);
    console.log(`   Response: ${authResult.data.substring(0, 100)}...`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  // Test 2: X-Auth-Token header
  console.log('\n2️⃣ Testing X-Auth-Token header:');
  try {
    const xAuthOptions = {
      hostname: config.hostname,
      port: config.port,
      path: '/api/market-data/health',
      method: 'GET',
      headers: {
        'X-Auth-Token': `Bearer ${testToken}`,
        'Content-Type': 'application/json',
      },
    };
    
    const xAuthResult = await makeRequest(xAuthOptions);
    console.log(`   Status: ${xAuthResult.statusCode}`);
    console.log(`   Response: ${xAuthResult.data.substring(0, 100)}...`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  // Test 3: No auth header
  console.log('\n3️⃣ Testing without auth header:');
  try {
    const noAuthOptions = {
      hostname: config.hostname,
      port: config.port,
      path: '/api/market-data/health',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    const noAuthResult = await makeRequest(noAuthOptions);
    console.log(`   Status: ${noAuthResult.statusCode}`);
    console.log(`   Response: ${noAuthResult.data.substring(0, 100)}...`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  console.log('\n' + '━'.repeat(50));
  console.log('✅ Auth header tests completed');
  
  // Summary
  console.log('\n📊 Summary:');
  console.log('- Authorization header: Used in development');
  console.log('- X-Auth-Token header: Used in Vercel production');
  console.log('- Both headers should be accepted by the backend');
}

// Run the test
const environment = process.argv[2] || 'development';
testAuthHeaders(environment).catch(console.error);