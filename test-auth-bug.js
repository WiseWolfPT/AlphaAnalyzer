#!/usr/bin/env node

/**
 * Test script to reproduce the authentication bug
 * This tests the exact login flow that's failing
 */

import fetch from 'node-fetch';

const BASE_URL = 'https://128.140.45.28.sslip.io';

async function testLoginBug() {
  console.log('🔍 Testing authentication bug...');

  try {
    // Test 1: Direct login attempt (should fail with CSRF error)
    console.log('\n1. Testing direct login (reproducing the bug)...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': BASE_URL
      },
      body: JSON.stringify({
        email: 'alfalyzer@gmail.com',
        password: 'test-password',
        rememberMe: false
      })
    });

    const loginData = await loginResponse.text();
    console.log('Status:', loginResponse.status);
    console.log('Response:', loginData);

    if (loginResponse.status === 403 && loginData.includes('CSRF_TOKEN_MISSING')) {
      console.log('✅ Bug reproduced: CSRF protection blocking login');
    } else {
      console.log('❌ Unexpected response - bug may be different');
    }

    // Test 2: Get CSRF token first, then try login
    console.log('\n2. Testing login with CSRF token...');
    const csrfResponse = await fetch(`${BASE_URL}/api/csrf-token`, {
      headers: { 'Origin': BASE_URL }
    });

    if (csrfResponse.ok) {
      const csrfData = await csrfResponse.json();
      console.log('CSRF token obtained:', csrfData.csrfToken ? 'Yes' : 'No');

      // Try login with CSRF token
      const loginWithCsrfResponse = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': BASE_URL,
          'X-CSRF-Token': csrfData.csrfToken
        },
        body: JSON.stringify({
          email: 'alfalyzer@gmail.com',
          password: 'test-password',
          rememberMe: false
        })
      });

      const loginWithCsrfData = await loginWithCsrfResponse.text();
      console.log('Status with CSRF:', loginWithCsrfResponse.status);
      console.log('Response with CSRF:', loginWithCsrfData);
    } else {
      console.log('❌ Could not get CSRF token');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testLoginBug();