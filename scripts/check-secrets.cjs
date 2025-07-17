#!/usr/bin/env node

/**
 * PRE-COMMIT HOOK - VERIFICAÇÃO DE SECRETS
 * ========================================
 * Verifica se arquivos staged contêm informações sensíveis
 * Bloqueia commit se detectar chaves de API, tokens, etc.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Padrões de secrets a detectar
const SECRET_PATTERNS = [
  {
    name: 'Stripe Test Key',
    pattern: /pk_test_[A-Za-z0-9]{24,}/g,
    severity: 'HIGH'
  },
  {
    name: 'Stripe Secret Key',
    pattern: /sk_test_[A-Za-z0-9]{24,}/g,
    severity: 'CRITICAL'
  },
  {
    name: 'Stripe Webhook Secret',
    pattern: /whsec_[A-Za-z0-9]{32,}/g,
    severity: 'CRITICAL'
  },
  {
    name: 'JWT Token',
    pattern: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    severity: 'HIGH'
  },
  {
    name: 'Generic API Key',
    pattern: /[A-Za-z0-9]{32,}/g,
    severity: 'MEDIUM'
  },
  {
    name: 'Database URL',
    pattern: /postgres:\/\/.*:.*@.*:.*\/.*/g,
    severity: 'CRITICAL'
  },
  {
    name: 'Supabase Service Key',
    pattern: /eyJ.*service_role.*/g,
    severity: 'CRITICAL'
  }
];

// Arquivos a ignorar (whitelist)
const IGNORED_FILES = [
  'check-secrets.js',
  'secure-logger.ts',
  '.env.example',
  '.env.template',
  '.env.test',
  'package-lock.json',
  'node_modules/',
  '.git/',
  'migrations/',
  'MANUAL_SUPABASE_SETUP.md'
];

/**
 * Obter lista de arquivos staged
 */
function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return output.trim().split('\n').filter(file => file && file.length > 0);
  } catch (error) {
    console.error('❌ Erro ao obter arquivos staged:', error.message);
    return [];
  }
}

/**
 * Verificar se arquivo deve ser ignorado
 */
function shouldIgnoreFile(filePath) {
  return IGNORED_FILES.some(ignored => filePath.includes(ignored));
}

/**
 * Verificar conteúdo de um arquivo
 */
function checkFileContent(filePath) {
  if (!fs.existsSync(filePath)) {
    return { hasSecrets: false, findings: [] };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const findings = [];

    SECRET_PATTERNS.forEach(({ name, pattern, severity }) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          findings.push({
            file: filePath,
            type: name,
            severity,
            match: match.substring(0, 10) + '...',
            line: getLineNumber(content, match)
          });
        });
      }
    });

    return {
      hasSecrets: findings.length > 0,
      findings
    };
  } catch (error) {
    console.error(`❌ Erro ao ler arquivo ${filePath}:`, error.message);
    return { hasSecrets: false, findings: [] };
  }
}

/**
 * Obter número da linha onde o match foi encontrado
 */
function getLineNumber(content, match) {
  const lines = content.substring(0, content.indexOf(match)).split('\n');
  return lines.length;
}

/**
 * Executar verificação principal
 */
function runSecretCheck() {
  console.log('🔍 VERIFICANDO SECRETS EM ARQUIVOS STAGED');
  console.log('=========================================');

  const stagedFiles = getStagedFiles();
  
  if (stagedFiles.length === 0) {
    console.log('ℹ️  Nenhum arquivo staged encontrado');
    return 0;
  }

  console.log(`📂 Verificando ${stagedFiles.length} arquivo(s) staged...\n`);

  let totalFindings = 0;
  let criticalFindings = 0;

  stagedFiles.forEach(file => {
    if (shouldIgnoreFile(file)) {
      console.log(`⏭️  Ignorando: ${file}`);
      return;
    }

    const result = checkFileContent(file);
    
    if (result.hasSecrets) {
      console.log(`🚨 SECRETS DETECTADOS em ${file}:`);
      result.findings.forEach(finding => {
        console.log(`   - ${finding.type} (${finding.severity}) na linha ${finding.line}: ${finding.match}`);
        totalFindings++;
        if (finding.severity === 'CRITICAL') {
          criticalFindings++;
        }
      });
      console.log('');
    } else {
      console.log(`✅ ${file}: Limpo`);
    }
  });

  console.log('\n📊 RESUMO DA VERIFICAÇÃO');
  console.log('========================');
  console.log(`Total de secrets encontrados: ${totalFindings}`);
  console.log(`Findings críticos: ${criticalFindings}`);

  if (totalFindings > 0) {
    console.log('\n🚫 COMMIT BLOQUEADO!');
    console.log('❌ Secrets detectados nos arquivos staged');
    console.log('🛠️  Ações necessárias:');
    console.log('   1. Remover todos os secrets dos arquivos');
    console.log('   2. Usar variáveis de ambiente ou .env');
    console.log('   3. Adicionar arquivos com secrets ao .gitignore');
    console.log('   4. Tentar commit novamente');
    return 1;
  }

  console.log('\n✅ VERIFICAÇÃO PASSOU!');
  console.log('🎉 Nenhum secret detectado - commit permitido');
  return 0;
}

// Executar verificação se chamado diretamente
if (require.main === module) {
  const exitCode = runSecretCheck();
  process.exit(exitCode);
}

module.exports = { runSecretCheck, SECRET_PATTERNS };