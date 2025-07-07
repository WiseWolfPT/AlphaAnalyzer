#!/usr/bin/env node

/**
 * Cost Protection Check for Alfalyzer CI/CD Pipeline
 * 
 * This script validates cost protection mechanisms and estimates
 * deployment costs to prevent unexpected charges.
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m'
};

class CostProtectionChecker {
  constructor() {
    this.environment = this.parseEnvironment();
    this.strict = process.argv.includes('--strict=true');
    this.costs = {
      estimated: 0,
      breakdown: {}
    };
    this.protections = [];
    this.violations = [];
    this.limits = this.getCostLimits();
  }

  parseEnvironment() {
    const envArg = process.argv.find(arg => arg.startsWith('--environment='));
    return envArg ? envArg.split('=')[1] : 'development';
  }

  getCostLimits() {
    return {
      development: { max: 10, warning: 5 },
      staging: { max: 50, warning: 25 },
      production: { max: 200, warning: 100 }
    }[this.environment] || { max: 10, warning: 5 };
  }

  log(message, type = 'info') {
    const color = {
      'error': COLORS.RED,
      'warning': COLORS.YELLOW,
      'success': COLORS.GREEN,
      'info': COLORS.BLUE
    }[type] || COLORS.RESET;

    console.log(`${color}${message}${COLORS.RESET}`);
  }

  checkCostProtectionMiddleware() {
    this.log('💰 Checking cost protection middleware...', 'info');
    
    const middlewareFile = 'server/middleware/cost-protection.ts';
    if (fs.existsSync(middlewareFile)) {
      this.protections.push('Cost protection middleware active');
      this.log('✅ Cost protection middleware found', 'success');
      
      try {
        const content = fs.readFileSync(middlewareFile, 'utf8');
        
        // Check for rate limiting
        if (content.includes('rate') && content.includes('limit')) {
          this.protections.push('Rate limiting implemented');
          this.log('✅ Rate limiting detected', 'success');
        } else {
          this.violations.push('Rate limiting not found in cost protection');
        }
        
        // Check for emergency switches
        if (content.includes('emergency') || content.includes('killswitch')) {
          this.protections.push('Emergency switches implemented');
          this.log('✅ Emergency switches detected', 'success');
        } else {
          this.violations.push('Emergency switches not implemented');
        }
        
      } catch (error) {
        this.violations.push(`Could not read cost protection middleware: ${error.message}`);
      }
    } else {
      this.violations.push('Cost protection middleware not found');
      this.log('❌ Cost protection middleware missing', 'error');
    }
  }

  checkBudgetMonitor() {
    this.log('📊 Checking budget monitoring...', 'info');
    
    const budgetFile = 'server/services/budget-monitor.ts';
    if (fs.existsSync(budgetFile)) {
      this.protections.push('Budget monitoring service active');
      this.log('✅ Budget monitor found', 'success');
      
      try {
        const content = fs.readFileSync(budgetFile, 'utf8');
        
        // Check for budget tracking
        if (content.includes('budget') && content.includes('track')) {
          this.protections.push('Budget tracking implemented');
        }
        
        // Check for alert mechanisms
        if (content.includes('alert') || content.includes('notify')) {
          this.protections.push('Budget alerts implemented');
        }
        
      } catch (error) {
        this.violations.push(`Could not analyze budget monitor: ${error.message}`);
      }
    } else {
      this.violations.push('Budget monitoring service not found');
      this.log('❌ Budget monitor missing', 'error');
    }
  }

  checkEmergencySwitches() {
    this.log('🚨 Checking emergency switches...', 'info');
    
    const emergencyFile = 'server/utils/emergency-switches.ts';
    if (fs.existsSync(emergencyFile)) {
      this.protections.push('Emergency switches available');
      this.log('✅ Emergency switches found', 'success');
    } else {
      this.violations.push('Emergency switches not implemented');
      this.log('❌ Emergency switches missing', 'error');
    }
  }

  estimateDeploymentCosts() {
    this.log('💲 Estimating deployment costs...', 'info');
    
    // Base deployment costs
    this.costs.breakdown = {
      'Vercel hosting': this.environment === 'production' ? 5 : 0,
      'Database (Supabase)': 0, // Free tier
      'API calls (estimated)': this.environment === 'production' ? 10 : 2,
      'Monitoring': 0, // Using free tools
      'CDN': 0, // Vercel includes CDN
      'Build time': 1 // GitHub Actions free tier
    };
    
    // Calculate total
    this.costs.estimated = Object.values(this.costs.breakdown)
      .reduce((total, cost) => total + cost, 0);
    
    // Add buffer for unexpected costs
    const buffer = this.costs.estimated * 0.2;
    this.costs.estimated += buffer;
    this.costs.breakdown['Safety buffer (20%)'] = buffer;
    
    this.log(`Estimated deployment cost: $${this.costs.estimated.toFixed(2)}`, 'info');
  }

  checkAPIQuotaLimits() {
    this.log('🔌 Checking API quota protections...', 'info');
    
    // Check for quota tracking
    const quotaFiles = [
      'server/services/quota/quota-tracker.ts',
      'server/services/api-usage-tracker.ts'
    ];
    
    let quotaProtectionFound = false;
    quotaFiles.forEach(file => {
      if (fs.existsSync(file)) {
        quotaProtectionFound = true;
        this.protections.push(`Quota tracking: ${path.basename(file)}`);
      }
    });
    
    if (!quotaProtectionFound) {
      this.violations.push('API quota tracking not found');
    }
    
    // Check for API rotation
    if (fs.existsSync('client/src/lib/api-rotation.ts') || 
        fs.existsSync('server/services/unified-api/unified-api-service.ts')) {
      this.protections.push('API rotation implemented');
      this.log('✅ API rotation found', 'success');
    } else {
      this.violations.push('API rotation not implemented');
    }
  }

  checkCacheConfiguration() {
    this.log('💾 Checking cache configuration...', 'info');
    
    const cacheFiles = [
      'server/cache/intelligent-cache-manager.ts',
      'client/src/lib/cache-manager.ts',
      'server/services/cache/cache-manager.ts'
    ];
    
    let cacheFound = false;
    cacheFiles.forEach(file => {
      if (fs.existsSync(file)) {
        cacheFound = true;
        this.protections.push(`Caching: ${path.basename(file)}`);
      }
    });
    
    if (cacheFound) {
      this.log('✅ Caching mechanisms found', 'success');
      // Caching reduces API costs
      this.costs.breakdown['Cache savings'] = -this.costs.estimated * 0.3;
      this.costs.estimated *= 0.7; // 30% cost reduction
    } else {
      this.violations.push('Caching not properly configured');
      this.log('❌ Caching mechanisms missing', 'error');
    }
  }

  validateCostLimits() {
    this.log('📋 Validating cost limits...', 'info');
    
    const { max, warning } = this.limits;
    
    if (this.costs.estimated > max) {
      this.violations.push(`Estimated cost ($${this.costs.estimated.toFixed(2)}) exceeds limit ($${max})`);
      this.log(`❌ Cost limit exceeded: $${this.costs.estimated.toFixed(2)} > $${max}`, 'error');
      return false;
    } else if (this.costs.estimated > warning) {
      this.violations.push(`Estimated cost ($${this.costs.estimated.toFixed(2)}) exceeds warning threshold ($${warning})`);
      this.log(`⚠️ Cost warning: $${this.costs.estimated.toFixed(2)} > $${warning}`, 'warning');
    } else {
      this.log(`✅ Cost within limits: $${this.costs.estimated.toFixed(2)} <= $${max}`, 'success');
    }
    
    return true;
  }

  generateReport() {
    this.log('\n💰 COST PROTECTION REPORT', 'info');
    this.log('=========================', 'info');
    
    this.log(`Environment: ${this.environment}`, 'info');
    this.log(`Estimated cost: $${this.costs.estimated.toFixed(2)}`, 'info');
    this.log(`Cost limit: $${this.limits.max}`, 'info');
    this.log(`Active protections: ${this.protections.length}`, 'info');
    this.log(`Violations: ${this.violations.length}`, 'info');
    
    // Cost breakdown
    this.log('\n📊 Cost Breakdown:', 'info');
    Object.entries(this.costs.breakdown).forEach(([item, cost]) => {
      const sign = cost >= 0 ? '' : '';
      this.log(`  ${item}: ${sign}$${Math.abs(cost).toFixed(2)}`, cost >= 0 ? 'info' : 'success');
    });
    
    // Active protections
    if (this.protections.length > 0) {
      this.log('\n✅ Active Protections:', 'success');
      this.protections.forEach(protection => {
        this.log(`  - ${protection}`, 'success');
      });
    }
    
    // Violations
    if (this.violations.length > 0) {
      this.log('\n❌ Violations:', 'error');
      this.violations.forEach(violation => {
        this.log(`  - ${violation}`, 'error');
      });
    }
    
    // Deployment approval
    const withinLimits = this.validateCostLimits();
    const hasMinimalProtection = this.protections.length >= 3;
    const hasNoCriticalViolations = this.violations.length === 0 || !this.strict;
    
    const approved = withinLimits && hasMinimalProtection && hasNoCriticalViolations;
    
    this.log('\n🎯 DEPLOYMENT DECISION:', 'info');
    this.log(`Cost approval: ${withinLimits ? '✅' : '❌'}`, withinLimits ? 'success' : 'error');
    this.log(`Protection level: ${hasMinimalProtection ? '✅' : '❌'}`, hasMinimalProtection ? 'success' : 'error');
    this.log(`Violation check: ${hasNoCriticalViolations ? '✅' : '❌'}`, hasNoCriticalViolations ? 'success' : 'error');
    
    if (approved) {
      this.log('\n🚀 DEPLOYMENT APPROVED', 'success');
      this.log('Cost protection mechanisms validated', 'success');
      return 0;
    } else {
      this.log('\n🚫 DEPLOYMENT BLOCKED', 'error');
      this.log('Cost protection requirements not met', 'error');
      return 1;
    }
  }

  async run() {
    this.log(`🔍 Running cost protection checks for ${this.environment}...`, 'info');
    
    try {
      this.checkCostProtectionMiddleware();
      this.checkBudgetMonitor();
      this.checkEmergencySwitches();
      this.checkAPIQuotaLimits();
      this.checkCacheConfiguration();
      this.estimateDeploymentCosts();
      
      return this.generateReport();
    } catch (error) {
      this.log(`❌ Cost protection check failed: ${error.message}`, 'error');
      return 1;
    }
  }
}

// Run cost protection checks
if (require.main === module) {
  const checker = new CostProtectionChecker();
  checker.run().then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('Fatal error during cost protection check:', error);
    process.exit(1);
  });
}

module.exports = CostProtectionChecker;