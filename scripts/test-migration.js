#!/usr/bin/env node

/**
 * Migration Test Script
 * Tests PostgreSQL connection and schema after migration
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🧪 PostgreSQL Migration Test');
console.log('============================\n');

// Check environment setup
const envPath = join(rootDir, '.env');
if (!existsSync(envPath)) {
  console.error('❌ .env file not found');
  process.exit(1);
}

// Load environment variables
const envContent = readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim().replace(/^"(.*)"$/, '$1');
  }
});

if (!envVars.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

// Set environment variables
Object.keys(envVars).forEach(key => {
  process.env[key] = envVars[key];
});

async function testMigration() {
  try {
    console.log('🔄 Testing database connection...');
    
    // Import database connection
    const { db } = await import(join(rootDir, 'server/db.ts'));
    
    console.log('✅ Database connection successful');
    
    // Test schema tables
    console.log('\n🔄 Testing schema tables...');
    
    const testQueries = [
      {
        name: 'Users table',
        query: 'SELECT 1 FROM users LIMIT 1',
        table: 'users'
      },
      {
        name: 'Portfolios table',
        query: 'SELECT 1 FROM portfolios LIMIT 1',
        table: 'portfolios'
      },
      {
        name: 'Enhanced stocks table',
        query: 'SELECT 1 FROM enhanced_stocks LIMIT 1',
        table: 'enhanced_stocks'
      },
      {
        name: 'Subscription plans table',
        query: 'SELECT 1 FROM subscription_plans LIMIT 1',
        table: 'subscription_plans'
      },
      {
        name: 'Audit logs table',
        query: 'SELECT 1 FROM audit_logs LIMIT 1',
        table: 'audit_logs'
      }
    ];

    const results = [];
    
    for (const test of testQueries) {
      try {
        await db.execute(test.query);
        console.log(`✅ ${test.name} - OK`);
        results.push({ ...test, status: 'OK' });
      } catch (error) {
        console.log(`❌ ${test.name} - FAILED: ${error.message}`);
        results.push({ ...test, status: 'FAILED', error: error.message });
      }
    }

    // Test enum types
    console.log('\n🔄 Testing enum types...');
    
    const enumTests = [
      {
        name: 'Subscription tier enum',
        query: "SELECT 'free'::subscription_tier_enum",
        enum: 'subscription_tier_enum'
      },
      {
        name: 'Transaction type enum',
        query: "SELECT 'buy'::transaction_type_enum",
        enum: 'transaction_type_enum'
      }
    ];

    for (const test of enumTests) {
      try {
        await db.execute(test.query);
        console.log(`✅ ${test.name} - OK`);
        results.push({ ...test, status: 'OK' });
      } catch (error) {
        console.log(`❌ ${test.name} - FAILED: ${error.message}`);
        results.push({ ...test, status: 'FAILED', error: error.message });
      }
    }

    // Test indexes
    console.log('\n🔄 Testing indexes...');
    
    try {
      const indexQuery = `
        SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        ORDER BY tablename, indexname;
      `;
      
      const indexes = await db.execute(indexQuery);
      console.log(`✅ Found ${indexes.length} indexes`);
      
      if (indexes.length > 0) {
        console.log('📊 Index summary:');
        const tableIndexes = {};
        indexes.forEach(idx => {
          if (!tableIndexes[idx.tablename]) {
            tableIndexes[idx.tablename] = 0;
          }
          tableIndexes[idx.tablename]++;
        });
        
        Object.entries(tableIndexes).forEach(([table, count]) => {
          console.log(`   ${table}: ${count} indexes`);
        });
      }
    } catch (error) {
      console.log(`⚠️  Could not retrieve index information: ${error.message}`);
    }

    // Test basic CRUD operations
    console.log('\n🔄 Testing basic operations...');
    
    try {
      // Insert test user
      const testUser = {
        email: 'test@example.com',
        fullName: 'Test User',
        subscriptionTier: 'free',
        subscriptionStatus: 'active'
      };
      
      const insertResult = await db.insert(users).values(testUser).returning();
      console.log('✅ Insert operation - OK');
      
      // Query test user
      const queryResult = await db.select().from(users).where(eq(users.email, 'test@example.com'));
      console.log('✅ Select operation - OK');
      
      // Update test user
      await db.update(users).set({ fullName: 'Updated Test User' }).where(eq(users.email, 'test@example.com'));
      console.log('✅ Update operation - OK');
      
      // Delete test user
      await db.delete(users).where(eq(users.email, 'test@example.com'));
      console.log('✅ Delete operation - OK');
      
    } catch (error) {
      console.log(`❌ CRUD operations failed: ${error.message}`);
    }

    // Summary
    console.log('\n📊 Test Summary:');
    console.log('================');
    
    const passed = results.filter(r => r.status === 'OK').length;
    const failed = results.filter(r => r.status === 'FAILED').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${passed + failed}`);
    
    if (failed === 0) {
      console.log('\n🎉 All tests passed! Migration successful!');
      console.log('\n🚀 Next steps:');
      console.log('   1. Start your application: npm run dev');
      console.log('   2. Test your application features');
      console.log('   3. Monitor for any issues');
      console.log('   4. Consider removing SQLite files after verification');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the errors above.');
      console.log('\n🔧 Troubleshooting:');
      console.log('   1. Check database connection');
      console.log('   2. Verify schema migration completed');
      console.log('   3. Check database permissions');
      console.log('   4. Review migration logs');
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure database migration completed successfully');
    console.log('   2. Check DATABASE_URL in .env');
    console.log('   3. Verify database is accessible');
    console.log('   4. Check server logs for more details');
    process.exit(1);
  }
}

// Check for help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node scripts/test-migration.js');
  console.log('');
  console.log('This script tests the PostgreSQL migration by:');
  console.log('  1. Testing database connection');
  console.log('  2. Verifying schema tables exist');
  console.log('  3. Testing enum types');
  console.log('  4. Checking indexes');
  console.log('  5. Testing basic CRUD operations');
  console.log('');
  console.log('Run this after completing the migration to verify everything works.');
  process.exit(0);
}

// Run tests
testMigration();