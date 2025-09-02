// Direct test of Supabase database connection
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

// Load environment variables
dotenv.config({ path: '.env.local' })

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase database connection...')
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    console.log('📡 Attempting to connect to database...')
    
    // Simple query to test connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Database connection failed:', error.message)
      console.error('Error details:', JSON.stringify(error, null, 2))
    } else {
      console.log('✅ Database connection successful!')
      console.log('Query result:', data)
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message)
    
    if (error.message.includes('Could not find host')) {
      console.log('🔧 This appears to be the Cloudflare host resolution issue')
      console.log('🚨 The Supabase project might need to be recreated or the URL updated')
    }
  }
}

testSupabaseConnection()