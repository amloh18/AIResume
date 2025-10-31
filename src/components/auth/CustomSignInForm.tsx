'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCustomAuth } from '@/contexts/CustomAuthContext'

interface SignInFormData {
  email: string
  password: string
}

export default function CustomSignInForm() {
  const [formData, setFormData] = useState<SignInFormData>({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const { signIn } = useCustomAuth()
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const result = await signIn(formData.email, formData.password)
      
      if (result.success) {
        setSuccess('Sign in successful! Redirecting...')
        setTimeout(() => {
          router.push('/dashboard')
        }, 1000)
      } else {
        setError(result.error || 'Sign in failed')
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#141810] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            Sign In
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            Access your account
          </p>
        </div>
        
        <div className="rounded-lg border text-card-foreground shadow-sm bg-gray-800 border-gray-700">
          <div className="flex flex-col space-y-1.5 p-6">
            <div className="text-2xl font-semibold leading-none tracking-tight text-white">
              User Access
            </div>
            <div className="text-sm text-gray-300">
              Enter your credentials to access your account
            </div>
          </div>
          
          <div className="p-6 pt-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-white" htmlFor="email">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="user@cvcircle.io"
                    className="flex h-10 w-full rounded-md px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground outline-none focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 mt-1 bg-gray-700 border border-[#80FF00]/50 text-white placeholder-gray-400 focus:border-2 focus:border-[#80FF00] transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-white" htmlFor="password">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Enter your password"
                    className="flex h-10 w-full rounded-md px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground outline-none focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 mt-1 bg-gray-700 border border-[#80FF00]/50 text-white placeholder-gray-400 focus:border-2 focus:border-[#80FF00] transition-all duration-200"
                  />
                </div>
              </div>
              
              {error && (
                <div className="text-red-400 text-sm text-center">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="text-green-400 text-sm text-center">
                  {success}
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-300">
                Test credentials: <br />
                <span className="text-blue-400">user@cvcircle.io</span> / <span className="text-blue-400">user123</span>
              </p>
              <p className="text-sm text-gray-300 mt-2">
                Admin access? <a href="/admin/signin" className="font-medium text-red-400 hover:text-red-300">Admin sign in</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
