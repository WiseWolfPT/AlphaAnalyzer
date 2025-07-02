#!/usr/bin/env node

/**
 * StockHeader Integration Test
 * 
 * This script performs integration testing by checking if the component
 * can be properly imported and used within the React application context.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔬 StockHeader Integration Test');
console.log('===============================\n');

// Test 1: Check if component is properly importable
console.log('1. 📦 Import Validation');
const stockHeaderPath = path.join(__dirname, 'client/src/components/stock/stock-header.tsx');
const testComponentPath = path.join(__dirname, 'client/src/components/stock/stock-header-test.tsx');

try {
    const stockHeaderContent = fs.readFileSync(stockHeaderPath, 'utf8');
    const testComponentContent = fs.readFileSync(testComponentPath, 'utf8');
    
    console.log('   ✅ StockHeader component file exists');
    console.log('   ✅ Test component file exists');
    
    // Check if the test component imports StockHeader correctly
    const hasCorrectImport = testComponentContent.includes("import { StockHeader } from './stock-header'");
    console.log(`   ${hasCorrectImport ? '✅' : '❌'} Test component imports StockHeader correctly`);
    
} catch (error) {
    console.log('   ❌ Failed to read component files:', error.message);
}

// Test 2: Check App.tsx route integration
console.log('\n2. 🛣️  Route Integration');
const appPath = path.join(__dirname, 'client/src/App.tsx');

try {
    const appContent = fs.readFileSync(appPath, 'utf8');
    
    const hasTestRoute = appContent.includes('/test/stock-header');
    const hasTestImport = appContent.includes('stock-header-test');
    
    console.log(`   ${hasTestRoute ? '✅' : '❌'} Test route added to App.tsx`);
    console.log(`   ${hasTestImport ? '✅' : '❌'} Test component import added to App.tsx`);
    
} catch (error) {
    console.log('   ❌ Failed to read App.tsx:', error.message);
}

// Test 3: Check dependencies
console.log('\n3. 📚 Dependencies Validation');

const requiredFiles = [
    'client/src/components/ui/button.tsx',
    'client/src/components/ui/badge.tsx',
    'client/src/lib/utils.ts'
];

requiredFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    const exists = fs.existsSync(fullPath);
    console.log(`   ${exists ? '✅' : '❌'} ${filePath}`);
});

// Test 4: Check package.json for required dependencies
console.log('\n4. 📦 Package Dependencies');
const packagePath = path.join(__dirname, 'package.json');

try {
    const packageContent = fs.readFileSync(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    
    const requiredDeps = [
        'react',
        'lucide-react',
        'clsx',
        'tailwind-merge'
    ];
    
    requiredDeps.forEach(dep => {
        const hasInDeps = packageJson.dependencies && packageJson.dependencies[dep];
        const hasInDevDeps = packageJson.devDependencies && packageJson.devDependencies[dep];
        const exists = hasInDeps || hasInDevDeps;
        console.log(`   ${exists ? '✅' : '❌'} ${dep}${exists ? ` (${hasInDeps ? packageJson.dependencies[dep] : packageJson.devDependencies[dep]})` : ''}`);
    });
    
} catch (error) {
    console.log('   ❌ Failed to read package.json:', error.message);
}

// Test 5: Server accessibility
console.log('\n5. 🌐 Server Accessibility');

import { spawn } from 'child_process';

const checkServer = (url, timeout = 5000) => {
    return new Promise((resolve) => {
        const curl = spawn('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', url]);
        
        const timer = setTimeout(() => {
            curl.kill();
            resolve('TIMEOUT');
        }, timeout);
        
        curl.on('close', (code) => {
            clearTimeout(timer);
            if (code === 0) {
                resolve('SUCCESS');
            } else {
                resolve('FAILED');
            }
        });
        
        curl.stdout.on('data', (data) => {
            clearTimeout(timer);
            const httpCode = data.toString().trim();
            resolve(httpCode === '200' ? 'SUCCESS' : httpCode);
        });
    });
};

// Check if servers are running
Promise.all([
    checkServer('http://localhost:3000'),
    checkServer('http://localhost:3001/api/health'),
    checkServer('http://localhost:3000/test/stock-header')
]).then(([frontend, backend, testRoute]) => {
    console.log(`   ${frontend === 'SUCCESS' ? '✅' : '❌'} Frontend server (http://localhost:3000) - ${frontend}`);
    console.log(`   ${backend === 'SUCCESS' ? '✅' : '❌'} Backend server (http://localhost:3001) - ${backend}`);
    console.log(`   ${testRoute === 'SUCCESS' ? '✅' : '❌'} Test route (http://localhost:3000/test/stock-header) - ${testRoute}`);
    
    // Final summary
    console.log('\n📊 Integration Test Summary');
    console.log('===========================');
    
    const allTests = [
        frontend === 'SUCCESS',
        backend === 'SUCCESS',
        testRoute === 'SUCCESS'
    ];
    
    const passedTests = allTests.filter(Boolean).length;
    const totalTests = allTests.length;
    const passRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log(`📈 Integration Pass Rate: ${passedTests}/${totalTests} (${passRate}%)`);
    
    if (passRate >= 100) {
        console.log('🎉 Perfect! Component is fully integrated and ready to use');
        console.log('\n🚀 Ready for Manual Testing:');
        console.log('   • Visit: http://localhost:3000/test/stock-header');
        console.log('   • Test all interactive features');
        console.log('   • Verify responsive behavior');
        console.log('   • Check error handling with invalid logo');
    } else if (passRate >= 66) {
        console.log('✅ Component integration looks good with minor issues');
        if (frontend !== 'SUCCESS') {
            console.log('   ⚠️  Frontend server may not be running - start with `npm run dev`');
        }
        if (backend !== 'SUCCESS') {
            console.log('   ⚠️  Backend server may not be running - check server logs');
        }
    } else {
        console.log('❌ Component has integration issues that need to be resolved');
    }
    
}).catch(error => {
    console.log('   ❌ Server check failed:', error.message);
    console.log('\n💡 Tip: Make sure to run `npm run dev` to start the development servers');
});