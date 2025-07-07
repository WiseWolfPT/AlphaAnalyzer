#!/usr/bin/env node

/**
 * Deployment Readiness Checks for Alfalyzer
 * 
 * This script validates that the application is ready for deployment
 * by checking various aspects of the codebase and configuration.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const COLORS = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m'
};

class DeploymentChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.checks = [];
    this.environment = process.argv.includes('--environment=production') ? 'production' : 
                     process.argv.includes('--environment=staging') ? 'staging' : 'development';
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

  addCheck(name, passed, message) {
    this.checks.push({ name, passed, message });
    if (!passed) {
      this.errors.push(`${name}: ${message}`);
    }
  }

  addWarning(name, message) {
    this.warnings.push(`${name}: ${message}`);
  }

  checkFileExists(filePath, required = true) {
    const exists = fs.existsSync(filePath);
    if (!exists && required) {
      this.addCheck(`File check: ${filePath}`, false, 'Required file missing');
    } else if (!exists) {
      this.addWarning(`File check: ${filePath}`, 'Optional file missing');
    } else {
      this.addCheck(`File check: ${filePath}`, true, 'File exists');
    }
    return exists;
  }

  checkPackageJson() {
    this.log('📦 Checking package.json...', 'info');
    
    if (!this.checkFileExists('package.json')) {
      return;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      // Check required scripts
      const requiredScripts = ['build', 'dev', 'start'];
      requiredScripts.forEach(script => {
        if (packageJson.scripts && packageJson.scripts[script]) {
          this.addCheck(`Script: ${script}`, true, 'Script exists');
        } else {
          this.addCheck(`Script: ${script}`, false, 'Required script missing');
        }
      });

      // Check for security dependencies
      const securityDeps = ['helmet', 'cors'];
      securityDeps.forEach(dep => {
        if ((packageJson.dependencies && packageJson.dependencies[dep]) ||
            (packageJson.devDependencies && packageJson.devDependencies[dep])) {
          this.addCheck(`Security dep: ${dep}`, true, 'Security dependency present');
        } else {
          this.addWarning(`Security dep: ${dep}`, 'Security dependency missing');
        }
      });

    } catch (error) {
      this.addCheck('Package.json parse', false, `Invalid JSON: ${error.message}`);
    }
  }

  checkEnvironmentConfiguration() {
    this.log('🔧 Checking environment configuration...', 'info');
    
    // Check for environment template
    this.checkFileExists('setup-env.template', true);
    
    // Check that .env files are not committed
    const envFiles = ['.env', '.env.local', '.env.production'];
    envFiles.forEach(file => {
      if (fs.existsSync(file)) {
        this.addCheck(`Env security: ${file}`, false, 'Environment file should not be committed');
      } else {
        this.addCheck(`Env security: ${file}`, true, 'Environment file not committed');
      }
    });

    // Check gitignore
    if (this.checkFileExists('.gitignore')) {
      const gitignore = fs.readFileSync('.gitignore', 'utf8');
      const requiredIgnores = ['.env', 'node_modules', 'dist', '*.log'];
      
      requiredIgnores.forEach(pattern => {
        if (gitignore.includes(pattern)) {
          this.addCheck(`Gitignore: ${pattern}`, true, 'Pattern ignored');
        } else {
          this.addCheck(`Gitignore: ${pattern}`, false, 'Pattern not ignored');
        }
      });
    }
  }

  checkBuildConfiguration() {
    this.log('🏗️ Checking build configuration...', 'info');
    
    // Check Vite config
    if (this.checkFileExists('vite.config.ts')) {
      this.addCheck('Build config', true, 'Vite configuration exists');
    }

    // Check TypeScript config
    if (this.checkFileExists('tsconfig.json')) {
      try {
        const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
        if (tsconfig.compilerOptions && tsconfig.compilerOptions.strict) {
          this.addCheck('TypeScript strict mode', true, 'Strict mode enabled');
        } else {
          this.addWarning('TypeScript strict mode', 'Strict mode not enabled');
        }
      } catch (error) {
        this.addCheck('TypeScript config', false, `Invalid tsconfig.json: ${error.message}`);
      }
    }

    // Check for client and server directories
    this.checkFileExists('client', true);
    this.checkFileExists('server', true);
  }

  checkSecurityConfiguration() {
    this.log('🔒 Checking security configuration...', 'info');
    
    // Check for security middleware files
    const securityFiles = [
      'server/middleware/auth.ts',
      'server/middleware/rate-limit.ts',
      'server/middleware/cost-protection.ts'
    ];
    
    securityFiles.forEach(file => {
      this.checkFileExists(file, false);
    });

    // Check for CORS configuration
    if (fs.existsSync('server')) {
      try {
        const serverFiles = execSync('find server -name "*.ts" -exec grep -l "cors" {} \\;', 
          { encoding: 'utf8' });
        if (serverFiles.trim()) {
          this.addCheck('CORS configuration', true, 'CORS middleware found');
        } else {
          this.addWarning('CORS configuration', 'CORS middleware not found');
        }
      } catch (error) {
        this.addWarning('CORS check', 'Could not verify CORS configuration');
      }
    }
  }

  checkCostProtection() {
    this.log('💰 Checking cost protection mechanisms...', 'info');
    
    const costProtectionFiles = [
      'server/middleware/cost-protection.ts',
      'server/services/budget-monitor.ts',
      'scripts/cost-protection-check.js'
    ];
    
    costProtectionFiles.forEach(file => {
      if (this.checkFileExists(file)) {
        this.addCheck(`Cost protection: ${path.basename(file)}`, true, 'File exists');
      } else {
        this.addWarning(`Cost protection: ${path.basename(file)}`, 'Cost protection file missing');
      }
    });
  }

  checkDatabaseConfiguration() {
    this.log('🗄️ Checking database configuration...', 'info');
    
    // Check for migration files
    if (this.checkFileExists('migrations', false)) {
      try {
        const migrationFiles = fs.readdirSync('migrations')
          .filter(file => file.endsWith('.sql'));
        
        if (migrationFiles.length > 0) {
          this.addCheck('Database migrations', true, `${migrationFiles.length} migration files found`);
        } else {
          this.addWarning('Database migrations', 'No migration files found');
        }
      } catch (error) {
        this.addWarning('Database migrations', 'Could not read migrations directory');
      }
    }

    // Check for database configuration
    this.checkFileExists('server/db/index.ts', false);
    this.checkFileExists('server/config/database.ts', false);
  }

  checkAPIConfiguration() {
    this.log('🔌 Checking API configuration...', 'info');
    
    // Check for API service files
    const apiFiles = [
      'server/services/market-data-service.ts',
      'server/routes/market-data.ts',
      'client/src/services/api.ts'
    ];
    
    apiFiles.forEach(file => {
      this.checkFileExists(file, false);
    });

    // Check for rate limiting
    if (fs.existsSync('server')) {
      try {
        const rateLimitFiles = execSync('find server -name "*.ts" -exec grep -l "rate.*limit" {} \\;', 
          { encoding: 'utf8' });
        if (rateLimitFiles.trim()) {
          this.addCheck('Rate limiting', true, 'Rate limiting configuration found');
        } else {
          this.addWarning('Rate limiting', 'Rate limiting not configured');
        }
      } catch (error) {
        this.addWarning('Rate limiting check', 'Could not verify rate limiting');
      }
    }
  }

  checkProductionReadiness() {
    if (this.environment !== 'production') {
      return;
    }

    this.log('🚀 Checking production readiness...', 'info');
    
    // Check for production-specific configurations
    this.checkFileExists('vercel.json', false);
    this.checkFileExists('Dockerfile', false);
    
    // Check for monitoring
    const monitoringFiles = [
      'server/middleware/ttfb-middleware.ts',
      'server/services/health-monitor.ts'
    ];
    
    monitoringFiles.forEach(file => {
      this.checkFileExists(file, false);
    });
  }

  generateReport() {
    this.log('\n📊 DEPLOYMENT READINESS REPORT', 'info');
    this.log('================================', 'info');
    
    const totalChecks = this.checks.length;
    const passedChecks = this.checks.filter(check => check.passed).length;
    const failedChecks = totalChecks - passedChecks;
    
    this.log(`Environment: ${this.environment}`, 'info');
    this.log(`Total checks: ${totalChecks}`, 'info');
    this.log(`Passed: ${passedChecks}`, 'success');
    this.log(`Failed: ${failedChecks}`, failedChecks > 0 ? 'error' : 'success');
    this.log(`Warnings: ${this.warnings.length}`, this.warnings.length > 0 ? 'warning' : 'success');
    
    if (this.errors.length > 0) {
      this.log('\n❌ ERRORS:', 'error');
      this.errors.forEach(error => this.log(`  - ${error}`, 'error'));
    }
    
    if (this.warnings.length > 0) {
      this.log('\n⚠️ WARNINGS:', 'warning');
      this.warnings.forEach(warning => this.log(`  - ${warning}`, 'warning'));
    }
    
    const score = Math.round((passedChecks / totalChecks) * 100);
    this.log(`\n📈 DEPLOYMENT SCORE: ${score}%`, score >= 80 ? 'success' : score >= 60 ? 'warning' : 'error');
    
    if (score >= 80) {
      this.log('✅ Ready for deployment!', 'success');
      return 0;
    } else if (score >= 60) {
      this.log('⚠️ Deployment possible with warnings', 'warning');
      return this.environment === 'production' ? 1 : 0;
    } else {
      this.log('❌ Not ready for deployment', 'error');
      return 1;
    }
  }

  async run() {
    this.log(`🔍 Running deployment checks for ${this.environment} environment...`, 'info');
    
    try {
      this.checkPackageJson();
      this.checkEnvironmentConfiguration();
      this.checkBuildConfiguration();
      this.checkSecurityConfiguration();
      this.checkCostProtection();
      this.checkDatabaseConfiguration();
      this.checkAPIConfiguration();
      this.checkProductionReadiness();
      
      return this.generateReport();
    } catch (error) {
      this.log(`❌ Deployment check failed: ${error.message}`, 'error');
      return 1;
    }
  }
}

// Run deployment checks
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new DeploymentChecker();
  checker.run().then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('Fatal error during deployment checks:', error);
    process.exit(1);
  });
}

export default DeploymentChecker;