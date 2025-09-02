-- Fix Business Profile Database - Add Missing business_details Column
-- Copy and paste this into Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/[your-project-id]/sql

-- Add the missing business_details column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS business_details TEXT;

-- Add constraint for business_details length (500 characters max)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_business_details_length' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT check_business_details_length 
        CHECK (LENGTH(business_details) <= 500);
    END IF;
END $$;

-- Verify all required business profile columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN (
    'business_name',
    'service_description', 
    'business_details',
    'target_clients', 
    'value_proposition',
    'communication_style'
)
ORDER BY column_name;