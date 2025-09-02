-- Simplified Business Profile Schema for ClientHandle
-- Run this in Supabase SQL Editor to add business profile columns

-- Add only the essential business profile columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS service_description TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS communication_style TEXT DEFAULT 'professional';

-- Add constraints for the simplified fields
ALTER TABLE public.users ADD CONSTRAINT IF NOT EXISTS check_business_name_length CHECK (LENGTH(business_name) <= 100);
ALTER TABLE public.users ADD CONSTRAINT IF NOT EXISTS check_service_description_length CHECK (LENGTH(service_description) <= 150);

-- Create communication style enum (simple version)
DROP TYPE IF EXISTS communication_style_enum CASCADE;
CREATE TYPE communication_style_enum AS ENUM (
    'casual',
    'professional', 
    'formal',
    'friendly',
    'direct'
);

-- Update users table to use enum for communication_style
ALTER TABLE public.users ALTER COLUMN communication_style TYPE communication_style_enum USING communication_style::communication_style_enum;

-- Create index for communication style queries
CREATE INDEX IF NOT EXISTS idx_users_communication_style ON public.users(communication_style) WHERE communication_style IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN public.users.business_name IS 'Name of the user''s business (for AI context)';
COMMENT ON COLUMN public.users.service_description IS 'Simple description of what the user does (for AI personalization)';
COMMENT ON COLUMN public.users.communication_style IS 'Preferred communication tone for AI-generated follow-ups';