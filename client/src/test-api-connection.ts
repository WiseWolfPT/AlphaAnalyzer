// Test script to debug API connection issues
import { env } from './lib/env';

export async function testAPIConnection() {
  const apiUrl = env.VITE_API_URL || 'http://localhost:3001';
  console.log('🔍 Testing API connection to:', apiUrl);
  
  try {
    // Test the health endpoint first
    console.log('1️⃣ Testing /api/health endpoint...');
    const healthResponse = await fetch(`${apiUrl}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors',
    });
    
    console.log('Health response status:', healthResponse.status);
    console.log('Health response headers:', Object.fromEntries(healthResponse.headers.entries()));
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health check passed:', healthData);
    } else {
      console.error('❌ Health check failed:', healthResponse.status, healthResponse.statusText);
    }
    
    // Test the market-data/test endpoint
    console.log('\n2️⃣ Testing /api/market-data/test endpoint...');
    const testResponse = await fetch(`${apiUrl}/api/market-data/test`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors',
    });
    
    console.log('Test response status:', testResponse.status);
    
    if (testResponse.ok) {
      const testData = await testResponse.json();
      console.log('✅ Market data test passed:', testData);
    } else {
      console.error('❌ Market data test failed:', testResponse.status, testResponse.statusText);
      const errorText = await testResponse.text();
      console.error('Error response:', errorText);
    }
    
    // Test the batch quotes endpoint
    console.log('\n3️⃣ Testing /api/market-data/quotes/batch endpoint...');
    const batchResponse = await fetch(`${apiUrl}/api/market-data/quotes/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbols: ['AAPL'] }),
      mode: 'cors',
    });
    
    console.log('Batch response status:', batchResponse.status);
    
    if (batchResponse.ok) {
      const batchData = await batchResponse.json();
      console.log('✅ Batch quotes test passed:', batchData);
    } else {
      console.error('❌ Batch quotes test failed:', batchResponse.status, batchResponse.statusText);
      const errorText = await batchResponse.text();
      console.error('Error response:', errorText);
    }
    
  } catch (error) {
    console.error('🚨 Connection error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });
  }
}

// Run the test when this file is loaded
testAPIConnection();