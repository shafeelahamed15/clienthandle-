import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            const response = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
            return response
          },
        },
      }
    )
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      console.log('✅ OAuth successful for user:', data.user.email)
      
      // Create response with cookies set
      const response = NextResponse.redirect(`${origin}${next}`)
      
      // Ensure session cookies are properly set
      const supabaseResponse = await supabase.auth.getSession()
      if (supabaseResponse.data.session) {
        console.log('✅ Session confirmed in callback:', supabaseResponse.data.session.user.email)
      }
      
      return response
    }
    
    console.error('❌ OAuth callback error:', error)
  }

  // Return to error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}