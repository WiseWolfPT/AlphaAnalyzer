#!/usr/bin/env node

/**
 * Deployment Monitoring Script for Alfalyzer CI/CD
 * 
 * Monitors deployments in real-time and provides alerts
 * for cost overruns, performance issues, and failures.
 */

import https from 'https';
import fs from 'fs';
import path from 'path';

const COLORS = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  RESET: '\x1b[0m'
};

class DeploymentMonitor {
  constructor() {
    this.environment = process.argv.includes('--environment=production') ? 'production' : 'staging';
    this.urls = {
      staging: 'https://alfalyzer-staging.vercel.app',
      production: 'https://alfalyzer.vercel.app'
    };
    this.checks = [];
    this.alerts = [];
    this.metrics = {
      responseTime: 0,
      availability: 0,
      errorRate: 0
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const color = {
      'error': COLORS.RED,
      'warning': COLORS.YELLOW,
      'success': COLORS.GREEN,
      'info': COLORS.BLUE,
      'monitor': COLORS.CYAN
    }[type] || COLORS.RESET;

    console.log(`${color}[${timestamp}] ${message}${COLORS.RESET}`);
  }

  async httpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const endTime = Date.now();
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
            responseTime: endTime - startTime
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  async checkHealth() {
    this.log('🏥 Checking application health...', 'monitor');
    
    const baseUrl = this.urls[this.environment];
    const healthEndpoints = [
      '/health',
      '/api/health',
      '/'
    ];

    let healthyEndpoints = 0;
    let totalResponseTime = 0;

    for (const endpoint of healthEndpoints) {
      try {
        const response = await this.httpRequest(`${baseUrl}${endpoint}`);
        
        if (response.statusCode >= 200 && response.statusCode < 400) {
          healthyEndpoints++;
          this.log(`✅ ${endpoint}: ${response.statusCode} (${response.responseTime}ms)`, 'success');
        } else {
          this.log(`❌ ${endpoint}: ${response.statusCode} (${response.responseTime}ms)`, 'error');
          this.alerts.push(`Health check failed: ${endpoint} returned ${response.statusCode}`);
        }
        
        totalResponseTime += response.responseTime;
      } catch (error) {
        this.log(`❌ ${endpoint}: ${error.message}`, 'error');
        this.alerts.push(`Health check error: ${endpoint} - ${error.message}`);
      }
    }

    this.metrics.availability = (healthyEndpoints / healthEndpoints.length) * 100;
    this.metrics.responseTime = totalResponseTime / healthEndpoints.length;

    if (this.metrics.availability < 100) {
      this.alerts.push(`Availability below 100%: ${this.metrics.availability.toFixed(1)}%`);
    }

    if (this.metrics.responseTime > 3000) {
      this.alerts.push(`Response time too high: ${this.metrics.responseTime}ms`);
    }
  }

  async checkPerformance() {
    this.log('📊 Running performance checks...', 'monitor');
    
    const baseUrl = this.urls[this.environment];
    const performanceChecks = [
      { path: '/', name: 'Landing Page' },
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/api/health', name: 'API Health' }
    ];

    for (const check of performanceChecks) {
      try {
        const response = await this.httpRequest(`${baseUrl}${check.path}`);
        
        this.log(`📈 ${check.name}: ${response.responseTime}ms`, 'info');
        
        // Performance thresholds
        if (response.responseTime > 5000) {
          this.alerts.push(`${check.name} response time critical: ${response.responseTime}ms`);
        } else if (response.responseTime > 3000) {
          this.alerts.push(`${check.name} response time warning: ${response.responseTime}ms`);
        }
        
        // Check for error responses
        if (response.statusCode >= 500) {
          this.alerts.push(`${check.name} server error: ${response.statusCode}`);
          this.metrics.errorRate++;
        }
        
      } catch (error) {
        this.log(`❌ ${check.name}: ${error.message}`, 'error');
        this.alerts.push(`Performance check failed: ${check.name} - ${error.message}`);
        this.metrics.errorRate++;
      }
    }

    this.metrics.errorRate = (this.metrics.errorRate / performanceChecks.length) * 100;
  }

  async checkSecurityHeaders() {
    this.log('🔒 Checking security headers...', 'monitor');
    
    const baseUrl = this.urls[this.environment];
    
    try {
      const response = await this.httpRequest(baseUrl);
      const headers = response.headers;
      
      const securityHeaders = {
        'x-frame-options': 'X-Frame-Options',
        'x-content-type-options': 'X-Content-Type-Options',
        'x-xss-protection': 'X-XSS-Protection',
        'strict-transport-security': 'Strict-Transport-Security',
        'content-security-policy': 'Content-Security-Policy'
      };
      
      let securityScore = 0;
      const totalHeaders = Object.keys(securityHeaders).length;
      
      for (const [header, displayName] of Object.entries(securityHeaders)) {
        if (headers[header]) {
          this.log(`✅ ${displayName}: Present`, 'success');
          securityScore++;
        } else {
          this.log(`⚠️ ${displayName}: Missing`, 'warning');
          this.alerts.push(`Security header missing: ${displayName}`);
        }
      }
      
      const securityPercentage = (securityScore / totalHeaders) * 100;
      this.log(`🔒 Security headers score: ${securityPercentage.toFixed(1)}%`, 
               securityPercentage >= 80 ? 'success' : 'warning');
      
    } catch (error) {
      this.log(`❌ Security header check failed: ${error.message}`, 'error');
      this.alerts.push(`Security header check failed: ${error.message}`);
    }
  }

  async checkCostMetrics() {
    this.log('💰 Checking cost metrics...', 'monitor');
    
    // Simulate cost checking (in real implementation, this would connect to actual cost APIs)
    const estimatedCosts = {
      staging: { current: 5, limit: 50 },
      production: { current: 25, limit: 200 }
    };
    
    const costs = estimatedCosts[this.environment];
    const costPercentage = (costs.current / costs.limit) * 100;
    
    this.log(`💲 Current cost: $${costs.current} / $${costs.limit} (${costPercentage.toFixed(1)}%)`, 'info');
    
    if (costPercentage > 80) {
      this.alerts.push(`Cost approaching limit: ${costPercentage.toFixed(1)}% of budget used`);
    }
    
    if (costs.current > costs.limit) {
      this.alerts.push(`CRITICAL: Cost limit exceeded! $${costs.current} > $${costs.limit}`);
    }
  }

  async checkDatabaseConnection() {
    this.log('🗄️ Checking database connectivity...', 'monitor');
    
    const baseUrl = this.urls[this.environment];
    
    try {
      // Check API endpoints that require database
      const dbEndpoints = [
        '/api/stocks',
        '/api/watchlists'
      ];
      
      for (const endpoint of dbEndpoints) {
        try {
          const response = await this.httpRequest(`${baseUrl}${endpoint}`);
          
          if (response.statusCode === 200) {
            this.log(`✅ Database endpoint ${endpoint}: Connected`, 'success');
          } else if (response.statusCode === 500) {
            this.alerts.push(`Database connection issue: ${endpoint} returned 500`);
          }
        } catch (error) {
          this.alerts.push(`Database endpoint ${endpoint} unreachable: ${error.message}`);
        }
      }
      
    } catch (error) {
      this.log(`❌ Database check failed: ${error.message}`, 'error');
      this.alerts.push(`Database connectivity check failed: ${error.message}`);
    }
  }

  async checkAPIEndpoints() {
    this.log('🔌 Checking critical API endpoints...', 'monitor');
    
    const baseUrl = this.urls[this.environment];
    const apiEndpoints = [
      { path: '/api/health', method: 'GET', critical: true },
      { path: '/api/stocks', method: 'GET', critical: false },
      { path: '/api/market-data', method: 'GET', critical: false }
    ];
    
    for (const endpoint of apiEndpoints) {
      try {
        const response = await this.httpRequest(`${baseUrl}${endpoint.path}`);
        
        if (response.statusCode >= 200 && response.statusCode < 400) {
          this.log(`✅ API ${endpoint.path}: ${response.statusCode}`, 'success');
        } else {
          const level = endpoint.critical ? 'error' : 'warning';
          this.log(`${endpoint.critical ? '❌' : '⚠️'} API ${endpoint.path}: ${response.statusCode}`, level);
          
          if (endpoint.critical) {
            this.alerts.push(`Critical API endpoint failed: ${endpoint.path} returned ${response.statusCode}`);
          }
        }
      } catch (error) {
        const level = endpoint.critical ? 'error' : 'warning';
        this.log(`${endpoint.critical ? '❌' : '⚠️'} API ${endpoint.path}: ${error.message}`, level);
        
        if (endpoint.critical) {
          this.alerts.push(`Critical API endpoint error: ${endpoint.path} - ${error.message}`);
        }
      }
    }
  }

  generateReport() {
    this.log('\n📊 DEPLOYMENT MONITORING REPORT', 'monitor');
    this.log('================================', 'monitor');
    
    this.log(`Environment: ${this.environment}`, 'info');
    this.log(`URL: ${this.urls[this.environment]}`, 'info');
    this.log(`Monitoring time: ${new Date().toISOString()}`, 'info');
    
    this.log('\n📈 Metrics:', 'info');
    this.log(`Availability: ${this.metrics.availability.toFixed(1)}%`, 
             this.metrics.availability >= 99 ? 'success' : 'warning');
    this.log(`Average response time: ${this.metrics.responseTime.toFixed(0)}ms`, 
             this.metrics.responseTime <= 3000 ? 'success' : 'warning');
    this.log(`Error rate: ${this.metrics.errorRate.toFixed(1)}%`, 
             this.metrics.errorRate === 0 ? 'success' : 'error');
    
    if (this.alerts.length > 0) {
      this.log('\n🚨 ALERTS:', 'error');
      this.alerts.forEach(alert => {
        this.log(`  - ${alert}`, 'error');
      });
      
      // Determine severity
      const criticalAlerts = this.alerts.filter(alert => 
        alert.includes('CRITICAL') || 
        alert.includes('server error') ||
        alert.includes('Critical API')
      );
      
      if (criticalAlerts.length > 0) {
        this.log('\n🆘 CRITICAL ISSUES DETECTED', 'error');
        this.log('Immediate attention required!', 'error');
        return 2; // Critical exit code
      } else {
        this.log('\n⚠️ NON-CRITICAL ISSUES DETECTED', 'warning');
        this.log('Review recommended', 'warning');
        return 1; // Warning exit code
      }
    } else {
      this.log('\n✅ ALL CHECKS PASSED', 'success');
      this.log('Deployment is healthy', 'success');
      return 0; // Success exit code
    }
  }

  async run() {
    this.log(`🔍 Starting deployment monitoring for ${this.environment}...`, 'monitor');
    
    try {
      await this.checkHealth();
      await this.checkPerformance();
      await this.checkSecurityHeaders();
      await this.checkCostMetrics();
      await this.checkDatabaseConnection();
      await this.checkAPIEndpoints();
      
      return this.generateReport();
    } catch (error) {
      this.log(`❌ Monitoring failed: ${error.message}`, 'error');
      return 3; // Fatal error exit code
    }
  }
}

// Run deployment monitoring
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new DeploymentMonitor();
  monitor.run().then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('Fatal error during deployment monitoring:', error);
    process.exit(3);
  });
}

export default DeploymentMonitor;