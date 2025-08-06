import Redis from 'ioredis';

/**
 * Test Redis connection from external client
 * Simulates what the backend in Docker will do
 */

async function testRedisConnection() {
  console.log('🔧 Testing Redis connection to Hetzner...');
  
  const redis = new Redis({
    host: '128.140.45.28',
    port: 6379,
    password: '2P7DIlgngchzUQwEx7fLHgr0DOsdNU1y+Q6M8s5L8Js=',
    connectTimeout: 5000,
    commandTimeout: 3000,
  });

  try {
    // Test 1: Ping
    console.log('\n📍 Test 1: Ping');
    const pong = await redis.ping();
    console.log('✅ Ping response:', pong);

    // Test 2: Set a value
    console.log('\n📍 Test 2: Set value');
    await redis.set('test:key', JSON.stringify({ test: true, timestamp: Date.now() }));
    console.log('✅ Value set successfully');

    // Test 3: Get the value
    console.log('\n📍 Test 3: Get value');
    const value = await redis.get('test:key');
    console.log('✅ Retrieved value:', value);

    // Test 4: Set with TTL
    console.log('\n📍 Test 4: Set with TTL (5 seconds)');
    await redis.setex('test:ttl', 5, 'This will expire in 5 seconds');
    console.log('✅ TTL value set');

    // Test 5: Check TTL
    console.log('\n📍 Test 5: Check TTL');
    const ttl = await redis.ttl('test:ttl');
    console.log(`✅ TTL remaining: ${ttl} seconds`);

    // Test 6: Delete
    console.log('\n📍 Test 6: Delete key');
    await redis.del('test:key');
    console.log('✅ Key deleted');

    // Test 7: Memory info
    console.log('\n📍 Test 7: Memory info');
    const info = await redis.info('memory');
    const memMatch = info.match(/used_memory_human:(.+)/);
    if (memMatch) {
      console.log(`✅ Memory used: ${memMatch[1]}`);
    }

    console.log('\n🎉 All tests passed! Redis is working correctly!');
    console.log('📊 The backend in Coolify should now be able to connect.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await redis.quit();
    console.log('\n👋 Connection closed');
  }
}

// Run the test
testRedisConnection().catch(console.error);