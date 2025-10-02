#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.production' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  try {
    console.log('Creating admin user...');

    // Create user with admin role
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'alfalyzer@gmail.com',
      password: 'Admin2025!@#',
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        name: 'Admin User'
      }
    });

    if (authError) {
      // If user exists, try to update
      if (authError.message?.includes('already been registered')) {
        console.log('User already exists, updating metadata...');

        // Get user by email
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;

        const existingUser = users.users.find(u => u.email === 'alfalyzer@gmail.com');
        if (existingUser) {
          // Update user metadata
          const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            {
              user_metadata: {
                role: 'admin',
                name: 'Admin User'
              }
            }
          );

          if (updateError) throw updateError;
          console.log('✅ Admin user metadata updated successfully!');
          console.log('User ID:', existingUser.id);

          // Reset password to ensure it's correct
          const { error: resetError } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            {
              password: 'Admin2025!@#'
            }
          );

          if (resetError) {
            console.error('Error resetting password:', resetError);
          } else {
            console.log('✅ Password reset successfully!');
          }
        }
      } else {
        throw authError;
      }
    } else {
      console.log('✅ Admin user created successfully!');
      console.log('User ID:', authData.user?.id);
    }

    console.log('\n📝 Admin Login Credentials:');
    console.log('Email: alfalyzer@gmail.com');
    console.log('Password: Admin2025!@#');
    console.log('\n🔐 You can now login at: https://128.140.45.28.sslip.io/login');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createAdminUser();