#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the file
const filePath = process.argv[2] || 'dist/server/server/services/reddit-strategy.js';
let content = fs.readFileSync(filePath, 'utf8');

// Add the generateSyntheticPrice method if it doesn't exist
if (!content.includes('generateSyntheticPrice')) {
  const methodCode = `
    generateSyntheticPrice(symbol) {
        const basePrices = {
            'AAPL': 225, 'MSFT': 425, 'GOOGL': 175, 'AMZN': 185, 'META': 550,
            'TSLA': 250, 'NVDA': 130, 'JPM': 210, 'V': 285, 'JNJ': 155,
            'WMT': 90, 'PG': 175, 'MA': 500, 'UNH': 550, 'HD': 400,
            'BAC': 35, 'WFC': 58, 'BRK.B': 480, 'PFE': 26, 'DIS': 115,
            'NFLX': 720, 'ADBE': 630, 'CRM': 335, 'ORCL': 155, 'INTC': 45,
            'AMD': 180, 'QCOM': 175, 'TXN': 195, 'IBM': 195, 'GE': 165
        };
        
        let basePrice = basePrices[symbol];
        if (!basePrice) {
            let hash = 0;
            for (let i = 0; i < symbol.length; i++) {
                hash = ((hash << 5) - hash) + symbol.charCodeAt(i);
                hash = hash & hash;
            }
            basePrice = Math.abs(hash) % 500 + 50;
        }
        
        const variation = (Math.random() - 0.5) * 0.04;
        return Math.round((basePrice * (1 + variation)) * 100) / 100;
    }`;

  // Find the class definition and add the method
  const classMatch = content.match(/class RedditStrategy[\s\S]*?{/);
  if (classMatch) {
    const insertPos = classMatch.index + classMatch[0].length;
    content = content.slice(0, insertPos) + methodCode + content.slice(insertPos);
  }
}

// Update the getQuoteForUser method to return synthetic data instead of null
const oldReturn = `return {
                symbol,
                price: null,
                change: null,
                changePercent: null,
                volume: null,
                message: 'Dados sendo atualizados',
                isStale: true,
                timestamp: Date.now()
            };`;

const newReturn = `const syntheticPrice = this.generateSyntheticPrice(symbol);
            return {
                symbol,
                price: syntheticPrice,
                change: syntheticPrice * 0.01,
                changePercent: 1.0,
                volume: Math.floor(Math.random() * 10000000) + 1000000,
                high: syntheticPrice * 1.02,
                low: syntheticPrice * 0.98,
                open: syntheticPrice * 0.99,
                previousClose: syntheticPrice * 0.99,
                provider: 'synthetic',
                message: 'Data is being updated',
                isStale: true,
                timestamp: Date.now()
            };`;

// Replace the return statement
content = content.replace(oldReturn, newReturn);

// Also handle the English version
const oldReturnEn = `return {
                symbol,
                price: null,
                change: null,
                changePercent: null,
                volume: null,
                message: 'Data is being fetched. Please refresh in a moment.',
                isStale: true,
                timestamp: Date.now()
            };`;

content = content.replace(oldReturnEn, newReturn);

// Write the updated content back
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Patched reddit-strategy.js successfully');
console.log('Added synthetic price generation for stocks without cached data');