/**
 * AGENTE 3: DATABASE - Supabase PostgreSQL Client
 * Migração de SQLite para PostgreSQL no Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '../../shared/types/supabase.js';

// Verificar variáveis de ambiente
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

// Cliente administrativo (para operações do servidor)
export const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
);

// Cliente público (para operações do cliente)
export const supabasePublic = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || '',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  }
);

// Funções auxiliares para migração
export async function testConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('_prisma_migrations')
      .select('id')
      .limit(1);
    
    // Se a tabela não existe, ainda está OK - significa banco limpo
    if (error && error.code === '42P01') {
      console.log('✅ Supabase conectado - banco de dados limpo');
      return true;
    }
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Supabase conectado com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com Supabase:', error);
    return false;
  }
}

// Exportar tipos úteis
export type SupabaseClient = typeof supabaseAdmin;
export type PublicSupabaseClient = typeof supabasePublic;