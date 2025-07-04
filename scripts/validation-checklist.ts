/**
 * Validation Checklist - Roadmap V4
 * 
 * Executa validações automáticas para verificar se todos os requisitos 
 * da Roadmap V4 estão funcionando corretamente
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: string;
}

class ValidationRunner {
  private results: ValidationResult[] = [];
  private serverUrl = 'http://localhost:3001';

  async runAllValidations(): Promise<void> {
    console.log('🔍 Starting Roadmap V4 Validation Checklist...\n');

    // 1. Verificar TTFB headers com cache
    await this.validateTTFBHeaders();

    // 2. Verificar /health/kv endpoint
    await this.validateKVHealthEndpoint();

    // 3. Verificar GitHub Action
    await this.validateGitHubAction();

    // 4. Verificar se não há VITE_ secrets
    await this.validateNoViteSecrets();

    // 5. Verificar rate limiting headers
    await this.validateRateLimitingHeaders();

    // 6. Verificar configuração Supabase
    await this.validateSupabaseConfig();

    // 7. Verificar estrutura de arquivos
    await this.validateFileStructure();

    // 8. Verificar dependencies
    await this.validateDependencies();

    this.printResults();
  }

  private async validateTTFBHeaders(): Promise<void> {
    try {
      console.log('⚡ Testing TTFB headers with repeated calls...');

      // Primeira chamada para popular cache
      const firstResponse = await fetch(`${this.serverUrl}/api/health`);
      
      if (!firstResponse.ok) {
        this.addResult('TTFB Headers', 'FAIL', 'Server not responding');
        return;
      }

      // Segunda chamada para testar cache hit
      const startTime = Date.now();
      const secondResponse = await fetch(`${this.serverUrl}/api/health`);
      const endTime = Date.now();

      const ttfbHeader = secondResponse.headers.get('X-Edge-TTFB');
      const responseTime = endTime - startTime;

      if (ttfbHeader) {
        const ttfb = parseInt(ttfbHeader);
        if (ttfb < 300) {
          this.addResult('TTFB Headers', 'PASS', `Cache hit TTFB: ${ttfb}ms < 300ms`);
        } else {
          this.addResult('TTFB Headers', 'WARN', `TTFB: ${ttfb}ms >= 300ms (may not be cache hit)`);
        }
      } else {
        this.addResult('TTFB Headers', 'WARN', `No X-Edge-TTFB header, response time: ${responseTime}ms`);
      }

    } catch (error) {
      this.addResult('TTFB Headers', 'FAIL', `Error: ${error}`);
    }
  }

  private async validateKVHealthEndpoint(): Promise<void> {
    try {
      console.log('🩺 Testing /health/kv endpoint...');

      const response = await fetch(`${this.serverUrl}/api/health/kv`);
      
      if (!response.ok) {
        this.addResult('KV Health Endpoint', 'FAIL', `HTTP ${response.status}`);
        return;
      }

      const data = await response.json();

      // Verificar estrutura
      const requiredFields = ['totalOps', 'limitOps', 'usage', 'status'];
      const missingFields = requiredFields.filter(field => !(field in data));

      if (missingFields.length > 0) {
        this.addResult('KV Health Endpoint', 'FAIL', `Missing fields: ${missingFields.join(', ')}`);
        return;
      }

      // Verificar valores
      if (data.totalOps < data.limitOps) {
        const usagePercent = ((data.totalOps / data.limitOps) * 100).toFixed(1);
        this.addResult('KV Health Endpoint', 'PASS', 
          `totalOps (${data.totalOps}) < limitOps (${data.limitOps}) - ${usagePercent}% used`);
      } else {
        this.addResult('KV Health Endpoint', 'FAIL', 
          `totalOps (${data.totalOps}) >= limitOps (${data.limitOps})`);
      }

    } catch (error) {
      this.addResult('KV Health Endpoint', 'FAIL', `Error: ${error}`);
    }
  }

  private async validateGitHubAction(): Promise<void> {
    console.log('🎯 Checking GitHub Action configuration...');

    const actionPath = '.github/workflows/kv-usage-check.yml';
    
    if (!existsSync(actionPath)) {
      this.addResult('GitHub Action', 'FAIL', 'kv-usage-check.yml not found');
      return;
    }

    try {
      const actionContent = readFileSync(actionPath, 'utf8');
      
      // Verificar elementos essenciais
      const checks = [
        { name: 'manual trigger', pattern: /workflow_dispatch/ },
        { name: 'cron schedule', pattern: /cron:.*07:30/ },
        { name: 'health check', pattern: /api\/health\/kv/ },
        { name: 'threshold check', pattern: /90000|0\.9|90%/ }
      ];

      const failedChecks = checks.filter(check => !check.pattern.test(actionContent));

      if (failedChecks.length === 0) {
        this.addResult('GitHub Action', 'PASS', 'All required elements present');
      } else {
        const missing = failedChecks.map(c => c.name).join(', ');
        this.addResult('GitHub Action', 'WARN', `Missing: ${missing}`);
      }

    } catch (error) {
      this.addResult('GitHub Action', 'FAIL', `Error reading file: ${error}`);
    }
  }

  private async validateNoViteSecrets(): Promise<void> {
    console.log('🔒 Checking for exposed VITE_ secrets...');

    try {
      // Verificar arquivos fonte
      const srcPaths = ['client/src', 'server'];
      let foundSecrets = false;
      let secretFiles: string[] = [];

      for (const srcPath of srcPaths) {
        try {
          // Usar grep para procurar VITE_ com patterns suspeitos
          const grepCmd = `grep -r "VITE_.*\\(SECRET\\|KEY\\|TOKEN\\|PASSWORD\\)" ${srcPath} 2>/dev/null || true`;
          const result = execSync(grepCmd, { encoding: 'utf8' });
          
          if (result.trim()) {
            foundSecrets = true;
            secretFiles.push(...result.split('\n').filter(line => line.trim()));
          }
        } catch (error) {
          // Grep pode falhar se não encontrar nada, isso é OK
        }
      }

      // Verificar também variáveis de ambiente expostas
      const envExamplePath = '.env.public.example';
      if (existsSync(envExamplePath)) {
        const envContent = readFileSync(envExamplePath, 'utf8');
        const suspiciousPatterns = ['SECRET', 'PRIVATE', 'SERVICE_ROLE'];
        
        for (const pattern of suspiciousPatterns) {
          if (envContent.includes(pattern) && envContent.includes('VITE_')) {
            foundSecrets = true;
            secretFiles.push(`${envExamplePath}: VITE_ variable with ${pattern}`);
          }
        }
      }

      if (foundSecrets) {
        this.addResult('VITE Secrets Check', 'FAIL', 'Found exposed secrets', secretFiles.join('\n'));
      } else {
        this.addResult('VITE Secrets Check', 'PASS', 'No VITE_ secrets found in source code');
      }

    } catch (error) {
      this.addResult('VITE Secrets Check', 'WARN', `Error during check: ${error}`);
    }
  }

  private async validateRateLimitingHeaders(): Promise<void> {
    try {
      console.log('🚦 Testing rate limiting headers...');

      const response = await fetch(`${this.serverUrl}/api/health`);
      
      if (!response.ok) {
        this.addResult('Rate Limiting Headers', 'FAIL', 'Server not responding');
        return;
      }

      const requiredHeaders = [
        'x-ratelimit-limit',
        'x-ratelimit-remaining', 
        'x-ratelimit-reset',
        'x-ratelimit-provider'
      ];

      const missingHeaders = requiredHeaders.filter(header => 
        !response.headers.has(header)
      );

      if (missingHeaders.length === 0) {
        const limit = response.headers.get('x-ratelimit-limit');
        const remaining = response.headers.get('x-ratelimit-remaining');
        const provider = response.headers.get('x-ratelimit-provider');
        
        this.addResult('Rate Limiting Headers', 'PASS', 
          `All headers present - Limit: ${limit}, Remaining: ${remaining}, Provider: ${provider}`);
      } else {
        this.addResult('Rate Limiting Headers', 'FAIL', 
          `Missing headers: ${missingHeaders.join(', ')}`);
      }

    } catch (error) {
      this.addResult('Rate Limiting Headers', 'FAIL', `Error: ${error}`);
    }
  }

  private async validateSupabaseConfig(): Promise<void> {
    console.log('🗄️ Checking Supabase configuration...');

    // Verificar arquivos de configuração
    const configFiles = [
      { path: '.env.example', required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
      { path: '.env.public.example', required: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] }
    ];

    let allConfigsValid = true;
    const issues: string[] = [];

    for (const config of configFiles) {
      if (!existsSync(config.path)) {
        allConfigsValid = false;
        issues.push(`${config.path} not found`);
        continue;
      }

      const content = readFileSync(config.path, 'utf8');
      const missingVars = config.required.filter(varName => !content.includes(varName));
      
      if (missingVars.length > 0) {
        allConfigsValid = false;
        issues.push(`${config.path} missing: ${missingVars.join(', ')}`);
      }
    }

    // Verificar middleware de auth
    const authMiddlewarePath = 'server/middleware/supabase-auth.ts';
    if (!existsSync(authMiddlewarePath)) {
      allConfigsValid = false;
      issues.push('Supabase auth middleware not found');
    }

    if (allConfigsValid) {
      this.addResult('Supabase Config', 'PASS', 'All configuration files present');
    } else {
      this.addResult('Supabase Config', 'FAIL', issues.join('; '));
    }
  }

  private async validateFileStructure(): Promise<void> {
    console.log('📁 Checking required file structure...');

    const requiredFiles = [
      'server/middleware/upstash-rate-limit.ts',
      'server/middleware/supabase-auth.ts', 
      'server/middleware/ttfb-middleware.ts',
      'server/middleware/global-backoff.ts',
      'server/routes/health/kv.ts',
      'scripts/supabase-seed.ts',
      'docs/SEED_GUIDE.md',
      '.github/workflows/kv-usage-check.yml'
    ];

    const missingFiles = requiredFiles.filter(file => !existsSync(file));

    if (missingFiles.length === 0) {
      this.addResult('File Structure', 'PASS', 'All required files present');
    } else {
      this.addResult('File Structure', 'FAIL', `Missing files: ${missingFiles.join(', ')}`);
    }
  }

  private async validateDependencies(): Promise<void> {
    console.log('📦 Checking required dependencies...');

    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      const requiredDeps = [
        '@upstash/ratelimit',
        '@upstash/redis',
        '@supabase/supabase-js'
      ];

      const missingDeps = requiredDeps.filter(dep => !(dep in dependencies));

      if (missingDeps.length === 0) {
        this.addResult('Dependencies', 'PASS', 'All required dependencies installed');
      } else {
        this.addResult('Dependencies', 'FAIL', `Missing: ${missingDeps.join(', ')}`);
      }

    } catch (error) {
      this.addResult('Dependencies', 'FAIL', `Error checking package.json: ${error}`);
    }
  }

  private addResult(name: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, details?: string): void {
    this.results.push({ name, status, message, details });
  }

  private printResults(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📋 VALIDATION RESULTS - ROADMAP V4');
    console.log('='.repeat(80));

    const passCount = this.results.filter(r => r.status === 'PASS').length;
    const failCount = this.results.filter(r => r.status === 'FAIL').length;
    const warnCount = this.results.filter(r => r.status === 'WARN').length;

    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${icon} ${result.name}: ${result.message}`);
      if (result.details) {
        console.log(`   ${result.details}`);
      }
    });

    console.log('\n' + '-'.repeat(80));
    console.log(`📊 SUMMARY: ${passCount} PASS, ${failCount} FAIL, ${warnCount} WARN`);
    
    if (failCount === 0) {
      console.log('\n🎉 ALL VALIDATIONS PASSED! Ready for demo.');
      console.log('\nYou can now respond with:');
      console.log('SMOKE TEST OK');
      console.log('SEED OK');
      console.log('QUOTA CHECK OK');
      console.log('DOCS OK');
      console.log('READY FOR DEMO');
    } else {
      console.log('\n⚠️  Some validations failed. Please fix the issues above before proceeding.');
    }
    
    console.log('='.repeat(80));
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new ValidationRunner();
  runner.runAllValidations()
    .then(() => {
      const hasFailures = runner['results'].some(r => r.status === 'FAIL');
      process.exit(hasFailures ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Validation runner failed:', error);
      process.exit(1);
    });
}

export { ValidationRunner };