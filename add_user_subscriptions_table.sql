-- Add user_subscriptions table for subscription management
-- This table is needed by the checkout API route

CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL, -- 'free', 'starter', 'professional', 'agency'
  billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' or 'yearly'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'canceled', 'past_due', 'incomplete'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for performance
CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_stripe_customer_id ON public.user_subscriptions(stripe_customer_id);
CREATE INDEX idx_user_subscriptions_status ON public.user_subscriptions(user_id, status);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own subscription" ON public.user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription" ON public.user_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON public.user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add missing columns to users table for subscription management
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free';

-- Create billing_events table for webhook event logging
CREATE TABLE public.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL, -- 'checkout_completed', 'payment_succeeded', 'payment_failed', etc.
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  provider TEXT NOT NULL, -- 'stripe', 'razorpay', 'paypal'
  provider_event_id TEXT NOT NULL,
  event_data JSONB, -- Full webhook event data for debugging
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_event_id)
);

-- Create indexes for billing_events
CREATE INDEX idx_billing_events_user_id ON public.billing_events(user_id);
CREATE INDEX idx_billing_events_provider ON public.billing_events(provider, provider_event_id);
CREATE INDEX idx_billing_events_created_at ON public.billing_events(user_id, created_at DESC);

-- Enable RLS for billing_events
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for billing_events
CREATE POLICY "Users can view own billing events" ON public.billing_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own billing events" ON public.billing_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);