#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🚀 FORCING VERCEL DEPLOYMENT NOW...\n');

try {
  // Navigate to project directory
  process.chdir('/Users/antoniofrancisco/Documents/teste 1');
  
  console.log('📁 Current directory:', process.cwd());
  
  // Create a dummy change to force deployment
  console.log('📝 Creating dummy change to force rebuild...');
  execSync('echo "// Force rebuild" >> client/src/App.tsx', { stdio: 'inherit' });
  
  // Add all changes
  console.log('📁 Adding changes...');
  execSync('git add .', { stdio: 'inherit' });
  
  // Commit with force flag
  console.log('💾 Force committing...');
  execSync(`git commit -m "force: trigger Vercel deployment for advanced charts

URGENT: Force deployment to activate advanced charts routing
- Add dummy comment to trigger rebuild
- Ensure /stock/:symbol/charts route works  
- Fix 'No Production Deployment' issue
- Deploy AdvancedCharts.tsx with all 14 chart components

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"`, { stdio: 'inherit' });
  
  // Force push
  console.log('📤 FORCE PUSHING to trigger deployment...');
  execSync('git push origin main', { stdio: 'inherit' });
  
  console.log('\n✅ FORCE DEPLOYMENT TRIGGERED!');
  console.log('\n🎯 This should FORCE Vercel to rebuild!');
  console.log('\n🌐 Check in 3-5 minutes:');
  console.log('   https://stock-analysis-app-sigma.vercel.app/stock/AAPL/charts');
  console.log('\n⚡ If still not working, we need to configure Vercel manually.');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n🆘 MANUAL STEPS:');
  console.log('1. Go to vercel.com');
  console.log('2. Click on stock-analysis-app project');
  console.log('3. Go to Settings > Git');
  console.log('4. Make sure auto-deploy is enabled');
  console.log('5. Manually trigger a deployment');
}