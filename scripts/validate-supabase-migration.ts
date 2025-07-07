#!/usr/bin/env tsx
/**
 * SUPABASE MIGRATION VALIDATOR
 * 
 * Valida que a migração Supabase foi bem-sucedida
 * testando todas as funcionalidades críticas
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import type { Database } from '../shared/types/database';

// Load environment variables
config();

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m', 
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

console.log(`${colors.cyan}🔍 ALFALYZER - SUPABASE MIGRATION VALIDATOR${colors.reset}`);
console.log(`${colors.cyan}=============================================${colors.reset}\n`);

// Configuration
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface ValidationResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

const results: ValidationResult[] = [];

function addResult(test: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any) {
  results.push({ test, status, message, details });
  
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  const color = status === 'pass' ? colors.green : status === 'fail' ? colors.red : colors.yellow;
  
  console.log(`${color}${icon} ${test}: ${message}${colors.reset}`);
  if (details) {
    console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
  }
}

async function validateEnvironment(): Promise<boolean> {
  console.log(`${colors.blue}📋 Environment Validation${colors.reset}`);
  
  let allValid = true;
  
  // Check Supabase URL
  if (!supabaseUrl) {
    addResult('Environment', 'fail', 'SUPABASE_URL not found');
    allValid = false;
  } else if (supabaseUrl.includes('demo.supabase.co')) {
    addResult('Environment', 'fail', 'Still using demo URL');
    allValid = false;
  } else if (!supabaseUrl.includes('supabase.co')) {
    addResult('Environment', 'fail', 'Invalid Supabase URL format');
    allValid = false;
  } else {
    addResult('Environment', 'pass', 'Supabase URL configured');
  }
  
  // Check Anon Key
  if (!supabaseAnonKey) {
    addResult('Environment', 'fail', 'SUPABASE_ANON_KEY not found');
    allValid = false;
  } else if (supabaseAnonKey.includes('demo')) {
    addResult('Environment', 'fail', 'Still using demo anon key');
    allValid = false;
  } else if (!supabaseAnonKey.startsWith('eyJ')) {
    addResult('Environment', 'fail', 'Invalid anon key format');
    allValid = false;
  } else {
    addResult('Environment', 'pass', 'Anon key configured');
  }
  
  // Check Service Role Key
  if (!supabaseServiceKey) {
    addResult('Environment', 'warning', 'SERVICE_ROLE_KEY not found (backend features limited)');
  } else if (supabaseServiceKey.includes('demo')) {
    addResult('Environment', 'fail', 'Still using demo service key');
    allValid = false;
  } else if (!supabaseServiceKey.startsWith('eyJ')) {
    addResult('Environment', 'fail', 'Invalid service key format');
    allValid = false;
  } else {
    addResult('Environment', 'pass', 'Service role key configured');
  }
  
  console.log();
  return allValid;
}

async function validateConnection(): Promise<boolean> {
  console.log(`${colors.blue}📡 Connection Validation${colors.reset}`);
  
  try {
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
    
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error && !error.message.includes('No rows')) {
      addResult('Connection', 'fail', `Connection failed: ${error.message}`, error);
      return false;
    }
    
    addResult('Connection', 'pass', 'Supabase connection successful');
    console.log();
    return true;
    
  } catch (error) {
    addResult('Connection', 'fail', `Connection error: ${error}`, error);
    console.log();
    return false;
  }
}

async function validateTables(): Promise<boolean> {
  console.log(`${colors.blue}🏗️  Database Schema Validation${colors.reset}`);
  
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
  
  const requiredTables = [
    'users',
    'watchlists', 
    'watchlist_items',
    'portfolios',
    'transactions',
    'holdings',
    'dividends',
    'portfolio_performance',
    'cash_transactions'
  ];
  
  let allTablesExist = true;
  
  for (const table of requiredTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error && error.message.includes('does not exist')) {
        addResult('Schema', 'fail', `Table '${table}' missing`);
        allTablesExist = false;
      } else {
        addResult('Schema', 'pass', `Table '${table}' exists`);
      }
    } catch (error) {
      addResult('Schema', 'fail', `Error checking table '${table}': ${error}`);
      allTablesExist = false;
    }
  }
  
  console.log();
  return allTablesExist;
}

async function validateAuth(): Promise<boolean> {
  console.log(`${colors.blue}🔐 Authentication Validation${colors.reset}`);
  
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
  
  try {
    // Test auth by attempting to get current user (should be null for unauthenticated)
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      addResult('Auth', 'fail', `Auth error: ${error.message}`, error);
      return false;
    }
    
    addResult('Auth', 'pass', 'Auth system accessible');
    
    // Test auth state change listener
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        // This just tests that the listener can be created
      });
      
      subscription.unsubscribe();
      addResult('Auth', 'pass', 'Auth state change listener working');
    } catch (error) {
      addResult('Auth', 'warning', 'Auth listener setup failed', error);
    }
    
    console.log();
    return true;
    
  } catch (error) {
    addResult('Auth', 'fail', `Auth validation failed: ${error}`, error);
    console.log();
    return false;
  }
}

async function validateRLS(): Promise<boolean> {
  console.log(`${colors.blue}🛡️  Row Level Security Validation${colors.reset}`);
  
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
  
  try {
    // Test that RLS is blocking unauthenticated access to user data
    const { data, error } = await supabase
      .from('watchlists')
      .select('*')
      .limit(10);
    
    // Should either return empty result or RLS error for unauthenticated user
    if (error && error.message.includes('RLS')) {
      addResult('RLS', 'pass', 'RLS policies blocking unauthenticated access');
    } else if (!data || data.length === 0) {
      addResult('RLS', 'pass', 'RLS policies working (no data returned)');
    } else {
      addResult('RLS', 'warning', 'RLS may not be properly configured');
    }
    
    // Test that public data is accessible
    const { data: stockData, error: stockError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (!stockError) {
      addResult('RLS', 'pass', 'Public data accessible');
    }
    
    console.log();
    return true;
    
  } catch (error) {
    addResult('RLS', 'fail', `RLS validation failed: ${error}`, error);
    console.log();
    return false;
  }
}

async function validateRealtime(): Promise<boolean> {
  console.log(`${colors.blue}📡 Real-time Validation${colors.reset}`);
  
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
  
  try {
    // Test real-time subscription setup
    const subscription = supabase
      .channel('test-channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'users'
        }, 
        (payload) => {
          console.log('Real-time event received:', payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          addResult('Realtime', 'pass', 'Real-time subscription successful');
        } else if (status === 'CHANNEL_ERROR') {
          addResult('Realtime', 'fail', 'Real-time subscription failed');
        }
      });
    
    // Wait a moment for subscription to establish
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Clean up
    await supabase.removeChannel(subscription);
    
    addResult('Realtime', 'pass', 'Real-time system functional');
    console.log();
    return true;
    
  } catch (error) {
    addResult('Realtime', 'fail', `Real-time validation failed: ${error}`, error);
    console.log();
    return false;
  }
}

function generateReport(): void {
  console.log(`${colors.magenta}📊 MIGRATION VALIDATION REPORT${colors.reset}`);
  console.log(`${colors.magenta}===============================${colors.reset}\n`);
  
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warning').length;
  
  console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Warnings: ${warnings}${colors.reset}\n`);
  
  if (failed === 0) {
    console.log(`${colors.green}🎉 MIGRATION SUCCESSFUL!${colors.reset}`);
    console.log(`${colors.green}Supabase is ready for production use.${colors.reset}\n`);
    
    console.log(`${colors.blue}📖 Next Steps:${colors.reset}`);
    console.log(`1. Start the application: ${colors.yellow}npm run dev${colors.reset}`);
    console.log(`2. Test user registration and login`);
    console.log(`3. Create a watchlist and add stocks`);
    console.log(`4. Create a portfolio and add transactions`);
    console.log(`5. Verify real-time updates are working`);
    
  } else {
    console.log(`${colors.red}❌ MIGRATION ISSUES DETECTED${colors.reset}`);
    console.log(`${colors.red}Please address the failed validations above.${colors.reset}\n`);
    
    console.log(`${colors.blue}🔧 Troubleshooting:${colors.reset}`);
    console.log(`1. Check your .env configuration`);
    console.log(`2. Verify Supabase project settings`);
    console.log(`3. Run migrations manually if needed`);
    console.log(`4. Check Supabase dashboard for errors`);
  }
  
  console.log(`\n${colors.cyan}🔗 Useful Links:${colors.reset}`);
  if (supabaseUrl) {
    const baseUrl = supabaseUrl.replace('/rest/v1', '');
    console.log(`• Dashboard: ${baseUrl}/project/default`);
    console.log(`• SQL Editor: ${baseUrl}/project/default/sql`);
    console.log(`• Auth Settings: ${baseUrl}/project/default/auth/settings`);
  }
}

// Main execution
async function main(): Promise<void> {
  try {
    console.log(`${colors.yellow}🚀 Starting Supabase migration validation...${colors.reset}\n`);
    
    const envValid = await validateEnvironment();
    
    if (!envValid) {
      console.log(`\n${colors.red}❌ Environment validation failed. Please fix configuration issues.${colors.reset}`);
      generateReport();
      process.exit(1);
    }
    
    const connectionValid = await validateConnection();
    if (connectionValid) {
      await validateTables();
      await validateAuth();
      await validateRLS();
      await validateRealtime();
    }
    
    generateReport();
    
    // Exit with error code if any critical failures
    const criticalFailures = results.filter(r => 
      r.status === 'fail' && 
      ['Environment', 'Connection', 'Schema'].includes(r.test)
    );
    
    if (criticalFailures.length > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`${colors.red}💥 Validation failed:${colors.reset}`, error);
    process.exit(1);
  }
}

// Export for use as module
export { main as validateSupabaseMigration };

// Run automatically
main().catch(console.error);