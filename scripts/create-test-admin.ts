#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load production environment
dotenv.config({ path: resolve(process.cwd(), '.env.production') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Generate unique email with timestamp
const timestamp = Date.now();
const testEmail = `admin_test_${timestamp}@example.com`;
const testPassword = 'TestAdmin123!';

async function createTestAdmin() {
  try {
    console.log('🔧 Creating test admin user...');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);

    // Sign up new user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          role: 'admin',
          name: 'Test Admin',
          is_test: true
        },
        emailRedirectTo: 'https://128.140.45.28.sslip.io/find-stocks'
      }
    });

    if (signUpError) {
      console.error('❌ Sign up failed:', signUpError);
      return;
    }

    console.log('✅ Test admin created successfully!');
    console.log('User ID:', signUpData.user?.id);

    // Try to sign in immediately
    console.log('\n🔐 Testing immediate login...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signInError) {
      console.error('❌ Immediate login failed:', signInError.message);
      console.log('\n⚠️  This is expected if email confirmation is required.');
      console.log('Solutions:');
      console.log('1. Disable email confirmation in Supabase Dashboard');
      console.log('2. Or manually confirm the user in Dashboard');
    } else {
      console.log('✅ Login successful!');
      console.log('Session token:', signInData.session?.access_token ? '✅ Present' : '❌ Missing');
    }

    console.log('\n📋 Test Admin Credentials:');
    console.log('=====================================');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);
    console.log('Login URL: https://128.140.45.28.sslip.io/login');
    console.log('=====================================');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createTestAdmin();