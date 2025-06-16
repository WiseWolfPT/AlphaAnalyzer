#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🎯 DEPLOY FRONTEND-ONLY - BYPASS SERVER ISSUES');
console.log('');

try {
  process.chdir('/Users/antoniofrancisco/Documents/teste 1');
  
  console.log('📦 Backing up original package.json...');
  execSync('cp package.json package-original.json', { stdio: 'inherit' });
  
  console.log('📝 Using frontend-only package.json...');
  execSync('cp package-frontend-only.json package.json', { stdio: 'inherit' });
  
  console.log('📝 Using frontend-only vercel.json...');
  execSync('cp vercel-frontend.json vercel.json', { stdio: 'inherit' });
  
  console.log('🧹 Cleaning up...');
  execSync('rm -rf node_modules dist', { stdio: 'inherit' });
  
  console.log('📦 Installing frontend dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('🏗️ Building frontend only...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('🚀 DEPLOYING FRONTEND-ONLY TO VERCEL...');
  execSync('vercel --prod --force', { stdio: 'inherit' });
  
  console.log('');
  console.log('✅ FRONTEND-ONLY DEPLOYMENT COMPLETE!');
  console.log('🎯 The advanced charts should now work!');
  
  console.log('');
  console.log('📦 Restoring original package.json...');
  execSync('cp package-original.json package.json', { stdio: 'inherit' });
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('');
  console.log('🔄 Restoring original files...');
  try {
    execSync('cp package-original.json package.json', { stdio: 'inherit' });
  } catch (e) {
    console.log('Could not restore package.json');
  }
}