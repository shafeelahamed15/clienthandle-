-- Production Database Fix Script
-- This script fixes all the critical database issues found in production testing
-- Run this script to apply all missing migrations and functions

-- First, let's create any missing custom types
DO $$ BEGIN
    CREATE TYPE subscription_plan AS ENUM ('free', 'starter', 'professional', 'agency');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'unpaid', 'trialing');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE billing_cycle AS ENUM ('monthly', 'yearly');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create plan_limits table (this was missing and causing /api/plans to fail)
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

-- Insert default plan limits if they don't exist
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

-- Create user_subscriptions table if it doesn't exist
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

-- Create billing_events table if it doesn't exist
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

-- Enable RLS on new tables
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for plan_limits (readable by all authenticated users)
DROP POLICY IF EXISTS "All users can view plan limits" ON public.plan_limits;
CREATE POLICY "All users can view plan limits" ON public.plan_limits
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create RLS policies for user_subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can insert own subscriptions" ON public.user_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can update own subscriptions" ON public.user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for billing_events
DROP POLICY IF EXISTS "Users can view own billing events" ON public.billing_events;
CREATE POLICY "Users can view own billing events" ON public.billing_events
  FOR SELECT USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON public.user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_billing_events_user ON public.billing_events(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_provider ON public.billing_events(provider, provider_event_id);

-- Create the missing database functions

-- Function for health check (was missing and causing health check to fail)
CREATE OR REPLACE FUNCTION public.version()
RETURNS TEXT AS $$
BEGIN
  RETURN 'ClientHandle Database v1.0';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get schema tables (was missing and causing schema validation to fail)
CREATE OR REPLACE FUNCTION public.get_schema_tables()
RETURNS TABLE(table_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT t.table_name::TEXT
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's plan and limits
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

-- Update the users table to include the subscription plan column if missing
DO $$ 
BEGIN
    -- Update users table to include subscription information
    ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS plan subscription_plan DEFAULT 'free';
EXCEPTION
    WHEN others THEN null;
END $$;

-- Update usage_tracking table to make sure it exists properly
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

-- Enable RLS on usage_tracking if not already enabled
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for usage_tracking
DROP POLICY IF EXISTS "Users can view own usage" ON public.usage_tracking;
CREATE POLICY "Users can view own usage" ON public.usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own usage" ON public.usage_tracking;
CREATE POLICY "Users can insert own usage" ON public.usage_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own usage" ON public.usage_tracking;
CREATE POLICY "Users can update own usage" ON public.usage_tracking
  FOR UPDATE USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_period ON public.usage_tracking(user_id, period_start);

-- Success message
SELECT 'Database migrations applied successfully! All missing tables, functions, and policies have been created.' as result;