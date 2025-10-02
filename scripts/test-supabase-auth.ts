#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment
dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

console.log('🔧 Connecting to Supabase...');
console.log('URL:', supabaseUrl);
console.log('Project Ref: avjnfessefxtfurayybp');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testAuth() {
  try {
    console.log('\n📋 Testing Supabase Auth Configuration...');

    // 1. List all users
    console.log('\n1. Getting all users...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('❌ Error listing users:', usersError);
    } else {
      console.log(`✅ Found ${users.users.length} users`);

      // Find admin user
      const adminUser = users.users.find(u => u.email === 'alfalyzer@gmail.com');
      if (adminUser) {
        console.log('\n📧 Admin User Found:');
        console.log('- ID:', adminUser.id);
        console.log('- Email:', adminUser.email);
        console.log('- Confirmed:', adminUser.confirmed_at ? 'Yes' : 'No');
        console.log('- Role:', adminUser.user_metadata?.role || 'user');
        console.log('- Last Sign In:', adminUser.last_sign_in_at);

        // Update password directly (no special characters for MCP compatibility)
        console.log('\n🔐 Resetting admin password...');
        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
          adminUser.id,
          {
            password: 'Admin2025SecurePass',
            email_confirm: true
          }
        );

        if (updateError) {
          console.error('❌ Error updating password:', updateError);
        } else {
          console.log('✅ Password reset successfully!');
        }

        // Update user metadata to ensure admin role
        console.log('\n🛡️ Updating user role...');
        const { data: roleData, error: roleError } = await supabase.auth.admin.updateUserById(
          adminUser.id,
          {
            user_metadata: {
              role: 'admin',
              name: 'Admin User'
            }
          }
        );

        if (roleError) {
          console.error('❌ Error updating role:', roleError);
        } else {
          console.log('✅ Admin role confirmed!');
        }
      } else {
        console.log('⚠️ Admin user not found, creating...');

        // Create admin user (no special characters for MCP compatibility)
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: 'alfalyzer@gmail.com',
          password: 'Admin2025SecurePass',
          email_confirm: true,
          user_metadata: {
            role: 'admin',
            name: 'Admin User'
          }
        });

        if (createError) {
          console.error('❌ Error creating user:', createError);
        } else {
          console.log('✅ Admin user created!');
          console.log('User ID:', newUser.user?.id);
        }
      }
    }

    // 2. Test redirect URLs
    console.log('\n🔗 Checking redirect URL configuration...');
    console.log('Production URL: https://128.140.45.28.sslip.io');
    console.log('Password Reset URL: https://128.140.45.28.sslip.io/auth/reset-password');

    console.log('\n📌 Important: Make sure these URLs are added in Supabase Dashboard:');
    console.log('1. Go to Authentication → URL Configuration');
    console.log('2. Add to Site URL: https://128.140.45.28.sslip.io');
    console.log('3. Add to Redirect URLs:');
    console.log('   - https://128.140.45.28.sslip.io/**');
    console.log('   - https://128.140.45.28.sslip.io/auth/reset-password');

    console.log('\n✅ Setup Complete!');
    console.log('=====================================');
    console.log('Admin Credentials:');
    console.log('Email: alfalyzer@gmail.com');
    console.log('Password: Admin2025SecurePass');
    console.log('Login URL: https://128.140.45.28.sslip.io/login');
    console.log('=====================================');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testAuth();