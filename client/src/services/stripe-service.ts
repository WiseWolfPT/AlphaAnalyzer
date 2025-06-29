import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

/**
 * Get Stripe instance (loads Stripe.js if not already loaded)
 */
const getStripe = () => {
  if (!stripePromise) {
    // In production, get this from your API
    stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  isPopular?: boolean;
  stripeData?: {
    priceId: string | null;
    isActive: boolean;
  };
}

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  subscription: {
    id: string;
    planId: string;
    status: string;
    stripeData: {
      status: string;
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
      trialEnd: Date | null;
      cancelAtPeriodEnd: boolean;
    };
  } | null;
  customer: {
    id: string;
    email: string;
  };
}

export interface CreateCheckoutRequest {
  planId: 'monthly' | 'annual';
  successUrl?: string;
  cancelUrl?: string;
  trialDays?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

/**
 * Frontend Stripe service for Alpha Analyzer
 */
class StripeApiService {
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = '/api/subscriptions';
  }

  /**
   * Get available subscription plans
   */
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/plans`);
      const result: ApiResponse<{ plans: SubscriptionPlan[] }> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch subscription plans');
      }
      
      return result.data.plans;
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      throw error;
    }
  }

  /**
   * Get current user's subscription status
   */
  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/status`, {
        credentials: 'include',
      });
      
      const result: ApiResponse<SubscriptionStatus> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch subscription status');
      }
      
      return result.data;
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      throw error;
    }
  }

  /**
   * Create checkout session and redirect to Stripe Checkout
   */
  async createCheckoutSession(request: CreateCheckoutRequest): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(request),
      });

      const result: ApiResponse<{ checkoutUrl: string }> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      window.location.href = result.data.checkoutUrl;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Create customer portal session for subscription management
   */
  async createPortalSession(returnUrl?: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ returnUrl }),
      });

      const result: ApiResponse<{ portalUrl: string }> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create portal session');
      }

      // Redirect to Stripe Customer Portal
      window.location.href = result.data.portalUrl;
    } catch (error) {
      console.error('Error creating portal session:', error);
      throw error;
    }
  }

  /**
   * Update subscription plan
   */
  async updateSubscription(
    planId: 'monthly' | 'annual',
    prorationBehavior: 'create_prorations' | 'none' = 'create_prorations'
  ): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          planId,
          prorationBehavior,
        }),
      });

      const result: ApiResponse<{ subscription: any; message: string }> = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update subscription');
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(immediately: boolean = false): Promise<{ message: string }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ immediately }),
      });

      const result: ApiResponse<{ subscription: any; message: string }> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to cancel subscription');
      }

      return { message: result.data.message };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * Reactivate cancelled subscription
   */
  async reactivateSubscription(): Promise<{ message: string }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const result: ApiResponse<{ subscription: any; message: string }> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to reactivate subscription');
      }

      return { message: result.data.message };
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription invoices
   */
  async getInvoices(limit: number = 10): Promise<any[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/invoices?limit=${limit}`, {
        credentials: 'include',
      });

      const result: ApiResponse<{ invoices: any[]; hasMore: boolean }> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch invoices');
      }

      return result.data.invoices;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  }

  /**
   * Handle feature access errors
   */
  handleFeatureAccessError(error: any): {
    isFeatureRestricted: boolean;
    upgradeRequired: boolean;
    currentTier?: string;
    requiredFeature?: string;
    message: string;
  } {
    if (error && typeof error === 'object') {
      if (error.upgradeRequired || error.requiredFeature) {
        return {
          isFeatureRestricted: true,
          upgradeRequired: true,
          currentTier: error.currentTier,
          requiredFeature: error.requiredFeature,
          message: error.error || 'This feature requires a subscription upgrade',
        };
      }
    }

    return {
      isFeatureRestricted: false,
      upgradeRequired: false,
      message: error?.message || 'An error occurred',
    };
  }
}

// React hook for Stripe service
export const useStripeService = () => {
  return new StripeApiService();
};

export const stripeApiService = new StripeApiService();
export default stripeApiService;