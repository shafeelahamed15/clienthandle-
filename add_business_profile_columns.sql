-- Add enhanced business profile columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS business_details TEXT,
ADD COLUMN IF NOT EXISTS target_clients TEXT,
ADD COLUMN IF NOT EXISTS value_proposition TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_business_details ON public.users(owner_uid) WHERE business_details IS NOT NULL;

-- Verify the columns were added
\d public.users;