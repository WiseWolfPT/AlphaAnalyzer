#!/usr/bin/env node

/**
 * CORS Test Script
 * Usage: node scripts/test-cors.js [backend-url] [frontend-origin]
 * Example: node scripts/test-cors.js https://your-backend.koyeb.app https://alphaanalyzer.vercel.app
 */

const https = require('https');
const http = require('http');

const backendUrl = process.argv[2] || 'http://localhost:3001';
const frontendOrigin = process.argv[3] || 'https://alphaanalyzer.vercel.app';

console.log('🔍 Testing CORS Configuration');
console.log(`   Backend: ${backendUrl}`);
console.log(`   Origin: ${frontendOrigin}`);
console.log('');

// Parse URL
const url = new URL(`${backendUrl}/api/cors-test`);
const protocol = url.protocol === 'https:' ? https : http;

// Test 1: Simple GET request
console.log('📋 Test 1: Simple GET request');
const getOptions = {
  hostname: url.hostname,
  port: url.port,
  path: url.pathname,
  method: 'GET',
  headers: {
    'Origin': frontendOrigin,
    'User-Agent': 'CORS-Test-Script/1.0'
  }
};

const getReq = protocol.request(getOptions, (res) => {
  console.log(`   Status: ${res.statusCode}`);
  console.log('   Headers:');
  console.log(`   - Access-Control-Allow-Origin: ${res.headers['access-control-allow-origin'] || 'NOT SET'}`);
  console.log(`   - Access-Control-Allow-Credentials: ${res.headers['access-control-allow-credentials'] || 'NOT SET'}`);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log(`   Response: ${json.message || 'OK'}`);
    } catch (e) {
      console.log(`   Response: ${data.substring(0, 100)}`);
    }
    console.log('');
    
    // Test 2: Preflight OPTIONS request
    testPreflight();
  });
});

getReq.on('error', (e) => {
  console.error(`   ❌ Error: ${e.message}`);
  process.exit(1);
});

getReq.end();

function testPreflight() {
  console.log('📋 Test 2: Preflight OPTIONS request');
  
  const optionsReq = protocol.request({
    ...getOptions,
    method: 'OPTIONS',
    headers: {
      'Origin': frontendOrigin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,authorization'
    }
  }, (res) => {
    console.log(`   Status: ${res.statusCode}`);
    console.log('   CORS Headers:');
    console.log(`   - Allow-Origin: ${res.headers['access-control-allow-origin'] || 'NOT SET'}`);
    console.log(`   - Allow-Methods: ${res.headers['access-control-allow-methods'] || 'NOT SET'}`);
    console.log(`   - Allow-Headers: ${res.headers['access-control-allow-headers'] || 'NOT SET'}`);
    console.log(`   - Max-Age: ${res.headers['access-control-max-age'] || 'NOT SET'}`);
    console.log('');
    
    // Test 3: POST request
    testPost();
  });
  
  optionsReq.on('error', (e) => {
    console.error(`   ❌ Error: ${e.message}`);
  });
  
  optionsReq.end();
}

function testPost() {
  console.log('📋 Test 3: POST request with JSON');
  
  const postData = JSON.stringify({ test: 'data', timestamp: new Date().toISOString() });
  
  const postReq = protocol.request({
    ...getOptions,
    method: 'POST',
    headers: {
      'Origin': frontendOrigin,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, (res) => {
    console.log(`   Status: ${res.statusCode}`);
    console.log(`   CORS Origin: ${res.headers['access-control-allow-origin'] || 'NOT SET'}`);
    
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log(`   Response: ${json.message || 'OK'}`);
      } catch (e) {
        console.log(`   Response: ${data.substring(0, 100)}`);
      }
      console.log('');
      console.log('✅ CORS tests completed!');
      
      // Summary
      console.log('\n📊 Summary:');
      console.log('   If all tests show proper CORS headers, your configuration is working.');
      console.log('   If you see "NOT SET" for CORS headers, check your backend configuration.');
      console.log('\n💡 Debug tips:');
      console.log('   1. Check Koyeb logs for CORS debug messages');
      console.log('   2. Ensure NODE_ENV=production is set in Koyeb');
      console.log('   3. Verify your frontend URL matches the origin patterns');
    });
  });
  
  postReq.on('error', (e) => {
    console.error(`   ❌ Error: ${e.message}`);
  });
  
  postReq.write(postData);
  postReq.end();
}