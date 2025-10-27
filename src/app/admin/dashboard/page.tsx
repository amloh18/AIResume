'use client';

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Settings, LogOut, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  type: string;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const response = await fetch('/api/admin/verify');
        const data = await response.json();

        if (data.success) {
          setUser(data.user);
        } else {
          router.push('/admin/signin');
        }
      } catch (error) {
        console.error('Admin verification error:', error);
        router.push('/admin/signin');
      } finally {
        setLoading(false);
      }
    };

    verifyAdmin();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  const handleSignOut = async () => {
    // Clear admin token cookie
    document.cookie = 'admin-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/admin/signin');
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-red-500 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-sm text-gray-300">Administrative Panel</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-sm bg-gray-700 border-gray-600 text-white">
                {user.role}
              </Badge>
              <span className="text-sm text-gray-300">{user.email}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="border-gray-600 text-gray-300 hover:bg-gray-700">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center text-sm text-gray-400 hover:text-gray-300">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to main site
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* User Management */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Users className="h-5 w-5 mr-2 text-red-500" />
                  User Management
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Manage user accounts and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 mb-4">
                  View, edit, and manage user accounts, subscriptions, and access levels.
                </p>
                <Button variant="outline" size="sm" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700">
                  Manage Users
                </Button>
              </CardContent>
            </Card>

            {/* System Settings */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Settings className="h-5 w-5 mr-2 text-red-500" />
                  System Settings
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Configure system-wide settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 mb-4">
                  Configure application settings, features, and system parameters.
                </p>
                <Button variant="outline" size="sm" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700">
                  Open Settings
                </Button>
              </CardContent>
            </Card>

            {/* Analytics */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Shield className="h-5 w-5 mr-2 text-red-500" />
                  Analytics
                </CardTitle>
                <CardDescription className="text-gray-300">
                  View system analytics and reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 mb-4">
                  Access detailed analytics, user metrics, and system performance data.
                </p>
                <Button variant="outline" size="sm" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700">
                  View Analytics
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Admin Info */}
          <Card className="mt-6 bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Admin Session Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-400">Email</p>
                  <p className="text-sm text-white">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400">Role</p>
                  <p className="text-sm text-white">{user.role}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400">Type</p>
                  <p className="text-sm text-white">{user.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400">User ID</p>
                  <p className="text-sm text-white">{user.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
