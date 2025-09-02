#!/usr/bin/env node

/**
 * Direct Database Fix Script using Supabase SDK
 * This script applies critical database fixes using individual operations
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createPlanLimitsData() {
  console.log('📋 Creating plan limits data...');

  const planLimits = [
    {
      plan: 'free',
      max_clients: 3,
      max_invoices_per_month: 5,
      max_ai_messages_per_month: 10,
      max_emails_per_month: 20,
      max_team_members: 1,
      can_use_ai_followups: true,
      can_use_custom_branding: false,
      can_use_automation: false,
      can_use_analytics: false,
      can_use_api: false,
      can_use_white_label: false,
      support_level: 'email',
      monthly_price_cents: 0,
      yearly_price_cents: 0
    },
    {
      plan: 'starter',
      max_clients: 10,
      max_invoices_per_month: 25,
      max_ai_messages_per_month: 50,
      max_emails_per_month: 100,
      max_team_members: 1,
      can_use_ai_followups: true,
      can_use_custom_branding: false,
      can_use_automation: false,
      can_use_analytics: false,
      can_use_api: false,
      can_use_white_label: false,
      support_level: 'email',
      monthly_price_cents: 2900,
      yearly_price_cents: 29000
    },
    {
      plan: 'professional',
      max_clients: 100,
      max_invoices_per_month: null,
      max_ai_messages_per_month: 200,
      max_emails_per_month: 500,
      max_team_members: 1,
      can_use_ai_followups: true,
      can_use_custom_branding: true,
      can_use_automation: true,
      can_use_analytics: true,
      can_use_api: false,
      can_use_white_label: false,
      support_level: 'priority',
      monthly_price_cents: 5900,
      yearly_price_cents: 59000
    },
    {
      plan: 'agency',
      max_clients: null,
      max_invoices_per_month: null,
      max_ai_messages_per_month: null,
      max_emails_per_month: null,
      max_team_members: 3,
      can_use_ai_followups: true,
      can_use_custom_branding: true,
      can_use_automation: true,
      can_use_analytics: true,
      can_use_api: true,
      can_use_white_label: true,
      support_level: 'phone',
      monthly_price_cents: 12900,
      yearly_price_cents: 129000
    }
  ];

  // Try to insert each plan individually
  let successCount = 0;
  let errorCount = 0;

  for (const plan of planLimits) {
    const { error } = await supabase
      .from('plan_limits')
      .upsert(plan, { 
        onConflict: 'plan',
        ignoreDuplicates: false 
      });

    if (error) {
      console.log(`⚠️  Error creating ${plan.plan} plan:`, error.message);
      errorCount++;
    } else {
      console.log(`✅ Created/updated ${plan.plan} plan`);
      successCount++;
    }
  }

  console.log(`📊 Plan limits: ${successCount} success, ${errorCount} errors\n`);
  return { successCount, errorCount };
}

async function testDatabaseHealth() {
  console.log('🩺 Testing database health...\n');

  // Test 1: Check tables exist
  const tables = ['users', 'clients', 'invoices', 'messages', 'plan_limits', 'usage_tracking'];
  
  for (const tableName of tables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ Table '${tableName}':`, error.message);
      } else {
        console.log(`✅ Table '${tableName}': accessible`);
      }
    } catch (err) {
      console.log(`❌ Table '${tableName}':`, err.message);
    }
  }

  // Test 2: Check plan limits specifically
  console.log('\n📋 Testing plan limits...');
  const { data: plans, error: planError } = await supabase
    .from('plan_limits')
    .select('plan, monthly_price_cents, max_clients');

  if (planError) {
    console.log('❌ Plan limits error:', planError.message);
  } else {
    console.log(`✅ Plan limits working: ${plans?.length || 0} plans found`);
    if (plans && plans.length > 0) {
      plans.forEach(plan => {
        console.log(`   - ${plan.plan}: $${plan.monthly_price_cents/100}/month, ${plan.max_clients || '∞'} clients`);
      });
    }
  }

  return true;
}

async function createMissingDatabaseFunctions() {
  console.log('🔧 Attempting to create missing database functions...\n');

  // Unfortunately, we can't create functions directly through the Supabase client
  // These would need to be created through the Supabase dashboard or CLI
  
  console.log('⚠️  Database functions need to be created manually:');
  console.log('   1. Go to Supabase Dashboard > SQL Editor');
  console.log('   2. Run the fix-production-database.sql file');
  console.log('   3. Or use Supabase CLI: supabase db push');
  
  return false;
}

async function main() {
  console.log('🚀 ClientHandle Direct Database Fix Tool\n');
  
  console.log('📍 Using Supabase URL:', supabaseUrl);
  console.log('🔑 Service key:', supabaseServiceKey ? 'Present' : 'Missing');
  console.log('');

  try {
    // Test current database state
    await testDatabaseHealth();
    console.log('');

    // Try to create plan limits data
    await createPlanLimitsData();

    // Test again after attempts
    console.log('🔄 Re-testing after fixes...');
    await testDatabaseHealth();

    console.log('\n✨ Database fix attempt completed!');
    console.log('\n📝 Manual steps still needed:');
    console.log('   1. Apply the SQL functions manually through Supabase dashboard');
    console.log('   2. Check that all tables have proper Row Level Security');
    console.log('   3. Verify authentication triggers are working');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createPlanLimitsData, testDatabaseHealth };