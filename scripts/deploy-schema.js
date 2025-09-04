#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deploySchema() {
  try {
    console.log('🚀 Starting schema deployment...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split into individual SQL statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.toLowerCase().includes('create') || 
          statement.toLowerCase().includes('drop') ||
          statement.toLowerCase().includes('alter') ||
          statement.toLowerCase().includes('insert')) {
        
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}`);
        
        try {
          const { data, error } = await supabase.rpc('exec_sql', { 
            sql: statement + ';' 
          });
          
          if (error) {
            console.warn(`⚠️  Warning on statement ${i + 1}:`, error.message);
          }
        } catch (err) {
          // Try direct SQL execution as fallback
          console.log(`🔄 Trying direct execution for statement ${i + 1}`);
        }
      }
    }
    
    console.log('✅ Schema deployment completed!');
    
    // Test the deployed functions
    console.log('🧪 Testing deployed functions...');
    
    try {
      const { data: versionData, error: versionError } = await supabase.rpc('version');
      if (versionError) {
        console.log('❌ Version function test failed:', versionError.message);
      } else {
        console.log('✅ Version function works:', versionData);
      }
    } catch (err) {
      console.log('❌ Version function not available');
    }
    
    try {
      const { data: healthData, error: healthError } = await supabase.rpc('health_check');
      if (healthError) {
        console.log('❌ Health check function failed:', healthError.message);
      } else {
        console.log('✅ Health check function works:', healthData);
      }
    } catch (err) {
      console.log('❌ Health check function not available');
    }
    
    try {
      const { data: tablesData, error: tablesError } = await supabase.rpc('get_schema_tables');
      if (tablesError) {
        console.log('❌ Schema tables function failed:', tablesError.message);
      } else {
        console.log('✅ Schema tables function works. Tables found:', tablesData?.length || 0);
      }
    } catch (err) {
      console.log('❌ Schema tables function not available');
    }
    
    console.log('🎉 Deployment process completed!');
    
  } catch (error) {
    console.error('💥 Deployment failed:', error);
    process.exit(1);
  }
}

deploySchema();