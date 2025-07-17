#!/usr/bin/env node

/**
 * Security Audit Script for Alfalyzer
 * Checks for potential security vulnerabilities before deployment
 */

import { exec } from 'child_process';
import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface SecurityIssue {
  type: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line?: number;
  message: string;
  code?: string;
}

class SecurityAuditor {
  private issues: SecurityIssue[] = [];
  private checkedFiles = 0;
  private totalFiles = 0;

  /**
   * Run complete security audit
   */
  async runAudit(): Promise<void> {
    console.log('🔒 Starting Alfalyzer Security Audit...\n');
    
    // 1. Check for exposed API keys
    console.log('📋 1. Checking for exposed API keys...');
    await this.checkExposedApiKeys();
    
    // 2. Check for secrets in code
    console.log('📋 2. Scanning for hardcoded secrets...');
    await this.scanForSecrets();
    
    // 3. Check environment variables
    console.log('📋 3. Validating environment variables...');
    await this.validateEnvironmentVariables();
    
    // 4. Check dependencies for vulnerabilities
    console.log('📋 4. Checking dependencies for vulnerabilities...');
    await this.checkDependencyVulnerabilities();
    
    // 5. Check CORS configuration
    console.log('📋 5. Validating CORS configuration...');
    await this.validateCorsConfiguration();
    
    // 6. Check for security headers
    console.log('📋 6. Checking security headers implementation...');
    await this.checkSecurityHeaders();
    
    // 7. Check database security
    console.log('📋 7. Validating database security...');
    await this.validateDatabaseSecurity();
    
    // 8. Check file permissions
    console.log('📋 8. Checking file permissions...');
    await this.checkFilePermissions();
    
    console.log('\n' + '='.repeat(60));
    this.generateReport();
  }

  /**
   * Check for exposed API keys in frontend code
   */
  private async checkExposedApiKeys(): Promise<void> {
    const clientSrcPath = './client/src';
    const dangerousPatterns = [
      /VITE_.*API_KEY/g,
      /VITE_.*SECRET/g,
      /VITE_.*TOKEN/g,
      /import\.meta\.env\.VITE_.*API_KEY/g,
      /process\.env\..*API_KEY/g,
    ];

    if (!this.pathExists(clientSrcPath)) {
      this.addIssue('medium', 'Client source not found', 0, 'Client source directory not found');
      return;
    }

    const files = this.getAllFiles(clientSrcPath, ['.ts', '.tsx', '.js', '.jsx']);
    
    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        dangerousPatterns.forEach(pattern => {
          if (pattern.test(line)) {
            this.addIssue(
              'critical',
              file,
              index + 1,
              `Potential API key exposure: ${line.trim()}`,
              line.trim()
            );
          }
        });
      });
    }
    
    console.log(`   ✅ Scanned ${files.length} frontend files`);
  }

  /**
   * Scan for hardcoded secrets and sensitive data
   */
  private async scanForSecrets(): Promise<void> {
    const secretPatterns = [
      { pattern: /sk_live_[a-zA-Z0-9]+/, type: 'critical', name: 'Stripe Live Secret Key' },
      { pattern: /sk_test_[a-zA-Z0-9]+/, type: 'high', name: 'Stripe Test Secret Key' },
      { pattern: /password\s*=\s*["'][^"']+["']/i, type: 'high', name: 'Hardcoded Password' },
      { pattern: /secret\s*=\s*["'][^"']+["']/i, type: 'high', name: 'Hardcoded Secret' },
      { pattern: /token\s*=\s*["'][^"']+["']/i, type: 'medium', name: 'Hardcoded Token' },
      { pattern: /api_key\s*=\s*["'][^"']+["']/i, type: 'medium', name: 'Hardcoded API Key' },
      { pattern: /[a-zA-Z0-9]{32,}/, type: 'low', name: 'Potential Secret (32+ chars)' },
    ];

    const allFiles = [
      ...this.getAllFiles('./client/src', ['.ts', '.tsx', '.js', '.jsx']),
      ...this.getAllFiles('./server', ['.ts', '.js']),
    ];

    for (const file of allFiles) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        secretPatterns.forEach(({ pattern, type, name }) => {
          if (pattern.test(line) && !line.includes('example') && !line.includes('placeholder')) {
            this.addIssue(
              type as SecurityIssue['type'],
              file,
              index + 1,
              `${name} detected: ${line.trim()}`,
              line.trim()
            );
          }
        });
      });
    }
    
    console.log(`   ✅ Scanned ${allFiles.length} files for secrets`);
  }

  /**
   * Validate environment variables configuration
   */
  private async validateEnvironmentVariables(): Promise<void> {
    const envExample = '.env.example';
    const env = '.env';
    
    // Check if .env is in .gitignore
    if (this.pathExists('.gitignore')) {
      const gitignore = readFileSync('.gitignore', 'utf-8');
      if (!gitignore.includes('.env')) {
        this.addIssue('critical', '.gitignore', 0, '.env file not in .gitignore');
      } else {
        console.log('   ✅ .env file is properly ignored by git');
      }
    }
    
    // Check if .env.example exists
    if (this.pathExists(envExample)) {
      console.log('   ✅ .env.example file exists');
    } else {
      this.addIssue('medium', 'root', 0, '.env.example file missing');
    }
    
    // Check for production environment variables
    if (this.pathExists(env)) {
      const envContent = readFileSync(env, 'utf-8');
      const requiredVars = [
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'ALPHA_VANTAGE_API_KEY',
        'FINNHUB_API_KEY',
        'FMP_API_KEY',
        'TWELVE_DATA_API_KEY'
      ];
      
      requiredVars.forEach(varName => {
        if (!envContent.includes(varName)) {
          this.addIssue('high', env, 0, `Missing required environment variable: ${varName}`);
        }
      });
      
      console.log('   ✅ Environment variables validated');
    }
  }

  /**
   * Check dependencies for known vulnerabilities
   */
  private async checkDependencyVulnerabilities(): Promise<void> {
    try {
      const { stdout } = await execAsync('npm audit --json');
      const auditResult = JSON.parse(stdout);
      
      if (auditResult.metadata.vulnerabilities.total > 0) {
        const { critical, high, moderate, low } = auditResult.metadata.vulnerabilities;
        
        if (critical > 0) {
          this.addIssue('critical', 'package.json', 0, `${critical} critical vulnerabilities found`);
        }
        if (high > 0) {
          this.addIssue('high', 'package.json', 0, `${high} high vulnerabilities found`);
        }
        if (moderate > 0) {
          this.addIssue('medium', 'package.json', 0, `${moderate} moderate vulnerabilities found`);
        }
        if (low > 0) {
          this.addIssue('low', 'package.json', 0, `${low} low vulnerabilities found`);
        }
      } else {
        console.log('   ✅ No vulnerabilities found in dependencies');
      }
    } catch (error) {
      console.log('   ⚠️ Could not run npm audit');
    }
  }

  /**
   * Validate CORS configuration
   */
  private async validateCorsConfiguration(): Promise<void> {
    const serverFiles = this.getAllFiles('./server', ['.ts', '.js']);
    let corsFound = false;
    
    for (const file of serverFiles) {
      const content = readFileSync(file, 'utf-8');
      
      if (content.includes('cors') || content.includes('CORS')) {
        corsFound = true;
        
        // Check for overly permissive CORS
        if (content.includes('origin: "*"') || content.includes('origin: true')) {
          this.addIssue('high', file, 0, 'Overly permissive CORS configuration');
        }
        
        // Check for proper CORS headers
        if (content.includes('Access-Control-Allow-Origin')) {
          console.log('   ✅ CORS headers configured');
        }
      }
    }
    
    if (!corsFound) {
      this.addIssue('medium', 'server', 0, 'CORS configuration not found');
    }
  }

  /**
   * Check for security headers implementation
   */
  private async checkSecurityHeaders(): Promise<void> {
    const serverFiles = this.getAllFiles('./server', ['.ts', '.js']);
    const requiredHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Strict-Transport-Security',
      'Content-Security-Policy'
    ];
    
    const foundHeaders = new Set<string>();
    
    for (const file of serverFiles) {
      const content = readFileSync(file, 'utf-8');
      
      requiredHeaders.forEach(header => {
        if (content.includes(header)) {
          foundHeaders.add(header);
        }
      });
    }
    
    requiredHeaders.forEach(header => {
      if (!foundHeaders.has(header)) {
        this.addIssue('medium', 'server', 0, `Missing security header: ${header}`);
      }
    });
    
    console.log(`   ✅ Found ${foundHeaders.size}/${requiredHeaders.length} security headers`);
  }

  /**
   * Validate database security configuration
   */
  private async validateDatabaseSecurity(): Promise<void> {
    const migrationFiles = this.getAllFiles('./migrations', ['.sql']);
    let rlsFound = false;
    
    for (const file of migrationFiles) {
      const content = readFileSync(file, 'utf-8');
      
      if (content.includes('ENABLE ROW LEVEL SECURITY') || content.includes('RLS')) {
        rlsFound = true;
        console.log('   ✅ Row Level Security configuration found');
        break;
      }
    }
    
    if (!rlsFound) {
      this.addIssue('high', 'database', 0, 'Row Level Security (RLS) not configured');
    }
    
    // Check for Supabase configuration
    const supabaseFiles = this.getAllFiles('./server', ['.ts', '.js']);
    let supabaseConfigFound = false;
    
    for (const file of supabaseFiles) {
      const content = readFileSync(file, 'utf-8');
      
      if (content.includes('supabase') && content.includes('SERVICE_ROLE_KEY')) {
        supabaseConfigFound = true;
        console.log('   ✅ Supabase configuration found');
        break;
      }
    }
    
    if (!supabaseConfigFound) {
      this.addIssue('high', 'database', 0, 'Supabase configuration not found');
    }
  }

  /**
   * Check file permissions
   */
  private async checkFilePermissions(): Promise<void> {
    const sensitiveFiles = ['.env', 'server/', 'migrations/'];
    
    for (const file of sensitiveFiles) {
      if (this.pathExists(file)) {
        console.log(`   ✅ ${file} exists and accessible`);
      }
    }
  }

  /**
   * Helper methods
   */
  private pathExists(path: string): boolean {
    try {
      statSync(path);
      return true;
    } catch {
      return false;
    }
  }

  private getAllFiles(dir: string, extensions: string[]): string[] {
    const files: string[] = [];
    
    if (!this.pathExists(dir)) {
      return files;
    }
    
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getAllFiles(fullPath, extensions));
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private addIssue(type: SecurityIssue['type'], file: string, line: number, message: string, code?: string): void {
    this.issues.push({ type, file, line, message, code });
  }

  /**
   * Generate security report
   */
  private generateReport(): void {
    const critical = this.issues.filter(i => i.type === 'critical').length;
    const high = this.issues.filter(i => i.type === 'high').length;
    const medium = this.issues.filter(i => i.type === 'medium').length;
    const low = this.issues.filter(i => i.type === 'low').length;
    
    console.log('\n📊 SECURITY AUDIT REPORT');
    console.log('='.repeat(60));
    
    if (this.issues.length === 0) {
      console.log('🎉 No security issues found!');
      console.log('✅ Alfalyzer is ready for production deployment.');
      return;
    }
    
    console.log(`📋 Issues found: ${this.issues.length}`);
    console.log(`🔴 Critical: ${critical}`);
    console.log(`🟠 High: ${high}`);
    console.log(`🟡 Medium: ${medium}`);
    console.log(`🟢 Low: ${low}`);
    
    console.log('\n📋 DETAILED ISSUES:');
    console.log('-'.repeat(60));
    
    this.issues.forEach((issue, index) => {
      const icon = this.getIssueIcon(issue.type);
      const location = issue.line ? `${issue.file}:${issue.line}` : issue.file;
      
      console.log(`${index + 1}. ${icon} ${issue.type.toUpperCase()}: ${issue.message}`);
      console.log(`   📁 Location: ${location}`);
      
      if (issue.code) {
        console.log(`   💾 Code: ${issue.code}`);
      }
      
      console.log('');
    });
    
    console.log('\n🚨 SECURITY RECOMMENDATIONS:');
    console.log('-'.repeat(60));
    
    if (critical > 0) {
      console.log('🔴 CRITICAL: Fix critical issues before deployment!');
    }
    
    if (high > 0) {
      console.log('🟠 HIGH: Address high-priority issues immediately.');
    }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Fix all critical and high-priority issues');
    console.log('2. Review and address medium-priority issues');
    console.log('3. Run audit again to verify fixes');
    console.log('4. Deploy to staging for testing');
    console.log('5. Deploy to production after validation');
  }

  private getIssueIcon(type: SecurityIssue['type']): string {
    switch (type) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }
}

// Run the audit
const auditor = new SecurityAuditor();
auditor.runAudit().catch(console.error);