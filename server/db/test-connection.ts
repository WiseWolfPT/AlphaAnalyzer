#!/usr/bin/env tsx

import { healthCheck, getDbInfo, execute, transaction } from './index';

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection...\n');

  try {
    // Test 1: Health Check
    console.log('1. Health Check:');
    const isHealthy = await healthCheck();
    console.log(`   Status: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}\n`);

    // Test 2: Database Info
    console.log('2. Database Info:');
    const info = getDbInfo();
    console.log(`   Connected: ${info.connected ? '✅' : '❌'}`);
    console.log(`   Filename: ${info.filename}`);
    console.log(`   In Transaction: ${info.inTransaction}`);
    const tableNames = Array.isArray(info.tables) 
      ? info.tables.map((t: any) => t.name).join(', ')
      : 'None';
    console.log(`   Tables: ${tableNames}\n`);

    // Test 3: Create test table
    console.log('3. Creating Test Table:');
    await execute(db => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS test_connection (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          message TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });
    console.log('   ✅ Test table created\n');

    // Test 4: Insert test data
    console.log('4. Inserting Test Data:');
    const insertResult = await transaction(db => {
      const stmt = db.prepare('INSERT INTO test_connection (message) VALUES (?)');
      return stmt.run('Database connection test successful!');
    });
    console.log(`   ✅ Inserted row with ID: ${insertResult.lastInsertRowid}\n`);

    // Test 5: Query test data
    console.log('5. Querying Test Data:');
    const rows = await execute(db => {
      const stmt = db.prepare('SELECT * FROM test_connection ORDER BY id DESC LIMIT 5');
      return stmt.all();
    });
    console.log(`   ✅ Found ${rows.length} rows:`);
    rows.forEach((row: any) => {
      console.log(`      ID: ${row.id}, Message: ${row.message}, Created: ${row.created_at}`);
    });
    console.log();

    // Test 6: Cleanup
    console.log('6. Cleanup:');
    await execute(db => {
      db.exec('DROP TABLE IF EXISTS test_connection');
    });
    console.log('   ✅ Test table dropped\n');

    console.log('✨ All tests passed! Database connection is working correctly.\n');

  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDatabaseConnection();