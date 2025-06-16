#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Quick Fix: Deploying Advanced Charts routing...\n');

try {
  // Change to project directory
  const projectDir = '/Users/antoniofrancisco/Documents/teste 1';
  process.chdir(projectDir);
  
  console.log('📁 Current directory:', process.cwd());
  
  // Add all changes
  console.log('📁 Adding changes...');
  execSync('git add .', { stdio: 'inherit' });
  
  // Commit changes
  console.log('💾 Committing fix...');
  execSync(`git commit -m "fix: resolve AdvancedCharts routing - ensure /stock/:symbol/charts works

- Deploy AdvancedCharts.tsx component properly
- Fix missing route registration
- Resolve 'Did you forget to add the page to the router?' error
- Ensure all 14 chart components are built correctly

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"`, { stdio: 'inherit' });
  
  // Push to GitHub
  console.log('📤 Pushing to GitHub...');
  execSync('git push origin main', { stdio: 'inherit' });
  
  console.log('\n✅ DEPLOYMENT COMPLETE!');
  console.log('\n🌐 Test in 2-3 minutes:');
  console.log('   • Original: https://stock-analysis-app-sigma.vercel.app/stock/AAPL');
  console.log('   • Advanced: https://stock-analysis-app-sigma.vercel.app/stock/AAPL/charts');
  console.log('\n🎯 The "View Advanced Charts" button should now work!');
  
} catch (error) {
  console.error('❌ Error during deployment:', error.message);
  console.log('\n📝 Manual backup plan:');
  console.log('1. Open Terminal');
  console.log('2. cd "/Users/antoniofrancisco/Documents/teste 1"');
  console.log('3. git add .');
  console.log('4. git commit -m "fix routing"');
  console.log('5. git push origin main');
}