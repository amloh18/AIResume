'use client'

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic';

import { useCustomAuth } from '@/contexts/CustomAuthContext'
import { CustomAuthProvider } from '@/contexts/CustomAuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

function DashboardContent() {
  const { user, loading, signOut } = useCustomAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/custom-signin')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <button
            onClick={signOut}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
          >
            Sign Out
          </button>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome, {user.name}!</h2>
          <div className="space-y-2">
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Type:</strong> {user.type}</p>
            <p><strong>Role:</strong> {user.role}</p>
          </div>
        </div>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">CV Builder</h3>
            <p className="text-gray-300">Create and manage your CVs</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Job Tracker</h3>
            <p className="text-gray-300">Track your job applications</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Analytics</h3>
            <p className="text-gray-300">View your application statistics</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SimpleDashboard() {
  return (
    <CustomAuthProvider>
      <DashboardContent />
    </CustomAuthProvider>
  )
}
