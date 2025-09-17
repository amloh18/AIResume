'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { signIn, getSession } from 'next-auth/react';
import { signInWithEmail } from '@/lib/unified-auth';

interface SignInFormData {
  email: string;
  password: string;
}

export default function SignInForm() {
  const [formData, setFormData] = useState<SignInFormData>({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Use unified authentication (tries Firebase first, falls back to NextAuth)
      const result = await signInWithEmail(formData.email, formData.password);

      if (result.success) {
        console.log(`✅ Authentication successful via ${result.method}`);
        
        // Check if user has CVs before deciding where to route
        try {
          // Get session to access user data
          const session = await getSession();
          if (session?.user) {
            console.log('🔍 Checking CVs for user:', session.user.id);
            const response = await fetch(`/api/cvs?userId=${session.user.id}&projection=count`);
            const cvResult = await response.json();
            
            if (cvResult.success && cvResult.count > 0) {
              console.log('✅ User has CVs, redirecting to dashboard');
              window.location.href = '/dashboard';
            } else {
              console.log('📝 User needs onboarding, redirecting to master CV onboarding');
              window.location.href = '/master-cv-onboarding';
            }
          } else {
            // Fallback to dashboard if no session data
            window.location.href = '/dashboard';
          }
        } catch (error) {
          console.error('❌ Error checking CV status:', error);
          // Default to dashboard if we can't check
          window.location.href = '/dashboard';
        }
      } else {
        setError(result.error || 'Authentication failed. Please try again.');
      }

    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/user-not-found') {
        setError('No account found with this email address');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later');
      } else {
        setError(error.message || 'Failed to sign in');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Get Firebase ID token and sign in with NextAuth
      const idToken = await user.getIdToken();
      const signInResult = await signIn('firebase', { 
        idToken, 
        redirect: false 
      });

      if (signInResult?.error) {
        console.error('NextAuth Google signin error:', signInResult.error);
        setError('Authentication failed. Please try again.');
      } else if (signInResult?.ok) {
        // Redirect manually after successful signin
        window.location.href = '/dashboard';
      }

    } catch (error: any) {
      console.error('Google sign in error:', error);
      setError(error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!formData.email) {
      setError('Please enter your email address first');
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });

      if (response.ok) {
        setResetEmailSent(true);
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setError('Failed to send reset email');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">Sign In</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {resetEmailSent && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          Password reset email sent! Check your inbox for instructions.
        </div>
      )}

      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handlePasswordReset}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </button>
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <a href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
          Sign up
        </a>
      </p>
    </div>
  );
}
