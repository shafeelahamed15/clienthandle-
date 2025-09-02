const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  console.log('🔍 Checking database schema...\n');
  
  const tables = ['users', 'clients', 'invoices', 'messages', 'reminders'];
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: EXISTS (${count || 0} rows)`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }
  
  // Check if custom types exist by trying to query
  console.log('\n🔍 Checking custom types...');
  
  try {
    const { data, error } = await supabase
      .from('pg_type')
      .select('typname')
      .in('typname', ['user_plan', 'invoice_status', 'message_type']);
    
    if (error) {
      console.log(`❌ Custom types: Cannot query pg_type (${error.message})`);
    } else {
      console.log(`✅ Custom types found: ${data.map(t => t.typname).join(', ')}`);
    }
  } catch (err) {
    console.log(`❌ Custom types: ${err.message}`);
  }
}

checkSchema().catch(console.error);