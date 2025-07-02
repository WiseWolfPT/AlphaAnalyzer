import Stripe from 'stripe';
import { Request, Response } from 'express';
import { SUBSCRIPTION_PLANS, type UserSubscription, type SubscriptionPlan } from '@shared/subscription-schema';

// Initialize Stripe with environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
});

// Production environment configuration
const STRIPE_CONFIG = {
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  successUrl: process.env.CLIENT_URL + '/subscription/success',
  cancelUrl: process.env.CLIENT_URL + '/subscription/cancelled',
  customerPortalUrl: process.env.CLIENT_URL + '/subscription/manage',
} as const;

// Price IDs mapping to our subscription plans
const STRIPE_PRICE_IDS = {
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID!,
  annual: process.env.STRIPE_ANNUAL_PRICE_ID!,
} as const;

export interface StripeCustomer {
  id: string;
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface CreateCheckoutSessionOptions {
  customerId?: string;
  customerEmail?: string;
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
  trialDays?: number;
  allowPromotionCodes?: boolean;
  metadata?: Record<string, string>;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}

/**
 * Production Stripe Service for Alpha Analyzer
 * Handles subscriptions, payments, and customer management
 */
export class StripeService {
  private static instance: StripeService;
  private stripe: Stripe;

  private constructor() {
    this.stripe = stripe;
    this.validateEnvironmentVariables();
  }

  public static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  private validateEnvironmentVariables(): void {
    const requiredVars = [
      'STRIPE_SECRET_KEY',
      'STRIPE_PUBLISHABLE_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'STRIPE_MONTHLY_PRICE_ID',
      'STRIPE_ANNUAL_PRICE_ID',
      'CLIENT_URL',
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  /**
   * Create or retrieve a Stripe customer
   */
  async createOrGetCustomer(email: string, name?: string, userId?: string): Promise<StripeCustomer> {
    try {
      // Check if customer already exists
      const existingCustomers = await this.stripe.customers.list({
        email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        const customer = existingCustomers.data[0];
        return {
          id: customer.id,
          email: customer.email!,
          name: customer.name || undefined,
          metadata: customer.metadata,
        };
      }

      // Create new customer
      const customer = await this.stripe.customers.create({
        email,
        name: name || undefined,
        metadata: {
          userId: userId || '',
          source: 'alpha-analyzer',
        },
      });

      return {
        id: customer.id,
        email: customer.email!,
        name: customer.name || undefined,
        metadata: customer.metadata,
      };
    } catch (error) {
      console.error('Error creating/getting customer:', error);
      throw new Error('Failed to create or retrieve customer');
    }
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(options: CreateCheckoutSessionOptions): Promise<string> {
    try {
      const {
        customerId,
        customerEmail,
        priceId,
        successUrl = STRIPE_CONFIG.successUrl,
        cancelUrl = STRIPE_CONFIG.cancelUrl,
        trialDays,
        allowPromotionCodes = true,
        metadata = {},
      } = options;

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        allow_promotion_codes: allowPromotionCodes,
        billing_address_collection: 'auto',
        customer_creation: customerId ? undefined : 'always',
        subscription_data: {
          trial_period_days: trialDays,
          metadata: {
            ...metadata,
            planId: this.getPlanIdFromPriceId(priceId),
          },
        },
        metadata,
      };

      // Set customer or customer email
      if (customerId) {
        sessionParams.customer = customerId;
      } else if (customerEmail) {
        sessionParams.customer_email = customerEmail;
      }

      const session = await this.stripe.checkout.sessions.create(sessionParams);

      if (!session.url) {
        throw new Error('Checkout session URL not generated');
      }

      return session.url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  /**
   * Create customer portal session for subscription management
   */
  async createCustomerPortalSession(customerId: string, returnUrl?: string): Promise<string> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl || STRIPE_CONFIG.customerPortalUrl,
      });

      return session.url;
    } catch (error) {
      console.error('Error creating customer portal session:', error);
      throw new Error('Failed to create customer portal session');
    }
  }

  /**
   * Get customer's active subscriptions
   */
  async getCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    try {
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        expand: ['data.items.data.price'],
      });

      return subscriptions.data;
    } catch (error) {
      console.error('Error getting customer subscriptions:', error);
      throw new Error('Failed to retrieve customer subscriptions');
    }
  }

  /**
   * Cancel a subscription at period end
   */
  async cancelSubscription(subscriptionId: string, immediately = false): Promise<Stripe.Subscription> {
    try {
      if (immediately) {
        return await this.stripe.subscriptions.cancel(subscriptionId);
      } else {
        return await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  /**
   * Reactivate a cancelled subscription
   */
  async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      throw new Error('Failed to reactivate subscription');
    }
  }

  /**
   * Update subscription to new plan
   */
  async updateSubscription(
    subscriptionId: string, 
    newPriceId: string,
    prorationBehavior: 'create_prorations' | 'none' = 'create_prorations'
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      
      return await this.stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: prorationBehavior,
        metadata: {
          ...subscription.metadata,
          planId: this.getPlanIdFromPriceId(newPriceId),
        },
      });
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw new Error('Failed to update subscription');
    }
  }

  /**
   * Get subscription by ID with expanded data
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price', 'customer'],
      });
    } catch (error) {
      console.error('Error getting subscription:', error);
      return null;
    }
  }

  /**
   * Handle Stripe webhooks securely
   */
  async handleWebhook(req: Request, res: Response, handlers: WebhookHandlers): Promise<Response> {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = this.stripe.webhooks.constructEvent(
        req.body,
        sig,
        STRIPE_CONFIG.webhookSecret
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return res.status(400).send('Webhook Error: Invalid signature');
    }

    try {
      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          if (handlers.onCheckoutCompleted) {
            await handlers.onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          }
          break;

        case 'customer.subscription.created':
          if (handlers.onSubscriptionCreated) {
            await handlers.onSubscriptionCreated(event.data.object as Stripe.Subscription);
          }
          break;

        case 'customer.subscription.updated':
          if (handlers.onSubscriptionUpdated) {
            await handlers.onSubscriptionUpdated(event.data.object as Stripe.Subscription);
          }
          break;

        case 'customer.subscription.deleted':
          if (handlers.onSubscriptionDeleted) {
            await handlers.onSubscriptionDeleted(event.data.object as Stripe.Subscription);
          }
          break;

        case 'customer.subscription.trial_will_end':
          if (handlers.onTrialWillEnd) {
            await handlers.onTrialWillEnd(event.data.object as Stripe.Subscription);
          }
          break;

        case 'invoice.payment_succeeded':
          if (handlers.onPaymentSucceeded) {
            await handlers.onPaymentSucceeded(event.data.object as Stripe.Invoice);
          }
          break;

        case 'invoice.payment_failed':
          if (handlers.onPaymentFailed) {
            await handlers.onPaymentFailed(event.data.object as Stripe.Invoice);
          }
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return res.json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  /**
   * Create subscription with trial directly (without checkout)
   */
  async createSubscriptionWithTrial(
    customerId: string,
    priceId: string,
    trialDays: number = 7
  ): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        trial_period_days: trialDays,
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          planId: this.getPlanIdFromPriceId(priceId),
          trialSubscription: 'true',
        },
      });
    } catch (error) {
      console.error('Error creating trial subscription:', error);
      throw new Error('Failed to create trial subscription');
    }
  }

  /**
   * Get upcoming invoice for subscription changes
   */
  async getUpcomingInvoice(customerId: string, subscriptionId?: string): Promise<Stripe.Invoice | null> {
    try {
      const params: Stripe.InvoiceRetrieveUpcomingParams = {
        customer: customerId,
      };
      
      if (subscriptionId) {
        params.subscription = subscriptionId;
      }

      return await this.stripe.invoices.retrieveUpcoming(params);
    } catch (error) {
      console.error('Error getting upcoming invoice:', error);
      return null;
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<Stripe.Invoice | null> {
    try {
      return await this.stripe.invoices.retrieve(invoiceId);
    } catch (error) {
      console.error('Error getting invoice:', error);
      return null;
    }
  }

  /**
   * Helper method to get plan ID from price ID
   */
  private getPlanIdFromPriceId(priceId: string): string {
    if (priceId === STRIPE_PRICE_IDS.monthly) return 'monthly';
    if (priceId === STRIPE_PRICE_IDS.annual) return 'annual';
    return 'unknown';
  }

  /**
   * Get all price IDs for the application
   */
  getPriceIds(): typeof STRIPE_PRICE_IDS {
    return STRIPE_PRICE_IDS;
  }

  /**
   * Get Stripe configuration (safe for client-side)
   */
  getPublicConfig() {
    return {
      publishableKey: STRIPE_CONFIG.publishableKey,
      successUrl: STRIPE_CONFIG.successUrl,
      cancelUrl: STRIPE_CONFIG.cancelUrl,
    };
  }

  /**
   * Convert Stripe subscription to our UserSubscription format
   */
  convertToUserSubscription(
    stripeSubscription: Stripe.Subscription,
    userId: string
  ): Partial<UserSubscription> {
    const planId = stripeSubscription.metadata?.planId || 'monthly';
    const currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
    const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
    const trialEnd = stripeSubscription.trial_end 
      ? new Date(stripeSubscription.trial_end * 1000) 
      : null;

    let status: UserSubscription['status'];
    switch (stripeSubscription.status) {
      case 'trialing':
        status = 'trial';
        break;
      case 'active':
        status = 'active';
        break;
      case 'canceled':
      case 'unpaid':
        status = 'cancelled';
        break;
      case 'past_due':
      case 'incomplete':
      case 'incomplete_expired':
      default:
        status = 'expired';
        break;
    }

    return {
      userId,
      planId,
      status,
      startDate: currentPeriodStart.toISOString(),
      endDate: currentPeriodEnd.toISOString(),
      trialEndDate: trialEnd?.toISOString(),
      paymentMethod: 'stripe',
      stripeSubscriptionId: stripeSubscription.id,
    };
  }
}

/**
 * Webhook event handlers interface
 */
export interface WebhookHandlers {
  onCheckoutCompleted?: (session: Stripe.Checkout.Session) => Promise<void>;
  onSubscriptionCreated?: (subscription: Stripe.Subscription) => Promise<void>;
  onSubscriptionUpdated?: (subscription: Stripe.Subscription) => Promise<void>;
  onSubscriptionDeleted?: (subscription: Stripe.Subscription) => Promise<void>;
  onTrialWillEnd?: (subscription: Stripe.Subscription) => Promise<void>;
  onPaymentSucceeded?: (invoice: Stripe.Invoice) => Promise<void>;
  onPaymentFailed?: (invoice: Stripe.Invoice) => Promise<void>;
}

// Export singleton instance
export const stripeService = StripeService.getInstance();