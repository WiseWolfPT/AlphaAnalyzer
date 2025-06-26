#!/usr/bin/env node

/**
 * Database Migration Script
 * Migrates from SQLite to PostgreSQL using enhanced schema
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🚀 Alfalyzer Database Migration to PostgreSQL');
console.log('============================================\n');

// Check if .env file exists
const envPath = join(rootDir, '.env');
if (!existsSync(envPath)) {
  console.error('❌ Error: .env file not found!');
  console.log('📝 Please copy .env.example to .env and configure DATABASE_URL');
  console.log('   cp .env.example .env');
  process.exit(1);
}

// Check if DATABASE_URL is configured
try {
  const envContent = readFileSync(envPath, 'utf8');
  const databaseUrlMatch = envContent.match(/DATABASE_URL\s*=\s*"([^"]+)"/);
  
  if (!databaseUrlMatch || databaseUrlMatch[1].includes('localhost:5432/alfalyzer')) {
    console.warn('⚠️  Warning: DATABASE_URL appears to be using the example value');
    console.log('📝 Please update DATABASE_URL in .env with your actual PostgreSQL connection string\n');
  } else {
    console.log('✅ DATABASE_URL configured');
  }
} catch (error) {
  console.error('❌ Error reading .env file:', error.message);
  process.exit(1);
}

// Migration steps
const steps = [
  {
    name: 'Generating migration files',
    command: 'npm',
    args: ['run', 'db:generate'],
    description: 'Creates migration files from enhanced schema'
  },
  {
    name: 'Applying migrations',
    command: 'npm',
    args: ['run', 'db:push'],
    description: 'Pushes schema to PostgreSQL database'
  }
];

async function runCommand(command, args, description) {
  return new Promise((resolve, reject) => {
    console.log(`🔄 ${description}...`);
    
    const process = spawn(command, args, {
      cwd: rootDir,
      stdio: ['inherit', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(data.toString().trim());
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(data.toString().trim());
    });

    process.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Success!\n');
        resolve({ stdout, stderr });
      } else {
        console.error(`❌ Failed with exit code ${code}\n`);
        reject(new Error(`Command failed: ${command} ${args.join(' ')}`));
      }
    });

    process.on('error', (error) => {
      console.error(`❌ Error: ${error.message}\n`);
      reject(error);
    });
  });
}

async function migrate() {
  try {
    console.log('📋 Migration Plan:');
    steps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step.description}`);
    });
    console.log();

    // Execute migration steps
    for (const step of steps) {
      await runCommand(step.command, step.args, step.name);
    }

    console.log('🎉 Migration completed successfully!');
    console.log('📊 You can now use Drizzle Studio to inspect your database:');
    console.log('   npm run db:studio');
    console.log();
    console.log('🚀 Start your application:');
    console.log('   npm run dev');

  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your DATABASE_URL in .env');
    console.log('   2. Ensure your PostgreSQL database is accessible');
    console.log('   3. Verify database permissions');
    console.log('   4. Check the migration guide: scripts/migrate-to-postgresql.md');
    process.exit(1);
  }
}

// Check for help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node scripts/migrate-db.js');
  console.log('');
  console.log('This script migrates your database from SQLite to PostgreSQL');
  console.log('using the enhanced schema.');
  console.log('');
  console.log('Prerequisites:');
  console.log('  1. Configure DATABASE_URL in .env file');
  console.log('  2. Ensure PostgreSQL database is accessible');
  console.log('');
  console.log('For detailed instructions, see: scripts/migrate-to-postgresql.md');
  process.exit(0);
}

// Run migration
migrate();