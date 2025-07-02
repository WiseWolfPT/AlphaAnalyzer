import { createClient } from '@supabase/supabase-js';
import { UserProfile, UserSession, SecurityLog, DataAccessLog } from '../types/auth';

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseServiceKey || 
    supabaseUrl === 'https://your-project-id.supabase.co' || 
    supabaseServiceKey === 'your-service-role-key') {
  console.warn('Supabase credentials not properly configured. Profile features may not work correctly.');
}

// Create Supabase client with service role key for server-side operations
export const supabase = supabaseUrl && supabaseServiceKey && 
  supabaseUrl !== 'https://your-project-id.supabase.co' && 
  supabaseServiceKey !== 'your-service-role-key' 
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    : null;

// Database helper functions for authentication and security
export const db = {
  // User profile operations
  async getProfile(userId: string): Promise<UserProfile | null> {
    if (!supabase) {
      console.warn('Supabase not configured, returning mock profile');
      // Return a mock profile for development when Supabase is not configured
      return {
        id: userId,
        email: 'user@example.com',
        full_name: 'Test User',
        subscription_tier: 'free',
        roles: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as UserProfile;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        roles:user_roles(
          role:roles(*)
        )
      `)
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    
    return data;
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>) {
    if (!supabase) {
      console.warn('Supabase not configured, mocking profile update');
      return { 
        data: { ...updates, id: userId, updated_at: new Date().toISOString() }, 
        error: null 
      };
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
    
    return { data, error };
  },

  async createProfile(profileData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>) {
    if (!supabase) {
      console.warn('Supabase not configured, mocking profile creation');
      const mockProfile = {
        ...profileData,
        id: 'mock-user-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return { data: mockProfile, error: null };
    }

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        ...profileData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    return { data, error };
  },

  // User session operations
  async createSession(sessionData: Omit<UserSession, 'id' | 'created_at'>): Promise<UserSession | null> {
    const { data, error } = await supabase
      .from('user_sessions')
      .insert({
        ...sessionData,
        created_at: new Date(),
        active: true
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating session:', error);
      return null;
    }
    
    return data;
  },

  async getSession(sessionToken: string): Promise<UserSession | null> {
    if (!supabase) {
      console.warn('Supabase not configured, mocking session');
      return {
        id: 'mock-session-id',
        session_token: sessionToken,
        user_id: 'mock-user-id',
        active: true,
        created_at: new Date(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        last_activity: new Date(),
        ip_address: '127.0.0.1',
        user_agent: 'Mock Browser'
      } as UserSession;
    }

    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .eq('active', true)
      .single();
    
    if (error) {
      console.error('Error fetching session:', error);
      return null;
    }
    
    return data;
  },

  async updateSessionActivity(sessionId: string) {
    const { error } = await supabase
      .from('user_sessions')
      .update({ 
        last_activity: new Date(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
    
    if (error) {
      console.error('Error updating session activity:', error);
    }
  },

  async invalidateSession(sessionId: string) {
    const { error } = await supabase
      .from('user_sessions')
      .update({ 
        active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
    
    return { error };
  },

  async invalidateAllUserSessions(userId: string) {
    const { error } = await supabase
      .from('user_sessions')
      .update({ 
        active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    return { error };
  },

  async cleanupExpiredSessions() {
    const { error } = await supabase
      .from('user_sessions')
      .update({ active: false })
      .lt('expires_at', new Date().toISOString());
    
    return { error };
  },

  // Security logging operations
  async logSecurityEvent(logData: Omit<SecurityLog, 'id' | 'timestamp'>) {
    if (!supabase) {
      console.log('Security event (Supabase not configured):', logData);
      return;
    }

    const { error } = await supabase
      .from('security_logs')
      .insert({
        ...logData,
        timestamp: new Date()
      });
    
    if (error) {
      console.error('Error logging security event:', error);
    }
  },

  async logDataAccess(logData: Omit<DataAccessLog, 'id' | 'timestamp'>) {
    const { error } = await supabase
      .from('data_access_logs')
      .insert({
        ...logData,
        timestamp: new Date()
      });
    
    if (error) {
      console.error('Error logging data access:', error);
    }
  },

  // Rate limiting operations
  async getUserApiUsage(userId: string, timeWindow: 'hour' | 'day' = 'hour') {
    const timeThreshold = new Date();
    if (timeWindow === 'hour') {
      timeThreshold.setHours(timeThreshold.getHours() - 1);
    } else {
      timeThreshold.setDate(timeThreshold.getDate() - 1);
    }

    const { data, error } = await supabase
      .from('api_usage_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', timeThreshold.toISOString());
    
    if (error) {
      console.error('Error fetching API usage:', error);
      return 0;
    }
    
    return data?.length || 0;
  },

  async logApiUsage(userId: string, endpoint: string, method: string) {
    const { error } = await supabase
      .from('api_usage_logs')
      .insert({
        user_id: userId,
        endpoint,
        method,
        timestamp: new Date()
      });
    
    if (error) {
      console.error('Error logging API usage:', error);
    }
  },

  // Whop integration operations
  async findUserByWhopId(whopUserId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        roles:user_roles(
          role:roles(*)
        )
      `)
      .eq('whop_user_id', whopUserId)
      .single();
    
    if (error) {
      return null;
    }
    
    return data;
  },

  async createWhopLinkedProfile(whopUserId: string, userData: any) {
    const profileData = {
      whop_user_id: whopUserId,
      email: userData.email || `whop_${whopUserId}@temp.com`,
      full_name: userData.name || 'Whop User',
      subscription_tier: 'premium', // Whop users get premium access
      roles: [],
    };

    return this.createProfile(profileData);
  },

  // Subscription and permission operations
  async updateUserSubscription(userId: string, subscriptionTier: string) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        subscription_tier: subscriptionTier,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
    
    return { data, error };
  },

  async getUserPermissions(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        role:roles(
          permissions
        )
      `)
      .eq('user_id', userId);
    
    if (error || !data) {
      return [];
    }
    
    const permissions = new Set<string>();
    data.forEach((userRole: any) => {
      if (userRole.role?.permissions) {
        userRole.role.permissions.forEach((permission: string) => {
          permissions.add(permission);
        });
      }
    });
    
    return Array.from(permissions);
  },

  // Financial data compliance operations
  async logFinancialDataAccess(accessData: {
    user_id: string;
    data_source: string;
    symbols_accessed: string[];
    data_types: string[];
    subscription_tier: string;
    rate_limit_remaining: number;
  }) {
    const { error } = await supabase
      .from('financial_data_access_logs')
      .insert({
        ...accessData,
        access_timestamp: new Date()
      });
    
    if (error) {
      console.error('Error logging financial data access:', error);
    }
  },

  // Audit and compliance operations
  async getSecurityLogs(userId?: string, limit: number = 100) {
    let query = supabase
      .from('security_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching security logs:', error);
      return [];
    }
    
    return data || [];
  },

  async getDataAccessLogs(userId?: string, dataType?: string, limit: number = 100) {
    let query = supabase
      .from('data_access_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    if (dataType) {
      query = query.eq('data_type', dataType);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching data access logs:', error);
      return [];
    }
    
    return data || [];
  }
};

// Auth helper functions for client-side operations
export const auth = {
  async signUp(email: string, password: string, metadata: { full_name?: string } = {}) {
    if (!supabase) {
      console.warn('Supabase not configured, mocking signup');
      return { 
        data: { 
          user: { 
            id: 'mock-user-id', 
            email,
            user_metadata: metadata 
          } 
        }, 
        error: null 
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
    return { data, error };
  },

  async signIn(email: string, password: string) {
    if (!supabase) {
      console.warn('Supabase not configured, mocking signin');
      return { 
        data: { 
          user: { 
            id: 'mock-user-id', 
            email 
          },
          session: null
        }, 
        error: null 
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.APP_URL || 'http://localhost:3000'}/auth/callback`
      }
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.APP_URL || 'http://localhost:3000'}/auth/reset-password`
    });
    return { data, error };
  },

  async updatePassword(newPassword: string) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    return { data, error };
  },

  getCurrentUser() {
    return supabase.auth.getUser();
  },

  getSession() {
    return supabase.auth.getSession();
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};