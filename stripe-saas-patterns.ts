// Stripe SaaS Subscription Management Patterns for TypeScript
// This file contains comprehensive patterns for implementing Stripe subscriptions
// including subscription tiers, webhooks, customer portal, metered billing, and freemium to premium flows

import Stripe from 'stripe';
import { Request, Response, NextFunction } from 'express';

// Initialize Stripe with TypeScript
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

// ==========================================
// 1. SUBSCRIPTION TIERS IMPLEMENTATION
// ==========================================

// Define subscription tier types
interface SubscriptionTier {
  id: string;
  name: string;
  priceId: string;
  features: string[];
  limits: {
    apiCalls?: number;
    storage?: number;
    users?: number;
  };
}

// Define your subscription tiers
const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  FREE: {
    id: 'free',
    name: 'Free',
    priceId: '', // No price ID for free tier
    features: ['Basic features', '100 API calls/month', '1GB storage'],
    limits: {
      apiCalls: 100,
      storage: 1,
      users: 1,
    },
  },
  STARTER: {
    id: 'starter',
    name: 'Starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    features: ['All basic features', '1,000 API calls/month', '10GB storage', 'Email support'],
    limits: {
      apiCalls: 1000,
      storage: 10,
      users: 5,
    },
  },
  PRO: {
    id: 'pro',
    name: 'Professional',
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    features: ['All starter features', '10,000 API calls/month', '100GB storage', 'Priority support', 'Advanced analytics'],
    limits: {
      apiCalls: 10000,
      storage: 100,
      users: 20,
    },
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
    features: ['Unlimited API calls', 'Unlimited storage', 'Dedicated support', 'Custom integrations', 'SLA'],
    limits: {
      apiCalls: -1, // Unlimited
      storage: -1,
      users: -1,
    },
  },
};

// Create a new customer with subscription
export async function createCustomerWithSubscription(
  email: string,
  name: string,
  tierId: keyof typeof SUBSCRIPTION_TIERS,
  paymentMethodId?: string
): Promise<{
  customer: Stripe.Customer;
  subscription?: Stripe.Subscription;
}> {
  try {
    // Create customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        tier: tierId,
      },
    });

    // If free tier, no subscription needed
    if (tierId === 'FREE') {
      return { customer };
    }

    // Attach payment method if provided
    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });

      // Set as default payment method
      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{
        price: SUBSCRIPTION_TIERS[tierId].priceId,
      }],
      payment_behavior: 'default_incomplete',
      payment_settings: { 
        save_default_payment_method: 'on_subscription' 
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        tier: tierId,
      },
    });

    return { customer, subscription };
  } catch (error) {
    console.error('Error creating customer with subscription:', error);
    throw error;
  }
}

// ==========================================
// 2. WEBHOOK HANDLING FOR PAYMENT EVENTS
// ==========================================

interface WebhookHandlers {
  'checkout.session.completed': (session: Stripe.Checkout.Session) => Promise<void>;
  'customer.subscription.created': (subscription: Stripe.Subscription) => Promise<void>;
  'customer.subscription.updated': (subscription: Stripe.Subscription) => Promise<void>;
  'customer.subscription.deleted': (subscription: Stripe.Subscription) => Promise<void>;
  'customer.subscription.trial_will_end': (subscription: Stripe.Subscription) => Promise<void>;
  'invoice.payment_succeeded': (invoice: Stripe.Invoice) => Promise<void>;
  'invoice.payment_failed': (invoice: Stripe.Invoice) => Promise<void>;
  'customer.subscription.paused': (subscription: Stripe.Subscription) => Promise<void>;
  'customer.subscription.resumed': (subscription: Stripe.Subscription) => Promise<void>;
}

// Webhook endpoint handler
export async function handleStripeWebhook(
  req: Request,
  res: Response,
  handlers: Partial<WebhookHandlers>
): Promise<Response> {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    // Construct event from raw body
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        if (handlers['checkout.session.completed']) {
          await handlers['checkout.session.completed'](session);
        }
        break;

      case 'customer.subscription.created':
        const subscriptionCreated = event.data.object as Stripe.Subscription;
        if (handlers['customer.subscription.created']) {
          await handlers['customer.subscription.created'](subscriptionCreated);
        }
        break;

      case 'customer.subscription.updated':
        const subscriptionUpdated = event.data.object as Stripe.Subscription;
        if (handlers['customer.subscription.updated']) {
          await handlers['customer.subscription.updated'](subscriptionUpdated);
        }
        break;

      case 'customer.subscription.deleted':
        const subscriptionDeleted = event.data.object as Stripe.Subscription;
        if (handlers['customer.subscription.deleted']) {
          await handlers['customer.subscription.deleted'](subscriptionDeleted);
        }
        break;

      case 'customer.subscription.trial_will_end':
        const subscriptionTrial = event.data.object as Stripe.Subscription;
        if (handlers['customer.subscription.trial_will_end']) {
          await handlers['customer.subscription.trial_will_end'](subscriptionTrial);
        }
        break;

      case 'invoice.payment_succeeded':
        const invoiceSucceeded = event.data.object as Stripe.Invoice;
        if (handlers['invoice.payment_succeeded']) {
          await handlers['invoice.payment_succeeded'](invoiceSucceeded);
        }
        break;

      case 'invoice.payment_failed':
        const invoiceFailed = event.data.object as Stripe.Invoice;
        if (handlers['invoice.payment_failed']) {
          await handlers['invoice.payment_failed'](invoiceFailed);
        }
        break;

      case 'customer.subscription.paused':
        const subscriptionPaused = event.data.object as Stripe.Subscription;
        if (handlers['customer.subscription.paused']) {
          await handlers['customer.subscription.paused'](subscriptionPaused);
        }
        break;

      case 'customer.subscription.resumed':
        const subscriptionResumed = event.data.object as Stripe.Subscription;
        if (handlers['customer.subscription.resumed']) {
          await handlers['customer.subscription.resumed'](subscriptionResumed);
        }
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).send('Webhook processing failed');
  }
}

// Example webhook handlers implementation
export const webhookHandlers: Partial<WebhookHandlers> = {
  'customer.subscription.created': async (subscription) => {
    console.log('New subscription created:', subscription.id);
    // Update user's subscription status in your database
    // Send welcome email
    // Provision resources based on tier
  },

  'customer.subscription.updated': async (subscription) => {
    console.log('Subscription updated:', subscription.id);
    // Update user's tier in database
    // Adjust resource limits
    // Send notification email
  },

  'customer.subscription.deleted': async (subscription) => {
    console.log('Subscription cancelled:', subscription.id);
    // Downgrade user to free tier
    // Schedule data retention/deletion
    // Send cancellation email
  },

  'invoice.payment_failed': async (invoice) => {
    console.log('Payment failed for invoice:', invoice.id);
    // Send payment failure email
    // Update user status
    // Implement retry logic
  },
};

// ==========================================
// 3. CUSTOMER PORTAL INTEGRATION
// ==========================================

// Create a customer portal session
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session.url;
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
}

// Configure customer portal programmatically
export async function configureCustomerPortal() {
  try {
    const configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your subscription',
      },
      features: {
        invoice_history: {
          enabled: true,
        },
        payment_method_update: {
          enabled: true,
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'other',
            ],
          },
        },
        subscription_pause: {
          enabled: true,
        },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price'],
          proration_behavior: 'create_prorations',
          products: [
            {
              product: process.env.STRIPE_PRODUCT_ID!,
              prices: [
                SUBSCRIPTION_TIERS.STARTER.priceId,
                SUBSCRIPTION_TIERS.PRO.priceId,
                SUBSCRIPTION_TIERS.ENTERPRISE.priceId,
              ],
            },
          ],
        },
      },
    });

    return configuration;
  } catch (error) {
    console.error('Error configuring portal:', error);
    throw error;
  }
}

// ==========================================
// 4. METERED BILLING FOR API USAGE
// ==========================================

// Create a usage-based price
export async function createMeteredPrice(
  productId: string,
  unitAmount: number,
  currency: string = 'usd'
): Promise<Stripe.Price> {
  try {
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: unitAmount,
      currency: currency,
      recurring: {
        interval: 'month',
        usage_type: 'metered',
        aggregate_usage: 'sum',
      },
      billing_scheme: 'per_unit',
      nickname: 'API Usage',
    });

    return price;
  } catch (error) {
    console.error('Error creating metered price:', error);
    throw error;
  }
}

// Create tiered pricing for volume discounts
export async function createTieredMeteredPrice(
  productId: string,
  currency: string = 'usd'
): Promise<Stripe.Price> {
  try {
    const price = await stripe.prices.create({
      product: productId,
      currency: currency,
      recurring: {
        interval: 'month',
        usage_type: 'metered',
      },
      billing_scheme: 'tiered',
      tiers_mode: 'graduated',
      tiers: [
        {
          unit_amount: 100, // $1.00 per unit for first 1000
          up_to: 1000,
        },
        {
          unit_amount: 80, // $0.80 per unit for 1001-10000
          up_to: 10000,
        },
        {
          unit_amount: 50, // $0.50 per unit for 10001+
          up_to: 'inf',
        },
      ],
      nickname: 'API Usage - Tiered',
    });

    return price;
  } catch (error) {
    console.error('Error creating tiered price:', error);
    throw error;
  }
}

// Report usage for a subscription
export async function reportUsage(
  subscriptionItemId: string,
  quantity: number,
  timestamp: number = Math.floor(Date.now() / 1000),
  action: 'increment' | 'set' = 'increment'
): Promise<Stripe.UsageRecord> {
  try {
    const usageRecord = await stripe.subscriptionItems.createUsageRecord(
      subscriptionItemId,
      {
        quantity,
        timestamp,
        action,
      }
    );

    return usageRecord;
  } catch (error) {
    console.error('Error reporting usage:', error);
    throw error;
  }
}

// Create meter event (new Stripe Billing Meters API)
export async function createMeterEvent(
  eventName: string,
  customerId: string,
  value: number,
  identifier?: string
): Promise<Stripe.Billing.MeterEvent> {
  try {
    const meterEvent = await stripe.billing.meterEvents.create({
      event_name: eventName,
      payload: {
        stripe_customer_id: customerId,
        value: value.toString(),
        ...(identifier && { identifier }),
      },
    });

    return meterEvent;
  } catch (error) {
    console.error('Error creating meter event:', error);
    throw error;
  }
}

// Get usage summary for a customer
export async function getUsageSummary(
  meterId: string,
  customerId: string,
  startTime: number,
  endTime: number
): Promise<Stripe.ApiList<Stripe.Billing.MeterEventSummary>> {
  try {
    const summaries = await stripe.billing.meters.listEventSummaries(
      meterId,
      {
        customer: customerId,
        start_time: startTime,
        end_time: endTime,
      }
    );

    return summaries;
  } catch (error) {
    console.error('Error getting usage summary:', error);
    throw error;
  }
}

// ==========================================
// 5. FREEMIUM TO PREMIUM UPGRADE FLOWS
// ==========================================

// Create checkout session for upgrade
export async function createUpgradeCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  trialDays?: number
): Promise<string> {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      subscription_data: {
        trial_period_days: trialDays,
        metadata: {
          upgrade: 'true',
        },
      },
    });

    return session.url!;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

// Upgrade subscription immediately
export async function upgradeSubscription(
  subscriptionId: string,
  newPriceId: string,
  prorationBehavior: 'create_prorations' | 'none' | 'always_invoice' = 'create_prorations'
): Promise<Stripe.Subscription> {
  try {
    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Update subscription with new price
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: prorationBehavior,
    });

    return updatedSubscription;
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    throw error;
  }
}

// Add metered component to existing subscription
export async function addMeteredBilling(
  subscriptionId: string,
  meteredPriceId: string
): Promise<Stripe.Subscription> {
  try {
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        price: meteredPriceId,
      }],
    });

    return updatedSubscription;
  } catch (error) {
    console.error('Error adding metered billing:', error);
    throw error;
  }
}

// Create a subscription with both flat rate and metered components
export async function createHybridSubscription(
  customerId: string,
  flatPriceId: string,
  meteredPriceId: string,
  paymentMethodId?: string
): Promise<Stripe.Subscription> {
  try {
    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: flatPriceId,
          quantity: 1,
        },
        {
          price: meteredPriceId,
        },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: { 
        save_default_payment_method: 'on_subscription' 
      },
      expand: ['latest_invoice.payment_intent'],
    });

    return subscription;
  } catch (error) {
    console.error('Error creating hybrid subscription:', error);
    throw error;
  }
}

// Check if user can access a feature based on their subscription
export async function checkFeatureAccess(
  customerId: string,
  feature: string
): Promise<boolean> {
  try {
    // Get customer's active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
    });

    if (subscriptions.data.length === 0) {
      // No active subscription, check if free tier allows it
      return SUBSCRIPTION_TIERS.FREE.features.includes(feature);
    }

    // Check if any active subscription includes the feature
    for (const subscription of subscriptions.data) {
      const tier = subscription.metadata.tier as keyof typeof SUBSCRIPTION_TIERS;
      if (tier && SUBSCRIPTION_TIERS[tier]?.features.includes(feature)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking feature access:', error);
    return false;
  }
}

// Create pricing table for display
export function getPricingTableData() {
  return Object.values(SUBSCRIPTION_TIERS).map(tier => ({
    id: tier.id,
    name: tier.name,
    priceId: tier.priceId,
    features: tier.features,
    limits: tier.limits,
    recommended: tier.id === 'pro', // Mark PRO as recommended
  }));
}

// ==========================================
// 6. SUBSCRIPTION LIFECYCLE MANAGEMENT
// ==========================================

// Pause subscription
export async function pauseSubscription(
  subscriptionId: string,
  pauseCollection: {
    behavior: 'keep_as_draft' | 'mark_uncollectible' | 'void';
    resumes_at?: number;
  }
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      pause_collection: pauseCollection,
    });

    return subscription;
  } catch (error) {
    console.error('Error pausing subscription:', error);
    throw error;
  }
}

// Resume paused subscription
export async function resumeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      pause_collection: null,
    });

    return subscription;
  } catch (error) {
    console.error('Error resuming subscription:', error);
    throw error;
  }
}

// Schedule subscription cancellation at period end
export async function scheduleSubscriptionCancellation(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    return subscription;
  } catch (error) {
    console.error('Error scheduling cancellation:', error);
    throw error;
  }
}

// Reactivate scheduled cancellation
export async function reactivateSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    return subscription;
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    throw error;
  }
}

// ==========================================
// 7. TRIAL MANAGEMENT
// ==========================================

// Create subscription with trial
export async function createSubscriptionWithTrial(
  customerId: string,
  priceId: string,
  trialDays: number = 14
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price: priceId,
      }],
      trial_period_days: trialDays,
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      trial_settings: {
        end_behavior: {
          missing_payment_method: 'cancel',
        },
      },
      metadata: {
        trial: 'true',
      },
    });

    return subscription;
  } catch (error) {
    console.error('Error creating trial subscription:', error);
    throw error;
  }
}

// Extend trial period
export async function extendTrial(
  subscriptionId: string,
  additionalDays: number
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const currentTrialEnd = subscription.trial_end || Math.floor(Date.now() / 1000);
    const newTrialEnd = currentTrialEnd + (additionalDays * 24 * 60 * 60);

    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      trial_end: newTrialEnd,
    });

    return updatedSubscription;
  } catch (error) {
    console.error('Error extending trial:', error);
    throw error;
  }
}

// ==========================================
// 8. COUPON AND DISCOUNT MANAGEMENT
// ==========================================

// Create a coupon
export async function createCoupon(
  percentOff?: number,
  amountOff?: number,
  duration: 'forever' | 'once' | 'repeating' = 'once',
  durationInMonths?: number,
  maxRedemptions?: number
): Promise<Stripe.Coupon> {
  try {
    const coupon = await stripe.coupons.create({
      percent_off: percentOff,
      amount_off: amountOff,
      currency: amountOff ? 'usd' : undefined,
      duration,
      duration_in_months: duration === 'repeating' ? durationInMonths : undefined,
      max_redemptions: maxRedemptions,
      metadata: {
        campaign: 'freemium_upgrade',
      },
    });

    return coupon;
  } catch (error) {
    console.error('Error creating coupon:', error);
    throw error;
  }
}

// Apply coupon to subscription
export async function applyCouponToSubscription(
  subscriptionId: string,
  couponId: string
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      coupon: couponId,
    });

    return subscription;
  } catch (error) {
    console.error('Error applying coupon:', error);
    throw error;
  }
}

// ==========================================
// 9. ANALYTICS AND REPORTING
// ==========================================

// Get subscription metrics
export async function getSubscriptionMetrics(
  startDate: Date,
  endDate: Date
): Promise<{
  totalSubscriptions: number;
  activeSubscriptions: number;
  churnedSubscriptions: number;
  revenue: number;
  averageRevenuePerUser: number;
}> {
  try {
    // This is a simplified example - in production, you'd want to use Stripe Sigma
    // or export data to your analytics platform
    
    const subscriptions = await stripe.subscriptions.list({
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000),
      },
      limit: 100,
      expand: ['data.items.data.price'],
    });

    let totalSubscriptions = 0;
    let activeSubscriptions = 0;
    let churnedSubscriptions = 0;
    let revenue = 0;

    // Process all subscriptions with auto-pagination
    for await (const subscription of subscriptions.autoPagingEach()) {
      totalSubscriptions++;
      
      if (subscription.status === 'active') {
        activeSubscriptions++;
        
        // Calculate revenue
        for (const item of subscription.items.data) {
          if (item.price.recurring?.interval === 'month') {
            revenue += (item.price.unit_amount || 0) * (item.quantity || 1);
          }
        }
      } else if (subscription.status === 'canceled') {
        churnedSubscriptions++;
      }
    }

    const averageRevenuePerUser = activeSubscriptions > 0 
      ? revenue / activeSubscriptions / 100 // Convert from cents
      : 0;

    return {
      totalSubscriptions,
      activeSubscriptions,
      churnedSubscriptions,
      revenue: revenue / 100, // Convert from cents
      averageRevenuePerUser,
    };
  } catch (error) {
    console.error('Error getting subscription metrics:', error);
    throw error;
  }
}

// Export type definitions
export type {
  SubscriptionTier,
  WebhookHandlers,
};

// Export Stripe instance for use in other modules
export { stripe };