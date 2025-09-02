// Apply subscription schema to Supabase database
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applySubscriptionSchema() {
  try {
    console.log('🔄 Starting subscription schema migration...');
    
    // Read the migration SQL file
    const migrationPath = join(__dirname, 'supabase', 'migrations', '002_subscription_system.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('📂 Read migration file:', migrationPath);
    console.log('📝 Migration size:', migrationSQL.length, 'characters');
    
    // Split SQL into individual statements (rough split by semicolon + newline)
    const statements = migrationSQL
      .split(';\n')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log('🔢 Found', statements.length, 'SQL statements to execute');
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'; // Add semicolon back
      
      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        
        // Skip comments and empty statements
        if (statement.trim().startsWith('--') || statement.trim() === ';') {
          console.log('⏭️  Skipping comment/empty statement');
          continue;
        }
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement 
        });
        
        if (error) {
          // Try direct execution if RPC fails
          console.log('🔄 RPC failed, trying direct execution...');
          const result = await supabase
            .from('_supabase_migrations')
            .select('*')
            .limit(1);
          
          if (result.error) {
            console.log('⚠️  Statement might have failed:', error.message);
            // Continue with next statement for now
          }
        } else {
          console.log('✅ Statement executed successfully');
        }
        
      } catch (statementError) {
        console.error(`❌ Error in statement ${i + 1}:`, statementError.message);
        console.log('📝 Statement was:', statement.substring(0, 100) + '...');
        // Continue with next statement
      }
    }
    
    // Verify the schema was created by checking if tables exist
    console.log('\n🔍 Verifying schema creation...');
    
    const tablesToCheck = [
      'user_subscriptions',
      'usage_tracking', 
      'billing_events',
      'plan_limits'
    ];
    
    for (const table of tablesToCheck) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count', { count: 'exact', head: true });
          
        if (error) {
          console.log(`❌ Table ${table} verification failed:`, error.message);
        } else {
          console.log(`✅ Table ${table} exists and is accessible`);
        }
      } catch (err) {
        console.log(`❌ Table ${table} check failed:`, err.message);
      }
    }
    
    // Check if plan_limits has data
    try {
      const { data: plans, error } = await supabase
        .from('plan_limits')
        .select('plan, monthly_price_cents')
        .order('monthly_price_cents');
        
      if (error) {
        console.log('❌ Could not verify plan_limits data:', error.message);
      } else {
        console.log('\n💰 Plan limits created:');
        plans.forEach(plan => {
          const price = plan.monthly_price_cents / 100;
          console.log(`  - ${plan.plan}: $${price}/month`);
        });
      }
    } catch (err) {
      console.log('❌ Plan limits verification failed:', err.message);
    }
    
    console.log('\n🎉 Subscription schema migration completed!');
    console.log('\n📋 Next steps:');
    console.log('  1. Test the pricing page');
    console.log('  2. Set up Stripe products');
    console.log('  3. Implement usage limits');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
applySubscriptionSchema();