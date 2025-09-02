-- ClientHandle Database Schema for Supabase
-- Fully idempotent schema - can be run multiple times safely without errors

-- Create custom types safely using DROP IF EXISTS first
DROP TYPE IF EXISTS user_plan CASCADE;
CREATE TYPE user_plan AS ENUM ('free', 'pro');

DROP TYPE IF EXISTS invoice_status CASCADE;
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'void');

DROP TYPE IF EXISTS message_type CASCADE;
CREATE TYPE message_type AS ENUM ('followup', 'reminder', 'update');

DROP TYPE IF EXISTS message_tone CASCADE;
CREATE TYPE message_tone AS ENUM ('friendly', 'professional', 'firm');

DROP TYPE IF EXISTS message_channel CASCADE;
CREATE TYPE message_channel AS ENUM ('email', 'whatsapp');

DROP TYPE IF EXISTS message_status CASCADE;
CREATE TYPE message_status AS ENUM ('draft', 'queued', 'sent', 'failed');

DROP TYPE IF EXISTS reminder_strategy CASCADE;
CREATE TYPE reminder_strategy AS ENUM ('gentle-3-7-14', 'firm-7-14-21', 'custom');

DROP TYPE IF EXISTS payment_provider CASCADE;
CREATE TYPE payment_provider AS ENUM ('razorpay', 'stripe', 'paypal');

-- Users table (extends auth.users)
DROP TABLE IF EXISTS public.users CASCADE;
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  plan user_plan DEFAULT 'free',
  mfa_enabled BOOLEAN DEFAULT FALSE,
  brand_logo_url TEXT,
  brand_accent_color TEXT DEFAULT '#0A84FF',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients table
DROP TABLE IF EXISTS public.clients CASCADE;
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  notes TEXT,
  personal_context TEXT,
  last_contact_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices table
DROP TABLE IF EXISTS public.invoices CASCADE;
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  number TEXT NOT NULL,
  currency TEXT DEFAULT 'USD',
  amount_cents INTEGER NOT NULL,
  status invoice_status DEFAULT 'draft',
  due_date DATE NOT NULL,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  payment_provider payment_provider,
  payment_intent_id TEXT,
  payment_link TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_uid, number)
);

-- Messages table
DROP TABLE IF EXISTS public.messages CASCADE;
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  type message_type NOT NULL,
  tone message_tone NOT NULL,
  channel message_channel NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  redacted_body TEXT NOT NULL,
  related_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  status message_status DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  schedule_timezone TEXT DEFAULT 'UTC',
  recurring_pattern JSONB,
  sequence_id UUID,
  sequence_step INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reminders table
DROP TABLE IF EXISTS public.reminders CASCADE;
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  strategy reminder_strategy DEFAULT 'gentle-3-7-14',
  next_run_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email schedules table
DROP TABLE IF EXISTS public.email_schedules CASCADE;
CREATE TABLE public.email_schedules (
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
DROP TABLE IF EXISTS public.email_templates CASCADE;
CREATE TABLE public.email_templates (
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
DROP TABLE IF EXISTS public.email_analytics CASCADE;
CREATE TABLE public.email_analytics (
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

-- Audit logs table
DROP TABLE IF EXISTS public.audit_logs CASCADE;
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  delta_hash TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create all indexes safely
CREATE INDEX IF NOT EXISTS idx_clients_owner_uid ON public.clients(owner_uid);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(owner_uid, name);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(owner_uid, email);
CREATE INDEX IF NOT EXISTS idx_clients_last_contact ON public.clients(owner_uid, last_contact_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_owner_uid ON public.invoices(owner_uid);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(owner_uid, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(owner_uid, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(owner_uid, number);

CREATE INDEX IF NOT EXISTS idx_messages_owner_uid ON public.messages(owner_uid);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON public.messages(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(owner_uid, client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_scheduled_at ON public.messages(owner_uid, scheduled_at ASC) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages(owner_uid, status);
CREATE INDEX IF NOT EXISTS idx_messages_sequence ON public.messages(owner_uid, sequence_id, sequence_step);

CREATE INDEX IF NOT EXISTS idx_reminders_owner_uid ON public.reminders(owner_uid);
CREATE INDEX IF NOT EXISTS idx_reminders_next_run ON public.reminders(owner_uid, enabled, next_run_at ASC);

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

CREATE INDEX IF NOT EXISTS idx_audit_logs_owner_uid ON public.audit_logs(owner_uid);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(owner_uid, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (will be recreated cleanly)
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Policies for clients table
CREATE POLICY "Users can view own clients" ON public.clients
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "Users can insert own clients" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "Users can update own clients" ON public.clients
  FOR UPDATE USING (auth.uid() = owner_uid);

CREATE POLICY "Users can delete own clients" ON public.clients
  FOR DELETE USING (auth.uid() = owner_uid);

-- Policies for invoices table
CREATE POLICY "Users can view own invoices" ON public.invoices
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "Users can insert own invoices" ON public.invoices
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "Users can update own invoices" ON public.invoices
  FOR UPDATE USING (auth.uid() = owner_uid);

CREATE POLICY "Users can delete own invoices" ON public.invoices
  FOR DELETE USING (auth.uid() = owner_uid);

-- Policies for messages table
CREATE POLICY "Users can view own messages" ON public.messages
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "Users can insert own messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "Users can update own messages" ON public.messages
  FOR UPDATE USING (auth.uid() = owner_uid);

CREATE POLICY "Users can delete own messages" ON public.messages
  FOR DELETE USING (auth.uid() = owner_uid);

-- Policies for reminders table
CREATE POLICY "Users can view own reminders" ON public.reminders
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "Users can insert own reminders" ON public.reminders
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "Users can update own reminders" ON public.reminders
  FOR UPDATE USING (auth.uid() = owner_uid);

CREATE POLICY "Users can delete own reminders" ON public.reminders
  FOR DELETE USING (auth.uid() = owner_uid);

-- Policies for audit_logs table
CREATE POLICY "Users can view own audit logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "Users can insert own audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);

-- Policies for email_schedules table
CREATE POLICY "Users can view own email schedules" ON public.email_schedules
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "Users can insert own email schedules" ON public.email_schedules
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "Users can update own email schedules" ON public.email_schedules
  FOR UPDATE USING (auth.uid() = owner_uid);

CREATE POLICY "Users can delete own email schedules" ON public.email_schedules
  FOR DELETE USING (auth.uid() = owner_uid);

-- Policies for email_templates table
CREATE POLICY "Users can view own email templates" ON public.email_templates
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "Users can insert own email templates" ON public.email_templates
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "Users can update own email templates" ON public.email_templates
  FOR UPDATE USING (auth.uid() = owner_uid);

CREATE POLICY "Users can delete own email templates" ON public.email_templates
  FOR DELETE USING (auth.uid() = owner_uid);

-- Policies for email_analytics table
CREATE POLICY "Users can view own email analytics" ON public.email_analytics
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "Users can insert own email analytics" ON public.email_analytics
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);

-- Create functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON public.clients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON public.invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_schedules_updated_at ON public.email_schedules;
CREATE TRIGGER update_email_schedules_updated_at 
    BEFORE UPDATE ON public.email_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON public.email_templates;
CREATE TRIGGER update_email_templates_updated_at 
    BEFORE UPDATE ON public.email_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();