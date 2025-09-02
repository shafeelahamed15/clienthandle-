-- Email Schedules Table for Automated Reminders
CREATE TABLE public.email_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  
  -- Schedule Configuration
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('once', 'recurring', 'invoice_based')),
  pattern JSONB NOT NULL, -- { "type": "days", "interval": 7, "times": [3, 7, 14] }
  
  -- Email Content
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('followup', 'reminder', 'update')),
  tone TEXT NOT NULL CHECK (tone IN ('friendly', 'professional', 'firm')),
  
  -- Execution Tracking
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  max_runs INTEGER, -- null = unlimited
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Schedule Executions (Log of actual sends)
CREATE TABLE public.email_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.email_schedules(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  
  -- Execution Details
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message TEXT,
  
  -- Context at time of execution
  invoice_status TEXT, -- What was the invoice status when we ran?
  client_email TEXT, -- What email did we send to?
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_email_schedules_owner ON public.email_schedules(owner_uid);
CREATE INDEX idx_email_schedules_client ON public.email_schedules(client_id);
CREATE INDEX idx_email_schedules_invoice ON public.email_schedules(invoice_id);
CREATE INDEX idx_email_schedules_next_run ON public.email_schedules(next_run_at) WHERE status = 'active';
CREATE INDEX idx_email_schedules_status ON public.email_schedules(status);

CREATE INDEX idx_email_executions_schedule ON public.email_executions(schedule_id);
CREATE INDEX idx_email_executions_executed_at ON public.email_executions(executed_at);

-- Row Level Security
ALTER TABLE public.email_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_schedules
CREATE POLICY "Users can view own schedules" ON public.email_schedules
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "Users can insert own schedules" ON public.email_schedules
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "Users can update own schedules" ON public.email_schedules
  FOR UPDATE USING (auth.uid() = owner_uid);

CREATE POLICY "Users can delete own schedules" ON public.email_schedules
  FOR DELETE USING (auth.uid() = owner_uid);

-- RLS Policies for email_executions  
CREATE POLICY "Users can view own executions" ON public.email_executions
  FOR SELECT USING (
    auth.uid() = (
      SELECT owner_uid FROM public.email_schedules 
      WHERE id = email_executions.schedule_id
    )
  );

CREATE POLICY "System can insert executions" ON public.email_executions
  FOR INSERT WITH CHECK (true); -- System service inserts these

-- Helper function to calculate next run time
CREATE OR REPLACE FUNCTION calculate_next_run_time(
  pattern JSONB,
  current_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  next_time TIMESTAMPTZ;
  interval_days INTEGER;
  schedule_type TEXT;
BEGIN
  schedule_type := pattern->>'type';
  
  CASE schedule_type
    WHEN 'days' THEN
      interval_days := COALESCE((pattern->>'interval')::INTEGER, 7);
      next_time := current_time + (interval_days || ' days')::INTERVAL;
    WHEN 'weekly' THEN
      next_time := current_time + INTERVAL '7 days';
    WHEN 'monthly' THEN
      next_time := current_time + INTERVAL '30 days';
    ELSE
      next_time := current_time + INTERVAL '7 days'; -- default
  END CASE;
  
  RETURN next_time;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate next_run_at on insert/update
CREATE OR REPLACE FUNCTION update_next_run_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.next_run_at IS NULL THEN
    NEW.next_run_at := calculate_next_run_time(NEW.pattern);
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_next_run_time
  BEFORE INSERT OR UPDATE ON public.email_schedules
  FOR EACH ROW EXECUTE FUNCTION update_next_run_time();

-- Sample reminder patterns as JSONB
-- Gentle: 3 days, 7 days, 14 days
-- { "type": "sequence", "intervals": [3, 7, 14], "unit": "days", "max_runs": 3 }

-- Firm: 7 days, 14 days, 21 days  
-- { "type": "sequence", "intervals": [7, 14, 21], "unit": "days", "max_runs": 3 }

-- Weekly recurring
-- { "type": "recurring", "interval": 7, "unit": "days", "max_runs": null }