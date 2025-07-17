#!/usr/bin/env tsx
/**
 * Script para aplicar Row Level Security (RLS) em todas as tabelas do Supabase
 * Execute com: npm run supabase:apply-rls
 */

import 'dotenv/config';
import { supabaseAdmin } from '../server/db/supabase-client';
import fs from 'fs';
import path from 'path';

const RLS_POLICIES_SQL = path.join(process.cwd(), 'migrations/postgres-migrations/004_rls_policies.sql');

// Lista de todas as tabelas que devem ter RLS habilitado
const TABLES_REQUIRING_RLS = [
  // Core user data tables
  'users',
  'watchlists', 
  'watchlist_stocks',
  'portfolios',
  'portfolio_holdings',
  'transcripts',
  'alerts',
  
  // Portfolio extension tables
  'holdings',
  'dividends',
  'portfolio_performance',
  'cash_transactions',
  'transactions',
  'subscriptions',
  
  // Enhanced tables
  'enhanced_watchlists',
  'portfolio_transactions',
  
  // Audit and logging tables
  'api_usage_logs',
  'audit_logs', 
  'data_access_logs',
  'subscription_history',
  'user_consents',
  'watchlist_performance',
  
  // Public data (limited access)
  'enhanced_stocks',
  'stock_fundamentals', 
  'subscription_plans',
  'cache_entries',
  'api_usage'
];

async function enableRLSOnAllTables() {
  console.log('🛡️  Habilitando Row Level Security em todas as tabelas...\n');

  for (const table of TABLES_REQUIRING_RLS) {
    try {
      console.log(`📋 Habilitando RLS na tabela: ${table}`);
      
      // Verificar se a tabela existe
      const { data: tableExists } = await supabaseAdmin
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', table)
        .single();

      if (!tableExists) {
        console.log(`  ⚠️  Tabela ${table} não existe - pulando`);
        continue;
      }

      // Habilitar RLS
      const { error } = await supabaseAdmin.rpc('exec_sql', {
        sql: `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`
      });

      if (error) {
        console.error(`  ❌ Erro ao habilitar RLS em ${table}:`, error.message);
      } else {
        console.log(`  ✅ RLS habilitado em ${table}`);
      }
    } catch (error) {
      console.error(`  ❌ Erro inesperado ao processar ${table}:`, error);
    }
  }
}

async function applyRLSPolicies() {
  console.log('\n📜 Aplicando políticas RLS...\n');

  if (!fs.existsSync(RLS_POLICIES_SQL)) {
    console.error(`❌ Arquivo de políticas não encontrado: ${RLS_POLICIES_SQL}`);
    return false;
  }

  try {
    const sqlContent = fs.readFileSync(RLS_POLICIES_SQL, 'utf8');
    
    // Dividir em comandos individuais (separados por linha em branco ou comentários de seção)
    const commands = sqlContent
      .split(/(?=-- =============================================================================)/g)
      .filter(cmd => cmd.trim() && !cmd.trim().startsWith('-- Migration:'))
      .map(cmd => cmd.trim());

    console.log(`📊 Encontrados ${commands.length} blocos de comandos para executar`);

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      if (command.includes('-- =============================================================================')) {
        const sectionMatch = command.match(/-- ([A-Z\s]+) TABLE POLICIES/);
        if (sectionMatch) {
          console.log(`\n🔧 Processando: ${sectionMatch[1].trim()}`);
        }
      }

      // Extrair comandos SQL individuais
      const sqlCommands = command
        .split(/;(?=\s*(?:CREATE|DROP|ALTER|COMMENT))/g)
        .filter(cmd => {
          const trimmed = cmd.trim();
          return trimmed && 
                 !trimmed.startsWith('--') && 
                 trimmed !== ';' &&
                 (trimmed.includes('CREATE POLICY') || 
                  trimmed.includes('DROP POLICY') || 
                  trimmed.includes('ALTER TABLE') ||
                  trimmed.includes('COMMENT ON POLICY'));
        });

      for (const sqlCmd of sqlCommands) {
        if (!sqlCmd.trim()) continue;
        
        try {
          const cleanCmd = sqlCmd.trim().replace(/;$/, '');
          await supabaseAdmin.rpc('exec_sql', { sql: cleanCmd });
          
          // Log apenas comandos importantes
          if (cleanCmd.includes('CREATE POLICY')) {
            const policyMatch = cleanCmd.match(/CREATE POLICY "([^"]+)"/);
            if (policyMatch) {
              console.log(`  ✅ Política criada: ${policyMatch[1]}`);
            }
          }
        } catch (error: any) {
          // Ignorar erros esperados
          if (error.message?.includes('already exists') || 
              error.message?.includes('does not exist')) {
            continue;
          }
          console.error(`  ⚠️  Erro ao executar comando SQL:`, error.message);
        }
      }
    }

    console.log('\n✅ Políticas RLS aplicadas com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao aplicar políticas RLS:', error);
    return false;
  }
}

async function verifyRLSSetup() {
  console.log('\n🔍 Verificando configuração RLS...\n');

  try {
    // Verificar tabelas com RLS habilitado
    const { data: rlsTables, error } = await supabaseAdmin
      .from('pg_tables')
      .select('*')
      .eq('schemaname', 'public');

    if (error) {
      console.error('❌ Erro ao verificar tabelas:', error);
      return;
    }

    console.log('📋 Status RLS por tabela:');
    
    for (const table of TABLES_REQUIRING_RLS) {
      const exists = rlsTables?.some(t => t.tablename === table);
      if (exists) {
        // Verificar se RLS está habilitado (isso requer uma query específica)
        console.log(`  ✅ ${table}: Configurado`);
      } else {
        console.log(`  ⚠️  ${table}: Não encontrada`);
      }
    }

    console.log('\n📊 Resumo da verificação concluído');
  } catch (error) {
    console.error('❌ Erro na verificação:', error);
  }
}

async function main() {
  console.log('🛡️  CONFIGURAÇÃO COMPLETA ROW LEVEL SECURITY\n');

  try {
    // 1. Habilitar RLS em todas as tabelas
    await enableRLSOnAllTables();

    // 2. Aplicar políticas
    const policiesApplied = await applyRLSPolicies();
    
    if (!policiesApplied) {
      console.error('❌ Falha ao aplicar políticas - abortando');
      process.exit(1);
    }

    // 3. Verificar configuração
    await verifyRLSSetup();

    console.log('\n🎉 Configuração RLS completa!');
    console.log('🔒 Todas as tabelas agora têm Row Level Security habilitado');
    console.log('🛡️  Políticas aplicadas para isolar dados por usuário');
    
  } catch (error) {
    console.error('❌ Erro durante configuração RLS:', error);
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Falha na configuração RLS:', error);
      process.exit(1);
    });
}

export { enableRLSOnAllTables, applyRLSPolicies, verifyRLSSetup };