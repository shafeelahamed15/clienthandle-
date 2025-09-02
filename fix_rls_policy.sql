-- Quick fix for missing INSERT policy on users table
-- Run this in your Supabase SQL Editor

-- Add the missing INSERT policy for users table
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Verify all policies are now in place
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY cmd;