// Simple auth test
const { createBrowserClient } = require('@supabase/ssr')

const supabase = createBrowserClient(
  'https://gjwgrkaabbydicnwgyrw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqd2dya2FhYmJ5ZGljbndneXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0ODk0MzEsImV4cCI6MjA3MTA2NTQzMX0.54oFvkTIE-LJ4s1FQRQb4KDEJ2SE8AJcekjjyjrAokQ'
)

async function testAuth() {
  try {
    console.log('🧪 Testing Supabase connection...')
    
    // Test connection
    const { data: session } = await supabase.auth.getSession()
    console.log('Session:', session?.session ? 'exists' : 'none')
    
    // Test user table access
    const { data: users, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Database error:', error)
    } else {
      console.log('✅ Database accessible')
    }
    
  } catch (error) {
    console.error('❌ Auth test failed:', error)
  }
}

testAuth()