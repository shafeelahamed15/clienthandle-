// Test if business profile columns exist in database
const { createClient } = require('@supabase/supabase-js')

console.log('🔍 Testing database connection and business profile columns...')

// Try to read environment variables from .env.local
try {
  require('dotenv').config({ path: '.env.local' })
} catch (e) {
  console.log('📝 No dotenv found, using environment variables')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('❌ Environment variables missing:')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseAnonKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testDatabaseColumns() {
  try {
    console.log('🔗 Connected to Supabase successfully')
    
    // Test 1: Check if we can query the users table structure
    console.log('\n📋 Test 1: Checking users table columns...')
    
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'users')
      .in('column_name', [
        'business_name', 
        'service_description', 
        'business_details', 
        'target_clients', 
        'value_proposition', 
        'communication_style'
      ])
    
    if (columnsError) {
      console.error('❌ Error checking columns:', columnsError.message)
    } else {
      console.log('✅ Found columns:')
      columns?.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`)
      })
      
      const requiredColumns = ['business_details', 'target_clients', 'value_proposition']
      const missingColumns = requiredColumns.filter(req => 
        !columns?.find(col => col.column_name === req)
      )
      
      if (missingColumns.length > 0) {
        console.log(`❌ Missing columns: ${missingColumns.join(', ')}`)
      } else {
        console.log('✅ All required business profile columns exist!')
      }
    }
    
    // Test 2: Try a simple insert/update operation
    console.log('\n📋 Test 2: Testing database permissions...')
    
    const { data: authData, error: authError } = await supabase.auth.getSession()
    
    if (authError || !authData.session) {
      console.log('⚠️  No authenticated session (expected for direct test)')
      console.log('💡 This test requires you to be signed in to the app')
    } else {
      console.log('✅ User authenticated:', authData.session.user.email)
      
      // Try to read user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, business_name, service_description, business_details, target_clients, value_proposition')
        .eq('id', authData.session.user.id)
        .single()
      
      if (userError) {
        console.log('❌ Error reading user profile:', userError.message)
        console.log('   Code:', userError.code)
        console.log('   Details:', userError.details)
      } else {
        console.log('✅ Successfully read user profile')
        console.log('   Columns available:', Object.keys(userData || {}))
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testDatabaseColumns().then(() => {
  console.log('\n🏁 Database column test complete')
  process.exit(0)
}).catch(error => {
  console.error('❌ Test script error:', error)
  process.exit(1)
})