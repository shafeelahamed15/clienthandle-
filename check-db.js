// Check database directly
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://gjwgrkaabbydicnwgyrw.supabase.co',
  'sb_secret_CxPJL2AHN9U9yyB2R_7OZw_MZA8iWbI', // service role key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function checkDatabase() {
  try {
    console.log('🔍 Checking auth.users...')
    
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError)
    } else {
      console.log(`✅ Found ${authUsers.users.length} auth users`)
      authUsers.users.forEach(user => {
        console.log(`  - ${user.email} (${user.email_confirmed_at ? 'confirmed' : 'unconfirmed'})`)
      })
    }
    
    console.log('\n🔍 Checking public.users...')
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('id, email, display_name')
    
    if (publicError) {
      console.error('❌ Error fetching public users:', publicError)
    } else {
      console.log(`✅ Found ${publicUsers.length} public users`)
      publicUsers.forEach(user => {
        console.log(`  - ${user.email} (${user.display_name})`)
      })
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error)
  }
}

checkDatabase()