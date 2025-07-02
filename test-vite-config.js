#!/usr/bin/env node

/**
 * Simple Vite Configuration Tester
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Testing Optimized Vite Configuration');
console.log('==========================================\n');

// Test 1: Check if vite.config.ts exists and has optimizations
console.log('1. Checking vite.config.ts...');
const configPath = path.join(__dirname, 'vite.config.ts');

if (fs.existsSync(configPath)) {
  console.log('✅ vite.config.ts found');
  
  const config = fs.readFileSync(configPath, 'utf8');
  
  const optimizations = [
    { name: 'Port fallback', pattern: /strictPort:\s*false/ },
    { name: 'HMR port separation', pattern: /getHMRPort\(\)/ },
    { name: 'CORS configuration', pattern: /cors:\s*\{/ },
    { name: 'Enhanced proxy', pattern: /configure:\s*\(proxy/ },
    { name: 'File watching', pattern: /watch:\s*\{/ }
  ];
  
  optimizations.forEach(opt => {
    if (opt.pattern.test(config)) {
      console.log(`✅ ${opt.name} - configured`);
    } else {
      console.log(`❌ ${opt.name} - missing`);
    }
  });
  
} else {
  console.log('❌ vite.config.ts not found');
}

// Test 2: Check environment configuration
console.log('\n2. Checking environment configuration...');
const envExamplePath = path.join(__dirname, '.env.example');

if (fs.existsSync(envExamplePath)) {
  console.log('✅ .env.example found');
  
  const envExample = fs.readFileSync(envExamplePath, 'utf8');
  if (envExample.includes('VITE_HOST')) {
    console.log('✅ Vite server configuration present');
  } else {
    console.log('❌ Vite server configuration missing');
  }
} else {
  console.log('❌ .env.example not found');
}

// Test 3: Check package.json scripts
console.log('\n3. Checking package.json scripts...');
const packagePath = path.join(__dirname, 'package.json');

if (fs.existsSync(packagePath)) {
  console.log('✅ package.json found');
  
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  if (packageJson.scripts && packageJson.scripts.frontend) {
    console.log('✅ Frontend script configured');
  } else {
    console.log('❌ Frontend script missing');
  }
  
  if (packageJson.scripts && packageJson.scripts.dev) {
    console.log('✅ Dev script configured');
  } else {
    console.log('❌ Dev script missing');
  }
} else {
  console.log('❌ package.json not found');
}

// Test 4: System information
console.log('\n4. System information...');
console.log(`✅ Node.js version: ${process.version}`);
console.log(`✅ Platform: ${process.platform}`);
console.log(`✅ Architecture: ${process.arch}`);

// Test 5: Port availability
console.log('\n5. Checking port availability...');
import { execSync } from 'child_process';

function checkPort(port) {
  try {
    execSync(`lsof -i :${port}`, { stdio: 'ignore' });
    return false; // Port in use
  } catch {
    return true; // Port available
  }
}

const ports = [3000, 3001, 5173];
ports.forEach(port => {
  if (checkPort(port)) {
    console.log(`✅ Port ${port} available`);
  } else {
    console.log(`⚠️  Port ${port} in use`);
  }
});

console.log('\n🎉 Configuration test complete!');
console.log('\nNext steps:');
console.log('1. Copy .env.example to .env if needed');
console.log('2. Run: npm run dev');
console.log('3. Access: http://localhost:3000');