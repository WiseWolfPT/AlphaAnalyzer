#!/usr/bin/env ts-node
/**
 * ALFALYZER - SCRIPT DE VALIDAÇÃO DE AMBIENTE
 * 
 * Este script verifica se todas as variáveis de ambiente necessárias estão configuradas
 * e se os serviços externos estão acessíveis.
 * 
 * Execução: npm run validate-env
 * Criado em: 11/07/2025
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import { join } from 'path';

// Carregar variáveis de ambiente
dotenv.config();

interface ValidationResult {
  service: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  message: string;
  details?: string;
}

class EnvValidator {
  private results: ValidationResult[] = [];
  private criticalErrors: string[] = [];

  // Variáveis obrigatórias (sem essas o app não funciona)
  private readonly requiredVars = [
    'NODE_ENV',
    'PORT',
    'DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET'
  ];

  // Variáveis opcionais mas recomendadas
  private readonly optionalVars = [
    'ALPHA_VANTAGE_API_KEY',
    'TWELVE_DATA_API_KEY',
    'FMP_API_KEY',
    'FINNHUB_API_KEY',
    'STRIPE_SECRET_KEY',
    'REDIS_URL'
  ];

  private log(service: string, status: 'SUCCESS' | 'WARNING' | 'ERROR', message: string, details?: string) {
    this.results.push({ service, status, message, details });
    
    const icon = status === 'SUCCESS' ? '✅' : status === 'WARNING' ? '⚠️' : '❌';
    console.log(`${icon} ${service}: ${message}`);
    
    if (details) {
      console.log(`   ${details}`);
    }
    
    if (status === 'ERROR') {
      this.criticalErrors.push(`${service}: ${message}`);
    }
  }

  async validateEnvironmentVariables(): Promise<void> {
    console.log('\n🔍 VALIDAÇÃO DE VARIÁVEIS DE AMBIENTE');
    console.log('=====================================');

    // Verificar variáveis obrigatórias
    for (const varName of this.requiredVars) {
      const value = process.env[varName];
      
      if (!value) {
        this.log(
          'ENV_VAR', 
          'ERROR', 
          `Variável obrigatória ${varName} não configurada`,
          `Adicione ${varName}=valor ao arquivo .env`
        );
      } else if (value === 'your-key-here' || value === 'demo' || value.includes('your-')) {
        this.log(
          'ENV_VAR', 
          'WARNING', 
          `Variável ${varName} usando valor padrão`,
          'Configure com valor real para produção'
        );
      } else {
        this.log('ENV_VAR', 'SUCCESS', `${varName} configurada corretamente`);
      }
    }

    // Verificar variáveis opcionais
    for (const varName of this.optionalVars) {
      const value = process.env[varName];
      
      if (!value) {
        this.log(
          'ENV_VAR', 
          'WARNING', 
          `Variável opcional ${varName} não configurada`,
          'Alguns recursos podem não funcionar'
        );
      } else if (value === 'demo' || value.includes('your-')) {
        this.log(
          'ENV_VAR', 
          'WARNING', 
          `${varName} usando valor demo`,
          'Configure com valor real para funcionalidade completa'
        );
      } else {
        this.log('ENV_VAR', 'SUCCESS', `${varName} configurada`);
      }
    }
  }

  async validateSupabase(): Promise<void> {
    console.log('\n🗄️  VALIDAÇÃO DO SUPABASE');
    console.log('=======================');

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      this.log('SUPABASE', 'ERROR', 'Credenciais do Supabase não configuradas');
      return;
    }

    try {
      // Testar conexão básica
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Testar autenticação
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (authError && !authError.message.includes('JWT')) {
        this.log('SUPABASE', 'ERROR', 'Erro na autenticação Supabase', authError.message);
        return;
      }

      this.log('SUPABASE', 'SUCCESS', 'Conexão com Supabase estabelecida');

      // Testar operações CRUD básicas
      await this.testSupabaseCRUD(supabase);

    } catch (error) {
      this.log('SUPABASE', 'ERROR', 'Erro ao conectar com Supabase', error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }

  private async testSupabaseCRUD(supabase: any): Promise<void> {
    console.log('\n🔄 TESTE DE OPERAÇÕES CRUD');
    console.log('===========================');

    // Testar se a tabela users existe
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      if (error) {
        if (error.message.includes('relation "users" does not exist')) {
          this.log('SUPABASE_CRUD', 'WARNING', 'Tabela users não existe', 'Execute as migrations primeiro');
        } else {
          this.log('SUPABASE_CRUD', 'ERROR', 'Erro ao acessar tabela users', error.message);
        }
      } else {
        this.log('SUPABASE_CRUD', 'SUCCESS', 'Tabela users acessível');
      }
    } catch (error) {
      this.log('SUPABASE_CRUD', 'ERROR', 'Erro no teste CRUD', error instanceof Error ? error.message : 'Erro desconhecido');
    }

    // Testar outras tabelas principais
    const tables = ['watchlists', 'portfolios', 'stocks', 'user_preferences'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          if (error.message.includes(`relation "${table}" does not exist`)) {
            this.log('SUPABASE_CRUD', 'WARNING', `Tabela ${table} não existe`, 'Execute as migrations primeiro');
          } else {
            this.log('SUPABASE_CRUD', 'ERROR', `Erro ao acessar tabela ${table}`, error.message);
          }
        } else {
          this.log('SUPABASE_CRUD', 'SUCCESS', `Tabela ${table} acessível`);
        }
      } catch (error) {
        this.log('SUPABASE_CRUD', 'WARNING', `Erro ao testar tabela ${table}`, error instanceof Error ? error.message : 'Erro desconhecido');
      }
    }
  }

  async validateAPIs(): Promise<void> {
    console.log('\n🌐 VALIDAÇÃO DE APIs EXTERNAS');
    console.log('=============================');

    // Testar Alpha Vantage
    if (process.env.ALPHA_VANTAGE_API_KEY && process.env.ALPHA_VANTAGE_API_KEY !== 'demo') {
      try {
        const response = await fetch(
          `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=AAPL&interval=1min&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data['Error Message']) {
            this.log('ALPHA_VANTAGE', 'ERROR', 'Chave API inválida', data['Error Message']);
          } else if (data['Note']) {
            this.log('ALPHA_VANTAGE', 'WARNING', 'Limite de taxa atingido', data['Note']);
          } else {
            this.log('ALPHA_VANTAGE', 'SUCCESS', 'API Alpha Vantage funcionando');
          }
        } else {
          this.log('ALPHA_VANTAGE', 'ERROR', `Erro HTTP ${response.status}`);
        }
      } catch (error) {
        this.log('ALPHA_VANTAGE', 'ERROR', 'Erro ao testar Alpha Vantage', error instanceof Error ? error.message : 'Erro desconhecido');
      }
    } else {
      this.log('ALPHA_VANTAGE', 'WARNING', 'Alpha Vantage não configurado');
    }

    // Testar Twelve Data
    if (process.env.TWELVE_DATA_API_KEY && process.env.TWELVE_DATA_API_KEY !== 'demo') {
      try {
        const response = await fetch(
          `https://api.twelvedata.com/time_series?symbol=AAPL&interval=1min&apikey=${process.env.TWELVE_DATA_API_KEY}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'error') {
            this.log('TWELVE_DATA', 'ERROR', 'Erro na API Twelve Data', data.message);
          } else {
            this.log('TWELVE_DATA', 'SUCCESS', 'API Twelve Data funcionando');
          }
        } else {
          this.log('TWELVE_DATA', 'ERROR', `Erro HTTP ${response.status}`);
        }
      } catch (error) {
        this.log('TWELVE_DATA', 'ERROR', 'Erro ao testar Twelve Data', error instanceof Error ? error.message : 'Erro desconhecido');
      }
    } else {
      this.log('TWELVE_DATA', 'WARNING', 'Twelve Data não configurado');
    }
  }

  async validateFileSystem(): Promise<void> {
    console.log('\n📁 VALIDAÇÃO DO SISTEMA DE ARQUIVOS');
    console.log('====================================');

    // Verificar se arquivos importantes existem
    const criticalFiles = [
      'package.json',
      '.env.example',
      'client/tsconfig.json',
      'server/tsconfig.json'
    ];

    for (const file of criticalFiles) {
      try {
        const filePath = join(process.cwd(), file);
        readFileSync(filePath);
        this.log('FILE_SYSTEM', 'SUCCESS', `Arquivo ${file} encontrado`);
      } catch (error) {
        this.log('FILE_SYSTEM', 'ERROR', `Arquivo ${file} não encontrado`, `Verifique se o arquivo existe em ${file}`);
      }
    }

    // Verificar diretórios importantes
    const directories = [
      'client/src',
      'server',
      'shared',
      'scripts'
    ];

    for (const dir of directories) {
      try {
        const dirPath = join(process.cwd(), dir);
        const fs = await import('fs');
        const stats = fs.statSync(dirPath);
        if (stats.isDirectory()) {
          this.log('FILE_SYSTEM', 'SUCCESS', `Diretório ${dir} encontrado`);
        } else {
          this.log('FILE_SYSTEM', 'WARNING', `${dir} não é um diretório`);
        }
      } catch (error) {
        this.log('FILE_SYSTEM', 'WARNING', `Diretório ${dir} não encontrado`, `Estrutura do projeto pode estar incompleta`);
      }
    }
  }

  generateReport(): void {
    console.log('\n📊 RELATÓRIO DE VALIDAÇÃO');
    console.log('=========================');

    const totalTests = this.results.length;
    const successes = this.results.filter(r => r.status === 'SUCCESS').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;
    const errors = this.results.filter(r => r.status === 'ERROR').length;

    console.log(`\n📈 ESTATÍSTICAS:`);
    console.log(`   Total de testes: ${totalTests}`);
    console.log(`   ✅ Sucessos: ${successes}`);
    console.log(`   ⚠️  Avisos: ${warnings}`);
    console.log(`   ❌ Erros: ${errors}`);

    if (this.criticalErrors.length > 0) {
      console.log(`\n🚨 ERROS CRÍTICOS (${this.criticalErrors.length}):`);
      this.criticalErrors.forEach(error => console.log(`   - ${error}`));
      console.log(`\n❌ VALIDAÇÃO FALHOU - Corrija os erros críticos antes de continuar`);
      process.exit(1);
    } else if (warnings > 0) {
      console.log(`\n⚠️  VALIDAÇÃO CONCLUÍDA COM AVISOS`);
      console.log(`   O aplicativo pode funcionar, mas alguns recursos podem estar limitados`);
      process.exit(0);
    } else {
      console.log(`\n✅ VALIDAÇÃO CONCLUÍDA COM SUCESSO`);
      console.log(`   Todos os sistemas estão funcionando corretamente`);
      process.exit(0);
    }
  }

  async run(): Promise<void> {
    console.log('🚀 ALFALYZER - VALIDAÇÃO DE AMBIENTE');
    console.log('===================================');
    console.log(`Executando em: ${process.cwd()}`);
    console.log(`Node.js: ${process.version}`);
    console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);

    await this.validateEnvironmentVariables();
    await this.validateSupabase();
    await this.validateAPIs();
    await this.validateFileSystem();

    this.generateReport();
  }
}

// Executar validação se este arquivo for executado diretamente
const validator = new EnvValidator();
validator.run().catch(error => {
  console.error('❌ Erro fatal na validação:', error);
  process.exit(1);
});

export { EnvValidator };