#!/usr/bin/env node

/**
 * Add cost protection scripts to package.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const packageJsonPath = join(projectRoot, 'package.json');

console.log('📦 Adding cost protection scripts to package.json...');

try {
  // Read current package.json
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  
  // Add cost protection scripts
  const newScripts = {
    "cost-protection:validate": "node scripts/validate-cost-protection.mjs",
    "cost-protection:demo": "node scripts/demo-cost-protection.mjs",
    "cost-protection:status": "curl -s http://localhost:3001/api/admin/cost-protection/status | jq .",
    "cost-protection:health": "curl -s http://localhost:3001/api/health/cost-protection | jq .",
    "cost-protection:emergency": "curl -X POST http://localhost:3001/api/admin/cost-protection/admin/emergency-mode -H 'Content-Type: application/json' -d '{\"activate\": true, \"reason\": \"Manual activation\"}'",
    "cost-protection:emergency-off": "curl -X POST http://localhost:3001/api/admin/cost-protection/admin/emergency-mode -H 'Content-Type: application/json' -d '{\"activate\": false}'",
    "cost-protection:reset-circuit": "curl -X POST http://localhost:3001/api/admin/cost-protection/admin/reset-circuit-breaker -H 'Content-Type: application/json' -d '{\"provider\": \"PROVIDER_NAME\", \"reason\": \"Manual reset\"}'",
    "monitor:costs": "watch -n 30 'npm run cost-protection:status'",
    "validate:before-deploy": "npm run cost-protection:validate && echo '✅ Safe to deploy!'"
  };
  
  // Merge with existing scripts
  packageJson.scripts = { ...packageJson.scripts, ...newScripts };
  
  // Write updated package.json
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  
  console.log('✅ Cost protection scripts added successfully!');
  console.log('\nAvailable commands:');
  console.log('------------------');
  Object.entries(newScripts).forEach(([script, command]) => {
    console.log(`npm run ${script}`);
    console.log(`  → ${command}`);
    console.log('');
  });
  
} catch (error) {
  console.error('❌ Failed to update package.json:', error.message);
  process.exit(1);
}

console.log('🚀 Cost protection integration complete!');
console.log('\nQuick start:');
console.log('1. npm run cost-protection:validate');
console.log('2. npm run cost-protection:demo');
console.log('3. npm run validate:before-deploy');