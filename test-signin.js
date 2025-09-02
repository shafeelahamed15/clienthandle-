// Simple sign-in test
const { createBrowserClient } = require('@supabase/ssr')

const supabase = createBrowserClient(
  'https://gjwgrkaabbydicnwgyrw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqd2dya2FhYmJ5ZGljbndneXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0ODk0MzEsImV4cCI6MjA3MTA2NTQzMX0.54oFvkTIE-LJ4s1FQRQb4KDEJ2SE8AJcekjjyjrAokQ'
)

async function testSignIn() {
  try {
    console.log('🧪 Testing sign-in...')
    
    // Try to sign up a test user first
    console.log('Creating test user...')
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'testpass123',
      options: {
        data: {
          display_name: 'Test User'
        }
      }
    })
    
    if (signUpError && signUpError.message.includes('already registered')) {
      console.log('User already exists, trying to sign in...')
      
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'testpass123'
      })
      
      if (signInError) {
        console.error('❌ Sign-in failed:', signInError)
      } else {
        console.log('✅ Sign-in successful:', signInData.user?.email)
      }
    } else if (signUpError) {
      console.error('❌ Sign-up failed:', signUpError)
    } else {
      console.log('✅ Sign-up successful:', signUpData.user?.email)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testSignIn()