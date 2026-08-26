'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'

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
      // Use NextAuth credentials provider
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error === 'CredentialsSignin' ? 'Invalid email or password' : result.error)
      } else if (result?.ok) {
        setSuccess('Sign in successful! Redirecting...')
        setTimeout(() => {
          router.push('/dashboard')
        }, 1000)
      } else {
        setError('Authentication failed. Please try again.')
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#141810] py-12 px-4 tablet:px-6 desktop:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-h1 font-extrabold text-white">
            Sign In
          </h2>
          <p className="mt-2 text-small text-gray-300">
            Access your account
          </p>
        </div>
        
        <div className="rounded-none border text-card-foreground shadow-sm bg-gray-800 border-gray-700">
          <div className="flex flex-col space-y-1.5 p-6">
            <div className="text-h2 font-semibold leading-none tracking-tight text-white">
              User Access
            </div>
            <div className="text-small text-gray-300">
              Enter your credentials to access your account
            </div>
          </div>
          
          <div className="p-6 pt-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-small font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-white" htmlFor="email">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="user@buildairesume.com"
                    className="flex h-10 w-full rounded-none px-3 py-2 text-small file:border-0 file:bg-transparent file:text-small file:font-medium placeholder:text-muted-foreground outline-none focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 mt-1 bg-gray-700 border border-[#013f2e]/50 text-white placeholder-gray-400 focus:border-2 focus:border-[#013f2e] transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="text-small font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-white" htmlFor="password">
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
                    className="flex h-10 w-full rounded-none px-3 py-2 text-small file:border-0 file:bg-transparent file:text-small file:font-medium placeholder:text-muted-foreground outline-none focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 mt-1 bg-gray-700 border border-[#013f2e]/50 text-white placeholder-gray-400 focus:border-2 focus:border-[#013f2e] transition-all duration-200"
                  />
                </div>
              </div>
              
              {error && (
                <div className="text-red-400 text-small text-center">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="text-green-400 text-small text-center">
                  {success}
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-small font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-small text-gray-300">
                Test credentials: <br />
                <span className="text-blue-400">user@buildairesume.com</span> / <span className="text-blue-400">user123</span>
              </p>
              <p className="text-small text-gray-300 mt-2">
                Admin access? <a href="/sign-in" className="font-medium text-red-400 hover:text-red-300">Admin sign in</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
