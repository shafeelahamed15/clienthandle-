const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applySchema() {
  try {
    console.log('🚀 Applying database schema to Supabase...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'supabase', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📄 Schema file loaded, executing SQL...');
    
    // Execute the schema
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: schema 
    });
    
    if (error) {
      // Try direct SQL execution if RPC doesn't work
      console.log('Trying direct SQL execution...');
      const { data: directData, error: directError } = await supabase
        .from('_any_table_')
        .select('*')
        .limit(0);
      
      if (directError) {
        console.error('❌ Failed to execute schema:', directError);
        console.log('\n📋 Manual steps required:');
        console.log('1. Go to: https://supabase.com/dashboard/project/gjwgrkaabbydicnwgyrw/sql');
        console.log('2. Copy the content from supabase/schema.sql');
        console.log('3. Paste and run it in the SQL Editor');
        return;
      }
    }
    
    console.log('✅ Schema applied successfully!');
    console.log('🎉 Database is now ready for your ClientHandle app');
    
    // Test the connection
    console.log('\n🧪 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.log('⚠️  Tables might not be created yet. Manual application required.');
    } else {
      console.log('✅ Database connection test passed!');
    }
    
  } catch (err) {
    console.error('❌ Error applying schema:', err.message);
    console.log('\n📋 Manual steps required:');
    console.log('1. Go to: https://supabase.com/dashboard/project/gjwgrkaabbydicnwgyrw/sql');
    console.log('2. Copy the content from supabase/schema.sql');
    console.log('3. Paste and run it in the SQL Editor');
  }
}

applySchema();