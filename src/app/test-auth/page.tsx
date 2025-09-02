'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestAuthPage() {
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('testpass123')
  const [result, setResult] = useState('')

  const testSignUp = async () => {
    try {
      setResult('Testing sign-up...')
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: 'Test User'
          }
        }
      })

      if (error) {
        setResult(`Sign-up error: ${error.message}`)
      } else {
        setResult(`Sign-up success: ${data.user?.email}`)
      }
    } catch (err: any) {
      setResult(`Exception: ${err.message}`)
    }
  }

  const testSignIn = async () => {
    try {
      setResult('Testing sign-in...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        setResult(`Sign-in error: ${error.message}`)
      } else {
        setResult(`Sign-in success: ${data.user?.email}`)
      }
    } catch (err: any) {
      setResult(`Exception: ${err.message}`)
    }
  }

  const testSession = async () => {
    try {
      setResult('Testing session...')
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        setResult(`Session error: ${error.message}`)
      } else {
        setResult(`Session: ${data.session ? data.session.user.email : 'none'}`)
      }
    } catch (err: any) {
      setResult(`Exception: ${err.message}`)
    }
  }

  const testSignOut = async () => {
    try {
      setResult('Testing sign-out...')
      const { error } = await supabase.auth.signOut()

      if (error) {
        setResult(`Sign-out error: ${error.message}`)
      } else {
        setResult('Sign-out success')
      }
    } catch (err: any) {
      setResult(`Exception: ${err.message}`)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Auth Test</h1>
        
        <div className="space-y-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-2 border rounded"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={testSignUp}
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Sign Up
          </button>
          <button 
            onClick={testSignIn}
            className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Sign In
          </button>
          <button 
            onClick={testSession}
            className="p-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Check Session
          </button>
          <button 
            onClick={testSignOut}
            className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Sign Out
          </button>
        </div>

        <div className="p-4 bg-gray-100 rounded-lg">
          <h3 className="font-bold">Result:</h3>
          <pre className="text-sm mt-2">{result}</pre>
        </div>
      </div>
    </div>
  )
}