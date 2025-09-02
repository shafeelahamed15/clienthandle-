'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export function AuthDebug() {
  const { user, profile, loading } = useAuth()
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
        
        setDebugInfo({
          session: session ? 'exists' : 'none',
          sessionError: error?.message,
          currentUser: currentUser ? 'exists' : 'none',
          userError: userError?.message,
          contextUser: user ? 'exists' : 'none',
          contextProfile: profile ? 'exists' : 'none',
          contextLoading: loading,
        })
      } catch (err: any) {
        setDebugInfo({ error: err.message })
      }
    }

    checkAuth()
  }, [user, profile, loading])

  if (process.env.NODE_ENV === 'production') return null

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs font-mono max-w-sm">
      <h3 className="text-yellow-400 font-bold mb-2">Auth Debug</h3>
      <pre className="text-xs">{JSON.stringify(debugInfo, null, 2)}</pre>
    </div>
  )
}