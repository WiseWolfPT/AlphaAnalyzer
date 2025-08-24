import { Request, Response, NextFunction } from 'express';
import { SUBSCRIPTION_LIMITS } from '@shared/subscription-schema';
import { stripeService } from '../services/stripe-service';

interface SubscriptionLimitOptions {
  feature: 'watchlist' | 'portfolio' | 'priceAlerts' | 'charts' | 'aiAnalysis' | 'signals';
  requiredTier?: 'starter' | 'pro' | 'elite';
  customMessage?: string;
}

/**
 * Middleware to check subscription limits
 */
export class SubscriptionLimitsMiddleware {
  /**
   * Check if user has access to a specific feature based on their subscription
   */
  static checkFeature(options: SubscriptionLimitOptions) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = req.user;
        
        // If no user, they're on free tier
        if (!user) {
          return SubscriptionLimitsMiddleware.handleFreeLimit(options, res);
        }

        // Get user's subscription status
        const userTier = await SubscriptionLimitsMiddleware.getUserTier(user.id, user.email);
        
        // Check if feature is available for user's tier
        const hasAccess = SubscriptionLimitsMiddleware.hasFeatureAccess(userTier, options.feature);
        
        if (!hasAccess) {
          return res.status(403).json({
            error: 'Feature not available',
            message: options.customMessage || `This feature requires a ${options.requiredTier || 'higher'} subscription plan`,
            requiredTier: options.requiredTier,
            currentTier: userTier,
            upgradeUrl: '/pricing'
          });
        }

        // Add tier info to request for downstream use
        req.userTier = userTier;
        req.subscriptionLimits = SUBSCRIPTION_LIMITS[userTier as keyof typeof SUBSCRIPTION_LIMITS];
        
        next();
      } catch (error) {
        console.error('Error checking subscription limits:', error);
        // Allow access on error to avoid blocking users
        next();
      }
    };
  }

  /**
   * Check if user can create more items (watchlists, portfolios, alerts)
   */
  static checkLimit(resource: 'watchlistStocks' | 'portfolios' | 'priceAlerts') {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = req.user;
        
        if (!user) {
          return SubscriptionLimitsMiddleware.handleFreeLimit({ feature: resource as any }, res);
        }

        const userTier = await SubscriptionLimitsMiddleware.getUserTier(user.id, user.email);
        const limits = SUBSCRIPTION_LIMITS[userTier as keyof typeof SUBSCRIPTION_LIMITS];
        const limit = limits[resource];
        
        // -1 means unlimited
        if (limit === -1) {
          req.userTier = userTier;
          req.subscriptionLimits = limits;
          return next();
        }

        // Check current count (this would need to be implemented based on your database)
        const currentCount = await SubscriptionLimitsMiddleware.getCurrentCount(user.id, resource);
        
        if (currentCount >= limit) {
          return res.status(403).json({
            error: 'Limit reached',
            message: `You have reached the limit of ${limit} ${resource} for your ${userTier} plan`,
            currentCount,
            limit,
            currentTier: userTier,
            upgradeUrl: '/pricing'
          });
        }

        req.userTier = userTier;
        req.subscriptionLimits = limits;
        req.remainingLimit = limit - currentCount;
        
        next();
      } catch (error) {
        console.error('Error checking resource limits:', error);
        next();
      }
    };
  }

  /**
   * Get user's current subscription tier
   */
  private static async getUserTier(userId: string, email: string): Promise<string> {
    if (!stripeService) {
      return 'free';
    }

    try {
      // Get customer from Stripe
      const customer = await stripeService.createOrGetCustomer(email, undefined, userId);
      
      // Get active subscriptions
      const subscriptions = await stripeService.getCustomerSubscriptions(customer.id);
      const activeSubscription = subscriptions.find(sub => 
        ['active', 'trialing'].includes(sub.status)
      );

      if (!activeSubscription) {
        return 'free';
      }

      // Extract tier from subscription metadata or price ID
      const planId = activeSubscription.metadata?.planId;
      
      if (planId) {
        // Extract tier from planId (e.g., "pro-monthly" -> "pro")
        const tier = planId.split('-')[0];
        if (['starter', 'pro', 'elite'].includes(tier)) {
          return tier;
        }
      }

      return 'free';
    } catch (error) {
      console.error('Error getting user tier:', error);
      return 'free';
    }
  }

  /**
   * Check if a tier has access to a feature
   */
  private static hasFeatureAccess(userTier: string, feature: string): boolean {
    const limits = SUBSCRIPTION_LIMITS[userTier as keyof typeof SUBSCRIPTION_LIMITS];
    
    if (!limits) {
      return false;
    }

    switch (feature) {
      case 'aiAnalysis':
        return limits.aiAnalysis === true;
      case 'signals':
        return (limits as any).signals === true;
      case 'charts':
        return limits.charts === 'all' || Array.isArray(limits.charts);
      default:
        return true;
    }
  }

  /**
   * Handle free tier limits
   */
  private static handleFreeLimit(options: SubscriptionLimitOptions, res: Response) {
    return res.status(403).json({
      error: 'Subscription required',
      message: options.customMessage || 'This feature requires a paid subscription',
      requiredTier: options.requiredTier || 'starter',
      currentTier: 'free',
      upgradeUrl: '/pricing'
    });
  }

  /**
   * Get current count of resources (placeholder - implement based on your database)
   */
  private static async getCurrentCount(userId: string, resource: string): Promise<number> {
    // This should query your database to get the actual count
    // For now, returning 0 as placeholder
    console.log(`Getting count of ${resource} for user ${userId}`);
    
    // Example implementation:
    // switch (resource) {
    //   case 'watchlistStocks':
    //     return await db.watchlists.countStocks(userId);
    //   case 'portfolios':
    //     return await db.portfolios.count({ userId });
    //   case 'priceAlerts':
    //     return await db.priceAlerts.count({ userId });
    //   default:
    //     return 0;
    // }
    
    return 0;
  }
}

// Export convenience functions
export const checkFeature = SubscriptionLimitsMiddleware.checkFeature;
export const checkLimit = SubscriptionLimitsMiddleware.checkLimit;

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userTier?: string;
      subscriptionLimits?: any;
      remainingLimit?: number;
    }
  }
}