-- Create email_jobs table for email scheduling
-- This table is used by the email scheduler service

CREATE TABLE IF NOT EXISTS public.email_jobs (
  id TEXT PRIMARY KEY,
  owner_uid UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  client_id TEXT NOT NULL,
  invoice_id TEXT,
  template_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  variables JSONB DEFAULT '{}'::jsonb,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_jobs_owner_uid ON public.email_jobs(owner_uid);
CREATE INDEX IF NOT EXISTS idx_email_jobs_status ON public.email_jobs(owner_uid, status);
CREATE INDEX IF NOT EXISTS idx_email_jobs_scheduled_for ON public.email_jobs(owner_uid, scheduled_for ASC);
CREATE INDEX IF NOT EXISTS idx_email_jobs_client_id ON public.email_jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_email_jobs_invoice_id ON public.email_jobs(invoice_id) WHERE invoice_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.email_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own email jobs" ON public.email_jobs
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "Users can insert own email jobs" ON public.email_jobs
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "Users can update own email jobs" ON public.email_jobs
  FOR UPDATE USING (auth.uid() = owner_uid);

CREATE POLICY "Users can delete own email jobs" ON public.email_jobs
  FOR DELETE USING (auth.uid() = owner_uid);

-- Create trigger for updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_email_jobs_updated_at 
    BEFORE UPDATE ON public.email_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify table was created
SELECT 
  schemaname, 
  tablename, 
  tableowner 
FROM pg_tables 
WHERE tablename = 'email_jobs'
ORDER BY tablename;