-- ClientHandle Production Database Setup
-- Run this script in your production Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create custom types
CREATE TYPE user_plan AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'void');
CREATE TYPE message_status AS ENUM ('draft', 'queued', 'sent', 'failed');
CREATE TYPE message_type AS ENUM ('followup', 'reminder', 'update');
CREATE TYPE message_tone AS ENUM ('friendly', 'professional', 'firm');
CREATE TYPE message_channel AS ENUM ('email', 'whatsapp');
CREATE TYPE feedback_type AS ENUM ('bug', 'feature', 'general', 'complaint', 'praise');
CREATE TYPE schedule_status AS ENUM ('scheduled', 'paused', 'completed', 'failed');

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  plan user_plan DEFAULT 'free',
  brand_logo_url TEXT,
  brand_accent_color TEXT DEFAULT '#0A84FF',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  notes TEXT,
  last_contact_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  number TEXT NOT NULL,
  currency TEXT DEFAULT 'USD',
  amount_cents INTEGER NOT NULL,
  status invoice_status DEFAULT 'draft',
  due_date DATE,
  line_items JSONB DEFAULT '[]'::jsonb,
  payment_provider TEXT,
  payment_intent_id TEXT,
  payment_link TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique invoice numbers per user
  UNIQUE(owner_uid, number)
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  type message_type NOT NULL,
  tone message_tone NOT NULL,
  channel message_channel DEFAULT 'email',
  subject TEXT,
  body TEXT NOT NULL,
  redacted_body TEXT,
  related_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  status message_status DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  schedule_timezone TEXT DEFAULT 'UTC',
  recurring_pattern JSONB,
  sequence_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email schedules table
CREATE TABLE IF NOT EXISTS public.email_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  status schedule_status DEFAULT 'scheduled',
  recurring_pattern JSONB,
  email_subject TEXT NOT NULL,
  email_body TEXT NOT NULL,
  variables JSONB DEFAULT '{}'::jsonb,
  next_run_at TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ,
  send_count INTEGER DEFAULT 0,
  max_sends INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email executions table
CREATE TABLE IF NOT EXISTS public.email_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.email_schedules(id) ON DELETE CASCADE NOT NULL,
  owner_uid UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'success',
  error_message TEXT,
  email_sent_to TEXT,
  email_subject TEXT,
  email_body TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_type feedback_type NOT NULL,
  title TEXT,
  description TEXT NOT NULL,
  page_url TEXT,
  user_agent TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  changes JSONB,
  ip_hash TEXT,
  user_agent_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_owner_uid ON public.clients(owner_uid);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(owner_uid, email);
CREATE INDEX IF NOT EXISTS idx_clients_last_contact ON public.clients(owner_uid, last_contact_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_owner_uid ON public.invoices(owner_uid);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(owner_uid, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(owner_uid, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(owner_uid, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_owner_uid ON public.messages(owner_uid);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON public.messages(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(owner_uid, client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages(owner_uid, status);

CREATE INDEX IF NOT EXISTS idx_email_schedules_owner_uid ON public.email_schedules(owner_uid);
CREATE INDEX IF NOT EXISTS idx_email_schedules_status ON public.email_schedules(status);
CREATE INDEX IF NOT EXISTS idx_email_schedules_next_run ON public.email_schedules(status, next_run_at ASC);

CREATE INDEX IF NOT EXISTS idx_email_executions_schedule_id ON public.email_executions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_email_executions_owner_uid ON public.email_executions(owner_uid);
CREATE INDEX IF NOT EXISTS idx_email_executions_executed_at ON public.email_executions(executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback(feedback_type);

CREATE INDEX IF NOT EXISTS idx_audit_logs_owner_uid ON public.audit_logs(owner_uid);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(owner_uid, created_at DESC);

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Clients policies
CREATE POLICY "Users can view own clients" ON public.clients
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "Users can insert own clients" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "Users can update own clients" ON public.clients
  FOR UPDATE USING (auth.uid() = owner_uid);

CREATE POLICY "Users can delete own clients" ON public.clients
  FOR DELETE USING (auth.uid() = owner_uid);

-- Invoices policies
CREATE POLICY "Users can view own invoices" ON public.invoices
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "Users can insert own invoices" ON public.invoices
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "Users can update own invoices" ON public.invoices
  FOR UPDATE USING (auth.uid() = owner_uid);

CREATE POLICY "Users can delete own invoices" ON public.invoices
  FOR DELETE USING (auth.uid() = owner_uid);

-- Messages policies
CREATE POLICY "Users can view own messages" ON public.messages
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "Users can insert own messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "Users can update own messages" ON public.messages
  FOR UPDATE USING (auth.uid() = owner_uid);

CREATE POLICY "Users can delete own messages" ON public.messages
  FOR DELETE USING (auth.uid() = owner_uid);

-- Email schedules policies
CREATE POLICY "Users can view own schedules" ON public.email_schedules
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "Users can insert own schedules" ON public.email_schedules
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "Users can update own schedules" ON public.email_schedules
  FOR UPDATE USING (auth.uid() = owner_uid);

CREATE POLICY "Users can delete own schedules" ON public.email_schedules
  FOR DELETE USING (auth.uid() = owner_uid);

-- Email executions policies
CREATE POLICY "Users can view own executions" ON public.email_executions
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "Users can insert own executions" ON public.email_executions
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);

-- Feedback policies (more permissive for anonymous feedback)
CREATE POLICY "Anyone can insert feedback" ON public.feedback
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own feedback" ON public.feedback
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Audit logs policies
CREATE POLICY "Users can view own audit logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "Users can insert own audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);

-- Create function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_email_schedules_updated_at
  BEFORE UPDATE ON public.email_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Setup complete
SELECT 'ClientHandle production database setup completed successfully!' as result;