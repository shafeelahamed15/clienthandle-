-- Create email_schedules table for managing scheduled follow-ups
-- This extends the follow-up system with advanced scheduling capabilities

CREATE TABLE IF NOT EXISTS public.email_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  
  -- Schedule metadata
  name TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled', 'paused')),
  
  -- Message details
  message_type TEXT DEFAULT 'reminder' CHECK (message_type IN ('followup', 'reminder', 'update')),
  tone TEXT DEFAULT 'professional' CHECK (tone IN ('friendly', 'professional', 'firm')),
  subject TEXT,
  body TEXT NOT NULL,
  
  -- Scheduling configuration
  scheduled_at TIMESTAMPTZ NOT NULL,
  next_run_at TIMESTAMPTZ,
  interval_type TEXT CHECK (interval_type IN ('once', 'daily', 'weekly', 'monthly', 'custom')),
  interval_value INTEGER, -- Number of days/hours for custom intervals
  
  -- Execution tracking
  send_count INTEGER DEFAULT 0,
  max_sends INTEGER, -- NULL means unlimited
  last_sent_at TIMESTAMPTZ,
  
  -- Options
  attach_invoice_pdf BOOLEAN DEFAULT FALSE,
  timezone TEXT DEFAULT 'UTC',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_schedules_owner ON public.email_schedules(owner_uid);
CREATE INDEX IF NOT EXISTS idx_email_schedules_client ON public.email_schedules(client_id);
CREATE INDEX IF NOT EXISTS idx_email_schedules_status ON public.email_schedules(status);
CREATE INDEX IF NOT EXISTS idx_email_schedules_next_run ON public.email_schedules(next_run_at) WHERE status = 'scheduled';

-- Enable RLS
ALTER TABLE public.email_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own schedules" ON public.email_schedules
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "Users can insert own schedules" ON public.email_schedules
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "Users can update own schedules" ON public.email_schedules
  FOR UPDATE USING (auth.uid() = owner_uid);

CREATE POLICY "Users can delete own schedules" ON public.email_schedules
  FOR DELETE USING (auth.uid() = owner_uid);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_email_schedules_updated_at 
  BEFORE UPDATE ON public.email_schedules 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add some sample data for testing (optional)
-- This will be populated by the app when users create schedules