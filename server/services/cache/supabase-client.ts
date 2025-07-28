import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public',
      },
    });
  }

  return supabaseClient;
}

// Helper function to get cache schema client
export function getCacheSchemaClient() {
  const client = getSupabaseClient();
  // Set schema to 'cache' for cache operations
  return client.schema('cache');
}

// Helper function for realtime operations
export function getRealtimeClient() {
  const client = getSupabaseClient();
  // Realtime tables are in public schema
  return client.schema('public');
}