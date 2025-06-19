// Express.js server implementation using Stripe SaaS patterns
// This demonstrates how to integrate the Stripe patterns into a real application

import express, { Request, Response } from 'express';
import cors from 'cors';
import { 
  createCustomerWithSubscription,
  handleStripeWebhook,
  webhookHandlers,
  createCustomerPortalSession,
  createUpgradeCheckoutSession,
  upgradeSubscription,
  reportUsage,
  createMeterEvent,
  checkFeatureAccess,
  getPricingTableData,
  createSubscriptionWithTrial,
  stripe,
  SUBSCRIPTION_TIERS
} from './stripe-saas-patterns';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Raw body middleware for webhooks
app.use('/webhook', express.raw({ type: 'application/json' }));

// ==========================================
// ROUTES
// ==========================================

// Get pricing tiers
app.get('/api/pricing', (req: Request, res: Response) => {
  try {
    const pricingData = getPricingTableData();
    res.json({ success: true, data: pricingData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create customer and subscription
app.post('/api/customers', async (req: Request, res: Response) => {
  try {
    const { email, name, tierId, paymentMethodId } = req.body;

    if (!email || !name || !tierId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: email, name, tierId' 
      });
    }

    const result = await createCustomerWithSubscription(
      email,
      name,
      tierId,
      paymentMethodId
    );

    res.json({ 
      success: true, 
      data: {
        customer: result.customer,
        subscription: result.subscription,
        clientSecret: result.subscription?.latest_invoice?.payment_intent?.client_secret
      }
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create checkout session for upgrade
app.post('/api/checkout/upgrade', async (req: Request, res: Response) => {
  try {
    const { customerId, priceId, trialDays } = req.body;

    if (!customerId || !priceId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: customerId, priceId' 
      });
    }

    const successUrl = `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.CLIENT_URL}/pricing`;

    const checkoutUrl = await createUpgradeCheckoutSession(
      customerId,
      priceId,
      successUrl,
      cancelUrl,
      trialDays
    );

    res.json({ success: true, data: { url: checkoutUrl } });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upgrade subscription immediately
app.post('/api/subscriptions/:id/upgrade', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPriceId, prorationBehavior } = req.body;

    if (!newPriceId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: newPriceId' 
      });
    }

    const subscription = await upgradeSubscription(
      id,
      newPriceId,
      prorationBehavior
    );

    res.json({ success: true, data: subscription });
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create customer portal session
app.post('/api/customer-portal', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: customerId' 
      });
    }

    const returnUrl = `${process.env.CLIENT_URL}/dashboard`;
    const portalUrl = await createCustomerPortalSession(customerId, returnUrl);

    res.json({ success: true, data: { url: portalUrl } });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Report API usage
app.post('/api/usage/report', async (req: Request, res: Response) => {
  try {
    const { subscriptionItemId, quantity, timestamp, action } = req.body;

    if (!subscriptionItemId || !quantity) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: subscriptionItemId, quantity' 
      });
    }

    const usageRecord = await reportUsage(
      subscriptionItemId,
      quantity,
      timestamp,
      action
    );

    res.json({ success: true, data: usageRecord });
  } catch (error) {
    console.error('Error reporting usage:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create meter event (new Billing Meters API)
app.post('/api/meter-events', async (req: Request, res: Response) => {
  try {
    const { eventName, customerId, value, identifier } = req.body;

    if (!eventName || !customerId || !value) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: eventName, customerId, value' 
      });
    }

    const meterEvent = await createMeterEvent(
      eventName,
      customerId,
      value,
      identifier
    );

    res.json({ success: true, data: meterEvent });
  } catch (error) {
    console.error('Error creating meter event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check feature access
app.get('/api/customers/:id/features/:feature', async (req: Request, res: Response) => {
  try {
    const { id, feature } = req.params;

    const hasAccess = await checkFeatureAccess(id, feature);

    res.json({ 
      success: true, 
      data: { 
        customerId: id,
        feature,
        hasAccess 
      }
    });
  } catch (error) {
    console.error('Error checking feature access:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get customer subscriptions
app.get('/api/customers/:id/subscriptions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const subscriptions = await stripe.subscriptions.list({
      customer: id,
      expand: ['data.items.data.price'],
    });

    res.json({ success: true, data: subscriptions });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create subscription with trial
app.post('/api/subscriptions/trial', async (req: Request, res: Response) => {
  try {
    const { customerId, priceId, trialDays } = req.body;

    if (!customerId || !priceId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: customerId, priceId' 
      });
    }

    const subscription = await createSubscriptionWithTrial(
      customerId,
      priceId,
      trialDays || 14
    );

    res.json({ success: true, data: subscription });
  } catch (error) {
    console.error('Error creating trial subscription:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stripe webhook endpoint
app.post('/webhook', async (req: Request, res: Response) => {
  return await handleStripeWebhook(req, res, webhookHandlers);
});

// API middleware to track usage (example)
const trackApiUsage = async (req: Request, res: Response, next: Function) => {
  try {
    const customerId = req.headers['x-customer-id'] as string;
    
    if (customerId) {
      // Track API call in Stripe
      await createMeterEvent(
        'api_calls',
        customerId,
        1,
        req.path
      );
    }
    
    next();
  } catch (error) {
    console.error('Error tracking usage:', error);
    next(); // Continue even if tracking fails
  }
};

// Protected API route example
app.get('/api/protected/data', trackApiUsage, async (req: Request, res: Response) => {
  try {
    const customerId = req.headers['x-customer-id'] as string;
    
    if (!customerId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Customer ID required' 
      });
    }

    // Check if customer has access to this feature
    const hasAccess = await checkFeatureAccess(customerId, 'Advanced analytics');
    
    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        error: 'Feature not available in your plan' 
      });
    }

    // Return protected data
    res.json({ 
      success: true, 
      data: { 
        message: 'This is protected data',
        analytics: {
          users: 1250,
          revenue: 25000,
          growth: 15.5
        }
      }
    });
  } catch (error) {
    console.error('Error accessing protected data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: Function) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Stripe API Version:', stripe.getApiField('version'));
});

export default app;