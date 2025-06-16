#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🎯 USING EXISTING DIST - DEPLOY PRE-BUILT FILES');
console.log('');

try {
  process.chdir('/Users/antoniofrancisco/Documents/teste 1');
  
  console.log('📁 Current dist contents:');
  execSync('ls -la dist/', { stdio: 'inherit' });
  
  console.log('');
  console.log('📝 Creating vercel.json for static deployment...');
  
  const vercelConfig = {
    "version": 2,
    "builds": [
      {
        "src": "dist/public/**",
        "use": "@vercel/static"
      }
    ],
    "routes": [
      {
        "src": "/assets/(.*)",
        "dest": "/dist/public/assets/$1"
      },
      {
        "src": "/(.*)",
        "dest": "/dist/public/index.html"
      }
    ]
  };
  
  require('fs').writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));
  
  console.log('🚀 DEPLOYING PRE-BUILT STATIC FILES...');
  execSync('vercel --prod --force', { stdio: 'inherit' });
  
  console.log('');
  console.log('✅ STATIC DEPLOYMENT COMPLETE!');
  console.log('🎯 This should finally work!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('');
  console.log('🔧 Manual steps:');
  console.log('1. The dist folder has your built files');
  console.log('2. Deploy those static files directly');
}