#!/usr/bin/env node

/**
 * Comprehensive End-to-End Validation Script for Alfalyzer Real Data Integration
 * Agent 5 - Final Validation Testing
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

class AlfalyzerValidator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const symbols = {
      info: 'ℹ️ ',
      success: '✅',
      error: '❌',
      warning: '⚠️ ',
      loading: '🔄'
    };
    
    console.log(`${symbols[type]} [${timestamp}] ${message}`);
    
    this.results.tests.push({
      timestamp,
      message,
      type,
      success: type === 'success'
    });
    
    this.results.summary.total++;
    if (type === 'success') this.results.summary.passed++;
    else if (type === 'error') this.results.summary.failed++;
    else if (type === 'warning') this.results.summary.warnings++;
  }

  async testAPI(url, name, expectedKeys = []) {
    try {
      this.log(`Testing ${name}: ${url}`, 'loading');
      
      const response = await fetch(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Alfalyzer-Validator/1.0'
        }
      });

      if (!response.ok) {
        this.log(`${name} failed: HTTP ${response.status}`, 'error');
        return false;
      }

      const data = await response.json();
      
      // Check for expected keys if provided
      if (expectedKeys.length > 0) {
        const missingKeys = expectedKeys.filter(key => !(key in data));
        if (missingKeys.length > 0) {
          this.log(`${name} missing keys: ${missingKeys.join(', ')}`, 'warning');
        }
      }
      
      this.log(`${name} responded successfully`, 'success');
      return data;
    } catch (error) {
      this.log(`${name} failed: ${error.message}`, 'error');
      return false;
    }
  }

  async validateBackendHealth() {
    this.log('=== BACKEND HEALTH VALIDATION ===', 'info');
    
    const healthEndpoints = [
      { url: 'http://localhost:3001/health', name: 'Main Backend Health' },
      { url: 'http://localhost:3001/api/health', name: 'Main Backend API Health' },
      { url: 'http://localhost:3003/health', name: 'Working Server Health' },
      { url: 'http://localhost:3003/api/health', name: 'Working Server API Health' }
    ];

    for (const endpoint of healthEndpoints) {
      await this.testAPI(endpoint.url, endpoint.name, ['status']);
    }
  }

  async validateRealDataAPIs() {
    this.log('=== REAL DATA API VALIDATION ===', 'info');
    
    const marketDataEndpoints = [
      { url: 'http://localhost:3003/api/market-data/test', name: 'Market Data Test', keys: ['providers', 'workingProviders'] },
      { url: 'http://localhost:3003/api/market-data/quote/AAPL', name: 'AAPL Quote', keys: ['symbol', 'price', 'provider'] },
      { url: 'http://localhost:3003/api/market-data/quote/GOOGL', name: 'GOOGL Quote', keys: ['symbol', 'price'] },
      { url: 'http://localhost:3003/api/stocks', name: 'Stocks List', keys: [] },
      { url: 'http://localhost:3003/api/stocks/TSLA', name: 'TSLA Individual Stock', keys: ['symbol', 'price'] }
    ];

    const realDataResults = [];
    
    for (const endpoint of marketDataEndpoints) {
      const result = await this.testAPI(endpoint.url, endpoint.name, endpoint.keys);
      if (result) {
        realDataResults.push({ endpoint: endpoint.name, data: result });
        
        // Validate data quality
        if (result.symbol && result.price) {
          const price = parseFloat(result.price);
          if (price > 0 && price < 10000) {
            this.log(`${endpoint.name} has realistic price: $${price}`, 'success');
          } else {
            this.log(`${endpoint.name} has unrealistic price: $${price}`, 'warning');
          }
        }
      }
    }
    
    return realDataResults;
  }

  async validateFrontendIntegration() {
    this.log('=== FRONTEND INTEGRATION VALIDATION ===', 'info');
    
    try {
      // Check if frontend server is running
      const frontendResponse = await fetch('http://localhost:3000', { timeout: 5000 });
      if (frontendResponse.ok) {
        this.log('Frontend server is accessible', 'success');
      } else {
        this.log(`Frontend server returned HTTP ${frontendResponse.status}`, 'warning');
      }
    } catch (error) {
      this.log(`Frontend server not accessible: ${error.message}`, 'error');
    }

    // Check key frontend files exist
    const frontendFiles = [
      'client/src/services/real-data-integration.ts',
      'client/src/hooks/use-enhanced-stocks.ts',
      'client/src/lib/enhanced-api.ts',
      'client/src/components/stock/enhanced-stock-card.tsx',
      'client/src/pages/dashboard-enhanced.tsx'
    ];

    for (const file of frontendFiles) {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        this.log(`Frontend component exists: ${file}`, 'success');
      } else {
        this.log(`Frontend component missing: ${file}`, 'error');
      }
    }
  }

  async validateExternalAPIs() {
    this.log('=== EXTERNAL API VALIDATION ===', 'info');
    
    const externalAPIs = [
      {
        url: 'https://api.twelvedata.com/quote?symbol=AAPL&apikey=demo',
        name: 'Twelve Data API (Demo)',
        keys: ['symbol', 'close']
      },
      {
        url: 'https://query1.finance.yahoo.com/v8/finance/chart/AAPL',
        name: 'Yahoo Finance API',
        keys: ['chart']
      }
    ];

    for (const api of externalAPIs) {
      try {
        const result = await this.testAPI(api.url, api.name, api.keys);
        if (result) {
          if (api.name.includes('Twelve Data') && result.close) {
            this.log(`Twelve Data returned AAPL price: $${result.close}`, 'success');
          } else if (api.name.includes('Yahoo') && result.chart?.result?.[0]?.meta?.regularMarketPrice) {
            this.log(`Yahoo Finance returned AAPL price: $${result.chart.result[0].meta.regularMarketPrice}`, 'success');
          }
        }
      } catch (error) {
        this.log(`External API ${api.name} failed: ${error.message}`, 'warning');
      }
    }
  }

  async validatePerformanceAndCaching() {
    this.log('=== PERFORMANCE & CACHING VALIDATION ===', 'info');
    
    // Test response times
    const startTime = Date.now();
    const result = await this.testAPI('http://localhost:3003/api/market-data/quote/AAPL', 'Performance Test');
    const responseTime = Date.now() - startTime;
    
    if (responseTime < 2000) {
      this.log(`API response time acceptable: ${responseTime}ms`, 'success');
    } else if (responseTime < 5000) {
      this.log(`API response time slow: ${responseTime}ms`, 'warning');
    } else {
      this.log(`API response time too slow: ${responseTime}ms`, 'error');
    }

    // Test caching by making the same request again
    const cacheStartTime = Date.now();
    await this.testAPI('http://localhost:3003/api/market-data/quote/AAPL', 'Cache Test');
    const cacheResponseTime = Date.now() - cacheStartTime;
    
    if (cacheResponseTime < responseTime) {
      this.log('Caching appears to be working (faster second request)', 'success');
    } else {
      this.log('Caching may not be working optimally', 'warning');
    }
  }

  async validateDataConsistency() {
    this.log('=== DATA CONSISTENCY VALIDATION ===', 'info');
    
    // Test the same stock from different endpoints
    const endpoints = [
      'http://localhost:3003/api/stocks/AAPL',
      'http://localhost:3003/api/market-data/quote/AAPL'
    ];
    
    const results = [];
    for (const endpoint of endpoints) {
      const result = await this.testAPI(endpoint, `Data Consistency Test: ${endpoint}`, ['symbol', 'price']);
      if (result) results.push(result);
    }
    
    if (results.length >= 2) {
      const prices = results.map(r => parseFloat(r.price || 0)).filter(p => p > 0);
      if (prices.length >= 2) {
        const priceDiff = Math.abs(prices[0] - prices[1]);
        const percentDiff = (priceDiff / prices[0]) * 100;
        
        if (percentDiff < 5) {
          this.log(`Data consistency good: price difference ${percentDiff.toFixed(2)}%`, 'success');
        } else {
          this.log(`Data consistency warning: price difference ${percentDiff.toFixed(2)}%`, 'warning');
        }
      }
    }
  }

  async runComprehensiveValidation() {
    this.log('🚀 Starting Comprehensive Alfalyzer Validation', 'info');
    this.log('Agent 5 - Final End-to-End Validation & Deployment Assessment', 'info');
    
    try {
      await this.validateBackendHealth();
      await this.validateRealDataAPIs();
      await this.validateFrontendIntegration();
      await this.validateExternalAPIs();
      await this.validatePerformanceAndCaching();
      await this.validateDataConsistency();
      
      this.generateFinalReport();
    } catch (error) {
      this.log(`Validation failed with error: ${error.message}`, 'error');
    }
  }

  generateFinalReport() {
    this.log('=== VALIDATION SUMMARY ===', 'info');
    
    const { total, passed, failed, warnings } = this.results.summary;
    const successRate = ((passed / total) * 100).toFixed(1);
    
    this.log(`Total Tests: ${total}`, 'info');
    this.log(`Passed: ${passed}`, 'success');
    this.log(`Failed: ${failed}`, failed > 0 ? 'error' : 'info');
    this.log(`Warnings: ${warnings}`, warnings > 0 ? 'warning' : 'info');
    this.log(`Success Rate: ${successRate}%`, successRate >= 80 ? 'success' : 'warning');
    
    // Generate recommendation
    if (successRate >= 90) {
      this.log('🎉 RECOMMENDATION: System is ready for production deployment!', 'success');
    } else if (successRate >= 70) {
      this.log('📝 RECOMMENDATION: System needs minor fixes before production', 'warning');
    } else {
      this.log('🔧 RECOMMENDATION: System needs significant work before production', 'error');
    }
    
    // Save detailed report
    const reportPath = path.join(__dirname, 'validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    this.log(`Detailed report saved to: ${reportPath}`, 'info');
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new AlfalyzerValidator();
  validator.runComprehensiveValidation().catch(console.error);
}

module.exports = AlfalyzerValidator;