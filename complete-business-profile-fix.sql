-- Complete Business Profile Schema Fix
-- Run this entire script in Supabase SQL Editor to fix all issues
-- URL: https://supabase.com/dashboard/project/[your-project]/sql

-- Step 1: Add missing columns (if they don't exist)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS service_description TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_details TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS target_clients TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS value_proposition TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS communication_style TEXT DEFAULT 'professional';

-- Step 2: Add constraints for data validation
DO $$ 
BEGIN
    -- business_name constraint (100 chars max)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_business_name_length' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT check_business_name_length 
        CHECK (LENGTH(business_name) <= 100);
    END IF;
    
    -- service_description constraint (500 chars max)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_service_description_length' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT check_service_description_length 
        CHECK (LENGTH(service_description) <= 500);
    END IF;
    
    -- business_details constraint (500 chars max)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_business_details_length' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT check_business_details_length 
        CHECK (LENGTH(business_details) <= 500);
    END IF;
    
    -- target_clients constraint (200 chars max)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_target_clients_length' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT check_target_clients_length 
        CHECK (LENGTH(target_clients) <= 200);
    END IF;
    
    -- value_proposition constraint (300 chars max)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_value_proposition_length' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT check_value_proposition_length 
        CHECK (LENGTH(value_proposition) <= 300);
    END IF;
END $$;

-- Step 3: Verify all columns exist and show their details
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
    AND table_name = 'users' 
    AND column_name IN (
        'business_name',
        'service_description', 
        'business_details',
        'target_clients', 
        'value_proposition',
        'communication_style'
    )
ORDER BY column_name;

-- Step 4: Test that a simple update works (replace 'your-user-id' with actual user ID)
-- This is just a test - you can comment this out if you don't want to test
/*
UPDATE public.users 
SET 
    business_name = 'Test Business',
    service_description = 'Test service',
    business_details = 'Test details',
    target_clients = 'Test clients',
    value_proposition = 'Test value',
    communication_style = 'professional'
WHERE id = 'your-user-id-here';
*/

-- Final verification
SELECT COUNT(*) as total_business_columns
FROM information_schema.columns 
WHERE table_schema = 'public'
    AND table_name = 'users' 
    AND column_name IN (
        'business_name',
        'service_description', 
        'business_details',
        'target_clients', 
        'value_proposition',
        'communication_style'
    );