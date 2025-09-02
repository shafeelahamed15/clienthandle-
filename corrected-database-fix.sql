-- CORRECTED DATABASE FIX - Missing target_clients column
-- Fixed syntax error in REFRESH command

-- Step 1: Add ALL missing business profile columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS service_description TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_details TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS target_clients TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS value_proposition TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS communication_style TEXT DEFAULT 'professional';

-- Step 2: Refresh schema cache (corrected syntax)
NOTIFY pgrst, 'reload schema';

-- Step 3: Verify columns exist
SELECT 
    column_name,
    data_type,
    is_nullable
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

-- Step 4: Show total count (should be 6)
SELECT COUNT(*) as business_profile_columns_count
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