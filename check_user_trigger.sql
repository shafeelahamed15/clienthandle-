-- Check if user creation trigger is working
-- Run this in Supabase SQL Editor

-- Check if the trigger function exists
SELECT 
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Check if the trigger exists
SELECT 
  tgname as trigger_name,
  tgfoid::regproc as function_name,
  tgenabled as enabled
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Check existing users in the users table
SELECT 
  id,
  email,
  display_name,
  plan,
  created_at,
  updated_at
FROM public.users
ORDER BY created_at DESC
LIMIT 5;

-- Check auth.users vs public.users sync
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  au.email_confirmed_at,
  pu.id as profile_id,
  pu.email as profile_email,
  pu.display_name
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC
LIMIT 5;