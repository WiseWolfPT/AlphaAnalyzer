const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Manual deployment process starting...');

try {
    // Change to project directory
    process.chdir('/Users/antoniofrancisco/Documents/teste 1');
    console.log('Working directory:', process.cwd());
    
    // Step 1: Install dependencies
    console.log('📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    
    // Step 2: Build project
    console.log('🔨 Building project...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // Step 3: Create deployment package
    console.log('📦 Creating deployment package...');
    execSync('tar --exclude=./node_modules -czf build.tgz .', { stdio: 'inherit' });
    
    console.log('✅ Build and package complete. Deployment files ready.');
    console.log('📁 Package created: build.tgz');
    
    // Check if VERCEL_TOKEN is available
    if (process.env.VERCEL_TOKEN) {
        console.log('🔑 Vercel token found, ready for API deployment');
    } else {
        console.log('⚠️  VERCEL_TOKEN not found. Set it and run: node deploy_via_api.mjs');
    }
    
} catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
}