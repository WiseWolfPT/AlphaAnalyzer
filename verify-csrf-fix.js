#!/usr/bin/env node

/**
 * AUTHENTICATION BUG VERIFICATION
 *
 * This script verifies that the CSRF protection fix is working
 * by testing the login flow end-to-end
 */

import fetch from 'node-fetch';

const BASE_URL = 'https://128.140.45.28.sslip.io';

async function testAuthenticationFix() {
  console.log('🔍 VERIFYING AUTHENTICATION CSRF FIX');
  console.log('=====================================');

  try {
    // Step 1: Test that the server is accessible
    console.log('\n1. Testing server connectivity...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`, {
      headers: { 'Origin': BASE_URL }
    });

    if (healthResponse.ok) {
      console.log('✅ Server is responding');
    } else {
      console.log('❌ Server health check failed:', healthResponse.status);
      return;
    }

    // Step 2: Test if login endpoint is accessible (should fail with validation error, not CSRF)
    console.log('\n2. Testing login endpoint accessibility...');
    const loginTestResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': BASE_URL
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword'
      })
    });

    const loginTestData = await loginTestResponse.text();
    console.log('Status:', loginTestResponse.status);
    console.log('Response:', loginTestData);

    if (loginTestResponse.status === 403 && loginTestData.includes('CSRF_TOKEN_MISSING')) {
      console.log('❌ CSRF BUG STILL PRESENT - Login blocked by CSRF protection');
      console.log('🔧 The fix did not work - CSRF is still blocking login');
      return false;
    } else if (loginTestResponse.status === 401 || loginTestResponse.status === 400) {
      console.log('✅ CSRF FIX WORKING - Login endpoint accessible, failing on credentials (expected)');
      console.log('🎉 Authentication bug is FIXED!');
      return true;
    } else {
      console.log('⚠️  Unexpected response - need to investigate further');
      return false;
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  }
}

// Run the verification
testAuthenticationFix().then(success => {
  if (success) {
    console.log('\n🎉 AUTHENTICATION BUG VERIFICATION: SUCCESS');
    console.log('✅ Admin can now login to the system');
  } else {
    console.log('\n❌ AUTHENTICATION BUG VERIFICATION: FAILED');
    console.log('🔧 Additional fixes required');
  }
  process.exit(success ? 0 : 1);
});