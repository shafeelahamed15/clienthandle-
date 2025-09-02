-- Fix missing increment_usage_counter function
-- Run this in Supabase SQL Editor to add the missing function

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

-- Also create the usage_tracking table if it doesn't exist
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

-- Enable RLS
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for usage_tracking if they don't exist
CREATE POLICY IF NOT EXISTS "Users can view own usage" ON public.usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own usage" ON public.usage_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own usage" ON public.usage_tracking
  FOR UPDATE USING (auth.uid() = user_id);