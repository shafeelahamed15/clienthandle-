-- Subscription System Database Schema
-- This migration adds tables for managing user subscriptions, billing, and usage tracking

-- Create subscription plans enum
CREATE TYPE subscription_plan AS ENUM ('free', 'starter', 'professional', 'agency');

-- Create subscription status enum  
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'unpaid', 'trialing');

-- Create billing cycle enum
CREATE TYPE billing_cycle AS ENUM ('monthly', 'yearly');

-- Update users table to include subscription information
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS plan subscription_plan DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status subscription_status DEFAULT 'active',
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  plan subscription_plan NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  billing_cycle billing_cycle NOT NULL DEFAULT 'monthly',
  
  -- Stripe/Payment provider fields
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  
  -- Razorpay fields (for India)
  razorpay_customer_id TEXT,
  razorpay_subscription_id TEXT,
  
  -- Billing dates
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 month',
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  
  -- Pricing
  amount_cents INTEGER NOT NULL DEFAULT 0, -- Amount in cents (e.g., 2900 = $29.00)
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create usage_tracking table to monitor limits
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Current month usage counters
  clients_count INTEGER DEFAULT 0,
  invoices_count INTEGER DEFAULT 0,
  ai_messages_count INTEGER DEFAULT 0,
  emails_sent_count INTEGER DEFAULT 0,
  
  -- Usage period (reset monthly)
  period_start TIMESTAMPTZ DEFAULT DATE_TRUNC('month', NOW()),
  period_end TIMESTAMPTZ DEFAULT DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to ensure one record per user per period
  UNIQUE(user_id, period_start)
);

-- Create billing_events table for payment tracking
CREATE TABLE IF NOT EXISTS public.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE CASCADE,
  
  -- Event details
  event_type TEXT NOT NULL, -- 'payment_succeeded', 'payment_failed', 'subscription_created', etc.
  amount_cents INTEGER,
  currency TEXT DEFAULT 'USD',
  
  -- Payment provider details
  provider TEXT NOT NULL, -- 'stripe', 'razorpay', 'paypal'
  provider_event_id TEXT,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  
  -- Event data (JSON)
  event_data JSONB,
  
  -- Processing status
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create plan_limits table to define what each plan includes
CREATE TABLE IF NOT EXISTS public.plan_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan subscription_plan NOT NULL UNIQUE,
  
  -- Usage limits
  max_clients INTEGER, -- NULL means unlimited
  max_invoices_per_month INTEGER, -- NULL means unlimited  
  max_ai_messages_per_month INTEGER, -- NULL means unlimited
  max_emails_per_month INTEGER, -- NULL means unlimited
  max_team_members INTEGER DEFAULT 1,
  
  -- Feature access
  can_use_ai_followups BOOLEAN DEFAULT TRUE,
  can_use_custom_branding BOOLEAN DEFAULT FALSE,
  can_use_automation BOOLEAN DEFAULT FALSE,
  can_use_analytics BOOLEAN DEFAULT FALSE,
  can_use_api BOOLEAN DEFAULT FALSE,
  can_use_white_label BOOLEAN DEFAULT FALSE,
  
  -- Support level
  support_level TEXT DEFAULT 'email', -- 'email', 'priority', 'phone'
  
  -- Pricing
  monthly_price_cents INTEGER NOT NULL DEFAULT 0,
  yearly_price_cents INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plan limits
INSERT INTO public.plan_limits (
  plan, 
  max_clients, 
  max_invoices_per_month, 
  max_ai_messages_per_month,
  max_emails_per_month,
  max_team_members,
  can_use_ai_followups,
  can_use_custom_branding,
  can_use_automation,
  can_use_analytics,
  can_use_api,
  can_use_white_label,
  support_level,
  monthly_price_cents,
  yearly_price_cents
) VALUES 
-- Free Plan
('free', 3, 5, 10, 20, 1, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, 'email', 0, 0),
-- Starter Plan ($29/month, $290/year - save $58)
('starter', 10, 25, 50, 100, 1, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, 'email', 2900, 29000),
-- Professional Plan ($59/month, $590/year - save $118) 
('professional', 100, NULL, 200, 500, 1, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE, 'priority', 5900, 59000),
-- Agency Plan ($129/month, $1290/year - save $258)
('agency', NULL, NULL, NULL, NULL, 3, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 'phone', 12900, 129000)
ON CONFLICT (plan) DO NOTHING;

-- Enable Row Level Security (RLS) on new tables
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON public.user_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for usage_tracking
CREATE POLICY "Users can view own usage" ON public.usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON public.usage_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON public.usage_tracking
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for billing_events  
CREATE POLICY "Users can view own billing events" ON public.billing_events
  FOR SELECT USING (auth.uid() = user_id);

-- Plan limits are readable by all authenticated users
CREATE POLICY "All users can view plan limits" ON public.plan_limits
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON public.user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_period ON public.usage_tracking(user_id, period_start);
CREATE INDEX IF NOT EXISTS idx_billing_events_user ON public.billing_events(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_provider ON public.billing_events(provider, provider_event_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE OR REPLACE TRIGGER set_timestamp_user_subscriptions
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE OR REPLACE TRIGGER set_timestamp_usage_tracking
  BEFORE UPDATE ON public.usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- Function to get current user's plan and limits
CREATE OR REPLACE FUNCTION get_user_plan_limits(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
  user_plan subscription_plan,
  max_clients INTEGER,
  max_invoices_per_month INTEGER,
  max_ai_messages_per_month INTEGER,
  max_emails_per_month INTEGER,
  max_team_members INTEGER,
  can_use_ai_followups BOOLEAN,
  can_use_custom_branding BOOLEAN,
  can_use_automation BOOLEAN,
  can_use_analytics BOOLEAN,
  can_use_api BOOLEAN,
  can_use_white_label BOOLEAN,
  support_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(u.plan, 'free'::subscription_plan) as user_plan,
    pl.max_clients,
    pl.max_invoices_per_month,
    pl.max_ai_messages_per_month,
    pl.max_emails_per_month,
    pl.max_team_members,
    pl.can_use_ai_followups,
    pl.can_use_custom_branding,
    pl.can_use_automation,
    pl.can_use_analytics,
    pl.can_use_api,
    pl.can_use_white_label,
    pl.support_level
  FROM public.users u
  LEFT JOIN public.plan_limits pl ON pl.plan = COALESCE(u.plan, 'free'::subscription_plan)
  WHERE u.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current usage for a user
CREATE OR REPLACE FUNCTION get_user_current_usage(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
  clients_count INTEGER,
  invoices_count INTEGER,
  ai_messages_count INTEGER,
  emails_sent_count INTEGER,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ut.clients_count, 0) as clients_count,
    COALESCE(ut.invoices_count, 0) as invoices_count,
    COALESCE(ut.ai_messages_count, 0) as ai_messages_count,
    COALESCE(ut.emails_sent_count, 0) as emails_sent_count,
    COALESCE(ut.period_start, DATE_TRUNC('month', NOW())) as period_start,
    COALESCE(ut.period_end, DATE_TRUNC('month', NOW()) + INTERVAL '1 month') as period_end
  FROM public.usage_tracking ut
  WHERE ut.user_id = user_uuid 
    AND ut.period_start = DATE_TRUNC('month', NOW())
  UNION ALL
  SELECT 0, 0, 0, 0, DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.usage_tracking ut 
    WHERE ut.user_id = user_uuid 
      AND ut.period_start = DATE_TRUNC('month', NOW())
  )
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage counter
CREATE OR REPLACE FUNCTION increment_usage_counter(
  user_uuid UUID DEFAULT auth.uid(),
  counter_type TEXT DEFAULT 'ai_messages', -- 'clients', 'invoices', 'ai_messages', 'emails_sent'
  increment_by INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  current_period_start TIMESTAMPTZ := DATE_TRUNC('month', NOW());
  current_period_end TIMESTAMPTZ := DATE_TRUNC('month', NOW()) + INTERVAL '1 month';
BEGIN
  -- Insert or update usage tracking record
  INSERT INTO public.usage_tracking (
    user_id, 
    period_start, 
    period_end,
    clients_count,
    invoices_count, 
    ai_messages_count,
    emails_sent_count
  ) VALUES (
    user_uuid,
    current_period_start,
    current_period_end,
    CASE WHEN counter_type = 'clients' THEN increment_by ELSE 0 END,
    CASE WHEN counter_type = 'invoices' THEN increment_by ELSE 0 END,
    CASE WHEN counter_type = 'ai_messages' THEN increment_by ELSE 0 END,
    CASE WHEN counter_type = 'emails_sent' THEN increment_by ELSE 0 END
  )
  ON CONFLICT (user_id, period_start)
  DO UPDATE SET
    clients_count = CASE 
      WHEN counter_type = 'clients' THEN public.usage_tracking.clients_count + increment_by
      ELSE public.usage_tracking.clients_count
    END,
    invoices_count = CASE
      WHEN counter_type = 'invoices' THEN public.usage_tracking.invoices_count + increment_by  
      ELSE public.usage_tracking.invoices_count
    END,
    ai_messages_count = CASE
      WHEN counter_type = 'ai_messages' THEN public.usage_tracking.ai_messages_count + increment_by
      ELSE public.usage_tracking.ai_messages_count  
    END,
    emails_sent_count = CASE
      WHEN counter_type = 'emails_sent' THEN public.usage_tracking.emails_sent_count + increment_by
      ELSE public.usage_tracking.emails_sent_count
    END,
    updated_at = NOW();
    
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;