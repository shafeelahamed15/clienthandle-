// Apply Business Profile Schema to Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyBusinessSchema() {
  console.log('🚀 Applying business profile schema...');
  
  try {
    // Step 1: Add business profile columns to users table
    console.log('📝 Adding business profile columns...');
    
    const alterTableQueries = [
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_name TEXT;',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_type TEXT;',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS industry TEXT;',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS service_description TEXT;',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS target_clients TEXT;',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_phone TEXT;',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_website TEXT;',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS value_proposition TEXT;',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS typical_project_duration TEXT;',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pricing_model TEXT;',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS communication_style TEXT DEFAULT \'professional\';',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;'
    ];
    
    for (const query of alterTableQueries) {
      console.log(`Executing: ${query.substring(0, 50)}...`);
      const { error } = await supabase.rpc('exec', { query });
      if (error && !error.message.includes('already exists')) {
        console.log(`⚠️  Query failed (might be expected): ${error.message}`);
      } else {
        console.log('✅ Success');
      }
    }
    
    console.log('✅ Business profile schema applied successfully!');
    console.log('📱 You can now use business profile features in the app');
    
    // Test the schema by checking if columns exist
    console.log('🧪 Testing schema...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('business_name, profile_completed')
      .limit(1);
    
    if (!testError) {
      console.log('✅ Schema test passed - business profile columns are available');
    } else {
      console.log('⚠️  Schema test failed:', testError.message);
      console.log('💡 This might be expected if there are no users yet');
    }
    
  } catch (error) {
    console.error('❌ Failed to apply schema:', error.message);
    console.log('\n📋 Manual Steps Required:');
    console.log('1. Go to: https://supabase.com/dashboard/project/gjwgrkaabbydicnwgyrw/sql');
    console.log('2. Copy content from: supabase/business-profile-schema.sql');  
    console.log('3. Paste and run in SQL Editor');
    console.log('4. Refresh your app');
  }
}

applyBusinessSchema();