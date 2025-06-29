#!/usr/bin/env node

/**
 * SQLite Backup Script
 * Creates a backup of existing SQLite database before migration
 */

import { spawn } from 'child_process';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('💾 SQLite Database Backup');
console.log('========================\n');

const sqlitePath = join(rootDir, 'dev.db');
const backupDir = join(rootDir, 'backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = join(backupDir, `dev-backup-${timestamp}.db`);
const sqlDumpPath = join(backupDir, `dev-backup-${timestamp}.sql`);

// Check if SQLite database exists
if (!existsSync(sqlitePath)) {
  console.log('ℹ️  No SQLite database found at dev.db');
  console.log('   This is normal if you\'re starting fresh');
  process.exit(0);
}

// Create backup directory
if (!existsSync(backupDir)) {
  mkdirSync(backupDir, { recursive: true });
  console.log('📁 Created backup directory');
}

async function runSqliteCommand(args, description) {
  return new Promise((resolve, reject) => {
    console.log(`🔄 ${description}...`);
    
    const process = spawn('sqlite3', args, {
      cwd: rootDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Success!');
        resolve({ stdout, stderr });
      } else {
        console.error(`❌ Failed with exit code ${code}`);
        console.error('stderr:', stderr);
        reject(new Error(`SQLite command failed: ${args.join(' ')}`));
      }
    });

    process.on('error', (error) => {
      if (error.code === 'ENOENT') {
        console.error('❌ sqlite3 command not found');
        console.log('📝 Install SQLite3:');
        console.log('   macOS: brew install sqlite');
        console.log('   Ubuntu: sudo apt install sqlite3');
        console.log('   Windows: Download from https://sqlite.org/download.html');
      } else {
        console.error(`❌ Error: ${error.message}`);
      }
      reject(error);
    });
  });
}

async function backupDatabase() {
  try {
    console.log(`📋 Backing up SQLite database: ${sqlitePath}`);
    console.log(`📁 Backup location: ${backupDir}\n`);

    // Copy database file
    console.log('🔄 Creating database file copy...');
    copyFileSync(sqlitePath, backupPath);
    console.log('✅ Database file copied');

    // Create SQL dump
    try {
      await runSqliteCommand([sqlitePath, '.dump'], 'Creating SQL dump');
      
      // Redirect output to file
      const { stdout } = await runSqliteCommand([sqlitePath, '.output', sqlDumpPath], 'Setting output file');
      await runSqliteCommand([sqlitePath, '.dump'], 'Writing SQL dump to file');
      
      console.log('✅ SQL dump created');
    } catch (error) {
      console.warn('⚠️  Warning: Could not create SQL dump (sqlite3 may not be available)');
      console.log('   Database file backup is still available');
    }

    // Get database info
    try {
      const { stdout } = await runSqliteCommand([sqlitePath, '.tables'], 'Getting table information');
      console.log('\n📊 Database contains tables:');
      if (stdout.trim()) {
        stdout.trim().split(/\s+/).forEach(table => {
          console.log(`   - ${table}`);
        });
      } else {
        console.log('   (no tables found)');
      }
    } catch (error) {
      console.warn('⚠️  Could not retrieve table information');
    }

    console.log('\n🎉 Backup completed successfully!');
    console.log('📁 Backup files:');
    console.log(`   Database: ${backupPath}`);
    console.log(`   SQL Dump: ${sqlDumpPath}`);
    console.log('\n📝 Next steps:');
    console.log('   1. Review migration guide: scripts/migrate-to-postgresql.md');
    console.log('   2. Configure DATABASE_URL in .env');
    console.log('   3. Run migration: node scripts/migrate-db.js');

  } catch (error) {
    console.error('💥 Backup failed:', error.message);
    console.log('\n🔧 Manual backup options:');
    console.log(`   1. Copy file manually: cp ${sqlitePath} ${backupPath}`);
    console.log('   2. Continue with migration (original file will remain)');
    process.exit(1);
  }
}

// Check for help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node scripts/backup-sqlite.js');
  console.log('');
  console.log('This script creates a backup of your existing SQLite database');
  console.log('before migrating to PostgreSQL.');
  console.log('');
  console.log('Backup includes:');
  console.log('  - Database file copy');
  console.log('  - SQL dump (if sqlite3 available)');
  console.log('');
  console.log('Backups are stored in: ./backups/');
  process.exit(0);
}

// Run backup
backupDatabase();