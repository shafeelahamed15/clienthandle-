import { supabase } from './supabase'

export interface UserProfile {
  id: string
  email: string
  display_name: string
  plan: 'free' | 'pro'
  mfa_enabled: boolean
  brand_logo_url?: string
  brand_accent_color?: string
  created_at: string
  updated_at: string
}

// Get current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

// Sign in with email/password
export const signIn = async (email: string, password: string) => {
  console.log('🔐 Attempting sign-in for:', email)
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) {
    console.error('❌ Sign-in error:', error)
    throw error
  }
  
  console.log('✅ Sign-in successful:', {
    hasUser: !!data.user,
    hasSession: !!data.session,
    userId: data.user?.id,
    userEmail: data.user?.email
  })
  
  return data
}

// Sign up with email/password
export const signUp = async (email: string, password: string, displayName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  })
  if (error) throw error
  return data
}

// Sign in with Google
export const signInWithGoogle = async () => {
  console.log('🔗 Starting Google OAuth sign-in...')
  
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  
  if (error) {
    console.error('❌ Google OAuth error:', error)
    throw error
  }
  
  console.log('✅ Google OAuth redirect initiated')
}

// Sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Get user profile
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error && error.code === 'PGRST116') {
      // Profile doesn't exist, create it
      const user = await getCurrentUser()
      if (!user) return null

      const displayName = user.user_metadata?.display_name || 
                         user.user_metadata?.full_name || 
                         user.email?.split('@')[0] || 
                         'User'

      try {
        const { data: newProfile, error: createError } = await supabase
          .from('users')
          .insert([{
            id: userId,
            email: user.email!,
            display_name: displayName,
            plan: 'free' as const,
            mfa_enabled: false,
            brand_accent_color: '#0A84FF'
          }])
          .select()
          .single()

        if (createError) {
          console.warn('❌ Failed to create user profile:', createError)
          // Return fallback profile if database table doesn't exist
          return createFallbackProfile(user)
        }
        return newProfile
      } catch (createError) {
        console.warn('❌ Failed to create user profile, using fallback:', createError)
        const user = await getCurrentUser()
        return user ? createFallbackProfile(user) : null
      }
    }

    if (error) {
      console.warn('❌ Database error getting user profile, using fallback:', error)
      // If users table doesn't exist, return fallback profile
      if (error.message?.includes('Could not find the table') || 
          error.message?.includes('relation "public.users" does not exist')) {
        const user = await getCurrentUser()
        return user ? createFallbackProfile(user) : null
      }
      throw error
    }
    
    return data
  } catch (error) {
    console.warn('❌ Error in getUserProfile, using fallback:', error)
    // Last resort: create fallback profile
    const user = await getCurrentUser()
    return user ? createFallbackProfile(user) : null
  }
}

// Create fallback profile when database is not available
function createFallbackProfile(user: any): UserProfile {
  const displayName = user.user_metadata?.display_name || 
                     user.user_metadata?.full_name || 
                     user.email?.split('@')[0] || 
                     'User'

  return {
    id: user.id,
    email: user.email,
    display_name: displayName,
    plan: 'free' as const,
    mfa_enabled: false,
    brand_accent_color: '#0A84FF',
    created_at: user.created_at || new Date().toISOString(),
    updated_at: user.updated_at || new Date().toISOString()
  }
}

// Update user profile
export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
  try {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
    
    if (error) {
      console.warn('❌ Failed to update user profile:', error)
      // If users table doesn't exist, just log and continue
      if (error.message?.includes('Could not find the table') || 
          error.message?.includes('relation "public.users" does not exist')) {
        console.log('⚠️  Users table not found, skipping profile update')
        return
      }
      throw error
    }
  } catch (error) {
    console.warn('❌ Error updating user profile:', error)
    // Don't throw error for table not found - allow app to continue
  }
}

// For backward compatibility
export const signOutUser = signOut