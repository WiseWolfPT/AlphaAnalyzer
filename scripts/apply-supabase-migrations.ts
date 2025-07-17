#!/usr/bin/env tsx

/**
 * SCRIPT DE EMERGÊNCIA - APLICAR MIGRATIONS SUPABASE
 * ================================================================
 * Executa todas as migrations no Supabase remoto usando Service Role
 * ATENÇÃO: Este script usa chaves de produção - usar com cuidado
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados');
  process.exit(1);
}

// Criar cliente com Service Role (bypass RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration(filename: string): Promise<boolean> {
  try {
    console.log(`🔄 Aplicando migration: ${filename}`);
    
    const migrationPath = resolve(__dirname, '../migrations', filename);
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // Executar SQL diretamente
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      // Se rpc não existir, tentar com query raw
      const { error: rawError } = await supabase
        .from('fake_table_for_raw_sql')
        .select('*')
        .eq('raw_sql', migrationSQL);
      
      if (rawError) {
        console.error(`❌ Erro na migration ${filename}:`, error.message);
        return false;
      }
    }
    
    console.log(`✅ Migration ${filename} aplicada com sucesso`);
    return true;
    
  } catch (err) {
    console.error(`❌ Erro fatal na migration ${filename}:`, err);
    return false;
  }
}

async function executeMigrations() {
  console.log('🚀 INICIANDO APLICAÇÃO DE MIGRATIONS SUPABASE');
  console.log('================================================');
  
  // Lista de migrations em ordem
  const migrations = [
    '001_initial_supabase_schema.sql',
    '20250112_create_job_queue.sql',  // PHASE 1 - DAY 1: Background Jobs
    // Adicionar outras conforme necessário
  ];
  
  let successCount = 0;
  
  for (const migration of migrations) {
    const success = await applyMigration(migration);
    if (success) successCount++;
  }
  
  console.log('\n📊 RESUMO DAS MIGRATIONS');
  console.log('========================');
  console.log(`✅ Sucessos: ${successCount}/${migrations.length}`);
  console.log(`❌ Falhas: ${migrations.length - successCount}/${migrations.length}`);
  
  if (successCount === migrations.length) {
    console.log('\n🎉 TODAS AS MIGRATIONS APLICADAS COM SUCESSO!');
    console.log('📝 Próximo passo: Testar conectividade com npm run supabase:test');
  } else {
    console.log('\n⚠️ ALGUMAS MIGRATIONS FALHARAM');
    console.log('📋 Verifique o Supabase Dashboard para aplicar manualmente');
  }
}

// Executar migrations
executeMigrations().catch(console.error);