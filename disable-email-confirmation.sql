-- Run this in Supabase SQL Editor to disable email confirmation temporarily for testing
-- This allows users to sign in without confirming their email

-- Update auth settings to disable email confirmation
UPDATE auth.config 
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'), 
  '{confirm_email}', 
  'false'
)
WHERE id = 'default';

-- Mark existing users as confirmed so they can sign in
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;