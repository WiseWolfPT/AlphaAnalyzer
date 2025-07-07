// Wave 4: Authentication + Monitoring Integration Hook
// Combines Supabase auth with comprehensive monitoring
import { useEffect } from 'react';
import { useSupabaseAuth } from '@/contexts/supabase-auth-context';
import { analytics, userContext } from '@/lib/monitoring';

// Custom hook that integrates authentication with monitoring
export const useAuthMonitoring = () => {
  const auth = useSupabaseAuth();

  // Update monitoring context when auth state changes
  useEffect(() => {
    if (auth.user && auth.userProfile) {
      // Set user context for error tracking
      userContext.setUser({
        id: auth.user.id,
        email: auth.user.email!,
        subscription_tier: auth.userProfile.subscription_tier
      });

      // Set user preferences for analytics
      userContext.setUserPreferences({
        currency: auth.userProfile.preferred_currency,
        language: auth.userProfile.preferred_language,
        region: auth.userProfile.preferred_region
      });

      // Track login event
      analytics.trackPageView('dashboard', {
        user_type: auth.userProfile.subscription_tier,
        market_focus: auth.userProfile.preferred_region,
        currency: auth.userProfile.preferred_currency
      });
    } else if (!auth.loading && !auth.user) {
      // Clear user context on logout
      userContext.clearUser();
    }
  }, [auth.user, auth.userProfile, auth.loading]);

  // Enhanced auth methods with monitoring
  const signInWithMonitoring = async (email: string, password: string) => {
    const startTime = performance.now();
    
    try {
      const result = await auth.signIn(email, password);
      
      if (result.user) {
        analytics.trackPageView('login_success', {
          login_method: 'email_password',
          duration: performance.now() - startTime
        });
      }
      
      return result;
    } catch (error) {
      analytics.trackError(error as Error, {
        context: 'login_attempt',
        method: 'email_password'
      });
      throw error;
    }
  };

  const signUpWithMonitoring = async (email: string, password: string, userData?: any) => {
    const startTime = performance.now();
    
    try {
      const result = await auth.signUp(email, password, userData);
      
      if (result.user) {
        analytics.trackPageView('signup_success', {
          signup_method: 'email_password',
          duration: performance.now() - startTime,
          user_region: userData?.preferred_region || 'EU'
        });
      }
      
      return result;
    } catch (error) {
      analytics.trackError(error as Error, {
        context: 'signup_attempt',
        method: 'email_password'
      });
      throw error;
    }
  };

  const signInWithGoogleMonitoring = async () => {
    const startTime = performance.now();
    
    try {
      const result = await auth.signInWithGoogle();
      
      if (result.user) {
        analytics.trackPageView('login_success', {
          login_method: 'google_oauth',
          duration: performance.now() - startTime
        });
      }
      
      return result;
    } catch (error) {
      analytics.trackError(error as Error, {
        context: 'login_attempt',
        method: 'google_oauth'
      });
      throw error;
    }
  };

  const signOutWithMonitoring = async () => {
    try {
      // Track session duration before logout
      if (auth.userProfile?.last_login_at) {
        const sessionDuration = Date.now() - new Date(auth.userProfile.last_login_at).getTime();
        analytics.trackPageView('logout', {
          session_duration: sessionDuration,
          user_type: auth.userProfile.subscription_tier
        });
      }
      
      const result = await auth.signOut();
      userContext.clearUser();
      
      return result;
    } catch (error) {
      analytics.trackError(error as Error, {
        context: 'logout_attempt'
      });
      throw error;
    }
  };

  return {
    // Original auth methods
    ...auth,
    
    // Enhanced methods with monitoring
    signIn: signInWithMonitoring,
    signUp: signUpWithMonitoring,
    signInWithGoogle: signInWithGoogleMonitoring,
    signOut: signOutWithMonitoring,
    
    // Monitoring utilities
    trackUserAction: (action: string, data?: Record<string, any>) => {
      analytics.trackPortfolioAction(action, data?.symbol, data?.value);
    },
    
    trackPageVisit: (pageName: string) => {
      analytics.trackPageView(pageName, {
        user_id: auth.user?.id,
        subscription_tier: auth.userProfile?.subscription_tier
      });
    }
  };
};