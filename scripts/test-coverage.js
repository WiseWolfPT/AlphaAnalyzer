#!/usr/bin/env node

/**
 * Script para executar testes e gerar relatório de cobertura
 * Uso: npm run test:coverage:report
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.bright + colors.cyan);
  console.log('='.repeat(60) + '\n');
}

async function main() {
  try {
    logSection('🧪 ALFALYZER - Test Coverage Report');

    // 1. Limpar resultados anteriores
    log('Limpando resultados anteriores...', colors.yellow);
    const coverageDir = path.join(__dirname, '..', 'coverage');
    const testResultsDir = path.join(__dirname, '..', 'test-results');
    
    if (fs.existsSync(coverageDir)) {
      fs.rmSync(coverageDir, { recursive: true });
    }
    if (fs.existsSync(testResultsDir)) {
      fs.rmSync(testResultsDir, { recursive: true });
    }

    // 2. Executar testes com cobertura
    logSection('Executando testes com cobertura...');
    
    try {
      execSync('npm run test:coverage', { 
        stdio: 'inherit',
        env: { ...process.env, CI: 'true' }
      });
    } catch (error) {
      log('⚠️  Alguns testes falharam, mas continuando com o relatório...', colors.yellow);
    }

    // 3. Verificar se a cobertura foi gerada
    if (!fs.existsSync(coverageDir)) {
      throw new Error('Diretório de cobertura não foi criado');
    }

    // 4. Ler e analisar o relatório de cobertura
    logSection('📊 Analisando Resultados de Cobertura');
    
    const coverageSummaryPath = path.join(coverageDir, 'coverage-summary.json');
    if (fs.existsSync(coverageSummaryPath)) {
      const coverageSummary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
      const total = coverageSummary.total;
      
      console.log('Cobertura Global:');
      console.log(`  • Linhas:      ${formatPercentage(total.lines.pct)}% (${total.lines.covered}/${total.lines.total})`);
      console.log(`  • Funções:     ${formatPercentage(total.functions.pct)}% (${total.functions.covered}/${total.functions.total})`);
      console.log(`  • Branches:    ${formatPercentage(total.branches.pct)}% (${total.branches.covered}/${total.branches.total})`);
      console.log(`  • Declarações: ${formatPercentage(total.statements.pct)}% (${total.statements.covered}/${total.statements.total})`);
      
      // 5. Identificar arquivos com baixa cobertura
      console.log('\n📋 Arquivos com Baixa Cobertura (<50%):');
      let lowCoverageCount = 0;
      
      Object.entries(coverageSummary).forEach(([file, data]) => {
        if (file !== 'total' && data.lines && data.lines.pct < 50) {
          lowCoverageCount++;
          const relativePath = file.replace(process.cwd(), '');
          console.log(`  • ${relativePath}: ${formatPercentage(data.lines.pct)}%`);
        }
      });
      
      if (lowCoverageCount === 0) {
        log('  ✅ Todos os arquivos têm cobertura acima de 50%!', colors.green);
      }
      
      // 6. Verificar thresholds
      console.log('\n🎯 Verificação de Thresholds (Meta: 30%):');
      const threshold = 30;
      let passedAllThresholds = true;
      
      ['lines', 'functions', 'branches', 'statements'].forEach(metric => {
        const pct = total[metric].pct;
        const passed = pct >= threshold;
        const icon = passed ? '✅' : '❌';
        const color = passed ? colors.green : colors.red;
        
        log(`  ${icon} ${metric}: ${formatPercentage(pct)}%`, color);
        
        if (!passed) passedAllThresholds = false;
      });
      
      // 7. Gerar relatório de componentes críticos
      logSection('🔍 Cobertura de Componentes Críticos');
      
      const criticalPaths = [
        'client/src/pages/unified-dashboard',
        'client/src/hooks/use-enhanced-stocks',
        'client/src/services/real-data-integration',
        'client/src/contexts/simple-auth-offline',
        'server/routes/auth',
        'server/routes/stocks',
      ];
      
      criticalPaths.forEach(criticalPath => {
        const fileData = Object.entries(coverageSummary).find(([file]) => 
          file.includes(criticalPath)
        );
        
        if (fileData) {
          const [file, data] = fileData;
          const pct = data.lines.pct;
          const color = pct >= 70 ? colors.green : pct >= 50 ? colors.yellow : colors.red;
          log(`  • ${criticalPath}: ${formatPercentage(pct)}%`, color);
        } else {
          log(`  • ${criticalPath}: Sem cobertura`, colors.red);
        }
      });
      
      // 8. Gerar sumário final
      logSection('📈 Sumário Final');
      
      if (passedAllThresholds) {
        log('✅ Todos os thresholds de cobertura foram atingidos!', colors.green);
        log(`🎉 Meta de 30% de cobertura alcançada!`, colors.green);
      } else {
        log('❌ Alguns thresholds de cobertura não foram atingidos', colors.red);
        log('💡 Continue adicionando testes para melhorar a cobertura', colors.yellow);
      }
      
      console.log('\n📂 Relatórios gerados:');
      console.log(`  • HTML: ${path.join(coverageDir, 'index.html')}`);
      console.log(`  • LCOV: ${path.join(coverageDir, 'lcov.info')}`);
      console.log(`  • JSON: ${path.join(coverageDir, 'coverage-final.json')}`);
      
      // 9. Abrir relatório HTML se não estiver em CI
      if (!process.env.CI) {
        console.log('\n🌐 Abrindo relatório HTML no navegador...');
        const htmlReport = path.join(coverageDir, 'index.html');
        const openCommand = process.platform === 'darwin' ? 'open' : 
                          process.platform === 'win32' ? 'start' : 'xdg-open';
        
        try {
          execSync(`${openCommand} ${htmlReport}`);
        } catch (error) {
          log('Não foi possível abrir o relatório automaticamente', colors.yellow);
        }
      }
      
      // 10. Salvar sumário em arquivo
      const summaryReport = {
        timestamp: new Date().toISOString(),
        coverage: {
          lines: total.lines.pct,
          functions: total.functions.pct,
          branches: total.branches.pct,
          statements: total.statements.pct,
        },
        thresholdsPassed: passedAllThresholds,
        lowCoverageFiles: lowCoverageCount,
        totalFiles: Object.keys(coverageSummary).length - 1, // -1 para excluir 'total'
      };
      
      fs.writeFileSync(
        path.join(testResultsDir, 'coverage-summary.json'),
        JSON.stringify(summaryReport, null, 2)
      );
      
      log('\n✨ Relatório de cobertura gerado com sucesso!', colors.green);
      
      // Exit com código apropriado
      process.exit(passedAllThresholds ? 0 : 1);
      
    } else {
      throw new Error('Arquivo de sumário de cobertura não encontrado');
    }
    
  } catch (error) {
    log(`\n❌ Erro ao gerar relatório: ${error.message}`, colors.red);
    process.exit(1);
  }
}

function formatPercentage(pct) {
  return typeof pct === 'number' ? pct.toFixed(2) : '0.00';
}

// Executar
main();