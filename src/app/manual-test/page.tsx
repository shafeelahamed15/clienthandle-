'use client'

import { useState } from 'react'
import { signIn, signUp } from '@/lib/auth'
import { useAuth } from '@/contexts/AuthContext'

export default function ManualTestPage() {
  const { user, profile, loading } = useAuth()
  const [email, setEmail] = useState('shafeelahamed15@gmail.com') // Use confirmed user
  const [password, setPassword] = useState('')
  const [result, setResult] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSignIn = async () => {
    setIsLoading(true)
    setResult('Attempting to sign in...')
    
    try {
      const data = await signIn(email, password)
      setResult(`Success! User: ${data.user?.email}`)
    } catch (error: any) {
      setResult(`Error: ${error.message}`)
    }
    
    setIsLoading(false)
  }

  const handleSignUp = async () => {
    setIsLoading(true)
    setResult('Attempting to sign up...')
    
    try {
      const data = await signUp(email, password, 'Test User')
      setResult(`Success! User: ${data.user?.email}. Check email for confirmation.`)
    } catch (error: any) {
      setResult(`Error: ${error.message}`)
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Manual Auth Test</h1>
        
        <div className="bg-blue-100 p-4 rounded">
          <h2 className="font-bold">Current Auth State:</h2>
          <p>Loading: {loading.toString()}</p>
          <p>User: {user?.email || 'null'}</p>
          <p>Profile: {profile?.display_name || 'null'}</p>
        </div>

        <div className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-3 border rounded"
          />
          
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full p-3 border rounded"
          />

          <div className="flex gap-2">
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="flex-1 p-3 bg-blue-500 text-white rounded disabled:bg-gray-400"
            >
              Sign In
            </button>
            
            <button
              onClick={handleSignUp}
              disabled={isLoading}
              className="flex-1 p-3 bg-green-500 text-white rounded disabled:bg-gray-400"
            >
              Sign Up
            </button>
          </div>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-bold">Result:</h3>
          <p className="mt-2 text-sm">{result}</p>
        </div>

        <div className="text-sm text-gray-600">
          <p><strong>Test Users Available:</strong></p>
          <p>• shafeelahamed15@gmail.com (confirmed)</p>
          <p>• igniteindustrialcorporation@gmail.com (confirmed)</p>
          <p>• ashafeel304@gmail.com (unconfirmed)</p>
        </div>
      </div>
    </div>
  )
}