import { Request, Response, NextFunction } from 'express';
import { stripeService } from '../services/stripe-service';
import { SUBSCRIPTION_PLANS } from '@shared/subscription-schema';

// Feature access control based on subscription plans
export const SUBSCRIPTION_FEATURES = {
  free: [
    'basic_stock_search',
    'basic_portfolio_tracking',
    'limited_watchlists', // Max 2 watchlists
    'basic_charts',
  ],
  monthly: [
    'basic_stock_search',
    'advanced_stock_analysis',
    'unlimited_portfolio_tracking',
    'unlimited_watchlists',
    'advanced_charts',
    'intrinsic_value_calculator',
    'real_time_data',
    'export_data',
    'email_alerts',
  ],
  annual: [
    'basic_stock_search',
    'advanced_stock_analysis',
    'unlimited_portfolio_tracking',
    'unlimited_watchlists',
    'advanced_charts',
    'intrinsic_value_calculator',
    'real_time_data',
    'export_data',
    'email_alerts',
    'premium_support',
    'early_access_features',
    'advanced_analytics',
    'custom_alerts',
  ],
} as const;

// Usage limits based on subscription plans
export const SUBSCRIPTION_LIMITS = {
  free: {
    apiCallsPerHour: 50,
    apiCallsPerDay: 500,
    watchlistsMax: 2,
    stocksPerWatchlist: 10,
    portfoliosMax: 1,
    alertsMax: 5,
    exportPerDay: 2,
  },
  monthly: {
    apiCallsPerHour: 500,
    apiCallsPerDay: 5000,
    watchlistsMax: 20,
    stocksPerWatchlist: 50,
    portfoliosMax: 10,
    alertsMax: 50,
    exportPerDay: 20,
  },
  annual: {
    apiCallsPerHour: 1000,
    apiCallsPerDay: 10000,
    watchlistsMax: -1, // Unlimited
    stocksPerWatchlist: -1, // Unlimited
    portfoliosMax: -1, // Unlimited
    alertsMax: -1, // Unlimited
    exportPerDay: -1, // Unlimited
  },
} as const;

export type SubscriptionFeature = (typeof SUBSCRIPTION_FEATURES)[keyof typeof SUBSCRIPTION_FEATURES][number];
export type SubscriptionTier = keyof typeof SUBSCRIPTION_FEATURES;

declare global {
  namespace Express {
    interface Request {
      subscription?: {
        tier: SubscriptionTier;
        features: readonly SubscriptionFeature[];
        limits: typeof SUBSCRIPTION_LIMITS[SubscriptionTier];
        isActive: boolean;
        trialEndsAt?: Date;
        expiresAt?: Date;
      };
    }
  }
}

/**
 * Middleware to check and attach subscription information to request
 */
export const attachSubscriptionInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      // No authenticated user, set free tier defaults
      req.subscription = {
        tier: 'free',
        features: SUBSCRIPTION_FEATURES.free,
        limits: SUBSCRIPTION_LIMITS.free,
        isActive: true,
      };
      return next();
    }

    // Get user's Stripe customer and subscription
    const customer = await stripeService.createOrGetCustomer(
      req.user.email,
      req.user.name,
      req.user.id
    );

    const subscriptions = await stripeService.getCustomerSubscriptions(customer.id);
    const activeSubscription = subscriptions.find(sub => 
      ['active', 'trialing'].includes(sub.status)
    );

    if (!activeSubscription) {
      // No active subscription, default to free tier
      req.subscription = {
        tier: 'free',
        features: SUBSCRIPTION_FEATURES.free,
        limits: SUBSCRIPTION_LIMITS.free,
        isActive: true,
      };
      return next();
    }

    // Determine tier from subscription metadata or price
    const planId = activeSubscription.metadata?.planId as SubscriptionTier;
    const tier: SubscriptionTier = planId && planId in SUBSCRIPTION_FEATURES ? planId : 'monthly';

    // Check if subscription is in trial
    const isTrialing = activeSubscription.status === 'trialing';
    const trialEndsAt = activeSubscription.trial_end 
      ? new Date(activeSubscription.trial_end * 1000) 
      : undefined;

    const expiresAt = new Date(activeSubscription.current_period_end * 1000);

    req.subscription = {
      tier,
      features: SUBSCRIPTION_FEATURES[tier],
      limits: SUBSCRIPTION_LIMITS[tier],
      isActive: true,
      trialEndsAt,
      expiresAt,
    };

    next();
  } catch (error) {
    console.error('Error attaching subscription info:', error);
    
    // Fallback to free tier on error
    req.subscription = {
      tier: 'free',
      features: SUBSCRIPTION_FEATURES.free,
      limits: SUBSCRIPTION_LIMITS.free,
      isActive: true,
    };
    
    next();
  }
};

/**
 * Middleware to require specific features
 */
export const requireFeature = (feature: SubscriptionFeature) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.subscription) {
      return res.status(500).json({
        success: false,
        error: 'Subscription information not available',
      });
    }

    if (!req.subscription.features.includes(feature)) {
      return res.status(403).json({
        success: false,
        error: 'Feature not available in your subscription plan',
        requiredFeature: feature,
        currentTier: req.subscription.tier,
        upgradeRequired: true,
      });
    }

    next();
  };
};

/**
 * Middleware to require minimum subscription tier
 */
export const requireTier = (minimumTier: SubscriptionTier) => {
  const tierLevels: Record<SubscriptionTier, number> = {
    free: 0,
    monthly: 1,
    annual: 2,
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.subscription) {
      return res.status(500).json({
        success: false,
        error: 'Subscription information not available',
      });
    }

    const currentLevel = tierLevels[req.subscription.tier];
    const requiredLevel = tierLevels[minimumTier];

    if (currentLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        error: 'Higher subscription tier required',
        currentTier: req.subscription.tier,
        requiredTier: minimumTier,
        upgradeRequired: true,
      });
    }

    next();
  };
};

/**
 * Middleware to check usage limits
 */
export const checkUsageLimit = (limitType: keyof typeof SUBSCRIPTION_LIMITS.free) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.subscription) {
        return res.status(500).json({
          success: false,
          error: 'Subscription information not available',
        });
      }

      const limit = req.subscription.limits[limitType];
      
      // -1 means unlimited
      if (limit === -1) {
        return next();
      }

      // Here you would implement actual usage tracking
      // For now, we'll just check the limit exists and continue
      // In a real implementation, you'd check against a usage tracking system
      
      // Example usage tracking check:
      // const currentUsage = await getUsageForUser(req.user?.id, limitType);
      // if (currentUsage >= limit) {
      //   return res.status(429).json({
      //     success: false,
      //     error: 'Usage limit exceeded',
      //     limit,
      //     currentUsage,
      //     resetTime: getNextResetTime(limitType),
      //   });
      // }

      next();
    } catch (error) {
      console.error('Error checking usage limit:', error);
      next(); // Allow request to continue on error
    }
  };
};

/**
 * Middleware to enforce API rate limits based on subscription
 */
export const subscriptionRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.subscription) {
    return res.status(500).json({
      success: false,
      error: 'Subscription information not available',
    });
  }

  // Get rate limit for current subscription tier
  const hourlyLimit = req.subscription.limits.apiCallsPerHour;
  const dailyLimit = req.subscription.limits.apiCallsPerDay;

  // Add rate limit headers
  res.setHeader('X-RateLimit-Tier', req.subscription.tier);
  res.setHeader('X-RateLimit-Hourly', hourlyLimit.toString());
  res.setHeader('X-RateLimit-Daily', dailyLimit.toString());

  // In a real implementation, you would check actual usage here
  // For now, just continue with the request
  next();
};

/**
 * Helper function to get subscription info for a user
 */
export const getSubscriptionInfo = async (userId: string, userEmail: string): Promise<{
  tier: SubscriptionTier;
  features: readonly SubscriptionFeature[];
  limits: typeof SUBSCRIPTION_LIMITS[SubscriptionTier];
  isActive: boolean;
  trialEndsAt?: Date;
  expiresAt?: Date;
}> => {
  try {
    const customer = await stripeService.createOrGetCustomer(userEmail, undefined, userId);
    const subscriptions = await stripeService.getCustomerSubscriptions(customer.id);
    const activeSubscription = subscriptions.find(sub => 
      ['active', 'trialing'].includes(sub.status)
    );

    if (!activeSubscription) {
      return {
        tier: 'free',
        features: SUBSCRIPTION_FEATURES.free,
        limits: SUBSCRIPTION_LIMITS.free,
        isActive: true,
      };
    }

    const planId = activeSubscription.metadata?.planId as SubscriptionTier;
    const tier: SubscriptionTier = planId && planId in SUBSCRIPTION_FEATURES ? planId : 'monthly';

    const trialEndsAt = activeSubscription.trial_end 
      ? new Date(activeSubscription.trial_end * 1000) 
      : undefined;

    const expiresAt = new Date(activeSubscription.current_period_end * 1000);

    return {
      tier,
      features: SUBSCRIPTION_FEATURES[tier],
      limits: SUBSCRIPTION_LIMITS[tier],
      isActive: true,
      trialEndsAt,
      expiresAt,
    };
  } catch (error) {
    console.error('Error getting subscription info:', error);
    return {
      tier: 'free',
      features: SUBSCRIPTION_FEATURES.free,
      limits: SUBSCRIPTION_LIMITS.free,
      isActive: true,
    };
  }
};

/**
 * Helper function to check if user has access to a feature
 */
export const hasFeatureAccess = (
  subscription: NonNullable<Request['subscription']>,
  feature: SubscriptionFeature
): boolean => {
  return subscription.features.includes(feature);
};

/**
 * Helper function to get upgrade URL for current user
 */
export const getUpgradeUrl = (currentTier: SubscriptionTier): string => {
  const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  return `${baseUrl}/subscription/upgrade?from=${currentTier}`;
};

export default {
  attachSubscriptionInfo,
  requireFeature,
  requireTier,
  checkUsageLimit,
  subscriptionRateLimit,
  getSubscriptionInfo,
  hasFeatureAccess,
  getUpgradeUrl,
  SUBSCRIPTION_FEATURES,
  SUBSCRIPTION_LIMITS,
};