-- Migration: Add email scheduling tables
-- Run this in your Supabase SQL Editor

-- Email schedules table
CREATE TABLE IF NOT EXISTS public.email_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  template_id UUID,
  name TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled', 'paused')),
  recurring_pattern JSONB,
  sequence_step INTEGER,
  parent_sequence_id UUID,
  email_subject TEXT NOT NULL,
  email_body TEXT NOT NULL,
  variables JSONB DEFAULT '{}'::jsonb,
  last_sent_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  send_count INTEGER DEFAULT 0,
  max_sends INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('welcome', 'followup', 'payment', 'acquisition', 'update', 'general')),
  description TEXT,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  tone TEXT DEFAULT 'professional' CHECK (tone IN ('friendly', 'professional', 'firm')),
  channel TEXT DEFAULT 'email' CHECK (channel IN ('email', 'whatsapp')),
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email analytics table
CREATE TABLE IF NOT EXISTS public.email_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  message_id UUID,
  schedule_id UUID REFERENCES public.email_schedules(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained')),
  event_data JSONB DEFAULT '{}'::jsonb,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_schedules_owner_uid ON public.email_schedules(owner_uid);
CREATE INDEX IF NOT EXISTS idx_email_schedules_client_id ON public.email_schedules(client_id);
CREATE INDEX IF NOT EXISTS idx_email_schedules_status ON public.email_schedules(owner_uid, status);
CREATE INDEX IF NOT EXISTS idx_email_schedules_scheduled_at ON public.email_schedules(owner_uid, scheduled_at ASC);
CREATE INDEX IF NOT EXISTS idx_email_schedules_next_run_at ON public.email_schedules(owner_uid, next_run_at ASC) WHERE next_run_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_templates_owner_uid ON public.email_templates(owner_uid);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON public.email_templates(owner_uid, category);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON public.email_templates(owner_uid, is_active);

CREATE INDEX IF NOT EXISTS idx_email_analytics_owner_uid ON public.email_analytics(owner_uid);
CREATE INDEX IF NOT EXISTS idx_email_analytics_client_id ON public.email_analytics(client_id);
CREATE INDEX IF NOT EXISTS idx_email_analytics_event_type ON public.email_analytics(owner_uid, event_type);
CREATE INDEX IF NOT EXISTS idx_email_analytics_created_at ON public.email_analytics(owner_uid, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.email_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for email_schedules table
CREATE POLICY "Users can view own email schedules" ON public.email_schedules
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "Users can insert own email schedules" ON public.email_schedules
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "Users can update own email schedules" ON public.email_schedules
  FOR UPDATE USING (auth.uid() = owner_uid);

CREATE POLICY "Users can delete own email schedules" ON public.email_schedules
  FOR DELETE USING (auth.uid() = owner_uid);

-- Create RLS policies for email_templates table
CREATE POLICY "Users can view own email templates" ON public.email_templates
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "Users can insert own email templates" ON public.email_templates
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "Users can update own email templates" ON public.email_templates
  FOR UPDATE USING (auth.uid() = owner_uid);

CREATE POLICY "Users can delete own email templates" ON public.email_templates
  FOR DELETE USING (auth.uid() = owner_uid);

-- Create RLS policies for email_analytics table
CREATE POLICY "Users can view own email analytics" ON public.email_analytics
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "Users can insert own email analytics" ON public.email_analytics
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);

-- Create triggers for updated_at columns
CREATE TRIGGER update_email_schedules_updated_at 
    BEFORE UPDATE ON public.email_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at 
    BEFORE UPDATE ON public.email_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify tables were created
SELECT 
  schemaname, 
  tablename, 
  tableowner 
FROM pg_tables 
WHERE tablename IN ('email_schedules', 'email_templates', 'email_analytics')
ORDER BY tablename;