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

console.log('🔧 Connecting to Supabase...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupAdmin() {
  try {
    // Step 1: Try to sign up the admin user
    console.log('\n📝 Creating admin account...');

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: 'alfalyzer@gmail.com',
      password: 'Admin2025!@#',
      options: {
        data: {
          role: 'admin',
          name: 'Admin User'
        }
      }
    });

    if (signUpError) {
      if (signUpError.message?.includes('already registered')) {
        console.log('⚠️  User already exists, trying to sign in...');

        // Try to sign in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: 'alfalyzer@gmail.com',
          password: 'Admin2025!@#'
        });

        if (signInError) {
          console.error('❌ Sign in failed:', signInError.message);
          console.log('\n💡 Possible solutions:');
          console.log('1. Reset password at: https://128.140.45.28.sslip.io/auth/forgot-password');
          console.log('2. Check if email is confirmed in Supabase Dashboard');
          console.log('3. Update password directly in Supabase Dashboard → Authentication → Users');
        } else {
          console.log('✅ Sign in successful!');
          console.log('User ID:', signInData.user?.id);
          console.log('Email confirmed:', signInData.user?.confirmed_at ? 'Yes' : 'No');
          console.log('User metadata:', signInData.user?.user_metadata);
        }
      } else {
        throw signUpError;
      }
    } else {
      console.log('✅ Admin user created successfully!');
      console.log('User ID:', signUpData.user?.id);
      console.log('⚠️  Note: Email confirmation may be required. Check your email or confirm in Supabase Dashboard.');
    }

    console.log('\n📋 Summary:');
    console.log('=====================================');
    console.log('Admin Email: alfalyzer@gmail.com');
    console.log('Password: Admin2025!@#');
    console.log('Login URL: https://128.140.45.28.sslip.io/login');
    console.log('=====================================');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setupAdmin();