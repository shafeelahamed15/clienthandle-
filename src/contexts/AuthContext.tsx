'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { UserProfile, getUserProfile } from '@/lib/auth'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let initialCheckComplete = false

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔍 Getting initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Error getting initial session:', error)
        }
        
        if (!mounted) return

        console.log('📋 Initial session result:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          userEmail: session?.user?.email
        })

        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('👤 Loading profile for user:', session.user.email)
          try {
            const userProfile = await getUserProfile(session.user.id)
            if (mounted) {
              setProfile(userProfile)
              console.log('✅ Profile loaded:', userProfile?.display_name)
            }
          } catch (error) {
            console.error('❌ Failed to get initial user profile:', error)
            if (mounted) setProfile(null)
          }
        } else {
          console.log('👤 No user session found')
          if (mounted) setProfile(null)
        }
        
        initialCheckComplete = true
        if (mounted) setLoading(false)
      } catch (error) {
        console.error('❌ Error in getInitialSession:', error)
        initialCheckComplete = true
        if (mounted) setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, {
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email,
          initialCheckComplete
        })
        
        if (!mounted) return

        // Don't process INITIAL_SESSION if we already handled it
        if (event === 'INITIAL_SESSION' && initialCheckComplete) {
          console.log('⏭️ Skipping INITIAL_SESSION (already processed)')
          return
        }
        
        // For SIGNED_IN event, ensure we process it even if initial check is complete
        if (event === 'SIGNED_IN') {
          console.log('✅ Processing SIGNED_IN event')
        }

        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('👤 Loading profile for auth change:', session.user.email)
          try {
            const userProfile = await getUserProfile(session.user.id)
            if (mounted) {
              setProfile(userProfile)
              console.log('✅ Profile loaded for auth change:', userProfile?.display_name)
            }
          } catch (error) {
            console.error('❌ Failed to get user profile on auth change:', error)
            if (mounted) setProfile(null)
          }
        } else {
          console.log('👤 No user in auth change')
          if (mounted) setProfile(null)
        }
        
        // Set loading to false after processing auth state change
        if (mounted) {
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = {
    user,
    profile,
    loading,
    signOut: handleSignOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}