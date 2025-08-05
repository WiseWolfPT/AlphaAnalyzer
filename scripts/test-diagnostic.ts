#!/usr/bin/env tsx

console.log('🔍 Testing diagnostic endpoints...\n');

const BASE_URL = process.env.API_URL || 'http://localhost:3001';

async function testEndpoint(path: string, description: string) {
  console.log(`Testing ${description}...`);
  try {
    const response = await fetch(`${BASE_URL}${path}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${description}: SUCCESS`);
      console.log(`   Status: ${response.status}`);
      
      // Show key info based on endpoint
      if (path === '/api/health') {
        console.log(`   Server status: ${data.status}`);
      } else if (path === '/api/diagnostic' || path === '/api/diagnostic/minimal') {
        console.log(`   Environment: ${data.environment}`);
        console.log(`   Coolify: ${data.coolifyInfo?.IS_COOLIFY ? 'YES' : 'NO'}`);
        console.log(`   Configured APIs: ${data.summary?.configuredApis?.join(', ') || 'None'}`);
      } else if (path === '/api/diagnostic/test-connectivity') {
        console.log(`   Summary: ${data.summary}`);
      }
    } else {
      console.log(`❌ ${description}: FAILED`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${JSON.stringify(data)}`);
    }
  } catch (error: any) {
    console.log(`❌ ${description}: ERROR`);
    console.log(`   Error: ${error.message}`);
  }
  console.log('');
}

async function runTests() {
  console.log(`Testing against: ${BASE_URL}\n`);
  
  // Test all diagnostic endpoints
  await testEndpoint('/api/health', 'Health Check');
  await testEndpoint('/api/diagnostic', 'Full Diagnostic');
  await testEndpoint('/api/diagnostic/minimal', 'Minimal Diagnostic');
  await testEndpoint('/api/diagnostic/health', 'Diagnostic Health');
  await testEndpoint('/api/diagnostic/test-connectivity', 'Connectivity Test');
  
  console.log('✨ All tests completed!\n');
  
  // Show how to test on Coolify
  console.log('To test on Coolify, run:');
  console.log('API_URL=https://your-app.coolify.app npm run test:diagnostic');
}

runTests().catch(console.error);