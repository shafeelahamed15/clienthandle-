// Test signing in with confirmed user
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

async function testConfirmedSignIn() {
  try {
    console.log('🧪 Testing sign-in with confirmed user...')
    
    // Try to sign in as admin (this uses service role, just to test)
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.createSession({
      email: 'shafeelahamed15@gmail.com'
    })
    
    if (sessionError) {
      console.error('❌ Session creation failed:', sessionError)
    } else {
      console.log('✅ Session created for:', sessionData.user.email)
    }
    
    // Check auth settings
    console.log('\n🔍 Checking auth settings...')
    const { data: settings, error: settingsError } = await supabase.auth.admin.getSettings()
    
    if (settingsError) {
      console.error('❌ Settings error:', settingsError)
    } else {
      console.log('Auth settings:')
      console.log('  - Email confirmation required:', !settings.disable_signup)
      console.log('  - External providers:', Object.keys(settings.external || {}))
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testConfirmedSignIn()