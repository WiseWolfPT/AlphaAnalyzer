#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔥 SOLUÇÃO FINAL - DEPLOY COM CONFIGURAÇÃO CORRIGIDA');
console.log('');

try {
  process.chdir('/Users/antoniofrancisco/Documents/teste 1');
  
  console.log('📝 Vercel config updated');
  console.log('📁 Adding vercel.json changes...');
  execSync('git add vercel.json', { stdio: 'inherit' });
  
  console.log('💾 Committing vercel config fix...');
  execSync('git commit -m "fix: update vercel.json config for proper deployment"', { stdio: 'inherit' });
  
  console.log('📤 Pushing config fix...');
  execSync('git push origin main', { stdio: 'inherit' });
  
  console.log('');
  console.log('🚀 DEPLOYING WITH FIXED CONFIG...');
  
  // Deploy with fixed config
  execSync('vercel --prod --force', { stdio: 'inherit' });
  
  console.log('');
  console.log('✅ DEPLOYMENT SHOULD NOW WORK!');
  console.log('🎯 Test the advanced charts now!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('');
  console.log('🔧 Try manually:');
  console.log('1. git add vercel.json');
  console.log('2. git commit -m "fix vercel config"');
  console.log('3. git push origin main');
  console.log('4. vercel --prod --force');
}