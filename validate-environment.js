#!/usr/bin/env node

// Environment Validation Script for Alfalyzer
// This script validates the environment configuration for deployment readiness

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function validateEnvironment() {
  console.log('🔍 ALFALYZER ENVIRONMENT VALIDATION\n');
  console.log('='.repeat(50));
  
  let issues = [];
  let warnings = [];
  let passed = 0;
  let total = 0;
  
  // Helper function to add test result
  function test(name, condition, errorMsg, warningMsg = null) {
    total++;
    if (condition) {
      console.log(`✅ ${name}`);
      passed++;
    } else if (warningMsg) {
      console.log(`⚠️  ${name}: ${warningMsg}`);
      warnings.push(`${name}: ${warningMsg}`);
    } else {
      console.log(`❌ ${name}: ${errorMsg}`);
      issues.push(`${name}: ${errorMsg}`);
    }
  }
  
  // Load environment variables
  const dotenv = await import('dotenv');
  dotenv.config();
  
  console.log('🔐 CRITICAL ENVIRONMENT VARIABLES:');
  
  // Check critical environment variables
  test(
    'NODE_ENV',
    process.env.NODE_ENV,
    'NODE_ENV not set'
  );
  
  test(
    'PORT',
    process.env.PORT && !isNaN(parseInt(process.env.PORT)),
    'PORT not set or invalid'
  );
  
  test(
    'DATABASE_PATH', 
    process.env.DATABASE_PATH,
    'DATABASE_PATH not set'
  );
  
  test(
    'JWT_ACCESS_SECRET',
    process.env.JWT_ACCESS_SECRET && process.env.JWT_ACCESS_SECRET.length >= 32,
    'JWT_ACCESS_SECRET missing or too short (minimum 32 characters)'
  );
  
  test(
    'JWT_REFRESH_SECRET',
    process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length >= 32,
    'JWT_REFRESH_SECRET missing or too short (minimum 32 characters)'
  );
  
  console.log('\n💰 API KEYS VALIDATION:');
  
  // Check API keys (these can be demo values for development)
  const apiKeys = [
    'ALPHA_VANTAGE_API_KEY',
    'FINNHUB_API_KEY', 
    'FMP_API_KEY',
    'TWELVE_DATA_API_KEY'
  ];
  
  apiKeys.forEach(keyName => {
    const value = process.env[keyName];
    const isDemoValue = value?.includes('demo_') || value?.includes('replace_me');
    
    test(
      keyName,
      value,
      'API key not set',
      isDemoValue ? 'Using demo value (replace with real key for production)' : null
    );
  });
  
  console.log('\n🌐 FRONTEND CONFIGURATION:');
  
  test(
    'VITE_APP_NAME',
    process.env.VITE_APP_NAME,
    'VITE_APP_NAME not set'
  );
  
  test(
    'VITE_API_BASE_URL',
    process.env.VITE_API_BASE_URL,
    'VITE_API_BASE_URL not set'
  );
  
  console.log('\n📁 FILE STRUCTURE VALIDATION:');
  
  // Check critical files exist
  const criticalFiles = [
    { path: '.env', required: true },
    { path: '.env.template', required: true },
    { path: 'package.json', required: true },
    { path: 'tsconfig.json', required: true },
    { path: 'vite.config.ts', required: true },
    { path: 'server/index.ts', required: true },
    { path: 'client/src/main.tsx', required: true }
  ];
  
  criticalFiles.forEach(file => {
    test(
      `File: ${file.path}`,
      fs.existsSync(file.path),
      'File missing'
    );
  });
  
  console.log('\n🔒 SECURITY VALIDATION:');
  
  // Check .gitignore for .env
  if (fs.existsSync('.gitignore')) {
    const gitignore = fs.readFileSync('.gitignore', 'utf8');
    test(
      '.env in .gitignore',
      gitignore.includes('.env'),
      '.env file not ignored by Git (security risk!)'
    );
  } else {
    test(
      '.gitignore exists',
      false,
      '.gitignore file missing'
    );
  }
  
  // Check if .env is tracked by Git
  try {
    const { execSync } = await import('child_process');
    const gitStatus = execSync('git status --porcelain .env 2>/dev/null || echo ""', { encoding: 'utf8' });
    
    test(
      '.env not tracked by Git',
      !gitStatus.trim() || gitStatus.includes('??'),
      '.env file is being tracked by Git (remove with: git rm --cached .env)'
    );
  } catch (error) {
    // Git not available or not a git repo
    test(
      'Git status check',
      true,
      '',
      'Could not check Git status'
    );
  }
  
  console.log('\n📦 PACKAGE DEPENDENCIES:');
  
  // Check package.json scripts
  if (fs.existsSync('package.json')) {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredScripts = ['dev', 'build', 'start'];
    
    requiredScripts.forEach(script => {
      test(
        `Script: ${script}`,
        packageJson.scripts && packageJson.scripts[script],
        `${script} script not defined in package.json`
      );
    });
    
    // Check for ES modules configuration
    test(
      'ES Modules configured',
      packageJson.type === 'module',
      'package.json should have "type": "module"'
    );
  }
  
  console.log('\n🚀 DEPLOYMENT READINESS:');
  
  // Check build directory
  test(
    'Build directory clean',
    !fs.existsSync('dist') || fs.readdirSync('dist').length === 0,
    '',
    'dist directory exists (run clean build for deployment)'
  );
  
  // Check for common deployment issues
  test(
    'No node_modules in src',
    !fs.existsSync('client/src/node_modules'),
    'node_modules found in src directory'
  );
  
  // Port configuration
  const frontendPort = 3000;
  const backendPort = parseInt(process.env.PORT || '3001');
  
  test(
    'Port configuration',
    frontendPort !== backendPort,
    'Frontend and backend using same port'
  );
  
  console.log('\n📊 VALIDATION SUMMARY:');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}/${total} tests`);
  console.log(`⚠️  Warnings: ${warnings.length}`);
  console.log(`❌ Issues: ${issues.length}`);
  
  if (issues.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES TO FIX:');
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS TO REVIEW:');
    warnings.forEach((warning, index) => {
      console.log(`${index + 1}. ${warning}`);
    });
  }
  
  console.log('\n🎯 DEPLOYMENT STATUS:');
  if (issues.length === 0) {
    if (warnings.length === 0) {
      console.log('🟢 READY FOR DEPLOYMENT');
    } else {
      console.log('🟡 DEPLOYMENT POSSIBLE (with warnings)');
    }
  } else {
    console.log('🔴 NOT READY FOR DEPLOYMENT (fix critical issues first)');
  }
  
  console.log('\n💡 QUICK FIXES:');
  if (issues.length > 0) {
    console.log('1. Run: node setup-environment.js (to fix missing env vars)');
    console.log('2. Run: git rm --cached .env (if .env is tracked)');
    console.log('3. Check package.json scripts');
    console.log('4. Verify all required files exist');
  } else {
    console.log('✅ No critical issues found!');
  }
  
  // Return exit code based on results
  process.exit(issues.length > 0 ? 1 : 0);
}

// Run validation
validateEnvironment().catch(error => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});