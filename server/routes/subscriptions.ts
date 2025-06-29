import { Router, Request, Response } from 'express';
import { stripeService, type WebhookHandlers } from '../services/stripe-service';
import { authMiddleware } from '../middleware/auth-middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit-middleware';
import { storage } from '../storage';
import { SUBSCRIPTION_PLANS } from '@shared/subscription-schema';
import { z } from 'zod';

const router = Router();

// Rate limiting for subscription endpoints
const subscriptionRateLimit = rateLimitMiddleware.endpointRateLimit('/api/subscriptions', {
  'free': 20,
  'pro': 50,
  'premium': 100,
});

// Validation schemas
const createCheckoutSchema = z.object({
  planId: z.enum(['monthly', 'annual']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  trialDays: z.number().min(0).max(30).optional(),
});

const updateSubscriptionSchema = z.object({
  planId: z.enum(['monthly', 'annual']),
  prorationBehavior: z.enum(['create_prorations', 'none']).optional(),
});

/**
 * Get subscription plans and pricing information
 */
router.get('/plans', authMiddleware.instance.optionalAuth(), async (req: Request, res: Response) => {
  try {
    const plans = SUBSCRIPTION_PLANS.filter(plan => plan.id !== 'whop-trial');
    const priceIds = stripeService.getPriceIds();
    
    const plansWithPriceIds = plans.map(plan => ({
      ...plan,
      stripeData: {
        priceId: priceIds[plan.id as keyof typeof priceIds] || null,
        isActive: !!priceIds[plan.id as keyof typeof priceIds],
      },
    }));

    res.json({
      success: true,
      data: {
        plans: plansWithPriceIds,
        config: stripeService.getPublicConfig(),
      },
    });
  } catch (error) {
    console.error('Error getting subscription plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve subscription plans',
    });
  }
});

/**
 * Create checkout session for subscription upgrade
 */
router.post('/checkout', 
  authMiddleware.instance.authenticate(),
  subscriptionRateLimit,
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const validatedData = createCheckoutSchema.parse(req.body);

      // Get or create Stripe customer
      const customer = await stripeService.createOrGetCustomer(
        user.email,
        user.name,
        user.id
      );

      // Get the correct price ID
      const priceIds = stripeService.getPriceIds();
      const priceId = priceIds[validatedData.planId];

      if (!priceId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid subscription plan',
        });
      }

      // Create checkout session
      const checkoutUrl = await stripeService.createCheckoutSession({
        customerId: customer.id,
        priceId,
        successUrl: validatedData.successUrl,
        cancelUrl: validatedData.cancelUrl,
        trialDays: validatedData.trialDays,
        metadata: {
          userId: user.id,
          planId: validatedData.planId,
        },
      });

      // Log checkout attempt
      console.log(`Checkout session created for user ${user.id}, plan: ${validatedData.planId}`);

      res.json({
        success: true,
        data: {
          checkoutUrl,
          customerId: customer.id,
        },
      });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create checkout session',
      });
    }
  }
);

/**
 * Get current user's subscription status
 */
router.get('/status', 
  authMiddleware.instance.authenticate(),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      // Get customer from Stripe
      const customer = await stripeService.createOrGetCustomer(user.email, user.name, user.id);
      
      // Get active subscriptions
      const subscriptions = await stripeService.getCustomerSubscriptions(customer.id);
      const activeSubscription = subscriptions.find(sub => 
        ['active', 'trialing'].includes(sub.status)
      );

      if (!activeSubscription) {
        return res.json({
          success: true,
          data: {
            hasActiveSubscription: false,
            subscription: null,
            customer: {
              id: customer.id,
              email: customer.email,
            },
          },
        });
      }

      // Convert to our subscription format
      const userSubscription = stripeService.convertToUserSubscription(
        activeSubscription,
        user.id
      );

      res.json({
        success: true,
        data: {
          hasActiveSubscription: true,
          subscription: {
            ...userSubscription,
            id: activeSubscription.id,
            stripeData: {
              status: activeSubscription.status,
              currentPeriodStart: new Date(activeSubscription.current_period_start * 1000),
              currentPeriodEnd: new Date(activeSubscription.current_period_end * 1000),
              trialEnd: activeSubscription.trial_end 
                ? new Date(activeSubscription.trial_end * 1000) 
                : null,
              cancelAtPeriodEnd: activeSubscription.cancel_at_period_end,
            },
          },
          customer: {
            id: customer.id,
            email: customer.email,
          },
        },
      });
    } catch (error) {
      console.error('Error getting subscription status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve subscription status',
      });
    }
  }
);

/**
 * Create customer portal session for subscription management
 */
router.post('/portal', 
  authMiddleware.instance.authenticate(),
  subscriptionRateLimit,
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { returnUrl } = req.body;

      // Get customer from Stripe
      const customer = await stripeService.createOrGetCustomer(user.email, user.name, user.id);

      // Create portal session
      const portalUrl = await stripeService.createCustomerPortalSession(
        customer.id,
        returnUrl
      );

      res.json({
        success: true,
        data: {
          portalUrl,
        },
      });
    } catch (error) {
      console.error('Error creating customer portal session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create customer portal session',
      });
    }
  }
);

/**
 * Update subscription plan
 */
router.put('/update', 
  authMiddleware.instance.authenticate(),
  subscriptionRateLimit,
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const validatedData = updateSubscriptionSchema.parse(req.body);

      // Get customer subscriptions
      const customer = await stripeService.createOrGetCustomer(user.email, user.name, user.id);
      const subscriptions = await stripeService.getCustomerSubscriptions(customer.id);
      const activeSubscription = subscriptions.find(sub => 
        ['active', 'trialing'].includes(sub.status)
      );

      if (!activeSubscription) {
        return res.status(404).json({
          success: false,
          error: 'No active subscription found',
        });
      }

      // Get new price ID
      const priceIds = stripeService.getPriceIds();
      const newPriceId = priceIds[validatedData.planId];

      if (!newPriceId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid subscription plan',
        });
      }

      // Update subscription
      const updatedSubscription = await stripeService.updateSubscription(
        activeSubscription.id,
        newPriceId,
        validatedData.prorationBehavior
      );

      // Convert to our format
      const userSubscription = stripeService.convertToUserSubscription(
        updatedSubscription,
        user.id
      );

      res.json({
        success: true,
        data: {
          subscription: userSubscription,
          message: 'Subscription updated successfully',
        },
      });
    } catch (error) {
      console.error('Error updating subscription:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update subscription',
      });
    }
  }
);

/**
 * Cancel subscription
 */
router.post('/cancel', 
  authMiddleware.instance.authenticate(),
  subscriptionRateLimit,
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { immediately = false } = req.body;

      // Get customer subscriptions
      const customer = await stripeService.createOrGetCustomer(user.email, user.name, user.id);
      const subscriptions = await stripeService.getCustomerSubscriptions(customer.id);
      const activeSubscription = subscriptions.find(sub => 
        ['active', 'trialing'].includes(sub.status)
      );

      if (!activeSubscription) {
        return res.status(404).json({
          success: false,
          error: 'No active subscription found',
        });
      }

      // Cancel subscription
      const cancelledSubscription = await stripeService.cancelSubscription(
        activeSubscription.id,
        immediately
      );

      res.json({
        success: true,
        data: {
          subscription: {
            id: cancelledSubscription.id,
            status: cancelledSubscription.status,
            cancelAtPeriodEnd: cancelledSubscription.cancel_at_period_end,
            currentPeriodEnd: new Date(cancelledSubscription.current_period_end * 1000),
          },
          message: immediately 
            ? 'Subscription cancelled immediately' 
            : 'Subscription will be cancelled at the end of the current period',
        },
      });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel subscription',
      });
    }
  }
);

/**
 * Reactivate cancelled subscription
 */
router.post('/reactivate', 
  authMiddleware.instance.authenticate(),
  subscriptionRateLimit,
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      // Get customer subscriptions
      const customer = await stripeService.createOrGetCustomer(user.email, user.name, user.id);
      const subscriptions = await stripeService.getCustomerSubscriptions(customer.id);
      const cancelledSubscription = subscriptions.find(sub => 
        sub.status === 'active' && sub.cancel_at_period_end
      );

      if (!cancelledSubscription) {
        return res.status(404).json({
          success: false,
          error: 'No cancelled subscription found to reactivate',
        });
      }

      // Reactivate subscription
      const reactivatedSubscription = await stripeService.reactivateSubscription(
        cancelledSubscription.id
      );

      res.json({
        success: true,
        data: {
          subscription: {
            id: reactivatedSubscription.id,
            status: reactivatedSubscription.status,
            cancelAtPeriodEnd: reactivatedSubscription.cancel_at_period_end,
          },
          message: 'Subscription reactivated successfully',
        },
      });
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reactivate subscription',
      });
    }
  }
);

/**
 * Get subscription invoices
 */
router.get('/invoices', 
  authMiddleware.instance.authenticate(),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

      // Get customer
      const customer = await stripeService.createOrGetCustomer(user.email, user.name, user.id);

      // Get invoices from Stripe (we'll use the Stripe instance directly for this)
      const invoices = await stripeService['stripe'].invoices.list({
        customer: customer.id,
        limit,
        expand: ['data.subscription'],
      });

      const formattedInvoices = invoices.data.map(invoice => ({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        created: new Date(invoice.created * 1000),
        paidAt: invoice.status_transitions.paid_at 
          ? new Date(invoice.status_transitions.paid_at * 1000) 
          : null,
        invoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
        description: invoice.description,
        periodStart: invoice.period_start 
          ? new Date(invoice.period_start * 1000) 
          : null,
        periodEnd: invoice.period_end 
          ? new Date(invoice.period_end * 1000) 
          : null,
      }));

      res.json({
        success: true,
        data: {
          invoices: formattedInvoices,
          hasMore: invoices.has_more,
        },
      });
    } catch (error) {
      console.error('Error getting subscription invoices:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve subscription invoices',
      });
    }
  }
);

/**
 * Webhook endpoint for Stripe events
 * This endpoint should receive raw body data
 */
router.post('/webhook', async (req: Request, res: Response) => {
  // Define webhook handlers
  const webhookHandlers: WebhookHandlers = {
    onCheckoutCompleted: async (session) => {
      console.log('Checkout completed:', session.id);
      // Handle successful checkout completion
      // Update user subscription status in database
      try {
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        
        if (subscriptionId) {
          const subscription = await stripeService.getSubscription(subscriptionId);
          if (subscription) {
            // Convert and store subscription data
            const userId = session.metadata?.userId;
            if (userId) {
              const userSubscription = stripeService.convertToUserSubscription(subscription, userId);
              // Here you would update your database with the subscription data
              console.log('User subscription data:', userSubscription);
            }
          }
        }
      } catch (error) {
        console.error('Error handling checkout completion:', error);
      }
    },

    onSubscriptionCreated: async (subscription) => {
      console.log('Subscription created:', subscription.id);
      try {
        // Update user subscription status
        const userId = subscription.metadata?.userId;
        if (userId) {
          const userSubscription = stripeService.convertToUserSubscription(subscription, userId);
          // Update database with new subscription
          console.log('New subscription data:', userSubscription);
        }
      } catch (error) {
        console.error('Error handling subscription creation:', error);
      }
    },

    onSubscriptionUpdated: async (subscription) => {
      console.log('Subscription updated:', subscription.id);
      try {
        const userId = subscription.metadata?.userId;
        if (userId) {
          const userSubscription = stripeService.convertToUserSubscription(subscription, userId);
          // Update database with subscription changes
          console.log('Updated subscription data:', userSubscription);
        }
      } catch (error) {
        console.error('Error handling subscription update:', error);
      }
    },

    onSubscriptionDeleted: async (subscription) => {
      console.log('Subscription deleted:', subscription.id);
      try {
        const userId = subscription.metadata?.userId;
        if (userId) {
          // Update user to free tier
          console.log('Subscription cancelled for user:', userId);
        }
      } catch (error) {
        console.error('Error handling subscription deletion:', error);
      }
    },

    onTrialWillEnd: async (subscription) => {
      console.log('Trial will end soon:', subscription.id);
      try {
        const userId = subscription.metadata?.userId;
        if (userId) {
          // Send trial ending notification
          console.log('Trial ending notification for user:', userId);
        }
      } catch (error) {
        console.error('Error handling trial ending:', error);
      }
    },

    onPaymentSucceeded: async (invoice) => {
      console.log('Payment succeeded:', invoice.id);
      try {
        // Handle successful payment
        if (invoice.subscription) {
          const subscription = await stripeService.getSubscription(invoice.subscription as string);
          if (subscription) {
            const userId = subscription.metadata?.userId;
            if (userId) {
              console.log('Payment successful for user:', userId);
            }
          }
        }
      } catch (error) {
        console.error('Error handling payment success:', error);
      }
    },

    onPaymentFailed: async (invoice) => {
      console.log('Payment failed:', invoice.id);
      try {
        // Handle failed payment
        if (invoice.subscription) {
          const subscription = await stripeService.getSubscription(invoice.subscription as string);
          if (subscription) {
            const userId = subscription.metadata?.userId;
            if (userId) {
              console.log('Payment failed for user:', userId);
              // Send payment failure notification
            }
          }
        }
      } catch (error) {
        console.error('Error handling payment failure:', error);
      }
    },
  };

  return await stripeService.handleWebhook(req, res, webhookHandlers);
});

export default router;