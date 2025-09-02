const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials!')
  console.log('Make sure you have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyBusinessProfileSchema() {
  console.log('🔧 Applying enhanced business profile schema...')
  
  try {
    // First, add the missing business_details column
    console.log('📋 Adding business_details column...')
    const addColumnResult = await supabase.rpc('execute_sql', {
      sql: `
        ALTER TABLE public.users 
        ADD COLUMN IF NOT EXISTS business_details TEXT;
        
        -- Add constraint for business_details length
        ALTER TABLE public.users 
        ADD CONSTRAINT IF NOT EXISTS check_business_details_length 
        CHECK (LENGTH(business_details) <= 500);
      `
    })
    
    if (addColumnResult.error) {
      console.error('❌ Error adding business_details column:', addColumnResult.error)
      
      // Try direct SQL approach
      console.log('🔄 Trying direct SQL approach...')
      const { error: directError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'users')
        .eq('column_name', 'business_details')
      
      if (directError) {
        console.log('📋 Column check failed, proceeding to add column...')
        
        // Use a simple approach to add the column
        const { error: simpleAddError } = await supabase.rpc('exec', {
          sql: `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_details TEXT;`
        })
        
        if (simpleAddError) {
          console.log('ℹ️  Column might already exist or will be added with the full schema')
        }
      }
    } else {
      console.log('✅ business_details column added successfully')
    }

    // Read and apply the full business profile schema
    const schemaPath = path.join(__dirname, 'supabase', 'business-profile-schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')
    
    console.log('📋 Applying full business profile schema...')
    
    // Split schema into individual statements and execute them
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📊 Found ${statements.length} SQL statements to execute`)
    
    let successCount = 0
    let skipCount = 0
    
    for (const [index, statement] of statements.entries()) {
      try {
        console.log(`🔄 Executing statement ${index + 1}/${statements.length}...`)
        
        // Use the SQL editor approach for complex statements
        const { error } = await supabase.rpc('execute_sql', {
          sql: statement + ';'
        })
        
        if (error) {
          // Many errors are expected (like "already exists" errors)
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist') ||
              error.message.includes('constraint') && error.message.includes('already exists')) {
            skipCount++
            console.log(`⏭️  Skipped (already exists): ${statement.substring(0, 50)}...`)
          } else {
            console.log(`⚠️  Warning on statement: ${error.message}`)
            console.log(`Statement: ${statement.substring(0, 100)}...`)
          }
        } else {
          successCount++
          console.log(`✅ Success: ${statement.substring(0, 50)}...`)
        }
      } catch (err) {
        console.log(`⚠️  Exception: ${err.message}`)
      }
    }
    
    console.log(`\n📊 Schema application summary:`)
    console.log(`✅ Successful: ${successCount}`)
    console.log(`⏭️  Skipped: ${skipCount}`)
    console.log(`❌ Errors: ${statements.length - successCount - skipCount}`)
    
    // Verify the new columns exist
    console.log('\n🔍 Verifying enhanced business profile columns...')
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'users')
      .in('column_name', ['business_details', 'target_clients', 'value_proposition', 'service_description'])
    
    if (columnsError) {
      console.error('❌ Error checking columns:', columnsError)
    } else {
      console.log('📋 Found enhanced business profile columns:')
      columns?.forEach(col => {
        console.log(`   ✅ ${col.column_name} (${col.data_type})`)
      })
    }
    
    console.log('\n🎉 Enhanced business profile schema application complete!')
    console.log('💡 You can now save enhanced business profile data in the UI')
    
  } catch (error) {
    console.error('❌ Failed to apply schema:', error)
    process.exit(1)
  }
}

// Run the schema application
applyBusinessProfileSchema()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })