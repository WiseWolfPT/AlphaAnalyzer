/**
 * AGENTE 3: Configuração do banco de dados
 * Suporta SQLite (desenvolvimento) e Supabase (produção)
 */

export const databaseConfig = {
  // Tipo de banco de dados - SUPABASE É O PADRÃO!
  type: process.env.DATABASE_TYPE || 'supabase', // 'sqlite' ou 'supabase'
  
  // Configurações SQLite (apenas para desenvolvimento local)
  sqlite: {
    path: process.env.DATABASE_PATH || './data/alfalyzer.db',
    verbose: process.env.NODE_ENV === 'development'
  },
  
  // Configurações Supabase (PADRÃO)
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey: process.env.SUPABASE_ANON_KEY
  },
  
  // Configurações gerais
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000
  },
  
  // Modo de migração
  migrationMode: process.env.MIGRATION_MODE === 'true',
  
  // Usar SQLite apenas quando explicitamente solicitado para desenvolvimento
  useSupabase: process.env.USE_SQLITE !== 'true'
};

export function isDatabaseConfigured(): boolean {
  if (databaseConfig.useSupabase) {
    return !!(databaseConfig.supabase.url && databaseConfig.supabase.serviceKey);
  }
  return true; // SQLite sempre está disponível
}