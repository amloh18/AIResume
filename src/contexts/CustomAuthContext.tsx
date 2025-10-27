'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@/lib/custom-auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const CustomAuthContext = createContext<AuthContextType | undefined>(undefined)

export function CustomAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/custom-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success) {
        setUser(data.user)
        return { success: true }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      console.error('Sign in error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  const signOut = async () => {
    try {
      await fetch('/api/auth/custom-logout', {
        method: 'POST',
      })
      setUser(null)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const refreshSession = async () => {
    try {
      const response = await fetch('/api/auth/custom-session')
      const data = await response.json()

      if (data.success) {
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Session refresh error:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshSession()
  }, [])

  return (
    <CustomAuthContext.Provider value={{ user, loading, signIn, signOut, refreshSession }}>
      {children}
    </CustomAuthContext.Provider>
  )
}

export function useCustomAuth() {
  const context = useContext(CustomAuthContext)
  if (context === undefined) {
    throw new Error('useCustomAuth must be used within a CustomAuthProvider')
  }
  return context
}
