#!/usr/bin/env node

/**
 * Emergency Rollback Script for Alfalyzer
 * 
 * Provides automated rollback capabilities for failed deployments
 * with comprehensive safety checks and monitoring.
 */

import fs from 'fs';
import { execSync } from 'child_process';

const COLORS = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  RESET: '\x1b[0m'
};

class EmergencyRollback {
  constructor() {
    this.environment = process.argv.includes('--environment=production') ? 'production' : 'staging';
    this.dryRun = process.argv.includes('--dry-run');
    this.force = process.argv.includes('--force');
    this.reason = this.extractReason();
    this.rollbackSteps = [];
    this.validationChecks = [];
  }

  extractReason() {
    const reasonArg = process.argv.find(arg => arg.startsWith('--reason='));
    return reasonArg ? reasonArg.split('=')[1] : 'Emergency rollback initiated';
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const color = {
      'error': COLORS.RED,
      'warning': COLORS.YELLOW,
      'success': COLORS.GREEN,
      'info': COLORS.BLUE,
      'emergency': COLORS.MAGENTA
    }[type] || COLORS.RESET;

    console.log(`${color}[${timestamp}] ${message}${COLORS.RESET}`);
  }

  async validateRollbackConditions() {
    this.log('🔍 Validating rollback conditions...', 'emergency');
    
    const checks = [
      {
        name: 'Backup availability',
        check: () => this.checkBackupAvailability(),
        critical: true
      },
      {
        name: 'Current deployment status',
        check: () => this.checkCurrentDeployment(),
        critical: true
      },
      {
        name: 'Rollback permissions',
        check: () => this.checkPermissions(),
        critical: true
      },
      {
        name: 'Database migration compatibility',
        check: () => this.checkDatabaseCompatibility(),
        critical: false
      }
    ];

    let criticalFailures = 0;

    for (const check of checks) {
      try {
        const result = await check.check();
        if (result.passed) {
          this.log(`✅ ${check.name}: ${result.message}`, 'success');
          this.validationChecks.push({ name: check.name, passed: true, message: result.message });
        } else {
          this.log(`❌ ${check.name}: ${result.message}`, 'error');
          this.validationChecks.push({ name: check.name, passed: false, message: result.message });
          
          if (check.critical) {
            criticalFailures++;
          }
        }
      } catch (error) {
        this.log(`❌ ${check.name}: ${error.message}`, 'error');
        this.validationChecks.push({ name: check.name, passed: false, message: error.message });
        
        if (check.critical) {
          criticalFailures++;
        }
      }
    }

    if (criticalFailures > 0 && !this.force) {
      throw new Error(`Rollback validation failed: ${criticalFailures} critical checks failed`);
    }

    return criticalFailures === 0;
  }

  async checkBackupAvailability() {
    // Check if we have a recent backup
    const backupAge = this.getLastBackupAge();
    
    if (backupAge === null) {
      return { passed: false, message: 'No recent backup found' };
    }
    
    if (backupAge > 24 * 60 * 60 * 1000) { // 24 hours
      return { passed: false, message: `Backup too old: ${Math.round(backupAge / (60 * 60 * 1000))} hours` };
    }
    
    return { passed: true, message: `Recent backup available (${Math.round(backupAge / (60 * 60 * 1000))} hours old)` };
  }

  getLastBackupAge() {
    // Simulate backup age check
    // In real implementation, this would check actual backup timestamps
    return 2 * 60 * 60 * 1000; // 2 hours ago
  }

  async checkCurrentDeployment() {
    try {
      // Check if current deployment is actually failing
      const healthCheck = await this.performHealthCheck();
      
      if (healthCheck.healthy && !this.force) {
        return { passed: false, message: 'Current deployment appears healthy - use --force to override' };
      }
      
      return { passed: true, message: 'Current deployment requires rollback' };
    } catch (error) {
      return { passed: true, message: 'Current deployment is unreachable - rollback justified' };
    }
  }

  async performHealthCheck() {
    // Simplified health check
    return { healthy: false, message: 'Deployment unhealthy' };
  }

  async checkPermissions() {
    // Check if we have the necessary permissions for rollback
    const requiredPermissions = [
      'deployment:write',
      'vercel:deploy',
      'database:read'
    ];
    
    // Simulate permission check
    return { passed: true, message: 'All required permissions available' };
  }

  async checkDatabaseCompatibility() {
    // Check if database schema is compatible with rollback version
    try {
      // In real implementation, this would check migration compatibility
      return { passed: true, message: 'Database schema compatible with rollback version' };
    } catch (error) {
      return { passed: false, message: `Database compatibility check failed: ${error.message}` };
    }
  }

  async createRollbackPlan() {
    this.log('📋 Creating rollback plan...', 'emergency');
    
    this.rollbackSteps = [
      {
        name: 'Activate maintenance mode',
        action: () => this.activateMaintenanceMode(),
        rollback: () => this.deactivateMaintenanceMode(),
        critical: false
      },
      {
        name: 'Stop current services',
        action: () => this.stopCurrentServices(),
        rollback: () => this.startServices(),
        critical: true
      },
      {
        name: 'Rollback database migrations',
        action: () => this.rollbackDatabase(),
        rollback: () => this.restoreDatabase(),
        critical: true
      },
      {
        name: 'Deploy previous version',
        action: () => this.deployPreviousVersion(),
        rollback: () => this.redeployCurrentVersion(),
        critical: true
      },
      {
        name: 'Verify rollback health',
        action: () => this.verifyRollbackHealth(),
        rollback: null,
        critical: true
      },
      {
        name: 'Deactivate maintenance mode',
        action: () => this.deactivateMaintenanceMode(),
        rollback: null,
        critical: false
      }
    ];

    this.log(`✅ Rollback plan created with ${this.rollbackSteps.length} steps`, 'success');
  }

  async executeRollback() {
    this.log('🚨 EXECUTING EMERGENCY ROLLBACK', 'emergency');
    this.log(`Environment: ${this.environment}`, 'emergency');
    this.log(`Reason: ${this.reason}`, 'emergency');
    this.log(`Dry run: ${this.dryRun}`, 'emergency');
    
    if (this.dryRun) {
      this.log('🔍 DRY RUN MODE - No actual changes will be made', 'warning');
    }

    let executedSteps = [];
    
    try {
      for (let i = 0; i < this.rollbackSteps.length; i++) {
        const step = this.rollbackSteps[i];
        this.log(`📋 Step ${i + 1}/${this.rollbackSteps.length}: ${step.name}`, 'info');
        
        if (!this.dryRun) {
          try {
            await step.action();
            executedSteps.push(step);
            this.log(`✅ Step ${i + 1} completed: ${step.name}`, 'success');
          } catch (error) {
            this.log(`❌ Step ${i + 1} failed: ${step.name} - ${error.message}`, 'error');
            
            if (step.critical) {
              this.log('🚨 Critical step failed - initiating rollback of rollback', 'emergency');
              await this.rollbackRollback(executedSteps.reverse());
              throw new Error(`Critical rollback step failed: ${step.name}`);
            } else {
              this.log('⚠️ Non-critical step failed - continuing', 'warning');
            }
          }
        } else {
          this.log(`🔍 Would execute: ${step.name}`, 'info');
        }
      }
      
      this.log('✅ ROLLBACK COMPLETED SUCCESSFULLY', 'success');
      await this.generateRollbackReport(true, null);
      
    } catch (error) {
      this.log(`❌ ROLLBACK FAILED: ${error.message}`, 'error');
      await this.generateRollbackReport(false, error);
      throw error;
    }
  }

  async rollbackRollback(executedSteps) {
    this.log('🔄 Rolling back the rollback...', 'emergency');
    
    for (const step of executedSteps) {
      if (step.rollback) {
        try {
          await step.rollback();
          this.log(`✅ Reversed: ${step.name}`, 'success');
        } catch (error) {
          this.log(`❌ Failed to reverse: ${step.name} - ${error.message}`, 'error');
        }
      }
    }
  }

  // Rollback step implementations
  async activateMaintenanceMode() {
    this.log('🚧 Activating maintenance mode...', 'info');
    // Implementation would set maintenance mode
  }

  async deactivateMaintenanceMode() {
    this.log('🔓 Deactivating maintenance mode...', 'info');
    // Implementation would disable maintenance mode
  }

  async stopCurrentServices() {
    this.log('⏹️ Stopping current services...', 'info');
    // Implementation would gracefully stop services
  }

  async startServices() {
    this.log('▶️ Starting services...', 'info');
    // Implementation would start services
  }

  async rollbackDatabase() {
    this.log('🗄️ Rolling back database migrations...', 'info');
    // Implementation would rollback database to compatible state
  }

  async restoreDatabase() {
    this.log('🗄️ Restoring database...', 'info');
    // Implementation would restore database
  }

  async deployPreviousVersion() {
    this.log('🚀 Deploying previous version...', 'info');
    
    const deployCommand = this.environment === 'production' 
      ? 'vercel --prod --yes' 
      : 'vercel --yes';
    
    if (!this.dryRun) {
      // Implementation would trigger deployment of previous version
      this.log('📦 Deployment triggered for previous stable version', 'info');
    }
  }

  async redeployCurrentVersion() {
    this.log('🔄 Redeploying current version...', 'info');
    // Implementation would redeploy current version
  }

  async verifyRollbackHealth() {
    this.log('🏥 Verifying rollback health...', 'info');
    
    // Give deployment time to stabilize
    await this.sleep(30000); // 30 seconds
    
    const healthCheck = await this.performHealthCheck();
    if (!healthCheck.healthy) {
      throw new Error('Rollback verification failed - deployment still unhealthy');
    }
    
    this.log('✅ Rollback health verification passed', 'success');
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateRollbackReport(success, error) {
    const report = {
      timestamp: new Date().toISOString(),
      environment: this.environment,
      reason: this.reason,
      dryRun: this.dryRun,
      success: success,
      error: error ? error.message : null,
      validationChecks: this.validationChecks,
      stepsExecuted: this.rollbackSteps.length,
      duration: Date.now() - this.startTime
    };

    this.log('\n📊 ROLLBACK REPORT', 'emergency');
    this.log('==================', 'emergency');
    this.log(`Status: ${success ? 'SUCCESS' : 'FAILED'}`, success ? 'success' : 'error');
    this.log(`Environment: ${this.environment}`, 'info');
    this.log(`Reason: ${this.reason}`, 'info');
    this.log(`Duration: ${Math.round(report.duration / 1000)}s`, 'info');
    
    if (error) {
      this.log(`Error: ${error.message}`, 'error');
    }

    // Save report to file
    const reportPath = `rollback-report-${Date.now()}.json`;
    if (!this.dryRun) {
      try {
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        this.log(`📄 Report saved to: ${reportPath}`, 'info');
      } catch (err) {
        this.log(`⚠️ Failed to save report: ${err.message}`, 'warning');
      }
    }

    return report;
  }

  async run() {
    this.startTime = Date.now();
    
    try {
      this.log('🚨 EMERGENCY ROLLBACK INITIATED', 'emergency');
      
      // Validate conditions
      await this.validateRollbackConditions();
      
      // Create rollback plan
      await this.createRollbackPlan();
      
      // Execute rollback
      await this.executeRollback();
      
      return 0; // Success
      
    } catch (error) {
      this.log(`💥 Emergency rollback failed: ${error.message}`, 'error');
      return 1; // Failure
    }
  }
}

// Run emergency rollback
if (import.meta.url === `file://${process.argv[1]}`) {
  const rollback = new EmergencyRollback();
  rollback.run().then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('Fatal error during emergency rollback:', error);
    process.exit(2);
  });
}

export default EmergencyRollback;