#!/usr/bin/env tsx

import { execute } from './index';

async function checkTables() {
  console.log('🔍 Checking Database Tables...\n');

  try {
    const tables = await execute(db => {
      const stmt = db.prepare(`
        SELECT name, type 
        FROM sqlite_master 
        WHERE type IN ('table', 'index') 
        ORDER BY type, name
      `);
      return stmt.all();
    });

    const tableList = tables.filter((t: any) => t.type === 'table' && !t.name.startsWith('sqlite_'));
    const indexList = tables.filter((t: any) => t.type === 'index' && !t.name.startsWith('sqlite_'));

    console.log(`📊 Tables (${tableList.length}):`);
    tableList.forEach((table: any) => {
      console.log(`   - ${table.name}`);
    });

    console.log(`\n🔍 Indexes (${indexList.length}):`);
    indexList.forEach((index: any) => {
      console.log(`   - ${index.name}`);
    });

    // Check row counts
    console.log('\n📈 Row Counts:');
    for (const table of tableList) {
      try {
        const count = await execute(db => {
          const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`);
          return stmt.get();
        });
        console.log(`   - ${table.name}: ${count.count} rows`);
      } catch (err) {
        console.log(`   - ${table.name}: Error counting rows`);
      }
    }

    // Show users table structure
    console.log('\n🔧 Users Table Structure:');
    const userColumns = await execute(db => {
      const stmt = db.prepare(`PRAGMA table_info(users)`);
      return stmt.all();
    });
    
    userColumns.forEach((col: any) => {
      const nullable = col.notnull === 0 ? 'NULL' : 'NOT NULL';
      const pk = col.pk === 1 ? ' PRIMARY KEY' : '';
      const defaultVal = col.dflt_value ? ` DEFAULT ${col.dflt_value}` : '';
      console.log(`   - ${col.name}: ${col.type} ${nullable}${pk}${defaultVal}`);
    });

  } catch (error) {
    console.error('❌ Error checking tables:', error);
    process.exit(1);
  }
}

checkTables();