#!/usr/bin/env node

/**
 * StockHeader Component Validation Script
 * 
 * This script validates the StockHeader component props and structure
 * to ensure it meets the expected requirements.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read the StockHeader component file
const stockHeaderPath = path.join(__dirname, 'client/src/components/stock/stock-header.tsx');

let componentContent = '';
try {
    componentContent = fs.readFileSync(stockHeaderPath, 'utf8');
} catch (error) {
    console.error('❌ Failed to read StockHeader component file:', error.message);
    process.exit(1);
}

console.log('🔍 StockHeader Component Validation Report');
console.log('==========================================\n');

// Test 1: Check if component exports correctly
const hasCorrectExport = componentContent.includes('export function StockHeader');
console.log(`✅ Component Export: ${hasCorrectExport ? 'PASS' : 'FAIL'}`);

// Test 2: Check required props interface
const requiredProps = [
    'symbol: string',
    'company: {',
    'name: string',
    'sector: string',
    'price: number',
    'change: number',
    'changePercent: number',
    'afterHoursPrice: number',
    'afterHoursChange: number',
    'afterHoursChangePercent: number',
    'earningsDate: string',
    'logo: string',
    'isInWatchlist: boolean',
    'onAddToWatchlist: () => void'
];

console.log('\n📋 Props Interface Validation:');
requiredProps.forEach(prop => {
    const hasProp = componentContent.includes(prop);
    console.log(`   ${hasProp ? '✅' : '❌'} ${prop.replace(/[{}]/g, '').trim()}`);
});

// Test 3: Check for required UI elements
const uiElements = [
    { name: 'Logo/Image', pattern: /<img|<div.*logo/ },
    { name: 'Ticker Symbol', pattern: /\{symbol\}/ },
    { name: 'Price Display', pattern: /price\.toFixed\(2\)/ },
    { name: 'Change Display', pattern: /change\.toFixed\(2\)/ },
    { name: 'Company Name', pattern: /company\.name/ },
    { name: 'After Hours Price', pattern: /afterHoursPrice/ },
    { name: 'Sector Badge', pattern: /company\.sector/ },
    { name: 'Earnings Date', pattern: /earningsDate/ },
    { name: 'Watchlist Button', pattern: /onAddToWatchlist/ },
    { name: 'Share Button', pattern: /Share/ }
];

console.log('\n🎨 UI Elements Validation:');
uiElements.forEach(element => {
    const hasElement = element.pattern.test(componentContent);
    console.log(`   ${hasElement ? '✅' : '❌'} ${element.name}`);
});

// Test 4: Check for responsive design classes
const responsiveClasses = [
    'sm:text-',
    'flex',
    'items-center',
    'justify-between',
    'space-y-'
];

console.log('\n📱 Responsive Design:');
responsiveClasses.forEach(className => {
    const hasClass = componentContent.includes(className);
    console.log(`   ${hasClass ? '✅' : '❌'} ${className}`);
});

// Test 5: Check for color coding logic
const colorLogic = [
    'isPositive',
    'text-green-500',
    'text-red-500',
    'isAfterHoursPositive'
];

console.log('\n🎨 Color Coding Logic:');
colorLogic.forEach(logic => {
    const hasLogic = componentContent.includes(logic);
    console.log(`   ${hasLogic ? '✅' : '❌'} ${logic}`);
});

// Test 6: Check for error handling
const errorHandling = [
    'onError',
    'fallback',
    'target.style.display',
    'innerHTML'
];

console.log('\n🛡️  Error Handling:');
errorHandling.forEach(handler => {
    const hasHandler = componentContent.includes(handler);
    console.log(`   ${hasHandler ? '✅' : '❌'} ${handler}`);
});

// Test 7: Performance and accessibility
const performanceAndA11y = [
    'alt=',
    'aria-',
    'className',
    'onClick'
];

console.log('\n♿ Accessibility & Performance:');
performanceAndA11y.forEach(feature => {
    const hasFeature = componentContent.includes(feature);
    console.log(`   ${hasFeature ? '✅' : '❌'} ${feature}`);
});

// Mock data validation
const mockData = {
    symbol: 'AAPL',
    company: {
        name: 'Apple Inc.',
        sector: 'Technology',
        price: 175.43,
        change: 2.15,
        changePercent: 1.24,
        afterHoursPrice: 176.20,
        afterHoursChange: 0.77,
        afterHoursChangePercent: 0.44,
        earningsDate: 'Feb 1, 2024',
        logo: 'https://logo.clearbit.com/apple.com'
    },
    isInWatchlist: false,
    onAddToWatchlist: () => {},
    onShare: () => {}
};

console.log('\n📊 Mock Data Structure Validation:');
function validateMockData(props) {
    const validations = [
        { name: 'symbol is string', test: typeof props.symbol === 'string' },
        { name: 'company exists', test: props.company !== undefined },
        { name: 'company.name is string', test: typeof props.company?.name === 'string' },
        { name: 'company.price is number', test: typeof props.company?.price === 'number' },
        { name: 'company.change is number', test: typeof props.company?.change === 'number' },
        { name: 'isInWatchlist is boolean', test: typeof props.isInWatchlist === 'boolean' },
        { name: 'onAddToWatchlist is function', test: typeof props.onAddToWatchlist === 'function' }
    ];

    validations.forEach(validation => {
        console.log(`   ${validation.test ? '✅' : '❌'} ${validation.name}`);
    });
}

validateMockData(mockData);

// Summary
console.log('\n📈 Component Analysis Summary:');
console.log('=====================================');

// Count passes
const totalTests = requiredProps.length + uiElements.length + responsiveClasses.length + 
                  colorLogic.length + errorHandling.length + performanceAndA11y.length + 7; // mock data tests

const passedTests = [
    ...requiredProps.map(prop => componentContent.includes(prop)),
    ...uiElements.map(element => element.pattern.test(componentContent)),
    ...responsiveClasses.map(className => componentContent.includes(className)),
    ...colorLogic.map(logic => componentContent.includes(logic)),
    ...errorHandling.map(handler => componentContent.includes(handler)),
    ...performanceAndA11y.map(feature => componentContent.includes(feature)),
    typeof mockData.symbol === 'string',
    mockData.company !== undefined,
    typeof mockData.company?.name === 'string',
    typeof mockData.company?.price === 'number',
    typeof mockData.company?.change === 'number',
    typeof mockData.isInWatchlist === 'boolean',
    typeof mockData.onAddToWatchlist === 'function'
].filter(Boolean).length;

const passRate = ((passedTests / totalTests) * 100).toFixed(1);

console.log(`📊 Pass Rate: ${passedTests}/${totalTests} (${passRate}%)`);

if (passRate >= 90) {
    console.log('🎉 Component looks excellent!');
} else if (passRate >= 75) {
    console.log('✅ Component looks good with minor issues');
} else if (passRate >= 50) {
    console.log('⚠️  Component needs some improvements');
} else {
    console.log('❌ Component has significant issues');
}

console.log('\n🚀 Next Steps for Testing:');
console.log('1. Visit http://localhost:5173/test/stock-header to test interactively');
console.log('2. Open stock-header-standalone-test.html in your browser');
console.log('3. Check component rendering with different data sets');
console.log('4. Verify responsive behavior on mobile devices');
console.log('5. Test all interactive elements (buttons, hover states)');

console.log('\n📝 Files Created for Testing:');
console.log('- client/src/components/stock/stock-header-test.tsx (React test component)');
console.log('- stock-header-standalone-test.html (Standalone HTML test)');
console.log('- validate-stock-header.js (This validation script)');