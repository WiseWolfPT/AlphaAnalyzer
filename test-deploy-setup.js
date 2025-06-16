#!/usr/bin/env node

/**
 * Test Deployment Setup
 * Validates that all prerequisites are met for deployment
 */

const fs = require('fs');
const path = require('path');

function log(message, color = 'reset') {
    const colors = {
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        reset: '\x1b[0m'
    };
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvironment() {
    log('Checking environment variables...', 'yellow');
    
    const required = ['GIT_REPO', 'VERCEL_TOKEN', 'VERCEL_PROJECT_ID', 'VERCEL_ORG_ID'];
    const missing = required.filter(env => !process.env[env]);
    
    if (missing.length > 0) {
        log(`❌ Missing environment variables: ${missing.join(', ')}`, 'red');
        return false;
    }
    
    log('✅ All environment variables present', 'green');
    return true;
}

function checkFiles() {
    log('Checking required files...', 'yellow');
    
    const requiredFiles = [
        'client/src/pages/StockCharts.tsx',
        'client/src/App.tsx',
        'package.json',
        'vite.config.ts'
    ];
    
    const missing = requiredFiles.filter(file => !fs.existsSync(file));
    
    if (missing.length > 0) {
        log(`❌ Missing files: ${missing.join(', ')}`, 'red');
        return false;
    }
    
    log('✅ All required files present', 'green');
    return true;
}

function checkChartComponents() {
    log('Checking chart components...', 'yellow');
    
    const chartsDir = 'client/src/components/charts';
    if (!fs.existsSync(chartsDir)) {
        log('❌ Charts directory not found', 'red');
        return false;
    }
    
    const requiredCharts = [
        'price-chart.tsx',
        'revenue-chart.tsx',
        'revenue-segment-chart.tsx',
        'ebitda-chart.tsx',
        'free-cash-flow-chart.tsx',
        'net-income-chart.tsx',
        'eps-chart.tsx',
        'cash-debt-chart.tsx',
        'dividends-chart.tsx',
        'return-capital-chart.tsx',
        'shares-chart.tsx',
        'ratios-chart.tsx',
        'valuation-chart.tsx',
        'expenses-chart.tsx'
    ];
    
    const missing = requiredCharts.filter(chart => 
        !fs.existsSync(path.join(chartsDir, chart))
    );
    
    if (missing.length > 0) {
        log(`❌ Missing chart components: ${missing.join(', ')}`, 'red');
        return false;
    }
    
    log(`✅ All ${requiredCharts.length} chart components present`, 'green');
    return true;
}

function checkStockChartsImplementation() {
    log('Checking StockCharts.tsx implementation...', 'yellow');
    
    const stockChartsPath = 'client/src/pages/StockCharts.tsx';
    if (!fs.existsSync(stockChartsPath)) {
        log('❌ StockCharts.tsx not found', 'red');
        return false;
    }
    
    const content = fs.readFileSync(stockChartsPath, 'utf8');
    
    // Check for chart imports
    const chartImports = content.match(/import.*Chart.*from.*charts/g) || [];
    if (chartImports.length < 14) {
        log(`❌ Insufficient chart imports in StockCharts.tsx (found: ${chartImports.length}, expected: 14)`, 'red');
        return false;
    }
    
    // Check for chart usage
    const chartUsage = content.match(/<\w*Chart.*data=/g) || [];
    if (chartUsage.length < 14) {
        log(`❌ Insufficient chart usage in StockCharts.tsx (found: ${chartUsage.length}, expected: 14)`, 'red');
        return false;
    }
    
    log('✅ StockCharts.tsx properly implements 14 charts', 'green');
    return true;
}

function checkRouting() {
    log('Checking App.tsx routing...', 'yellow');
    
    const appPath = 'client/src/App.tsx';
    if (!fs.existsSync(appPath)) {
        log('❌ App.tsx not found', 'red');
        return false;
    }
    
    const content = fs.readFileSync(appPath, 'utf8');
    
    if (!content.includes('/stock/:symbol')) {
        log('❌ Missing /stock/:symbol route in App.tsx', 'red');
        return false;
    }
    
    if (!content.includes('StockCharts')) {
        log('❌ StockCharts component not referenced in App.tsx', 'red');
        return false;
    }
    
    log('✅ Routing properly configured', 'green');
    return true;
}

function main() {
    log('🚀 Testing deployment setup...', 'green');
    log('=====================================', 'green');
    
    const checks = [
        checkEnvironment,
        checkFiles,
        checkChartComponents,
        checkStockChartsImplementation,
        checkRouting
    ];
    
    let allPassed = true;
    
    for (const check of checks) {
        if (!check()) {
            allPassed = false;
        }
        console.log(''); // Empty line for spacing
    }
    
    log('=====================================', 'green');
    
    if (allPassed) {
        log('🎉 All checks passed! Ready for deployment.', 'green');
        log('Run: node run-deploy.js', 'yellow');
    } else {
        log('❌ Some checks failed. Please fix the issues above.', 'red');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}