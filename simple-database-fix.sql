-- SIMPLE DATABASE FIX - One column at a time
-- Sometimes adding columns individually works better

-- Add columns one by one
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_name TEXT;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS service_description TEXT;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_details TEXT;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS target_clients TEXT;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS value_proposition TEXT;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS communication_style TEXT DEFAULT 'professional';

-- Force schema refresh
SELECT pg_notify('pgrst', 'reload schema');

-- Check what we have
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
AND column_name LIKE '%business%' OR column_name LIKE '%service%' OR column_name LIKE '%target%' OR column_name LIKE '%value%' OR column_name LIKE '%communication%'
ORDER BY column_name;