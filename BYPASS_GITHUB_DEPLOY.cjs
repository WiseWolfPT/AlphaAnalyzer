#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔥 BYPASS GITHUB - DEPLOY DIRETO PARA VERCEL!');
console.log('');

try {
  process.chdir('/Users/antoniofrancisco/Documents/teste 1');
  
  console.log('📦 Installing Vercel CLI...');
  try {
    execSync('npm install -g vercel', { stdio: 'inherit' });
  } catch (e) {
    console.log('Vercel CLI already installed or failed to install');
  }
  
  console.log('');
  console.log('🚀 DEPLOYING DIRECTLY TO VERCEL...');
  console.log('This will bypass the GitHub auto-deploy issue!');
  console.log('');
  
  // Deploy directly with Vercel CLI
  execSync('vercel --prod --yes', { stdio: 'inherit' });
  
  console.log('');
  console.log('✅ DEPLOYMENT COMPLETE!');
  console.log('');
  console.log('🎯 The advanced charts should now work!');
  console.log('🌐 Test at the URL provided above + /stock/AAPL/charts');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('');
  console.log('🔧 MANUAL FALLBACK:');
  console.log('1. npm install -g vercel');
  console.log('2. vercel login (if needed)');
  console.log('3. vercel --prod');
  console.log('');
  console.log('This will deploy directly without GitHub!');
}