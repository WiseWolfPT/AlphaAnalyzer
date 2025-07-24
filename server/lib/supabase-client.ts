import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

let supabase: SupabaseClient | null = null;
let initialized = false;

// Initialize Supabase client with lazy loading
function initializeSupabase() {
  if (initialized) return;
  initialized = true;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                      process.env.SUPABASE_SERVICE_KEY ||
                      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
                      process.env.SUPABASE_ANON_KEY || '';

  if (supabaseUrl && supabaseKey && supabaseUrl !== '' && supabaseKey !== '') {
    try {
      supabase = createClient(supabaseUrl, supabaseKey);
      logger.info('✅ Supabase client initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Supabase client:', error);
      supabase = null;
    }
  } else {
    logger.warn('⚠️ Supabase not configured - some features will be disabled');
  }
}

// Export a function to get Supabase client
export const getSupabaseClient = () => {
  // Initialize on first use
  if (!initialized) {
    initializeSupabase();
  }

  if (supabase) {
    return supabase;
  }
  
  // Return a mock client that logs warnings
  return {
    from: (table: string) => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
      upsert: () => Promise.resolve({ data: null, error: null }),
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        download: () => Promise.resolve({ data: null, error: null }),
        remove: () => Promise.resolve({ data: null, error: null }),
      }),
    },
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signIn: () => Promise.resolve({ data: null, error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {},
    }),
  };
};

export const isSupabaseConfigured = () => {
  if (!initialized) {
    initializeSupabase();
  }
  return !!supabase;
};

// Don't call getSupabaseClient() at module level
export default { getSupabaseClient, isSupabaseConfigured };