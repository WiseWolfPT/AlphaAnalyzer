#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Change to the project directory
process.chdir('/Users/antoniofrancisco/Documents/teste 1');

console.log('🚀 Quick Deploy - Fixing 404 Error...');

// Check if we have the webapp code
const fs = require('fs');
if (!fs.existsSync('client/src/App.tsx')) {
    console.log('❌ Error: App.tsx not found');
    process.exit(1);
}

console.log('📁 Adding all webapp files...');

try {
    // Initialize git if not already initialized
    try {
        execSync('git status', { stdio: 'ignore' });
        console.log('Git repository already initialized');
    } catch (e) {
        execSync('git init');
        console.log('Git repository initialized');
    }

    // Add all files
    execSync('git add .');
    console.log('All files added to git');

    // Create commit
    const commitMessage = `feat: complete Alpha Analyzer webapp with 14 financial charts

✨ Features:
- Portuguese landing page with modern design  
- Real-time stock dashboard with intrinsic value
- 14 comprehensive financial charts (Price, Revenue, EBITDA, etc.)
- Responsive design with dark theme
- API integration with Finnhub + Alpha Vantage

🔧 Tech Stack:
- React + TypeScript + Vite
- Tailwind CSS + Chart.js
- Wouter routing
- Mock data for demo

🎯 Pages:
- / (Landing page)
- /dashboard (Stock dashboard) 
- /stock/AAPL (14 charts example)

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>`;

    execSync(`git commit -m "${commitMessage}"`);
    console.log('✅ Initial commit created');

    // Instructions for user
    console.log('');
    console.log('🎯 NEXT STEPS TO FIX THE 404:');
    console.log('');
    console.log('1. Connect to GitHub (if not done):');
    console.log('   git remote add origin https://github.com/YOUR_USERNAME/alpha-analyzer-webapp.git');
    console.log('');
    console.log('2. Push the code:');
    console.log('   git push -u origin main');
    console.log('');
    console.log('3. Vercel will auto-deploy and fix the 404!');
    console.log('');
    console.log('🌐 Your site will then show:');
    console.log('   • Landing page at: alpha-analyzer-webapp.vercel.app');
    console.log('   • Dashboard at: alpha-analyzer-webapp.vercel.app/dashboard');
    console.log('   • Charts at: alpha-analyzer-webapp.vercel.app/stock/AAPL');
    console.log('');
    console.log('💡 If you need the GitHub repo created first, I can help with that!');

} catch (error) {
    console.error('Error during deployment:', error.message);
    process.exit(1);
}