const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function applySchemaViaAPI() {
  try {
    console.log('🚀 Applying schema via Supabase REST API...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '001_followup_system_enhancement.sql');
    const schema = fs.readFileSync(migrationPath, 'utf8');
    
    // Split schema into individual statements (safer approach)
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📄 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement via curl to the PostgREST API
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < Math.min(5, statements.length); i++) {
      const stmt = statements[i];
      if (stmt.toLowerCase().includes('create type') || 
          stmt.toLowerCase().includes('drop type') ||
          stmt.toLowerCase().includes('create table')) {
        console.log(`Executing statement ${i + 1}: ${stmt.substring(0, 60)}...`);
        
        try {
          // Use fetch to execute the SQL
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
              'apikey': serviceRoleKey
            },
            body: JSON.stringify({ query: stmt })
          });
          
          if (response.ok) {
            successCount++;
            console.log(`✅ Statement ${i + 1} executed successfully`);
          } else {
            errorCount++;
            const error = await response.text();
            console.log(`❌ Statement ${i + 1} failed:`, error);
          }
        } catch (err) {
          errorCount++;
          console.log(`❌ Statement ${i + 1} error:`, err.message);
        }
      }
    }
    
    console.log(`\n📊 Results: ${successCount} successful, ${errorCount} failed`);
    
    if (errorCount > 0) {
      console.log('\n📋 Manual application required:');
      console.log('1. Go to: https://supabase.com/dashboard/project/gjwgrkaabbydicnwgyrw/sql');
      console.log('2. Copy the content from supabase/schema.sql');
      console.log('3. Paste and run it in the SQL Editor');
      console.log('4. This will create all tables, policies, and triggers');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\n📋 Please apply schema manually:');
    console.log('1. Go to: https://supabase.com/dashboard/project/gjwgrkaabbydicnwgyrw/sql');
    console.log('2. Copy the content from supabase/schema.sql');
    console.log('3. Paste and run it in the SQL Editor');
  }
}

// Alternative: Just provide the manual instructions
console.log('🎯 Database Schema Application Required');
console.log('=====================================');
console.log('');
console.log('Since automated schema application has limitations,');
console.log('please follow these steps to complete the setup:');
console.log('');
console.log('📋 Manual Steps:');
console.log('1. Open: https://supabase.com/dashboard/project/gjwgrkaabbydicnwgyrw/sql');
console.log('2. Open the file: supabase/migrations/001_followup_system_enhancement.sql in your project');
console.log('3. Copy ALL content from 001_followup_system_enhancement.sql');
console.log('4. Paste it into the Supabase SQL Editor');
console.log('5. Click "Run" to execute the schema');
console.log('');
console.log('✨ What this creates:');
console.log('• Enhanced followup system with angle and tone enums');
console.log('• Followup sequences table for campaign management');
console.log('• Enhanced followup_queue with retry logic and metadata');
console.log('• Enhanced messages table with tracking and channel data');
console.log('• Enhanced clients table with engagement scoring');
console.log('• Performance indexes and RLS policies');
console.log('');
console.log('🕒 Estimated time: 2-3 minutes');
console.log('');
console.log('After completion, your app will be fully functional!');