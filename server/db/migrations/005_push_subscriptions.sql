-- Migration 005: Push Subscriptions for PWA Notifications
-- ======================================================

-- Create push_subscriptions table
CREATE TABLE public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_details JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_endpoint ON public.push_subscriptions USING GIN ((subscription_details->>'endpoint'));
CREATE INDEX idx_push_subscriptions_created_at ON public.push_subscriptions(created_at);

-- Add unique constraint to prevent duplicate subscriptions per user+endpoint
CREATE UNIQUE INDEX idx_push_subscriptions_unique 
ON public.push_subscriptions(user_id, (subscription_details->>'endpoint'));

-- Enable Row Level Security
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for push_subscriptions
CREATE POLICY "Users can manage their own push subscriptions"
ON public.push_subscriptions FOR ALL
USING (auth.uid() = user_id);

-- Allow users to view their own subscriptions
CREATE POLICY "Users can view their own push subscriptions"
ON public.push_subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own subscriptions
CREATE POLICY "Users can insert their own push subscriptions"
ON public.push_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own subscriptions
CREATE POLICY "Users can update their own push subscriptions"
ON public.push_subscriptions FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own subscriptions
CREATE POLICY "Users can delete their own push subscriptions"
ON public.push_subscriptions FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER push_subscriptions_updated_at
    BEFORE UPDATE ON public.push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- Add helpful comments
COMMENT ON TABLE public.push_subscriptions IS 'Stores web push subscriptions for PWA notifications';
COMMENT ON COLUMN public.push_subscriptions.subscription_details IS 'Complete push subscription object from browser';
COMMENT ON COLUMN public.push_subscriptions.user_id IS 'Reference to the user who owns this subscription';

-- Insert test data (optional - for development only)
-- This will be cleaned up in production
DO $$
BEGIN
    IF current_setting('server_version_num')::integer >= 130000 THEN
        -- Only insert test data if we're in a dev environment
        IF EXISTS (SELECT 1 FROM pg_database WHERE datname = current_database() AND datname LIKE '%dev%' OR datname LIKE '%test%') THEN
            INSERT INTO public.push_subscriptions (user_id, subscription_details) VALUES
            (
                '00000000-0000-0000-0000-000000000000'::uuid,
                '{
                    "endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint",
                    "keys": {
                        "p256dh": "test-p256dh-key",
                        "auth": "test-auth-key"
                    }
                }'::jsonb
            ) ON CONFLICT DO NOTHING;
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors (e.g., if user doesn't exist)
    NULL;
END $$;