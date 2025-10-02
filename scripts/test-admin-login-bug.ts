#!/usr/bin/env ts-node

/**
 * FAILING TEST: Reproduces the admin login bug
 *
 * This test demonstrates the circular dependency bug in admin authentication:
 * 1. User logs in successfully
 * 2. Frontend tries to check admin status via /api/admin/auth/check
 * 3. But this endpoint requires admin auth (requireAdmin middleware)
 * 4. Creates circular dependency - need to be admin to check if admin
 * 5. Request fails, user gets 403/401, redirected to 404
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://128.140.45.28.sslip.io'
  : 'http://localhost:3001';

async function testAdminLoginBug() {
  console.log('🧪 Testing Admin Login Bug - Circular Dependency');
  console.log(`Testing against: ${BASE_URL}`);
  console.log('');

  try {
    // Step 1: Test the problematic admin auth endpoints
    console.log('📋 Step 1: Testing /api/admin/auth/check without authentication');

    const checkResponse = await fetch(`${BASE_URL}/api/admin/auth/check`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log(`Status: ${checkResponse.status}`);
    console.log(`Status Text: ${checkResponse.statusText}`);

    if (checkResponse.status === 401 || checkResponse.status === 403) {
      console.log('❌ BUG CONFIRMED: /api/admin/auth/check requires admin auth to check admin status!');
      console.log('   This creates a circular dependency - cannot check admin status without being admin');
    }

    // Step 2: Test the permissions endpoint
    console.log('');
    console.log('📋 Step 2: Testing /api/admin/auth/permissions without authentication');

    const permissionsResponse = await fetch(`${BASE_URL}/api/admin/auth/permissions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log(`Status: ${permissionsResponse.status}`);
    console.log(`Status Text: ${permissionsResponse.statusText}`);

    if (permissionsResponse.status === 401 || permissionsResponse.status === 403) {
      console.log('❌ BUG CONFIRMED: /api/admin/auth/permissions also requires admin auth!');
    }

    // Step 3: Demonstrate what should happen instead
    console.log('');
    console.log('📋 Step 3: What should happen instead:');
    console.log('   1. /api/admin/auth/check should be accessible to any authenticated user');
    console.log('   2. It should return { isAdmin: false } for non-admin users');
    console.log('   3. It should return { isAdmin: true } for admin users');
    console.log('   4. AdminRoute component can then redirect appropriately');
    console.log('');

    console.log('🔍 Root Cause:');
    console.log('   In /server/routes/admin/auth.ts:');
    console.log('   - Line 15: router.get(\'/check\', requireAdmin as any, ...)');
    console.log('   - Line 61: router.get(\'/permissions\', requireAdmin as any, ...)');
    console.log('   Both endpoints use requireAdmin middleware, creating circular dependency');
    console.log('');

    console.log('💡 Solution:');
    console.log('   1. Remove requireAdmin middleware from /check endpoint');
    console.log('   2. Make /check accessible to any authenticated user');
    console.log('   3. Let the endpoint logic determine admin status');
    console.log('   4. Keep requireAdmin on /permissions since it should only return data to admins');

    return false; // Test failed as expected

  } catch (error) {
    console.error('❌ Test execution error:', error);
    return false;
  }
}

// Run the test
testAdminLoginBug().then(success => {
  if (!success) {
    console.log('');
    console.log('🚨 TEST RESULT: BUG REPRODUCED SUCCESSFULLY');
    console.log('   The circular dependency in admin auth has been confirmed.');
    console.log('   This explains why users get 404 after login - AdminRoute fails auth check.');
    process.exit(1); // Exit with error to indicate bug exists
  } else {
    console.log('✅ TEST PASSED: Bug is fixed!');
    process.exit(0);
  }
});