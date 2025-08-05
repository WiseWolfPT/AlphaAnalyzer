// Check which routes are loaded on the backend
import fetch from 'node-fetch';

const API_BASE_URL = process.env.COOLIFY_API_URL || 'https://grateful-sana-alfalyzer-5d8d2f74.coolify.app';

async function checkRoutesLoaded() {
  console.log('🔍 Checking loaded routes on backend');
  console.log(`📍 API URL: ${API_BASE_URL}`);
  console.log('');

  // Test if diagnostic endpoint exists
  console.log('1️⃣ Testing /api/diagnostic/routes');
  try {
    const response = await fetch(`${API_BASE_URL}/api/diagnostic/routes`);
    const text = await response.text();
    
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200) {
      try {
        const data = JSON.parse(text);
        console.log(`   Routes found: ${data.routes?.length || 0}`);
        
        // Check for cached routes
        const cachedRoutes = data.routes?.filter(r => r.path?.includes('/cached')) || [];
        console.log(`   Cached routes: ${cachedRoutes.length}`);
        
        if (cachedRoutes.length > 0) {
          console.log('   Cached route paths:');
          cachedRoutes.forEach(r => console.log(`     - ${r.method} ${r.path}`));
        }
      } catch (parseError) {
        console.log('   Response is not JSON:', text.substring(0, 100));
      }
    } else {
      console.log('   Response:', text.substring(0, 200));
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
  console.log('');

  // Direct test of cached endpoint
  console.log('2️⃣ Direct test of /api/cached/stats');
  try {
    const response = await fetch(`${API_BASE_URL}/api/cached/stats`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    const text = await response.text();
    if (text.startsWith('<!DOCTYPE')) {
      console.log('   ❌ Received HTML instead of JSON (route not found)');
    } else {
      console.log('   Response:', text.substring(0, 100));
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
}

checkRoutesLoaded().catch(console.error);