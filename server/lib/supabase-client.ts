import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client with fallback
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

let supabase: SupabaseClient | null = null;

// Only initialize Supabase if credentials are available
if (supabaseUrl && supabaseKey && supabaseUrl !== '' && supabaseKey !== '') {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error);
    supabase = null;
  }
} else {
  console.warn('⚠️ Supabase not configured - some features will be disabled');
  console.warn('   To enable Supabase features, set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
}

// Export a mock client for development when Supabase is not configured
export const getSupabaseClient = () => {
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

export const isSupabaseConfigured = () => !!supabase;

export default getSupabaseClient();