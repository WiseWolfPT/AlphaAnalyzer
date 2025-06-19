# Stripe SaaS Subscription Management Patterns

This repository contains comprehensive TypeScript patterns and examples for implementing Stripe subscriptions in a SaaS application. It covers subscription tiers, webhook handling, customer portal integration, metered billing, and freemium-to-premium upgrade flows.

## 📁 Files Overview

- **`stripe-saas-patterns.ts`** - Core Stripe utilities and patterns
- **`stripe-express-server.ts`** - Express.js server implementation
- **`FreemiumUpgradeFlow.tsx`** - React components for upgrade flows
- **`STRIPE_PATTERNS_README.md`** - This comprehensive guide

## 🚀 Quick Start

### 1. Environment Setup

Create a `.env` file with your Stripe credentials:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Product and Price IDs
STRIPE_PRODUCT_ID=prod_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...

# Application URLs
CLIENT_URL=http://localhost:3000
NODE_ENV=development
PORT=3000
```

### 2. Installation

```bash
npm install stripe express cors
npm install --save-dev @types/express @types/cors typescript
npm install @stripe/stripe-js @stripe/react-stripe-js react

# For the server
npm install express cors body-parser

# For React frontend
npm install react react-dom
```

### 3. Basic Usage

```typescript
import { 
  createCustomerWithSubscription,
  handleStripeWebhook,
  createCustomerPortalSession,
  reportUsage
} from './stripe-saas-patterns';

// Create a customer with subscription
const { customer, subscription } = await createCustomerWithSubscription(
  'user@example.com',
  'John Doe',
  'PRO',
  'pm_1234567890' // payment method ID
);

// Report API usage
await reportUsage(
  subscription.items.data[0].id,
  10, // quantity
  Math.floor(Date.now() / 1000) // timestamp
);
```

## 🏗️ Architecture Overview

### Subscription Tiers

The system supports four subscription tiers:

| Tier | Features | API Calls | Storage | Users |
|------|----------|-----------|---------|-------|
| **Free** | Basic features | 100/month | 1GB | 1 |
| **Starter** | + Email support | 1,000/month | 10GB | 5 |
| **Pro** | + Priority support + Analytics | 10,000/month | 100GB | 20 |
| **Enterprise** | + Custom integrations + SLA | Unlimited | Unlimited | Unlimited |

### Core Components

1. **Subscription Management** - Create, upgrade, downgrade, pause, cancel
2. **Webhook Handling** - Process Stripe events securely
3. **Customer Portal** - Self-service billing management
4. **Metered Billing** - Usage-based pricing for API calls
5. **Feature Gates** - Control access based on subscription tier

## 📊 Subscription Patterns

### 1. Creating Customers and Subscriptions

```typescript
// Simple subscription creation
const result = await createCustomerWithSubscription(
  'user@example.com',
  'Jane Smith',
  'STARTER'
);

// With payment method
const resultWithPayment = await createCustomerWithSubscription(
  'user@example.com',
  'Jane Smith',
  'PRO',
  'pm_1234567890'
);

// With trial
const subscription = await createSubscriptionWithTrial(
  'cus_1234567890',
  'price_1234567890',
  14 // 14-day trial
);
```

### 2. Upgrade/Downgrade Flows

```typescript
// Immediate upgrade
const upgradedSubscription = await upgradeSubscription(
  'sub_1234567890',
  'price_new_tier',
  'create_prorations'
);

// Checkout-based upgrade
const checkoutUrl = await createUpgradeCheckoutSession(
  'cus_1234567890',
  'price_1234567890',
  'https://app.com/success',
  'https://app.com/cancel',
  7 // trial days
);
```

### 3. Hybrid Pricing (Flat + Metered)

```typescript
// Create subscription with both flat rate and usage-based pricing
const hybridSubscription = await createHybridSubscription(
  'cus_1234567890',
  'price_monthly_flat',   // $29/month base
  'price_usage_based',    // $0.01 per API call
  'pm_1234567890'
);

// Report usage
await reportUsage(
  subscription.items.data[1].id, // metered item
  100, // 100 API calls
  Math.floor(Date.now() / 1000)
);
```

## 🔗 Webhook Implementation

### Setting Up Webhooks

```typescript
import { handleStripeWebhook, webhookHandlers } from './stripe-saas-patterns';

app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  return await handleStripeWebhook(req, res, {
    'customer.subscription.created': async (subscription) => {
      // Update user's subscription status in database
      await updateUserSubscription(subscription.customer, subscription);
      
      // Send welcome email
      await sendWelcomeEmail(subscription.customer);
      
      // Provision resources
      await provisionUserResources(subscription);
    },
    
    'customer.subscription.updated': async (subscription) => {
      // Handle plan changes
      await handlePlanChange(subscription);
      
      // Update feature access
      await updateFeatureAccess(subscription.customer, subscription);
    },
    
    'customer.subscription.deleted': async (subscription) => {
      // Downgrade to free tier
      await downgradeToFree(subscription.customer);
      
      // Schedule data cleanup
      await scheduleDataCleanup(subscription.customer);
    },
    
    'invoice.payment_failed': async (invoice) => {
      // Handle failed payments
      await handlePaymentFailure(invoice.customer, invoice);
      
      // Send dunning emails
      await sendPaymentFailureEmail(invoice.customer);
    }
  });
});
```

### Event Types to Handle

| Event | Description | Action |
|-------|-------------|---------|
| `customer.subscription.created` | New subscription | Provision resources, send welcome email |
| `customer.subscription.updated` | Plan change | Update limits, send notification |
| `customer.subscription.deleted` | Cancellation | Downgrade to free, cleanup data |
| `customer.subscription.trial_will_end` | Trial ending | Send conversion email |
| `invoice.payment_succeeded` | Successful payment | Update billing status |
| `invoice.payment_failed` | Failed payment | Send dunning email, retry logic |

## 💳 Customer Portal Integration

```typescript
// Create portal session
const portalUrl = await createCustomerPortalSession(
  'cus_1234567890',
  'https://app.com/dashboard'
);

// Configure portal features
await configureCustomerPortal();
```

The customer portal allows users to:
- Update payment methods
- Download invoices
- Change subscription plans
- Cancel subscriptions
- Pause subscriptions (if enabled)

## 📈 Metered Billing Patterns

### Traditional Usage Records

```typescript
// Report usage for existing subscription
await reportUsage(
  subscriptionItemId,
  apiCallCount,
  timestamp,
  'increment' // or 'set'
);
```

### New Billing Meters API

```typescript
// Create meter event
await createMeterEvent(
  'api_calls',           // event name
  'cus_1234567890',     // customer ID
  10,                   // value
  'endpoint:/users'     // optional identifier
);

// Get usage summary
const usage = await getUsageSummary(
  'meter_1234567890',
  'cus_1234567890',
  startTimestamp,
  endTimestamp
);
```

### Volume-Based Pricing

```typescript
// Create graduated tiers (pay per tier)
const graduatedPrice = await createTieredMeteredPrice(
  'prod_1234567890'
);

// Pricing example:
// 0-1,000 calls: $0.01 each
// 1,001-10,000 calls: $0.008 each  
// 10,001+ calls: $0.005 each
```

## ⚛️ React Integration

### Pricing Table Component

```jsx
import { FreemiumUpgradeFlow } from './FreemiumUpgradeFlow';

function PricingPage() {
  const user = getCurrentUser();
  
  return (
    <FreemiumUpgradeFlow
      user={user}
      onUpgradeComplete={(subscription) => {
        // Handle successful upgrade
        console.log('Upgrade completed:', subscription);
        router.push('/dashboard?upgraded=true');
      }}
    />
  );
}
```

### Feature Gating

```jsx
import { FeatureGate } from './FreemiumUpgradeFlow';

function AdvancedAnalytics() {
  const user = getCurrentUser();
  
  return (
    <FeatureGate
      featureName="Advanced analytics"
      currentUser={user}
      fallback={
        <div>
          <h3>Premium Feature</h3>
          <p>Upgrade to Pro to access advanced analytics</p>
          <UpgradeButton />
        </div>
      }
    >
      <AnalyticsDashboard />
    </FeatureGate>
  );
}
```

### Usage Tracking Middleware

```typescript
// Automatic usage tracking
const trackApiUsage = async (req: Request, res: Response, next: Function) => {
  const customerId = req.headers['x-customer-id'] as string;
  
  if (customerId) {
    await createMeterEvent(
      'api_calls',
      customerId,
      1,
      req.path
    );
  }
  
  next();
};

app.use('/api/protected', trackApiUsage);
```

## 🔄 Upgrade Flow Patterns

### 1. Checkout-Based Upgrade (Recommended)

```typescript
// Redirect to Stripe Checkout
const checkoutUrl = await createUpgradeCheckoutSession(
  user.customerId,
  targetPriceId,
  `${process.env.CLIENT_URL}/success`,
  `${process.env.CLIENT_URL}/cancel`,
  14 // trial days for pro plan
);

window.location.href = checkoutUrl;
```

### 2. Inline Payment Form

```jsx
function InlineUpgrade() {
  const stripe = useStripe();
  const elements = useElements();
  
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement(CardElement),
    });
    
    if (!error) {
      // Upgrade subscription with payment method
      await upgradeSubscription(subscriptionId, newPriceId, paymentMethod.id);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit">Upgrade Now</button>
    </form>
  );
}
```

### 3. Immediate Upgrade (Existing Payment Method)

```typescript
// For customers with existing payment methods
const subscription = await upgradeSubscription(
  'sub_1234567890',
  'price_pro_monthly',
  'create_prorations' // Prorate the change
);
```

## 🛡️ Security Best Practices

### 1. Webhook Signature Verification

```typescript
// Always verify webhook signatures
try {
  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    webhookSecret
  );
} catch (err) {
  return res.status(400).send('Invalid signature');
}
```

### 2. Idempotency

```typescript
// Use idempotency keys for critical operations
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }]
}, {
  idempotencyKey: `upgrade-${customerId}-${Date.now()}`
});
```

### 3. Input Validation

```typescript
// Validate inputs before Stripe API calls
if (!customerId || !priceId) {
  throw new Error('Missing required parameters');
}

// Verify customer ownership
const customer = await stripe.customers.retrieve(customerId);
if (customer.deleted) {
  throw new Error('Customer not found');
}
```

## 📊 Analytics and Monitoring

### Subscription Metrics

```typescript
const metrics = await getSubscriptionMetrics(
  new Date('2024-01-01'),
  new Date('2024-02-01')
);

console.log({
  totalSubscriptions: metrics.totalSubscriptions,
  activeSubscriptions: metrics.activeSubscriptions,
  churnRate: metrics.churnedSubscriptions / metrics.totalSubscriptions,
  monthlyRecurringRevenue: metrics.revenue,
  averageRevenuePerUser: metrics.averageRevenuePerUser
});
```

### Key Metrics to Track

1. **Monthly Recurring Revenue (MRR)**
2. **Customer Churn Rate**
3. **Average Revenue Per User (ARPU)**
4. **Customer Lifetime Value (CLV)**
5. **Conversion Rate (Free → Paid)**
6. **Usage Patterns by Tier**

## 🧪 Testing

### Webhook Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to your account
stripe login

# Forward events to local server
stripe listen --forward-to localhost:3000/webhook

# Trigger test events
stripe trigger customer.subscription.created
stripe trigger invoice.payment_failed
```

### Test Cards

Use Stripe's test cards for different scenarios:

```javascript
// Success
'4242424242424242'

// Decline
'4000000000000002'

// Requires 3D Secure
'4000002500003155'

// Insufficient funds
'4000000000009995'
```

## 🚀 Deployment Checklist

- [ ] Set production Stripe keys
- [ ] Configure webhook endpoints in Stripe Dashboard
- [ ] Set up proper error monitoring (Sentry, etc.)
- [ ] Implement proper logging
- [ ] Set up database backups
- [ ] Configure SSL certificates
- [ ] Test all payment flows
- [ ] Set up monitoring alerts

## 📚 Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe SCA Guide](https://stripe.com/docs/strong-customer-authentication)
- [Webhook Security](https://stripe.com/docs/webhooks/signatures)
- [Billing Best Practices](https://stripe.com/guides/billing-best-practices)
- [Testing Webhooks](https://stripe.com/docs/webhooks/test)

## 💡 Pro Tips

1. **Always use webhooks** for subscription state changes, never rely on client-side events
2. **Implement proper error handling** for all Stripe API calls
3. **Use metadata** to store additional information about customers and subscriptions
4. **Set up monitoring** for failed payments and high churn periods
5. **Implement grace periods** for failed payments before restricting access
6. **Use Stripe's Customer Portal** when possible to reduce support overhead
7. **Test thoroughly** with different payment methods and scenarios
8. **Keep your Stripe library updated** for the latest features and security fixes

## 🤝 Contributing

Feel free to submit issues and pull requests to improve these patterns and examples.

## 📄 License

This code is provided as educational examples. Please review Stripe's terms of service and ensure compliance with all applicable regulations in your jurisdiction.