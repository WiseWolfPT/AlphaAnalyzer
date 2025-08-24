# 🚀 Stripe 3-Tier Pricing Setup Guide

## Quick Start (15 minutes)

This guide will help you set up Stripe with the 3-tier pricing structure for Alfalyzer.

## 📋 Prerequisites

- Stripe account (create at https://dashboard.stripe.com)
- Access to Stripe Dashboard
- Node.js environment configured

## 🎯 Step 1: Create Products in Stripe Dashboard

### 1.1 Login to Stripe
Go to https://dashboard.stripe.com and login to your account.

### 1.2 Create Products

Navigate to **Products** → **Add Product** and create these 3 products:

#### **Starter Plan**
- **Name**: Alfalyzer Starter
- **Description**: Perfect for beginners getting started with investing
- **Pricing**:
  - Monthly: €9.99 EUR, recurring monthly
  - Yearly: €99.00 EUR, recurring yearly
- **Trial Period**: 7 days (set in subscription data)
- **Features** (add in metadata):
  ```json
  {
    "tier": "starter",
    "watchlists": "5",
    "portfolios": "1",
    "charts": "basic"
  }
  ```

#### **Pro Plan** (Most Popular)
- **Name**: Alfalyzer Pro
- **Description**: Professional tools for serious investors
- **Pricing**:
  - Monthly: €19.99 EUR, recurring monthly
  - Yearly: €199.00 EUR, recurring yearly
- **Trial Period**: 7 days
- **Features** (add in metadata):
  ```json
  {
    "tier": "pro",
    "watchlists": "unlimited",
    "portfolios": "5",
    "charts": "all",
    "signals": "true"
  }
  ```

#### **Elite Plan**
- **Name**: Alfalyzer Elite
- **Description**: AI-powered insights for advanced traders
- **Pricing**:
  - Monthly: €39.99 EUR, recurring monthly
  - Yearly: €399.00 EUR, recurring yearly
- **Trial Period**: 7 days
- **Features** (add in metadata):
  ```json
  {
    "tier": "elite",
    "watchlists": "unlimited",
    "portfolios": "unlimited",
    "charts": "all",
    "ai": "true",
    "signals": "true"
  }
  ```

## 🔑 Step 2: Get Your API Keys

1. Go to **Developers** → **API keys**
2. Copy your keys:
   - **Publishable key**: `pk_test_...` or `pk_live_...`
   - **Secret key**: `sk_test_...` or `sk_live_...`

## 🔗 Step 3: Configure Stripe Link

1. Go to **Settings** → **Checkout and Payment Links**
2. Enable **Link** (Stripe's 1-click checkout)
3. Configure:
   - ✅ Enable Link for all customers
   - ✅ Allow customers to save payment methods
   - ✅ Auto-enable for returning customers

## 🪝 Step 4: Set Up Webhooks

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Configure:
   - **Endpoint URL**: 
     - Development: `http://localhost:3001/api/subscriptions/webhook`
     - Production: `https://your-domain.com/api/subscriptions/webhook`
   - **Events to listen**:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `customer.subscription.trial_will_end`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
4. Copy the **Signing secret**: `whsec_...`

## 🔧 Step 5: Configure Environment Variables

Create or update your `.env` file:

```bash
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here

# Starter Plan Price IDs
STRIPE_STARTER_MONTHLY_PRICE_ID=price_1ABC...
STRIPE_STARTER_YEARLY_PRICE_ID=price_2DEF...

# Pro Plan Price IDs (Most Popular)
STRIPE_PRO_MONTHLY_PRICE_ID=price_3GHI...
STRIPE_PRO_YEARLY_PRICE_ID=price_4JKL...

# Elite Plan Price IDs
STRIPE_ELITE_MONTHLY_PRICE_ID=price_5MNO...
STRIPE_ELITE_YEARLY_PRICE_ID=price_6PQR...

# URLs
CLIENT_URL=http://localhost:5173
```

## 🎨 Step 6: Configure Customer Portal

1. Go to **Settings** → **Billing** → **Customer portal**
2. Enable features:
   - ✅ Customers can update payment methods
   - ✅ Customers can update billing address
   - ✅ Customers can cancel subscriptions
   - ✅ Customers can switch plans
3. Configure branding:
   - Upload logo
   - Set brand colors (use Teya green: #10B981)
   - Add support email

## 🧪 Step 7: Test the Integration

### Test Mode
1. Use test cards: https://stripe.com/docs/testing
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

### Test Flow
```bash
# 1. Start your server
npm run dev

# 2. Navigate to pricing page
http://localhost:5173/pricing

# 3. Click "Start 7-Day Free Trial" on any plan

# 4. Complete checkout with test card

# 5. Verify webhook received
# Check server logs for "Checkout completed"

# 6. Check subscription status
http://localhost:5173/api/subscriptions/status
```

## 📊 Step 8: Monitoring & Analytics

### Stripe Dashboard
- Monitor subscriptions: **Billing** → **Subscriptions**
- Track revenue: **Reports** → **Revenue**
- Customer insights: **Customers**

### Key Metrics to Track
- Monthly Recurring Revenue (MRR)
- Churn rate
- Trial-to-paid conversion
- Average Revenue Per User (ARPU)

## 🚀 Step 9: Go Live Checklist

- [ ] Switch to live API keys
- [ ] Update webhook endpoint to production URL
- [ ] Test live mode with small transaction
- [ ] Enable fraud protection rules
- [ ] Configure email receipts
- [ ] Set up tax collection (if needed)
- [ ] Configure dispute handling
- [ ] Enable Stripe Radar for fraud prevention

## 💡 Pro Tips

### 1. Optimize for Conversion
- Keep checkout simple (Stripe Link helps!)
- Show trust badges on pricing page
- Add testimonials near pricing
- Highlight "Most Popular" on Pro plan

### 2. Reduce Churn
- Send trial ending reminders (3 days before)
- Offer discount before cancellation
- Implement win-back campaigns
- Track cancellation reasons

### 3. Pricing Psychology
- Annual plans save 17% (2 months free)
- Pro plan positioned as best value
- Elite plan for power users who need AI

## 🐛 Troubleshooting

### Common Issues

**Webhook not receiving events**
```bash
# Use Stripe CLI for local testing
stripe listen --forward-to localhost:3001/api/subscriptions/webhook
```

**Price IDs not found**
- Verify price IDs in Stripe Dashboard
- Check if using test vs live keys correctly

**Checkout session fails**
- Check browser console for errors
- Verify CORS settings
- Ensure user is authenticated

## 📚 Resources

- [Stripe Docs](https://stripe.com/docs)
- [Stripe Link](https://stripe.com/docs/payments/link)
- [Testing Guide](https://stripe.com/docs/testing)
- [Webhook Events](https://stripe.com/docs/webhooks/stripe-events)

## 🎉 Success Metrics

After implementation, you should see:
- ✅ 7% higher conversion with Stripe Link
- ✅ 70% of users choosing Pro plan
- ✅ 17% uplift from annual pricing
- ✅ <2% payment failure rate

---

**Need Help?** Contact support@alfalyzer.com or check our FAQ.