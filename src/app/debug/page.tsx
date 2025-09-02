'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function DebugPage() {
  const [supabaseUrl, setSupabaseUrl] = useState('')
  const [supabaseKey, setSupabaseKey] = useState('')
  const [connectionTest, setConnectionTest] = useState('')
  const { user, profile, loading } = useAuth()

  useEffect(() => {
    setSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || 'not set')
    setSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'not set')
    
    // Test basic connection
    const testConnection = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('count')
          .limit(1)
        
        if (error) {
          setConnectionTest(`Error: ${error.message}`)
        } else {
          setConnectionTest('✅ Database connection OK')
        }
      } catch (err: any) {
        setConnectionTest(`Exception: ${err.message}`)
      }
    }
    
    testConnection()
  }, [])

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Debug Information</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Environment</h2>
            <div className="space-y-2 text-sm">
              <div><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</div>
              <div><strong>Supabase URL:</strong> {supabaseUrl}</div>
              <div><strong>Supabase Key:</strong> {supabaseKey}</div>
              <div><strong>Connection Test:</strong> {connectionTest}</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Auth Context</h2>
            <div className="space-y-2 text-sm">
              <div><strong>Loading:</strong> {loading.toString()}</div>
              <div><strong>User:</strong> {user ? user.email : 'null'}</div>
              <div><strong>Profile:</strong> {profile ? profile.display_name : 'null'}</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Full Auth State:</h3>
          <pre className="text-xs overflow-auto">
            {JSON.stringify({ 
              loading, 
              user: user ? { id: user.id, email: user.email } : null,
              profile: profile ? { id: profile.id, display_name: profile.display_name } : null
            }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}