-- Migration: 003_subscriptions
-- Purpose: Create subscriptions table for Stripe integration
-- Description: This table manages user subscriptions and syncs with Stripe webhook events
-- Dependencies: Requires uuid-ossp extension and users table from previous migrations

-- Create subscriptions table for Stripe integration
CREATE TABLE IF NOT EXISTS subscriptions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Foreign key to users table
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Stripe integration fields
  stripe_customer_id TEXT NOT NULL, -- Stripe customer ID (cus_XXXXXX)
  stripe_subscription_id TEXT UNIQUE NOT NULL, -- Stripe subscription ID (sub_XXXXXX)
  stripe_price_id TEXT NOT NULL, -- Stripe price ID (price_XXXXXX) - links to product pricing
  
  -- Subscription status with allowed values matching Stripe's subscription statuses
  status TEXT NOT NULL CHECK (status IN (
    'active',        -- Subscription is active and paid
    'past_due',      -- Payment failed but still in grace period
    'canceled',      -- Subscription has been canceled
    'incomplete',    -- Initial payment is pending
    'trialing'       -- In trial period
  )),
  
  -- Billing period tracking (synchronized from Stripe webhooks)
  current_period_start TIMESTAMPTZ, -- Start of current billing period
  current_period_end TIMESTAMPTZ,   -- End of current billing period
  
  -- Cancellation handling
  cancel_at_period_end BOOLEAN DEFAULT FALSE, -- If true, subscription ends at period_end
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at on row updates
CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON subscriptions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can read their own subscription
CREATE POLICY "Users can read own subscription" 
  ON subscriptions
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Only system/service role can insert subscriptions (via Stripe webhooks)
CREATE POLICY "Service role can insert subscriptions" 
  ON subscriptions
  FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

-- Only system/service role can update subscriptions (via Stripe webhooks)
CREATE POLICY "Service role can update subscriptions" 
  ON subscriptions
  FOR UPDATE 
  USING (auth.role() = 'service_role');

-- Users cannot delete subscriptions directly (handled by Stripe)
-- No DELETE policy = no deletes allowed except by service role

-- Performance indexes

-- Index for fast lookup by Stripe subscription ID (used by webhooks)
CREATE INDEX idx_subscriptions_stripe_id 
  ON subscriptions(stripe_subscription_id);

-- Index for fast lookup by user ID (used by user queries)
CREATE INDEX idx_subscriptions_user_id 
  ON subscriptions(user_id);

-- Index for filtering by status
CREATE INDEX idx_subscriptions_status 
  ON subscriptions(status) 
  WHERE status IN ('active', 'trialing');

-- Index for finding subscriptions that need attention
CREATE INDEX idx_subscriptions_past_due 
  ON subscriptions(status, current_period_end) 
  WHERE status = 'past_due';

-- Composite index for common queries
CREATE INDEX idx_subscriptions_user_status 
  ON subscriptions(user_id, status);

-- Comments for documentation

COMMENT ON TABLE subscriptions IS 'Stores user subscription data synchronized with Stripe';

COMMENT ON COLUMN subscriptions.id IS 'Internal UUID for the subscription record';
COMMENT ON COLUMN subscriptions.user_id IS 'Reference to the user who owns this subscription';
COMMENT ON COLUMN subscriptions.stripe_customer_id IS 'Stripe Customer ID (format: cus_XXXXXX)';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'Stripe Subscription ID (format: sub_XXXXXX) - unique identifier from Stripe';
COMMENT ON COLUMN subscriptions.stripe_price_id IS 'Stripe Price ID (format: price_XXXXXX) - determines billing amount and interval';
COMMENT ON COLUMN subscriptions.status IS 'Current subscription status from Stripe';
COMMENT ON COLUMN subscriptions.current_period_start IS 'Start timestamp of the current billing period';
COMMENT ON COLUMN subscriptions.current_period_end IS 'End timestamp of the current billing period';
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'If true, subscription will end at current_period_end without renewal';
COMMENT ON COLUMN subscriptions.created_at IS 'Timestamp when subscription was created';
COMMENT ON COLUMN subscriptions.updated_at IS 'Timestamp when subscription was last updated (auto-updated by trigger)';

-- Stripe Webhook Integration Notes:
-- 
-- This table is designed to be updated by Stripe webhooks for the following events:
-- 1. customer.subscription.created - Insert new subscription
-- 2. customer.subscription.updated - Update subscription status/details
-- 3. customer.subscription.deleted - Update status to 'canceled'
-- 4. invoice.payment_succeeded - May update current_period_end
-- 5. invoice.payment_failed - May update status to 'past_due'
--
-- The service should listen for these webhooks and update the table accordingly.
-- Always trust Stripe as the source of truth for subscription data.
--
-- Example webhook handler pseudo-code:
-- ```
-- switch(event.type) {
--   case 'customer.subscription.created':
--   case 'customer.subscription.updated':
--     upsertSubscription(event.data.object);
--     break;
--   case 'customer.subscription.deleted':
--     updateSubscriptionStatus(event.data.object.id, 'canceled');
--     break;
-- }
-- ```