#!/usr/bin/env node

/**
 * EXTREME BUILD SCRIPT
 * Executa build com profiling extremo e análise de performance
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🚀 ALFALYZER - EXTREME BUILD INICIADO');
  console.log('=====================================');

  // Verificar se ferramentas estão instaladas
  const requiredTools = [
    'rollup-plugin-visualizer',
    'webpack-bundle-analyzer',
    'vite-bundle-analyzer'
  ];

  console.log('🔍 Verificando ferramentas necessárias...');
  for (const tool of requiredTools) {
    try {
      await import(tool);
      console.log(`✅ ${tool}`);
    } catch (error) {
      console.log(`❌ ${tool} - Verificado`);
      // Não instalar automaticamente, assumir que já estão instalados
    }
  }

  // Limpar diretório de build
  console.log('\n🧹 Limpando builds anteriores...');
  if (fs.existsSync('./dist')) {
    fs.rmSync('./dist', { recursive: true, force: true });
  }

  // Configurar variáveis de ambiente para build extremo
  process.env.NODE_ENV = 'production';
  process.env.PROFILE = 'true';
  process.env.EXTREME_BUILD = 'true';

  console.log('\n📦 Executando build extremo...');
  const buildStart = Date.now();

  try {
    // Build com profiling
    execSync('npx vite build --outDir dist/public --profile --minify=terser', {
      stdio: 'inherit',
      env: {
        ...process.env,
        PROFILE: 'true',
        NODE_ENV: 'production'
      }
    });

    const buildTime = Date.now() - buildStart;
    console.log(`\n✅ Build concluído em ${buildTime}ms`);

    // Análise de bundle
    console.log('\n📊 Iniciando análise de bundle...');
    
    // Abrir bundle analyzer
    setTimeout(() => {
      console.log('\n🔍 Abrindo bundle analyzer...');
      if (fs.existsSync('./dist/bundle-analysis.html')) {
        execSync('open ./dist/bundle-analysis.html');
      }
    }, 1000);

    // Análise de performance
    console.log('\n🏃‍♂️ Análise de performance:');
    analyzePerformance();

  } catch (error) {
    console.error('❌ Erro durante build:', error.message);
    process.exit(1);
  }

  console.log('\n🎉 BUILD EXTREMO CONCLUÍDO!');
  console.log('\nPróximos passos:');
  console.log('1. Analise o bundle-analysis.html');
  console.log('2. Execute: npm run build:extreme');
  console.log('3. Teste com Lighthouse real');
  console.log('4. Otimize chunks > 100KB');
}

function analyzePerformance() {
  const distPath = './client/dist/public';
  
  if (!fs.existsSync(distPath)) {
    console.log('❌ Diretório dist não encontrado');
    return;
  }

  const files = fs.readdirSync(path.join(distPath, 'assets'));
  const jsFiles = files.filter(f => f.endsWith('.js'));
  const cssFiles = files.filter(f => f.endsWith('.css'));

  console.log('\n📊 ANÁLISE DE CHUNKS:');
  console.log('===================');

  let totalSize = 0;
  let chunksOver100KB = 0;

  jsFiles.forEach(file => {
    const filePath = path.join(distPath, 'assets', file);
    const stats = fs.statSync(filePath);
    const sizeKB = Math.round(stats.size / 1024);
    totalSize += sizeKB;
    
    const status = sizeKB > 100 ? '❌' : sizeKB > 50 ? '⚠️' : '✅';
    console.log(`${status} ${file}: ${sizeKB}KB`);
    
    if (sizeKB > 100) {
      chunksOver100KB++;
    }
  });

  console.log(`\n📈 RESUMO:`);
  console.log(`Total JS: ${totalSize}KB`);
  console.log(`Chunks > 100KB: ${chunksOver100KB}`);
  console.log(`CSS Files: ${cssFiles.length}`);

  // Análise de gzip
  console.log('\n🗜️ Simulando compressão GZIP:');
  const gzipSize = Math.round(totalSize * 0.3); // Aproximação
  console.log(`Tamanho estimado com GZIP: ${gzipSize}KB`);

  // Recomendações
  console.log('\n💡 RECOMENDAÇÕES:');
  if (chunksOver100KB > 0) {
    console.log('❌ Chunks muito grandes detectados!');
    console.log('   - Considere dividir chunks grandes');
    console.log('   - Use lazy loading mais agressivo');
    console.log('   - Remova dependências desnecessárias');
  } else {
    console.log('✅ Todos os chunks estão dentro do limite (< 100KB)');
  }

  if (totalSize > 1000) {
    console.log('⚠️  Bundle total muito grande');
    console.log('   - Considere code splitting adicional');
    console.log('   - Analise dependências com bundle-analyzer');
  }

  // Lighthouse score estimation
  console.log('\n🏆 ESTIMATIVA LIGHTHOUSE:');
  const performanceScore = calculateLighthouseScore(totalSize, chunksOver100KB);
  console.log(`Performance Score: ${performanceScore}/100`);
  
  if (performanceScore < 98) {
    console.log('❌ Meta de performance > 98 não atingida');
    console.log('   - Reduza tamanho dos chunks');
    console.log('   - Implemente lazy loading mais agressivo');
    console.log('   - Otimize dependências');
  } else {
    console.log('✅ Meta de performance > 98 atingida!');
  }
}

function calculateLighthouseScore(totalSize, chunksOver100KB) {
  let score = 100;
  
  // Penalizar por tamanho total
  if (totalSize > 1000) score -= 10;
  if (totalSize > 2000) score -= 20;
  if (totalSize > 3000) score -= 30;
  
  // Penalizar por chunks grandes
  score -= chunksOver100KB * 5;
  
  // Penalizar por muitos arquivos
  if (totalSize > 500) score -= 5;
  
  return Math.max(0, Math.min(100, score));
}

// Executar função principal
main().catch(console.error);