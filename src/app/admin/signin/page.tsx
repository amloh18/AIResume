'use client';

import { useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield } from 'lucide-react';

interface AdminSignInFormData {
  email: string;
  password: string;
}

export default function AdminSignInPage() {
  const [formData, setFormData] = useState<AdminSignInFormData>({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const { data: session, update } = useSession();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Attempting admin sign-in via NextAuth...');
      
      // Use NextAuth signIn with admin-credentials provider
      const result = await signIn('admin-credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false, // Don't redirect automatically
      });

      // Handle the result
      if (result) {
        if (result.error) {
          console.error('❌ Admin sign-in failed:', result.error);
          // Provide more specific error messages
          if (result.error === 'CredentialsSignin') {
            setError('Invalid email or password. Please check your credentials.');
          } else if (result.error.includes('JSON') || result.error.includes('DOCTYPE')) {
            setError('Server error: Invalid response format. Please try again or contact support.');
          } else {
            setError('Invalid admin credentials or access denied');
          }
        } else if (result.ok) {
          console.log('✅ Admin sign-in successful, updating session and redirecting...');
          // Update session to ensure it's fresh
          await update();
          // Refresh router to get latest session
          router.refresh();
          // Redirect to admin dashboard
          router.push('/admin/dashboard');
        } else {
          setError('An unexpected error occurred. Please try again.');
        }
      } else {
        // No result returned - might be a network or server error
        setError('No response from server. Please check your connection and try again.');
      }

    } catch (error: any) {
      console.error('❌ Admin sign in error:', error);
      
      // Handle different error types
      if (error instanceof TypeError && error.message.includes('JSON')) {
        setError('Server error: Invalid response. Please try again or contact support.');
      } else if (error instanceof Error) {
        setError(error.message || 'Failed to sign in. Please try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            Admin Sign In
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            Access the administrative panel
          </p>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Administrator Access</CardTitle>
            <CardDescription className="text-gray-300">
              Enter your admin credentials to access the administrative panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminSignIn} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="bg-red-900 border-red-700">
                  <AlertDescription className="text-red-200">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-white">Admin Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="admin@cvcircle.io"
                    className="mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="text-white">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter admin password"
                    className="mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In to Admin Panel'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-300">
                Not an admin?{' '}
                <a
                  href="/sign-in"
                  className="font-medium text-red-400 hover:text-red-300"
                >
                  Regular user sign in
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
