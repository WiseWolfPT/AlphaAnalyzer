#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🎯 DEPLOY SIMPLES - SÓ FRONTEND COM VITE');
console.log('');

try {
  process.chdir('/Users/antoniofrancisco/Documents/teste 1');
  
  console.log('🏗️ Building only frontend with vite...');
  execSync('npm run dev &', { stdio: 'pipe' }); // Start dev server
  
  // Kill dev server after a moment
  setTimeout(() => {
    try {
      execSync('pkill -f "vite"', { stdio: 'pipe' });
    } catch (e) {
      // Ignore error
    }
  }, 2000);
  
  console.log('🏗️ Building frontend...');
  execSync('vite build --outDir dist', { stdio: 'inherit' });
  
  console.log('🚀 DEPLOYING FRONTEND BUILD...');
  execSync('vercel --prod --force', { stdio: 'inherit' });
  
  console.log('');
  console.log('✅ SIMPLE FRONTEND DEPLOYMENT COMPLETE!');
  console.log('🎯 Advanced charts should work now!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('');
  console.log('🔧 Try manual deployment:');
  console.log('1. vite build --outDir dist');
  console.log('2. vercel --prod --force');
}