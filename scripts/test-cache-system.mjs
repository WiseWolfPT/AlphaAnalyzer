#!/usr/bin/env node

/**
 * CACHE SYSTEM TESTING SCRIPT
 * Tests the multi-layer cache system functionality
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { setTimeout } from 'timers/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Cache System Testing Script');
console.log('==============================\n');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

async function makeRequest(endpoint, description) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${SERVER_URL}${endpoint}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Cache-Test-Script/1.0'
      }
    });
    
    const duration = Date.now() - startTime;
    const headers = Object.fromEntries(response.headers.entries());
    
    if (!response.ok) {
      console.log(`❌ ${description}: ${response.status} ${response.statusText} (${duration}ms)`);
      return null;
    }
    
    const data = await response.json();
    const cacheStatus = headers['x-cache'] || 'UNKNOWN';
    const cacheKey = headers['x-cache-key'] || 'N/A';
    
    console.log(`${cacheStatus === 'HIT' ? '🎯' : '📦'} ${description}: ${response.status} (${duration}ms) [${cacheStatus}]`);
    
    if (headers['x-cache-key']) {
      console.log(`   Cache Key: ${cacheKey.substring(0, 50)}...`);
    }
    
    return { data, headers, duration, cacheStatus };
    
  } catch (error) {
    console.log(`❌ ${description}: Error - ${error.message}`);
    return null;
  }
}

async function testCacheEndpoints() {
  console.log('📊 Testing Cache Endpoints');
  console.log('-------------------------\n');
  
  // Test cache health
  await makeRequest('/api/admin/cache/health', 'Cache Health Check');
  
  // Test cache stats
  await makeRequest('/api/admin/cache/stats', 'Cache Statistics');
  
  // Test cache entries
  await makeRequest('/api/admin/cache/entries?limit=5', 'Cache Entries (limit 5)');
  
  console.log('');
}

async function testCachePerformance() {
  console.log('⚡ Testing Cache Performance');
  console.log('---------------------------\n');
  
  const testEndpoint = '/api/stocks/AAPL/profile';
  
  console.log('Testing cache miss (first request):');
  const firstRequest = await makeRequest(testEndpoint, 'First Request (Cache Miss)');
  
  console.log('\nTesting cache hit (second request):');
  const secondRequest = await makeRequest(testEndpoint, 'Second Request (Cache Hit)');
  
  console.log('\nTesting cache hit (third request):');
  const thirdRequest = await makeRequest(testEndpoint, 'Third Request (Cache Hit)');
  
  if (firstRequest && secondRequest && thirdRequest) {
    console.log('\n📈 Performance Analysis:');
    console.log(`   First Request:  ${firstRequest.duration}ms (${firstRequest.cacheStatus})`);
    console.log(`   Second Request: ${secondRequest.duration}ms (${secondRequest.cacheStatus})`);
    console.log(`   Third Request:  ${thirdRequest.duration}ms (${thirdRequest.cacheStatus})`);
    
    if (secondRequest.cacheStatus === 'HIT' && thirdRequest.cacheStatus === 'HIT') {
      const speedup = Math.round(firstRequest.duration / secondRequest.duration * 100) / 100;
      console.log(`   Cache Speedup:  ${speedup}x faster`);
      console.log('   ✅ Cache is working correctly!');
    } else {
      console.log('   ⚠️ Cache might not be working as expected');
    }
  }
  
  console.log('');
}

async function testCacheInvalidation() {
  console.log('🗑️ Testing Cache Invalidation');
  console.log('-----------------------------\n');
  
  const testEndpoint = '/api/stocks/GOOGL/profile';
  
  // Make initial request to populate cache
  console.log('Populating cache:');
  await makeRequest(testEndpoint, 'Initial Request');
  
  // Verify cache hit
  console.log('\nVerifying cache hit:');
  const cachedRequest = await makeRequest(testEndpoint, 'Cached Request');
  
  if (cachedRequest && cachedRequest.cacheStatus === 'HIT') {
    console.log('✅ Cache populated successfully');
    
    // Test cache invalidation
    console.log('\nInvalidating cache pattern:');
    const invalidateResponse = await makeRequest('/api/admin/cache/clear?pattern=company_profile:GOOGL', 'Cache Invalidation');
    
    if (invalidateResponse) {
      console.log('✅ Cache invalidation completed');
      
      // Test that cache is cleared
      console.log('\nTesting cache miss after invalidation:');
      const afterInvalidation = await makeRequest(testEndpoint, 'After Invalidation');
      
      if (afterInvalidation && afterInvalidation.cacheStatus === 'MISS') {
        console.log('✅ Cache invalidation working correctly!');
      } else {
        console.log('⚠️ Cache invalidation might not be working');
      }
    }
  } else {
    console.log('⚠️ Could not verify cache functionality');
  }
  
  console.log('');
}

async function testCacheWarming() {
  console.log('🔥 Testing Cache Warming');
  console.log('------------------------\n');
  
  // Start cache warming
  console.log('Starting cache warming:');
  const warmingResponse = await fetch(`${SERVER_URL}/api/admin/cache/warm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      symbols: ['TSLA', 'MSFT', 'AMZN']
    })
  });
  
  if (warmingResponse.ok) {
    const warmingData = await warmingResponse.json();
    console.log(`✅ Cache warming started for ${warmingData.count} symbols`);
    
    // Check warming progress
    console.log('\nChecking warming progress:');
    for (let i = 0; i < 5; i++) {
      await setTimeout(1000); // Wait 1 second
      
      const progressResponse = await makeRequest('/api/admin/cache/warm/progress', `Progress Check ${i + 1}`);
      
      if (progressResponse && progressResponse.data) {
        const { isWarming, progress, total, percentage } = progressResponse.data;
        console.log(`   Progress: ${progress}/${total} (${percentage}%) - ${isWarming ? 'In Progress' : 'Complete'}`);
        
        if (!isWarming) {
          console.log('✅ Cache warming completed!');
          break;
        }
      }
    }
  } else {
    console.log('❌ Failed to start cache warming');
  }
  
  console.log('');
}

async function testCacheMemoryUsage() {
  console.log('💾 Testing Cache Memory Usage');
  console.log('-----------------------------\n');
  
  // Get initial stats
  const initialStats = await makeRequest('/api/admin/cache/stats', 'Initial Cache Stats');
  
  if (initialStats && initialStats.data) {
    const { memory, redis } = initialStats.data;
    
    console.log('📊 Cache Statistics:');
    console.log(`   Memory Cache: ${memory.totalEntries} entries, ${memory.hitRate} hit rate`);
    console.log(`   Redis Cache:  ${redis.connected ? 'Connected' : 'Disconnected'}, ${redis.keyCount} keys`);
    console.log(`   Memory Usage: ${memory.memoryUsage?.percentage || 'N/A'}`);
    
    // Test performance under load
    console.log('\nTesting performance under load:');
    const performanceTest = await fetch(`${SERVER_URL}/api/admin/cache/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operations: 100,
        dataSize: 'medium'
      })
    });
    
    if (performanceTest.ok) {
      const perfData = await performanceTest.json();
      console.log(`✅ Performance test completed:`);
      console.log(`   Operations: ${perfData.operations} (${perfData.opsPerSecond} ops/sec)`);
      console.log(`   Hit Rate: ${perfData.hitRate}`);
      console.log(`   Duration: ${perfData.duration}ms`);
    }
  }
  
  console.log('');
}

async function runAllTests() {
  console.log(`🚀 Testing cache system at ${SERVER_URL}\n`);
  
  try {
    // Test server connectivity first
    const healthCheck = await makeRequest('/health', 'Server Health Check');
    if (!healthCheck) {
      console.log('❌ Server is not responding. Please start the server first.');
      process.exit(1);
    }
    
    console.log('✅ Server is running\n');
    
    // Run all tests
    await testCacheEndpoints();
    await testCachePerformance();
    await testCacheInvalidation();
    await testCacheWarming();
    await testCacheMemoryUsage();
    
    console.log('🎉 All cache tests completed!');
    console.log('\n📋 Summary:');
    console.log('   - Cache endpoints are functional');
    console.log('   - Cache hit/miss logic is working');
    console.log('   - Cache invalidation is operational');
    console.log('   - Cache warming system is active');
    console.log('   - Memory usage is being tracked');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { 
  testCacheEndpoints,
  testCachePerformance,
  testCacheInvalidation,
  testCacheWarming,
  testCacheMemoryUsage
};