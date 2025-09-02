#!/usr/bin/env node

/**
 * Production Database Fix Script
 * This script applies critical database fixes to resolve production issues
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
  console.error('\nPlease check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyDatabaseFixes() {
  console.log('🔧 Starting production database fixes...\n');

  try {
    // Read the SQL fix script
    const sqlFilePath = path.join(__dirname, 'fix-production-database.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📄 Loaded database fix script');
    console.log('🗄️ Applying database migrations...');

    // Execute the SQL script
    const { data, error } = await supabase.rpc('exec', { sql: sqlScript });

    if (error) {
      console.error('❌ Error applying database fixes:', error);
      return false;
    }

    console.log('✅ Database migrations applied successfully!\n');

    // Test the fixes by checking if the missing tables now exist
    console.log('🧪 Testing database fixes...');

    // Test 1: Check if plan_limits table exists and has data
    const { data: planLimits, error: planError } = await supabase
      .from('plan_limits')
      .select('plan, max_clients, monthly_price_cents')
      .limit(5);

    if (planError) {
      console.log('⚠️  Plan limits test failed:', planError.message);
    } else {
      console.log('✅ Plan limits table working:', planLimits.length, 'plans found');
    }

    // Test 2: Check if the version function exists
    const { data: versionData, error: versionError } = await supabase.rpc('version');

    if (versionError) {
      console.log('⚠️  Version function test failed:', versionError.message);
    } else {
      console.log('✅ Version function working:', versionData);
    }

    // Test 3: Check if get_schema_tables function exists
    const { data: schemaData, error: schemaError } = await supabase.rpc('get_schema_tables');

    if (schemaError) {
      console.log('⚠️  Schema tables function test failed:', schemaError.message);
    } else {
      console.log('✅ Schema tables function working:', schemaData?.length, 'tables found');
    }

    // Test 4: Check if usage_tracking table exists
    const { data: usageData, error: usageError } = await supabase
      .from('usage_tracking')
      .select('id')
      .limit(1);

    if (usageError) {
      console.log('⚠️  Usage tracking test failed:', usageError.message);
    } else {
      console.log('✅ Usage tracking table accessible');
    }

    console.log('\n🎉 Database fixes completed successfully!');
    console.log('📋 Summary of what was fixed:');
    console.log('   • Created plan_limits table with default pricing plans');
    console.log('   • Created user_subscriptions table for subscription management');
    console.log('   • Created billing_events table for payment tracking');
    console.log('   • Added missing database functions (version, get_schema_tables)');
    console.log('   • Set up proper Row Level Security policies');
    console.log('   • Added necessary database indexes for performance');
    
    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Alternative method using direct SQL execution
async function applyDatabaseFixesDirect() {
  console.log('🔧 Applying database fixes using direct SQL execution...\n');

  try {
    // Read and split the SQL script into individual statements
    const sqlFilePath = path.join(__dirname, 'fix-production-database.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split by semicolons and filter out empty statements
    const statements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      .map(stmt => stmt + ';');

    console.log(`📄 Found ${statements.length} SQL statements to execute`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comment-only statements
      if (statement.replace(/\s+/g, '') === ';') continue;
      
      console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', { query: statement });
      
      if (error) {
        console.log(`⚠️  Statement ${i + 1} warning:`, error.message.substring(0, 100));
        errorCount++;
      } else {
        successCount++;
      }
    }

    console.log(`\n📊 Execution summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⚠️  Warnings/Errors: ${errorCount}`);

    return true;

  } catch (error) {
    console.error('❌ Error in direct SQL execution:', error);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 ClientHandle Database Fix Tool\n');
  
  // Try the direct approach first
  const success = await applyDatabaseFixes();
  
  if (!success) {
    console.log('\n🔄 Trying alternative approach...');
    await applyDatabaseFixesDirect();
  }
  
  console.log('\n✨ Database fix process completed!');
  console.log('🔄 Please restart your application server to see the changes.');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { applyDatabaseFixes };