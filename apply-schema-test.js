const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('clients').select('count').limit(1);
    
    if (error) {
      console.error('❌ Database connection error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      if (error.code === '42P01') {
        console.log('🔧 Table does not exist. Need to apply schema.');
      } else if (error.code === 'PGRST301') {
        console.log('🚨 Permission error. Check RLS policies.');
      }
      
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

async function checkSchema() {
  console.log('🔍 Checking database schema...');
  
  try {
    // Check if clients table exists and has the right columns
    const { data, error } = await supabase.rpc('get_table_columns', {
      table_name: 'clients'
    });
    
    if (error && error.code !== '42883') {
      console.error('❌ Schema check error:', error);
      return false;
    }
    
    console.log('📋 Table structure:', data);
    return true;
  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting database diagnostics...');
  console.log('📍 Supabase URL:', supabaseUrl);
  console.log('🔑 Service key present:', !!supabaseKey);
  
  await testDatabaseConnection();
  // await checkSchema();
}

main().catch(console.error);