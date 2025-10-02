import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { User as SupabaseUser, Session, AuthError } from '@supabase/supabase-js';
import { performanceMonitor } from '@/lib/performance-monitor';

// Enhanced user profile that aligns with the Supabase auth context
export interface UserProfile {
  id: string;
  auth_id: string;
  email: string;
  name?: string;
  preferred_currency: 'EUR' | 'USD' | 'GBP' | 'JPY';
  preferred_language: 'pt' | 'en' | 'es' | 'fr';
  preferred_region: 'EU' | 'USA' | 'APAC';
  subscription_tier: 'free' | 'pro' | 'premium';
  profile_picture_url?: string;
  timezone: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  is_active: boolean;
}

// Legacy user interface for backward compatibility
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan: 'free' | 'pro' | 'enterprise';
  isAdmin: boolean;
  createdAt: string;
  lastLoginAt: string;
  emailVerified: boolean;
  phoneNumber?: string;
  country?: string;
  timezone?: string;
}

// Auth state for managing Supabase authentication
export interface AuthState {
  user: SupabaseUser | null;
  session: Session | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

export interface UserPreferences {
  defaultWatchlistId?: string;
  defaultPortfolioId?: string;
  favoriteStocks: string[];
  hiddenStocks: string[];
  customAlerts: {
    email: boolean;
    push: boolean;
    sms: boolean;
    priceAlerts: boolean;
    newsAlerts: boolean;
    earningsAlerts: boolean;
  };
  tradingHours: {
    preMarket: boolean;
    regularHours: boolean;
    afterHours: boolean;
  };
  chartDefaults: {
    period: '1D' | '1W' | '1M' | '3M' | '1Y';
    type: 'line' | 'candlestick' | 'area';
    indicators: string[];
  };
}

export interface UserSubscription {
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'canceled' | 'expired' | 'trial';
  expiresAt?: string;
  trialEndsAt?: string;
  features: {
    maxWatchlists: number;
    maxPortfolios: number;
    maxStocksPerWatchlist: number;
    maxHoldingsPerPortfolio: number;
    realTimeData: boolean;
    advancedCharts: boolean;
    customAlerts: boolean;
    exportData: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
  };
  usage: {
    watchlists: number;
    portfolios: number;
    apiCalls: number;
    alertsUsed: number;
  };
}

export interface UserState {
  // Legacy user data (for backward compatibility)
  user: User | null;
  preferences: UserPreferences;
  subscription: UserSubscription | null;
  
  // Enhanced Supabase authentication state
  auth: AuthState;
  
  // Authentication state (legacy)
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Legacy actions
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  setSubscription: (subscription: UserSubscription | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  
  // Enhanced authentication actions
  setSupabaseUser: (user: SupabaseUser | null) => void;
  setSession: (session: Session | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setAuthLoading: (isLoading: boolean) => void;
  setAuthError: (error: string | null) => void;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  
  // Auth actions (to be migrated from context)
  signUp: (email: string, password: string, userData?: any) => Promise<{ user: SupabaseUser | null; error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ user: SupabaseUser | null; error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ user: SupabaseUser | null; error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  refreshUser: () => Promise<void>;
  
  // Preference helpers
  addFavoriteStock: (symbol: string) => void;
  removeFavoriteStock: (symbol: string) => void;
  addHiddenStock: (symbol: string) => void;
  removeHiddenStock: (symbol: string) => void;
  toggleChartIndicator: (indicator: string) => void;
  
  // Subscription helpers
  canCreateWatchlist: () => boolean;
  canCreatePortfolio: () => boolean;
  canUseRealTimeData: () => boolean;
  canUseAdvancedCharts: () => boolean;
  canCreateCustomAlerts: () => boolean;
  
  // Computed getters
  getLegacyUser: () => User | null;
  getIsAuthenticated: () => boolean;
  
  // Utility actions
  resetUserState: () => void;
}

// Default preferences
const defaultPreferences: UserPreferences = {
  favoriteStocks: [],
  hiddenStocks: [],
  customAlerts: {
    email: true,
    push: true,
    sms: false,
    priceAlerts: true,
    newsAlerts: true,
    earningsAlerts: true,
  },
  tradingHours: {
    preMarket: true,
    regularHours: true,
    afterHours: true,
  },
  chartDefaults: {
    period: '1D',
    type: 'line',
    indicators: ['MA', 'Volume'],
  },
};

// Helper functions
const convertSupabaseUserToLegacy = (supabaseUser: SupabaseUser | null, userProfile: UserProfile | null): User | null => {
  if (!supabaseUser || !userProfile) return null;
  
  return {
    id: userProfile.id,
    email: supabaseUser.email || '',
    name: userProfile.name || supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || '',
    avatar: userProfile.profile_picture_url,
    plan: userProfile.subscription_tier === 'premium' ? 'enterprise' : userProfile.subscription_tier,
    isAdmin: false, // This would be determined by a separate admin check
    createdAt: userProfile.created_at,
    lastLoginAt: userProfile.last_login_at || userProfile.created_at,
    emailVerified: !!supabaseUser.email_confirmed_at,
    timezone: userProfile.timezone,
    country: userProfile.preferred_region,
  };
};

// Create the store with persistence
export const useUserStore = create<UserState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        user: null,
        preferences: defaultPreferences,
        subscription: null,
        isAuthenticated: false,
        isLoading: false,
        
        // Enhanced auth state
        auth: {
          user: null,
          session: null,
          userProfile: null,
          isLoading: false,
          error: null,
        },

        // Legacy actions
        setUser: (user) => {
          set((state) => {
            state.user = user;
            state.isAuthenticated = !!user;
          });
        },

        updateUser: (updates) => {
          set((state) => {
            if (state.user) {
              Object.assign(state.user, updates);
            }
          });
        },

        updatePreferences: (newPreferences) => {
          set((state) => {
            Object.assign(state.preferences, newPreferences);
          });
        },

        setSubscription: (subscription) => {
          set((state) => {
            state.subscription = subscription;
          });
        },

        setIsAuthenticated: (isAuthenticated) => {
          set((state) => {
            state.isAuthenticated = isAuthenticated;
          });
        },

        setIsLoading: (isLoading) => {
          set((state) => {
            state.isLoading = isLoading;
          });
        },

        // Enhanced authentication actions
        setSupabaseUser: (user) => {
          const startTime = performance.now();
          
          set((state) => {
            state.auth.user = user;
            // Update legacy user when both user and profile are available
            if (user && state.auth.userProfile) {
              state.user = convertSupabaseUserToLegacy(user, state.auth.userProfile);
            } else if (!user) {
              state.user = null;
            }
            state.isAuthenticated = !!user;
          });
          
          performanceMonitor.trackStoreUpdate('user', performance.now() - startTime);
        },

        setSession: (session) => {
          set((state) => {
            state.auth.session = session;
          });
        },

        setUserProfile: (profile) => {
          const startTime = performance.now();
          
          set((state) => {
            state.auth.userProfile = profile;
            // Update legacy user when both user and profile are available
            if (state.auth.user && profile) {
              state.user = convertSupabaseUserToLegacy(state.auth.user, profile);
            } else if (!profile) {
              state.user = null;
            }
          });
          
          performanceMonitor.trackStoreUpdate('user', performance.now() - startTime);
        },

        setAuthLoading: (isLoading) => {
          set((state) => {
            state.auth.isLoading = isLoading;
            state.isLoading = isLoading; // Keep legacy loading in sync
          });
        },

        setAuthError: (error) => {
          set((state) => {
            state.auth.error = error;
          });
        },

        updateUserProfile: async (updates) => {
          const startTime = performance.now();
          const { auth, setAuthLoading, setAuthError } = get();
          
          if (!auth.user) {
            throw new Error('User not authenticated');
          }

          try {
            setAuthLoading(true);
            setAuthError(null);

            // Import supabase here to avoid circular dependencies
            const { supabase } = await import('@/lib/supabase');
            
            // Update user profile in database
            const { data, error } = await supabase
              .from('users')
              .update({
                ...updates,
                updated_at: new Date().toISOString(),
              })
              .eq('auth_id', auth.user.id)
              .select()
              .single();

            if (error) throw error;

            // Update local state
            set((state) => {
              state.auth.userProfile = data;
              if (state.auth.user) {
                state.user = convertSupabaseUserToLegacy(state.auth.user, data);
              }
            });

            performanceMonitor.trackStoreUpdate('user', performance.now() - startTime);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
            setAuthError(errorMessage);
            throw error;
          } finally {
            setAuthLoading(false);
          }
        },

        // Auth actions (implementing the core logic from context)
        signUp: async (email, password, userData = {}) => {
          const { setAuthLoading, setAuthError } = get();
          
          try {
            setAuthLoading(true);
            setAuthError(null);

            const { supabase } = await import('@/lib/supabase');
            
            const { data, error } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  name: userData?.name,
                  preferred_language: 'pt',
                  preferred_currency: 'EUR',
                  preferred_region: 'EU',
                  ...userData
                }
              }
            });

            if (error) {
              setAuthError(error.message);
              return { user: null, error };
            }

            return { user: data.user, error: null };
          } catch (error) {
            const authError = error as AuthError;
            setAuthError(authError.message);
            return { user: null, error: authError };
          } finally {
            setAuthLoading(false);
          }
        },

        signIn: async (email, password) => {
          const { setAuthLoading, setAuthError } = get();
          
          try {
            setAuthLoading(true);
            setAuthError(null);

            const { supabase } = await import('@/lib/supabase');
            
            const { data, error } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (error) {
              setAuthError(error.message);
              return { user: null, error };
            }

            return { user: data.user, error: null };
          } catch (error) {
            const authError = error as AuthError;
            setAuthError(authError.message);
            return { user: null, error: authError };
          } finally {
            setAuthLoading(false);
          }
        },

        signInWithGoogle: async () => {
          const { setAuthLoading, setAuthError } = get();
          
          try {
            setAuthLoading(true);
            setAuthError(null);

            const { supabase } = await import('@/lib/supabase');
            
            const { data, error } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
              redirectTo: `${window.location.origin}/find-stocks`,
                queryParams: {
                  access_type: 'offline',
                  prompt: 'consent',
                }
              }
            });

            return { user: data.user, error };
          } catch (error) {
            const authError = error as AuthError;
            setAuthError(authError.message);
            return { user: null, error: authError };
          } finally {
            setAuthLoading(false);
          }
        },

        signOut: async () => {
          const { setAuthLoading, setAuthError } = get();
          
          try {
            setAuthLoading(true);
            setAuthError(null);

            const { supabase } = await import('@/lib/supabase');
            
            const { error } = await supabase.auth.signOut();

            if (error) {
              setAuthError(error.message);
              return { error };
            }

            // Clear local state
            set((state) => {
              state.auth.user = null;
              state.auth.session = null;
              state.auth.userProfile = null;
              state.user = null;
              state.isAuthenticated = false;
              state.subscription = null;
            });

            return { error: null };
          } catch (error) {
            const authError = error as AuthError;
            setAuthError(authError.message);
            return { error: authError };
          } finally {
            setAuthLoading(false);
          }
        },

        resetPassword: async (email) => {
          const { setAuthError } = get();
          
          try {
            setAuthError(null);

            const { supabase } = await import('@/lib/supabase');
            
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
              setAuthError(error.message);
              return { error };
            }

            return { error: null };
          } catch (error) {
            const authError = error as AuthError;
            setAuthError(authError.message);
            return { error: authError };
          }
        },

        refreshUser: async () => {
          const { auth, setAuthLoading, setAuthError } = get();
          
          if (!auth.user) return;

          try {
            setAuthLoading(true);
            setAuthError(null);

            const { supabase } = await import('@/lib/supabase');
            
            const { data, error } = await supabase
              .from('users')
              .select('*')
              .eq('auth_id', auth.user.id)
              .single();

            if (error) throw error;

            set((state) => {
              state.auth.userProfile = data;
              if (state.auth.user) {
                state.user = convertSupabaseUserToLegacy(state.auth.user, data);
              }
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to refresh user';
            setAuthError(errorMessage);
          } finally {
            setAuthLoading(false);
          }
        },

        // Preference helpers
        addFavoriteStock: (symbol) => {
          set((state) => {
            if (!state.preferences.favoriteStocks.includes(symbol)) {
              state.preferences.favoriteStocks.push(symbol);
            }
          });
        },

        removeFavoriteStock: (symbol) => {
          set((state) => {
            state.preferences.favoriteStocks = state.preferences.favoriteStocks.filter(
              (s) => s !== symbol
            );
          });
        },

        addHiddenStock: (symbol) => {
          set((state) => {
            if (!state.preferences.hiddenStocks.includes(symbol)) {
              state.preferences.hiddenStocks.push(symbol);
            }
          });
        },

        removeHiddenStock: (symbol) => {
          set((state) => {
            state.preferences.hiddenStocks = state.preferences.hiddenStocks.filter(
              (s) => s !== symbol
            );
          });
        },

        toggleChartIndicator: (indicator) => {
          set((state) => {
            const indicators = state.preferences.chartDefaults.indicators;
            const index = indicators.indexOf(indicator);
            
            if (index === -1) {
              indicators.push(indicator);
            } else {
              indicators.splice(index, 1);
            }
          });
        },

        // Subscription helpers
        canCreateWatchlist: () => {
          const { subscription } = get();
          if (!subscription) return false;
          return subscription.usage.watchlists < subscription.features.maxWatchlists;
        },

        canCreatePortfolio: () => {
          const { subscription } = get();
          if (!subscription) return false;
          return subscription.usage.portfolios < subscription.features.maxPortfolios;
        },

        canUseRealTimeData: () => {
          const { subscription } = get();
          return subscription?.features.realTimeData || false;
        },

        canUseAdvancedCharts: () => {
          const { subscription } = get();
          return subscription?.features.advancedCharts || false;
        },

        canCreateCustomAlerts: () => {
          const { subscription } = get();
          return subscription?.features.customAlerts || false;
        },

        // Computed getters
        getLegacyUser: () => {
          const { auth } = get();
          if (!auth.user || !auth.userProfile) return null;
          return convertSupabaseUserToLegacy(auth.user, auth.userProfile);
        },

        getIsAuthenticated: () => {
          const { auth } = get();
          return !!auth.user;
        },

        // Utility actions
        resetUserState: () => {
          set((state) => {
            state.user = null;
            state.preferences = { ...defaultPreferences };
            state.subscription = null;
            state.isAuthenticated = false;
            state.isLoading = false;
            
            // Reset auth state
            state.auth = {
              user: null,
              session: null,
              userProfile: null,
              isLoading: false,
              error: null,
            };
          });
        },
      })),
      {
        name: 'alfalyzer-user-store',
        partialize: (state) => ({
          user: state.user,
          preferences: state.preferences,
          subscription: state.subscription,
          isAuthenticated: state.isAuthenticated,
          auth: {
            userProfile: state.auth.userProfile,
            // Don't persist session or user for security
          },
        }),
      }
    ),
    {
      name: 'user-store',
    }
  )
);

// Legacy selectors for backward compatibility
export const useCurrentUser = () => useUserStore((state) => state.user);
export const useIsAuthenticated = () => useUserStore((state) => state.isAuthenticated);
export const useUserPreferences = () => useUserStore((state) => state.preferences);
export const useUserSubscription = () => useUserStore((state) => state.subscription);
export const useUserLoading = () => useUserStore((state) => state.isLoading);

// Enhanced auth selectors
export const useSupabaseUser = () => useUserStore((state) => state.auth.user);
export const useSupabaseSession = () => useUserStore((state) => state.auth.session);
export const useUserProfile = () => useUserStore((state) => state.auth.userProfile);
export const useAuthLoading = () => useUserStore((state) => state.auth.isLoading);
export const useAuthError = () => useUserStore((state) => state.auth.error);
export const useAuthState = () => useUserStore((state) => ({
  user: state.auth.user,
  session: state.auth.session,
  userProfile: state.auth.userProfile,
  isLoading: state.auth.isLoading,
  error: state.auth.error,
  isAuthenticated: !!state.auth.user,
}));

// Auth actions selectors
export const useAuthActions = () => useUserStore((state) => ({
  signUp: state.signUp,
  signIn: state.signIn,
  signInWithGoogle: state.signInWithGoogle,
  signOut: state.signOut,
  resetPassword: state.resetPassword,
  refreshUser: state.refreshUser,
  updateUserProfile: state.updateUserProfile,
  setSupabaseUser: state.setSupabaseUser,
  setSession: state.setSession,
  setUserProfile: state.setUserProfile,
  setAuthLoading: state.setAuthLoading,
  setAuthError: state.setAuthError,
}));

export const useFavoriteStocks = () => useUserStore((state) => ({
  favoriteStocks: state.preferences.favoriteStocks,
  addFavorite: state.addFavoriteStock,
  removeFavorite: state.removeFavoriteStock,
}));

export const useHiddenStocks = () => useUserStore((state) => ({
  hiddenStocks: state.preferences.hiddenStocks,
  addHidden: state.addHiddenStock,
  removeHidden: state.removeHiddenStock,
}));

export const useChartDefaults = () => useUserStore((state) => ({
  chartDefaults: state.preferences.chartDefaults,
  toggleIndicator: state.toggleChartIndicator,
}));

export const useSubscriptionLimits = () => useUserStore((state) => ({
  canCreateWatchlist: state.canCreateWatchlist,
  canCreatePortfolio: state.canCreatePortfolio,
  canUseRealTimeData: state.canUseRealTimeData,
  canUseAdvancedCharts: state.canUseAdvancedCharts,
  canCreateCustomAlerts: state.canCreateCustomAlerts,
  subscription: state.subscription,
}));

// Computed values
export const useUserDisplayName = () => {
  const user = useCurrentUser();
  return user?.name || user?.email || 'Anonymous';
};

export const useUserPlan = () => {
  const subscription = useUserSubscription();
  return subscription?.plan || 'free';
};

export const useIsProUser = () => {
  const plan = useUserPlan();
  return plan === 'pro' || plan === 'enterprise';
};

export const useIsAdmin = () => {
  const user = useCurrentUser();
  return user?.isAdmin || false;
};
