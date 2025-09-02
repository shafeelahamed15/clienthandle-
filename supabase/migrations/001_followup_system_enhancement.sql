-- Migration 001: Followup System Enhancement - Database Schema Phase 1
-- This migration adds enhanced followup system tables and enums for better AI integration

-- Create enum types for followup system
CREATE TYPE followup_angle AS ENUM (
  'forgot_to_add',
  'resource',
  'next_step_question',
  'benefit_framing',
  'deadline_or_capacity',
  'easy_out'
);

CREATE TYPE followup_tone AS ENUM (
  'friendly',
  'professional',
  'firm',
  'helpful_service'
);

CREATE TYPE followup_status AS ENUM (
  'queued',
  'sent',
  'paused',
  'cancelled',
  'failed'
);

CREATE TYPE message_channel AS ENUM (
  'email',
  'whatsapp',
  'sms'
);

-- Create followup_sequences table for managing followup campaigns
CREATE TABLE public.followup_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  steps JSONB NOT NULL DEFAULT '[]', -- Array of sequence steps with timing and content
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for followup_sequences
CREATE INDEX idx_followup_sequences_owner ON public.followup_sequences(owner_uid);
CREATE INDEX idx_followup_sequences_active ON public.followup_sequences(owner_uid, is_active);

-- Enhance existing followup_queue table with new columns
ALTER TABLE public.followup_queue 
ADD COLUMN IF NOT EXISTS angle followup_angle DEFAULT 'benefit_framing',
ADD COLUMN IF NOT EXISTS tone followup_tone DEFAULT 'helpful_service',
ADD COLUMN IF NOT EXISTS sequence_id UUID REFERENCES public.followup_sequences(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sequence_step INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Update followup_queue status column to use new enum (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followup_queue' AND column_name = 'status' AND data_type = 'text') THEN
    -- Convert existing text status to enum
    ALTER TABLE public.followup_queue 
    ALTER COLUMN status TYPE followup_status USING status::followup_status;
  END IF;
END $$;

-- Enhance existing messages table
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS channel message_channel DEFAULT 'email',
ADD COLUMN IF NOT EXISTS tone followup_tone,
ADD COLUMN IF NOT EXISTS angle followup_angle,
ADD COLUMN IF NOT EXISTS sequence_id UUID REFERENCES public.followup_sequences(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sequence_step INTEGER,
ADD COLUMN IF NOT EXISTS tracking_data JSONB DEFAULT '{}', -- Email opens, clicks, etc.
ADD COLUMN IF NOT EXISTS reply_detected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;

-- Enhance existing clients table for better tracking
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS last_reply_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS followups_paused BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS unsubscribed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bounce_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_bounce_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 50; -- 0-100 engagement score

-- Create indexes for enhanced performance
CREATE INDEX IF NOT EXISTS idx_followup_queue_angle ON public.followup_queue(owner_uid, angle);
CREATE INDEX IF NOT EXISTS idx_followup_queue_tone ON public.followup_queue(owner_uid, tone);
CREATE INDEX IF NOT EXISTS idx_followup_queue_sequence ON public.followup_queue(sequence_id, sequence_step);
CREATE INDEX IF NOT EXISTS idx_followup_queue_retry ON public.followup_queue(owner_uid, retry_count, max_retries);

CREATE INDEX IF NOT EXISTS idx_messages_channel ON public.messages(owner_uid, channel);
CREATE INDEX IF NOT EXISTS idx_messages_tracking ON public.messages(owner_uid, reply_detected_at) WHERE reply_detected_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_sequence ON public.messages(sequence_id, sequence_step);

CREATE INDEX IF NOT EXISTS idx_clients_engagement ON public.clients(owner_uid, engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_clients_paused ON public.clients(owner_uid, followups_paused) WHERE followups_paused = TRUE;
CREATE INDEX IF NOT EXISTS idx_clients_unsubscribed ON public.clients(owner_uid, unsubscribed) WHERE unsubscribed = TRUE;

-- Create trigger functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_followup_sequences_updated_at 
  BEFORE UPDATE ON public.followup_sequences 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security on new tables
ALTER TABLE public.followup_sequences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for followup_sequences
CREATE POLICY "Users can view own sequences" ON public.followup_sequences
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "Users can insert own sequences" ON public.followup_sequences
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "Users can update own sequences" ON public.followup_sequences
  FOR UPDATE USING (auth.uid() = owner_uid);

CREATE POLICY "Users can delete own sequences" ON public.followup_sequences
  FOR DELETE USING (auth.uid() = owner_uid);

-- Create default followup sequences for new users (will be handled by application)
-- This could be populated by a trigger or application logic

-- Grant necessary permissions
GRANT ALL ON public.followup_sequences TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.followup_sequences IS 'Predefined followup sequences for automated campaigns';
COMMENT ON COLUMN public.followup_sequences.steps IS 'JSON array of sequence steps with timing and content templates';
COMMENT ON COLUMN public.followup_queue.angle IS 'AI followup angle strategy used for this message';
COMMENT ON COLUMN public.followup_queue.tone IS 'Tone preference for this followup message';
COMMENT ON COLUMN public.messages.tracking_data IS 'Email delivery and engagement tracking data';
COMMENT ON COLUMN public.clients.engagement_score IS 'Calculated engagement score (0-100) based on response rates';