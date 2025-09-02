-- ClientHandle Database Schema for Supabase (Fixed)
-- Clean, minimal version that works with Supabase

-- Create custom types
CREATE TYPE user_plan AS ENUM ('free', 'pro');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'void');
CREATE TYPE message_type AS ENUM ('followup', 'reminder', 'update');
CREATE TYPE message_tone AS ENUM ('friendly', 'professional', 'firm');
CREATE TYPE message_channel AS ENUM ('email', 'whatsapp');
CREATE TYPE message_status AS ENUM ('draft', 'queued', 'sent', 'failed');
CREATE TYPE reminder_strategy AS ENUM ('gentle-3-7-14', 'firm-7-14-21', 'custom');
CREATE TYPE payment_provider AS ENUM ('razorpay', 'stripe', 'paypal');

-- Users table (extends auth.users)
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
CREATE TABLE public.clients (
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
  scheduled_at TIMESTAMPTZ,
  schedule_timezone TEXT DEFAULT 'UTC',
  recurring_pattern JSONB,
  sequence_id UUID,
  sequence_step INTEGER DEFAULT 1,
  status message_status DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reminders table
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

-- Audit logs table
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

-- Create indexes for performance
CREATE INDEX idx_clients_owner_uid ON public.clients(owner_uid);
CREATE INDEX idx_clients_name ON public.clients(owner_uid, name);
CREATE INDEX idx_clients_email ON public.clients(owner_uid, email);
CREATE INDEX idx_clients_last_contact ON public.clients(owner_uid, last_contact_at DESC);

CREATE INDEX idx_invoices_owner_uid ON public.invoices(owner_uid);
CREATE INDEX idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX idx_invoices_status ON public.invoices(owner_uid, status);
CREATE INDEX idx_invoices_due_date ON public.invoices(owner_uid, due_date ASC);
CREATE INDEX idx_invoices_number ON public.invoices(owner_uid, number);

CREATE INDEX idx_messages_owner_uid ON public.messages(owner_uid);
CREATE INDEX idx_messages_client_id ON public.messages(client_id);
CREATE INDEX idx_messages_created_at ON public.messages(owner_uid, client_id, created_at DESC);
CREATE INDEX idx_messages_scheduled_at ON public.messages(owner_uid, scheduled_at ASC) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_messages_status ON public.messages(owner_uid, status);
CREATE INDEX idx_messages_sequence ON public.messages(owner_uid, sequence_id, sequence_step);

CREATE INDEX idx_reminders_owner_uid ON public.reminders(owner_uid);
CREATE INDEX idx_reminders_next_run ON public.reminders(owner_uid, enabled, next_run_at ASC);

CREATE INDEX idx_audit_logs_owner_uid ON public.audit_logs(owner_uid);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(owner_uid, created_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

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

-- Reminders policies
CREATE POLICY "Users can view own reminders" ON public.reminders
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "Users can insert own reminders" ON public.reminders
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "Users can update own reminders" ON public.reminders
  FOR UPDATE USING (auth.uid() = owner_uid);

CREATE POLICY "Users can delete own reminders" ON public.reminders
  FOR DELETE USING (auth.uid() = owner_uid);

-- Audit logs policies
CREATE POLICY "Users can view own audit logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "Users can insert own audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices 
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
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();