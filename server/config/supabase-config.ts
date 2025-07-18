/**
 * Centralized Supabase configuration
 * Handles missing environment variables gracefully
 */

export const supabaseConfig = {
  url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '',
  
  isConfigured(): boolean {
    return !!(this.url && (this.anonKey || this.serviceKey));
  },
  
  getConfig() {
    if (!this.isConfigured()) {
      console.warn('⚠️ Supabase is not configured. Running without database features.');
      return null;
    }
    
    return {
      url: this.url,
      key: this.serviceKey || this.anonKey
    };
  }
};

// Log configuration status on startup
if (!supabaseConfig.isConfigured()) {
  console.log('🔶 Running without Supabase - database features disabled');
} else {
  console.log('✅ Supabase configured');
}