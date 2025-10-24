'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { Eye, EyeOff, Mail, Lock, Loader2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { useConsoleLoggerContext } from '@/contexts/ConsoleLoggerProvider';
import InlineMessages from '@/components/auth/InlineMessages';

interface SignInFormData {
  email: string;
  password: string;
}

// Main sign-in component
function SignInPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const redirectUrl = searchParams.get('redirect_url') || '/dashboard';
  const planKey = searchParams.get('plan');
  const returnUrl = searchParams.get('returnUrl');
  const { messages, clearMessages } = useConsoleLoggerContext();

  const [formData, setFormData] = useState<SignInFormData>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check if user is already signed in
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      console.log('🔍 User already signed in, redirecting to:', redirectUrl);
      // If plan is specified, redirect to dashboard with plan parameter
      if (planKey) {
        router.push(`/dashboard?plan=${planKey}&showPaymentModal=true`);
      } else {
        router.push(returnUrl || redirectUrl);
      }
    }
  }, [status, session, router, redirectUrl, planKey, returnUrl]);

  // Handle redirect after successful sign-in
  useEffect(() => {
    if (success && status === 'authenticated' && session?.user) {
      console.log('🔍 Sign-in successful, redirecting to:', redirectUrl);
      const timer = setTimeout(() => {
        // If plan is specified, redirect to dashboard with plan parameter
        if (planKey) {
          router.push(`/dashboard?plan=${planKey}&showPaymentModal=true`);
        } else {
          router.push(returnUrl || redirectUrl);
        }
      }, 1500); // Small delay to show success message
      
      return () => clearTimeout(timer);
    }
  }, [success, status, session, router, redirectUrl, planKey, returnUrl]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.password.trim()) {
      setError('Password is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Try credentials first (for users with passwords)
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.ok) {
        setSuccess('Sign in successful! Redirecting...');
      } else {
        setError(result?.error || 'Invalid email or password.');
      }

    } catch (error: any) {
      console.error('Sign in error:', error);
      setError('Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');

    try {
      await signIn('google', { callbackUrl: redirectUrl });
    } catch (error: any) {
      console.error('Google sign in error:', error);
      setError('Failed to sign in with Google. Please try again.');
      setIsLoading(false);
    }
  };

  // Show loading while checking session status
  if (status === 'loading') {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-lime-400" />
          <p className="text-white text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex">
      {/* Left Side - Full Height Sign In Image (50%) - Hidden on Mobile */}
      <div className="hidden md:flex w-1/2 p-4">
        {/* Full Height Image with Padding */}
        <div className="relative h-full rounded-2xl overflow-hidden bg-gradient-to-br from-lime-400/20 to-lime-500/20">
          <img 
            src="/images/Login/signin.png" 
            alt="Sign In Interface"
            className="w-full h-full object-cover"
            onError={(e) => {
              // Simple fallback - just hide the image
              e.currentTarget.style.display = 'none';
            }}
          />
          
          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-black/40"></div>

          {/* Text Overlay */}
          <div className="absolute inset-0 flex flex-col justify-start pt-20 px-12 lg:px-16 xl:px-20">
            <div className="relative z-10">
              {/* Main Heading */}
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                Welcome Back to Your
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">
                  Career Journey
                </span>
              </h2>

              {/* Subtitle */}
              <p className="text-xl text-gray-300 leading-relaxed">
                Continue building amazing CVs with AI assistance, professional templates, and real-time analytics.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Sign In Modal (50% on desktop, 100% on mobile) */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center px-8 lg:px-12 xl:px-16 relative">
        {/* CVCircle Logo - Top Right */}
        <div className="absolute top-8 right-8">
          <h1 className="text-3xl font-bold">
            <span className="text-lime-400">CV</span>
            <span className="text-white">Circle</span>
          </h1>
        </div>
        
        <div className="w-full max-w-md">

          {/* Sign In Modal */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Welcome Back</h3>
              <p className="text-gray-400">Sign in to continue your journey</p>
            </div>

            {/* Social Sign In Buttons */}
            <div className="space-y-3 mb-6">
              {/* Google Sign In Button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 border border-gray-600 hover:border-lime-400 text-white py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {isLoading ? 'Signing in...' : 'Continue with Google'}
              </button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-gray-400">Or continue with email</span>
              </div>
            </div>

            {/* Sign In Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-gray-600 text-white placeholder-gray-400 focus:border-lime-400 focus:ring-lime-400 focus:ring-2 transition-all duration-200 rounded-lg"
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 bg-white/10 border border-gray-600 text-white placeholder-gray-400 focus:border-lime-400 focus:ring-lime-400 focus:ring-2 transition-all duration-200 rounded-lg"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <a
                  href="/auth/reset-password"
                  className="text-sm text-lime-400 hover:text-lime-300 transition-colors"
                >
                  Forgot password?
                </a>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{success}</span>
                </div>
              )}

              {/* Inline Messages from Console Logs */}
              <InlineMessages 
                messages={messages} 
                onClear={clearMessages}
                className="mt-4"
              />

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-300 hover:to-lime-400 text-black font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-lime-400/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="text-center mt-6">
              <p className="text-gray-500 text-sm">
                Don't have an account?{' '}
                <a href="/sign-up" className="text-lime-400 hover:text-lime-300 transition-colors duration-200 font-medium">
                  Sign up here
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main export function
export default function SignInPage() {
  // Since Clerk is now enabled in layout.tsx, render the sign-in content directly
  return <SignInPageContent />;
}
