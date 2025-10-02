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
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  try {
    console.log('\n🔐 Testing login with admin credentials...');

    // Try signing in directly
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'alfalyzer@gmail.com',
      password: 'Admin2025!@#'
    });

    if (error) {
      console.error('❌ Login failed:', error.message);
      console.error('Error code:', error.status);
      console.error('Full error:', JSON.stringify(error, null, 2));

      if (error.message.includes('Email not confirmed')) {
        console.log('\n⚠️  Email needs confirmation!');
        console.log('Please check your email or confirm the user in Supabase Dashboard:');
        console.log('1. Go to Supabase Dashboard → Authentication → Users');
        console.log('2. Find user: alfalyzer@gmail.com');
        console.log('3. Click on the user and confirm email manually');
      }
    } else {
      console.log('✅ Login successful!');
      console.log('User ID:', data.user?.id);
      console.log('Email:', data.user?.email);
      console.log('Confirmed at:', data.user?.confirmed_at);
      console.log('Role:', data.user?.user_metadata?.role || 'user');
      console.log('Access token:', data.session?.access_token ? '✅ Present' : '❌ Missing');

      // Check if user has admin role
      if (data.user?.user_metadata?.role === 'admin') {
        console.log('✅ User has admin role!');
      } else {
        console.log('⚠️  User does not have admin role in metadata');
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testLogin();