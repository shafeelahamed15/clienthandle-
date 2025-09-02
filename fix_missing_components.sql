-- Fix missing database components
-- Run this in your Supabase SQL Editor

-- 1. Create the missing usage_tracking table
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  clients_count INTEGER DEFAULT 0,
  invoices_count INTEGER DEFAULT 0,
  ai_messages_count INTEGER DEFAULT 0,
  emails_sent_count INTEGER DEFAULT 0,
  period_start TIMESTAMPTZ DEFAULT DATE_TRUNC('month', NOW()),
  period_end TIMESTAMPTZ DEFAULT DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period_start)
);

-- Enable RLS
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for usage_tracking (drop first if they exist)
DROP POLICY IF EXISTS "Users can view own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can insert own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can update own usage" ON public.usage_tracking;

CREATE POLICY "Users can view own usage" ON public.usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON public.usage_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON public.usage_tracking
  FOR UPDATE USING (auth.uid() = user_id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON public.usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period ON public.usage_tracking(user_id, period_start);

-- Create trigger for updated_at (drop first if exists)
DROP TRIGGER IF EXISTS update_usage_tracking_updated_at ON public.usage_tracking;
CREATE TRIGGER update_usage_tracking_updated_at 
    BEFORE UPDATE ON public.usage_tracking 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Create the increment_usage_counter function
CREATE OR REPLACE FUNCTION increment_usage_counter(
  user_uuid UUID DEFAULT auth.uid(),
  counter_type TEXT DEFAULT 'ai_messages',
  increment_by INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  current_period_start TIMESTAMPTZ := DATE_TRUNC('month', NOW());
  current_period_end TIMESTAMPTZ := DATE_TRUNC('month', NOW()) + INTERVAL '1 month';
BEGIN
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

-- 3. Create the get_current_usage function
CREATE OR REPLACE FUNCTION get_current_usage(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(
  clients_count INTEGER,
  invoices_count INTEGER,
  ai_messages_count INTEGER,
  emails_sent_count INTEGER
) AS $$
DECLARE
  current_period_start TIMESTAMPTZ := DATE_TRUNC('month', NOW());
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ut.clients_count, 0)::INTEGER,
    COALESCE(ut.invoices_count, 0)::INTEGER,
    COALESCE(ut.ai_messages_count, 0)::INTEGER,
    COALESCE(ut.emails_sent_count, 0)::INTEGER
  FROM public.usage_tracking ut
  WHERE ut.user_id = user_uuid 
    AND ut.period_start = current_period_start;
  
  -- If no record exists, return zeros
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, 0, 0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;