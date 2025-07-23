#!/usr/bin/env node
/**
 * Script de teste completo para validar solução do erro 401
 * Valida toda a stack: ambiente, proxy, headers, CORS, cache, APIs
 */

import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import { createVercelApiClient } from '@vercel/sdk';
import * as dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';

// Carrega variáveis de ambiente
dotenv.config();
dotenv.config({ path: '.env.local' });

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
  time?: number;
}

interface TestCategory {
  name: string;
  tests: TestResult[];
}

class Error401TestSuite {
  private results: TestCategory[] = [];
  private startTime: number = Date.now();
  
  constructor() {
    console.log(chalk.blue.bold('\n🔍 Teste Completo da Solução 401\n'));
  }

  async runAllTests() {
    await this.testEnvironmentVariables();
    await this.testVercelDeployment();
    await this.testAuthHeaders();
    await this.testCORSConfiguration();
    await this.testCacheSystem();
    await this.testAPIConnectivity();
    await this.testPerformance();
    
    this.generateReport();
  }

  /**
   * Teste 1: Variáveis de Ambiente
   */
  async testEnvironmentVariables() {
    const spinner = ora('Testando variáveis de ambiente...').start();
    const tests: TestResult[] = [];
    
    // Backend keys (não devem ter VITE_ prefix)
    const backendKeys = [
      'ALPHA_VANTAGE_API_KEY',
      'FINNHUB_API_KEY',
      'FMP_API_KEY',
      'TWELVE_DATA_API_KEY',
      'POLYGON_API_KEY',
      'SUPABASE_SERVICE_KEY',
      'STRIPE_SECRET_KEY'
    ];
    
    // Frontend keys (devem ter VITE_ prefix)
    const frontendKeys = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'VITE_BACKEND_URL'
    ];
    
    // Verifica backend keys
    for (const key of backendKeys) {
      const value = process.env[key];
      tests.push({
        name: `Backend: ${key}`,
        status: value ? 'pass' : 'fail',
        message: value ? 'Configurada' : 'Não encontrada',
        details: { exists: !!value, length: value?.length || 0 }
      });
    }
    
    // Verifica frontend keys
    for (const key of frontendKeys) {
      const value = process.env[key];
      tests.push({
        name: `Frontend: ${key}`,
        status: value ? 'pass' : 'fail',
        message: value ? 'Configurada' : 'Não encontrada',
        details: { exists: !!value, value: value?.substring(0, 20) + '...' }
      });
    }
    
    // Verifica .env.local
    try {
      const envLocal = await fs.readFile('.env.local', 'utf-8');
      tests.push({
        name: 'Arquivo .env.local',
        status: 'pass',
        message: 'Encontrado',
        details: { lines: envLocal.split('\n').length }
      });
    } catch {
      tests.push({
        name: 'Arquivo .env.local',
        status: 'fail',
        message: 'Não encontrado',
        details: { error: 'File not found' }
      });
    }
    
    spinner.succeed('Variáveis de ambiente testadas');
    this.results.push({ name: 'Variáveis de Ambiente', tests });
  }

  /**
   * Teste 2: Deployment Vercel
   */
  async testVercelDeployment() {
    const spinner = ora('Testando deployment Vercel...').start();
    const tests: TestResult[] = [];
    
    // Verifica vercel.json
    try {
      const vercelConfig = JSON.parse(await fs.readFile('vercel.json', 'utf-8'));
      
      // Verifica proxy configurado
      const hasProxy = vercelConfig.rewrites?.some(
        (r: any) => r.source.includes('/api/:path*')
      );
      
      tests.push({
        name: 'vercel.json configurado',
        status: hasProxy ? 'pass' : 'fail',
        message: hasProxy ? 'Proxy configurado' : 'Proxy não encontrado',
        details: vercelConfig
      });
      
      // Verifica functions
      if (vercelConfig.functions) {
        tests.push({
          name: 'Configuração de functions',
          status: 'pass',
          message: 'Functions configuradas',
          details: vercelConfig.functions
        });
      }
    } catch (error) {
      tests.push({
        name: 'vercel.json',
        status: 'fail',
        message: 'Erro ao ler arquivo',
        details: { error: error.message }
      });
    }
    
    // Testa conectividade com Vercel API
    if (process.env.VERCEL_TOKEN) {
      try {
        const client = createVercelApiClient({
          token: process.env.VERCEL_TOKEN
        });
        
        const deployments = await client.deployments.list();
        tests.push({
          name: 'API Vercel',
          status: 'pass',
          message: 'Conectado',
          details: { deployments: deployments.length }
        });
      } catch (error) {
        tests.push({
          name: 'API Vercel',
          status: 'warning',
          message: 'Token não configurado',
          details: { hint: 'Configure VERCEL_TOKEN para testes completos' }
        });
      }
    }
    
    spinner.succeed('Deployment Vercel testado');
    this.results.push({ name: 'Deployment Vercel', tests });
  }

  /**
   * Teste 3: Headers de Autenticação
   */
  async testAuthHeaders() {
    const spinner = ora('Testando headers de autenticação...').start();
    const tests: TestResult[] = [];
    
    const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:3001';
    
    // Teste 1: Headers básicos
    try {
      const response = await axios.get(`${backendUrl}/api/health`, {
        headers: {
          'x-vercel-proxy-auth': 'test-secret-key',
          'x-api-key': process.env.ALPHA_VANTAGE_API_KEY || ''
        }
      });
      
      tests.push({
        name: 'Headers aceitos',
        status: 'pass',
        message: 'Backend aceitou headers',
        details: response.headers
      });
    } catch (error) {
      tests.push({
        name: 'Headers rejeitados',
        status: 'fail',
        message: error.response?.status === 401 ? 'Não autorizado' : 'Erro de conexão',
        details: { status: error.response?.status, message: error.message }
      });
    }
    
    // Teste 2: Headers inválidos
    try {
      await axios.get(`${backendUrl}/api/health`, {
        headers: {
          'x-vercel-proxy-auth': 'invalid-key'
        }
      });
      
      tests.push({
        name: 'Rejeição de headers inválidos',
        status: 'fail',
        message: 'Backend aceitou headers inválidos!',
        details: { security: 'FALHA CRÍTICA' }
      });
    } catch (error) {
      tests.push({
        name: 'Rejeição de headers inválidos',
        status: error.response?.status === 401 ? 'pass' : 'fail',
        message: error.response?.status === 401 ? 'Corretamente rejeitado' : 'Resposta inesperada',
        details: { status: error.response?.status }
      });
    }
    
    spinner.succeed('Headers de autenticação testados');
    this.results.push({ name: 'Headers de Autenticação', tests });
  }

  /**
   * Teste 4: Configuração CORS
   */
  async testCORSConfiguration() {
    const spinner = ora('Testando configuração CORS...').start();
    const tests: TestResult[] = [];
    
    const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:3001';
    const origins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://alfalyzer.vercel.app',
      'https://alfalyzer.com'
    ];
    
    for (const origin of origins) {
      try {
        const response = await axios.options(`${backendUrl}/api/health`, {
          headers: {
            'Origin': origin,
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Content-Type'
          }
        });
        
        const allowedOrigin = response.headers['access-control-allow-origin'];
        const allowedMethods = response.headers['access-control-allow-methods'];
        
        tests.push({
          name: `CORS para ${origin}`,
          status: allowedOrigin ? 'pass' : 'fail',
          message: allowedOrigin ? 'Permitido' : 'Bloqueado',
          details: {
            allowedOrigin,
            allowedMethods,
            credentials: response.headers['access-control-allow-credentials']
          }
        });
      } catch (error) {
        tests.push({
          name: `CORS para ${origin}`,
          status: 'fail',
          message: 'Erro ao testar',
          details: { error: error.message }
        });
      }
    }
    
    spinner.succeed('Configuração CORS testada');
    this.results.push({ name: 'Configuração CORS', tests });
  }

  /**
   * Teste 5: Sistema de Cache
   */
  async testCacheSystem() {
    const spinner = ora('Testando sistema de cache...').start();
    const tests: TestResult[] = [];
    
    const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:3001';
    
    // Teste 1: Cache hit
    try {
      const start1 = Date.now();
      const response1 = await axios.get(`${backendUrl}/api/stocks/AAPL/quote`, {
        headers: {
          'x-vercel-proxy-auth': process.env.VERCEL_PROXY_AUTH_SECRET
        }
      });
      const time1 = Date.now() - start1;
      
      // Segunda chamada (deve ser cache)
      const start2 = Date.now();
      const response2 = await axios.get(`${backendUrl}/api/stocks/AAPL/quote`, {
        headers: {
          'x-vercel-proxy-auth': process.env.VERCEL_PROXY_AUTH_SECRET
        }
      });
      const time2 = Date.now() - start2;
      
      const cacheHit = time2 < time1 * 0.5; // Cache deve ser pelo menos 50% mais rápido
      
      tests.push({
        name: 'Cache hit performance',
        status: cacheHit ? 'pass' : 'warning',
        message: cacheHit ? 'Cache funcionando' : 'Cache pode estar desabilitado',
        details: {
          firstCall: `${time1}ms`,
          secondCall: `${time2}ms`,
          improvement: `${Math.round((1 - time2/time1) * 100)}%`
        }
      });
      
      // Verifica headers de cache
      const cacheHeaders = response2.headers['x-cache-status'];
      tests.push({
        name: 'Headers de cache',
        status: cacheHeaders ? 'pass' : 'warning',
        message: cacheHeaders || 'Headers não encontrados',
        details: {
          'cache-control': response2.headers['cache-control'],
          'x-cache-status': cacheHeaders
        }
      });
    } catch (error) {
      tests.push({
        name: 'Sistema de cache',
        status: 'fail',
        message: 'Erro ao testar cache',
        details: { error: error.message }
      });
    }
    
    spinner.succeed('Sistema de cache testado');
    this.results.push({ name: 'Sistema de Cache', tests });
  }

  /**
   * Teste 6: Conectividade APIs
   */
  async testAPIConnectivity() {
    const spinner = ora('Testando conectividade com APIs...').start();
    const tests: TestResult[] = [];
    
    const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:3001';
    const apis = [
      { name: 'Alpha Vantage', endpoint: '/stocks/AAPL/quote' },
      { name: 'Finnhub', endpoint: '/stocks/AAPL/profile' },
      { name: 'FMP', endpoint: '/stocks/AAPL/financials' },
      { name: 'Twelve Data', endpoint: '/stocks/AAPL/chart' }
    ];
    
    for (const api of apis) {
      try {
        const start = Date.now();
        const response = await axios.get(`${backendUrl}/api${api.endpoint}`, {
          headers: {
            'x-vercel-proxy-auth': process.env.VERCEL_PROXY_AUTH_SECRET
          },
          timeout: 10000
        });
        const time = Date.now() - start;
        
        tests.push({
          name: api.name,
          status: response.status === 200 ? 'pass' : 'warning',
          message: `Status ${response.status}`,
          details: {
            time: `${time}ms`,
            dataReceived: !!response.data,
            provider: response.headers['x-api-provider']
          },
          time
        });
      } catch (error) {
        tests.push({
          name: api.name,
          status: 'fail',
          message: error.response?.status || 'Timeout',
          details: {
            error: error.message,
            status: error.response?.status
          }
        });
      }
    }
    
    spinner.succeed('Conectividade com APIs testada');
    this.results.push({ name: 'Conectividade APIs', tests });
  }

  /**
   * Teste 7: Performance
   */
  async testPerformance() {
    const spinner = ora('Testando performance...').start();
    const tests: TestResult[] = [];
    
    const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:3001';
    const endpoints = [
      '/api/health',
      '/api/stocks/AAPL/quote',
      '/api/watchlists',
      '/api/earnings/calendar'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const times: number[] = [];
        
        // Faz 5 chamadas para média
        for (let i = 0; i < 5; i++) {
          const start = Date.now();
          await axios.get(`${backendUrl}${endpoint}`, {
            headers: {
              'x-vercel-proxy-auth': process.env.VERCEL_PROXY_AUTH_SECRET
            }
          });
          times.push(Date.now() - start);
        }
        
        const avgTime = times.reduce((a, b) => a + b) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        
        tests.push({
          name: endpoint,
          status: avgTime < 1000 ? 'pass' : avgTime < 2000 ? 'warning' : 'fail',
          message: `Média: ${Math.round(avgTime)}ms`,
          details: {
            avg: `${Math.round(avgTime)}ms`,
            min: `${minTime}ms`,
            max: `${maxTime}ms`,
            samples: times.length
          }
        });
      } catch (error) {
        tests.push({
          name: endpoint,
          status: 'fail',
          message: 'Erro ao testar',
          details: { error: error.message }
        });
      }
    }
    
    spinner.succeed('Performance testada');
    this.results.push({ name: 'Performance', tests });
  }

  /**
   * Gera relatório final
   */
  generateReport() {
    const totalTime = Date.now() - this.startTime;
    
    console.log(chalk.blue.bold('\n📊 Relatório de Testes\n'));
    
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let warningTests = 0;
    
    // Mostra resultados por categoria
    this.results.forEach(category => {
      console.log(chalk.yellow.bold(`\n${category.name}:`));
      
      category.tests.forEach(test => {
        totalTests++;
        
        let icon: string;
        let color: any;
        
        switch (test.status) {
          case 'pass':
            icon = '✅';
            color = chalk.green;
            passedTests++;
            break;
          case 'fail':
            icon = '❌';
            color = chalk.red;
            failedTests++;
            break;
          case 'warning':
            icon = '⚠️';
            color = chalk.yellow;
            warningTests++;
            break;
        }
        
        console.log(`  ${icon} ${color(test.name)}: ${test.message}`);
        
        if (test.details && (test.status === 'fail' || test.status === 'warning')) {
          console.log(chalk.gray(`     → ${JSON.stringify(test.details, null, 2).split('\n').join('\n     ')}`));
        }
      });
    });
    
    // Resumo final
    console.log(chalk.blue.bold('\n📈 Resumo:\n'));
    console.log(`  Total de testes: ${totalTests}`);
    console.log(`  ${chalk.green('✅ Aprovados:')} ${passedTests} (${Math.round(passedTests/totalTests*100)}%)`);
    console.log(`  ${chalk.yellow('⚠️  Avisos:')} ${warningTests} (${Math.round(warningTests/totalTests*100)}%)`);
    console.log(`  ${chalk.red('❌ Falhas:')} ${failedTests} (${Math.round(failedTests/totalTests*100)}%)`);
    console.log(`  ⏱️  Tempo total: ${(totalTime/1000).toFixed(2)}s`);
    
    // Status geral
    const overallStatus = failedTests === 0 ? 'SUCESSO' : 
                         failedTests <= 2 ? 'PARCIAL' : 'FALHA';
    
    const statusColor = overallStatus === 'SUCESSO' ? chalk.green :
                       overallStatus === 'PARCIAL' ? chalk.yellow : chalk.red;
    
    console.log(chalk.bold(`\n🎯 Status Geral: ${statusColor(overallStatus)}\n`));
    
    // Salva relatório
    this.saveReport();
    
    // Recomendações
    if (failedTests > 0) {
      console.log(chalk.blue.bold('💡 Recomendações:\n'));
      this.generateRecommendations();
    }
  }
  
  async saveReport() {
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        total: this.results.reduce((acc, cat) => acc + cat.tests.length, 0),
        passed: this.results.reduce((acc, cat) => 
          acc + cat.tests.filter(t => t.status === 'pass').length, 0),
        failed: this.results.reduce((acc, cat) => 
          acc + cat.tests.filter(t => t.status === 'fail').length, 0),
        warnings: this.results.reduce((acc, cat) => 
          acc + cat.tests.filter(t => t.status === 'warning').length, 0)
      }
    };
    
    await fs.writeFile(
      `test-results/401-solution-${Date.now()}.json`,
      JSON.stringify(report, null, 2)
    );
  }
  
  generateRecommendations() {
    const failedCategories = this.results
      .filter(cat => cat.tests.some(t => t.status === 'fail'))
      .map(cat => cat.name);
    
    if (failedCategories.includes('Variáveis de Ambiente')) {
      console.log('  1. Configure as variáveis faltantes no arquivo .env.local');
      console.log('  2. Certifique-se de usar o prefixo VITE_ apenas para variáveis do frontend');
    }
    
    if (failedCategories.includes('Headers de Autenticação')) {
      console.log('  3. Verifique se VERCEL_PROXY_AUTH_SECRET está configurado');
      console.log('  4. Confirme que o middleware de autenticação está ativo');
    }
    
    if (failedCategories.includes('Conectividade APIs')) {
      console.log('  5. Verifique se as chaves de API estão válidas');
      console.log('  6. Considere implementar fallback entre APIs');
    }
    
    console.log('\n');
  }
}

// Executa os testes
const tester = new Error401TestSuite();
tester.runAllTests().catch(console.error);