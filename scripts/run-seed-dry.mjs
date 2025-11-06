#!/usr/bin/env node
/**
 * Simple wrapper to run seed-stock-universe in dry-run mode
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runDryRun() {
  console.log('🧪 Starting DRY RUN - Stock Universe Seeding');
  console.log('=' .repeat(60));
  console.log('Mode: DRY RUN (no database changes)');
  console.log('Target: https://128.140.45.28.sslip.io');
  console.log('');

  try {
    // Run the TypeScript file directly with tsx
    const command = 'npx tsx scripts/seed-stock-universe.ts --dry-run';
    const { stdout, stderr } = await execAsync(command, {
      cwd: '/Users/antoniofrancisco/Documents/teste 1',
      env: {
        ...process.env,
        TARGET_URL: 'https://128.140.45.28.sslip.io',
      },
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    if (stdout) console.log(stdout);
    if (stderr) console.error('STDERR:', stderr);

    console.log('');
    console.log('✅ Dry run completed successfully');
  } catch (error) {
    console.error('❌ Dry run failed:', error.message);
    if (error.stdout) console.log('STDOUT:', error.stdout);
    if (error.stderr) console.error('STDERR:', error.stderr);
    process.exit(1);
  }
}

runDryRun();
