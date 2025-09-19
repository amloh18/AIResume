'use client';

import React, { useState, useEffect, useRef } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, User, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import LoadingAnimation from '@/components/ui/LoadingAnimation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface SignUpFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function SignUpPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [formData, setFormData] = useState<SignUpFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated' && session) {
      // Pass signup data to master-cv-onboarding
      const signupData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        fullName: `${formData.firstName} ${formData.lastName}`.trim()
      };
      
      // Store signup data in sessionStorage for the onboarding page
      sessionStorage.setItem('signupData', JSON.stringify(signupData));
      
      router.push('/master-cv-onboarding');
    }
  }, [session, status, router, formData]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [emailError, setEmailError] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const emailTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const validatePasswordRealTime = (password: string) => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('At least 8 characters');
    }
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('One lowercase letter');
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('One uppercase letter');
    }
    if (!/(?=.*\d)/.test(password)) {
      errors.push('One number');
    }
    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
      errors.push('One special character');
    }
    
    return errors;
  };

  const checkEmailExists = async (email: string) => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError('');
      return;
    }

    setIsCheckingEmail(true);
    try {
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      
      if (result.success && result.exists) {
        setEmailError('An account with this email already exists. Please sign in instead.');
      } else {
        setEmailError('');
      }
    } catch (error) {
      console.error('Error checking email:', error);
      setEmailError('');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (error) setError('');
    if (emailError) setEmailError('');
    
    // Validate password in real-time
    if (name === 'password') {
      const errors = validatePasswordRealTime(value);
      setPasswordErrors(errors);
    }
    
    // Check email existence in real-time with debouncing
    if (name === 'email') {
      // Clear previous timeout
      if (emailTimeoutRef.current) {
        clearTimeout(emailTimeoutRef.current);
      }
      
      // Set new timeout
      emailTimeoutRef.current = setTimeout(() => {
        checkEmailExists(value);
      }, 500); // 500ms debounce
    }
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      setError('First name is required');
      return false;
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (emailError) {
      setError(emailError);
      return false;
    }
    
    // Comprehensive password validation
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    if (!/(?=.*[a-z])/.test(formData.password)) {
      setError('Password must contain at least one lowercase letter');
      return false;
    }
    if (!/(?=.*[A-Z])/.test(formData.password)) {
      setError('Password must contain at least one uppercase letter');
      return false;
    }
    if (!/(?=.*\d)/.test(formData.password)) {
      setError('Password must contain at least one number');
      return false;
    }
    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(formData.password)) {
      setError('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
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
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Update the user's display name
      await updateProfile(userCredential.user, {
        displayName: `${formData.firstName} ${formData.lastName}`,
      });

      // Sign in with NextAuth using credentials provider (same as manual sign-in)
      console.log('🔑 Attempting automatic sign-in with credentials provider...');
      
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      console.log('🔍 NextAuth signIn result:', result);

      if (result?.ok) {
        setSuccess('Account created successfully! Redirecting...');
        // Redirect will be handled by useEffect when session updates
      } else {
        console.error('❌ NextAuth signIn failed:', result?.error);
        setError('Account created but sign in failed. Please try signing in manually.');
      }

    } catch (error: any) {
      console.error('Sign up error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password does not meet security requirements. Please ensure your password contains uppercase letters, lowercase letters, numbers, and special characters.');
      } else if (error.code === 'auth/password-does-not-meet-requirements') {
        setError('Password does not meet security requirements. Please ensure your password contains uppercase letters, lowercase letters, numbers, and special characters.');
      } else {
        setError('Failed to create account. Please check your information and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setError('');

    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (error: any) {
      console.error('Google sign up error:', error);
      setError('Failed to sign up with Google. Please try again.');
      setIsLoading(false);
    }
  };

  // If user exists, redirect
  if (status === 'loading') {
    return <LoadingAnimation progress={0.8} showProgressBar={false} />;
  }

  if (session) {
    return <LoadingAnimation progress={0.8} showProgressBar={false} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex">
      {/* Left Side - Images (50%) */}
      <div className="w-1/2 flex flex-col justify-center px-12 lg:px-16 xl:px-20">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-lime-400/5 to-blue-400/5"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-lime-400/3 to-blue-400/3 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10">
          {/* Logo and Branding */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-lime-400 to-lime-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white">CVCircle</h1>
          </div>

          {/* Main Heading */}
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Start Your
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">
              Career Journey
            </span>
          </h2>

          {/* Subtitle */}
          <p className="text-xl text-gray-300 mb-12 leading-relaxed">
            Join thousands of professionals who have transformed their careers with AI-powered CV building, professional templates, and real-time analytics.
          </p>

          {/* Images Section */}
          <div className="space-y-8 mb-12">
            {/* Login/Signup Images */}
            <div className="grid grid-cols-2 gap-6">
              {/* Login Image */}
              <div className="relative group">
                <div className="aspect-[4/3] bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-2xl border border-lime-400/30 overflow-hidden">
                  <img
                    src="/images/Login/login-image-1.png"
                    alt="Login Interface"
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                    onError={(e) => {
                      // Fallback to a gradient background if image doesn't exist
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center">
                          <div class="text-center">
                            <div class="w-16 h-16 bg-lime-400/30 rounded-full flex items-center justify-center mx-auto mb-4">
                              <svg class="w-8 h-8 text-lime-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                              </svg>
                            </div>
                            <h3 class="text-white font-semibold mb-2">Login Interface</h3>
                            <p class="text-gray-400 text-sm">Secure authentication</p>
                          </div>
                        </div>
                      `;
                    }}
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-2xl"></div>
                <div className="absolute bottom-4 left-4">
                  <h3 className="text-white font-semibold">Secure Login</h3>
                  <p className="text-gray-300 text-sm">Quick and safe access</p>
                </div>
              </div>

              {/* Signup Image */}
              <div className="relative group">
                <div className="aspect-[4/3] bg-gradient-to-br from-blue-400/20 to-blue-500/20 rounded-2xl border border-blue-400/30 overflow-hidden">
                  <img
                    src="/images/Login/login-image-2.png"
                    alt="Signup Interface"
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                    onError={(e) => {
                      // Fallback to a gradient background if image doesn't exist
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center">
                          <div class="text-center">
                            <div class="w-16 h-16 bg-blue-400/30 rounded-full flex items-center justify-center mx-auto mb-4">
                              <svg class="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                              </svg>
                            </div>
                            <h3 class="text-white font-semibold mb-2">Signup Interface</h3>
                            <p class="text-gray-400 text-sm">Easy registration</p>
                          </div>
                        </div>
                      `;
                    }}
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-2xl"></div>
                <div className="absolute bottom-4 left-4">
                  <h3 className="text-white font-semibold">Easy Signup</h3>
                  <p className="text-gray-300 text-sm">Join in seconds</p>
                </div>
              </div>
            </div>

            {/* Additional Feature Images */}
            <div className="grid grid-cols-3 gap-4">
              {/* CV Builder Image */}
              <div className="relative group">
                <div className="aspect-square bg-gradient-to-br from-purple-400/20 to-purple-500/20 rounded-xl border border-purple-400/30 overflow-hidden">
                  <img
                    src="/images/Login/cv-builder.png"
                    alt="CV Builder"
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center">
                          <div class="w-12 h-12 bg-purple-400/30 rounded-full flex items-center justify-center mx-auto mb-2">
                            <svg class="w-6 h-6 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                            </svg>
                          </div>
                          <p class="text-white text-xs font-medium">CV Builder</p>
                        </div>
                      `;
                    }}
                  />
                </div>
              </div>

              {/* Templates Image */}
              <div className="relative group">
                <div className="aspect-square bg-gradient-to-br from-green-400/20 to-green-500/20 rounded-xl border border-green-400/30 overflow-hidden">
                  <img
                    src="/images/Login/templates.png"
                    alt="Templates"
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center">
                          <div class="w-12 h-12 bg-green-400/30 rounded-full flex items-center justify-center mx-auto mb-2">
                            <svg class="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
                            </svg>
                          </div>
                          <p class="text-white text-xs font-medium">Templates</p>
                        </div>
                      `;
                    }}
                  />
                </div>
              </div>

              {/* Analytics Image */}
              <div className="relative group">
                <div className="aspect-square bg-gradient-to-br from-orange-400/20 to-orange-500/20 rounded-xl border border-orange-400/30 overflow-hidden">
                  <img
                    src="/images/Login/analytics.png"
                    alt="Analytics"
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center">
                          <div class="w-12 h-12 bg-orange-400/30 rounded-full flex items-center justify-center mx-auto mb-2">
                            <svg class="w-6 h-6 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                            </svg>
                          </div>
                          <p class="text-white text-xs font-medium">Analytics</p>
                        </div>
                      `;
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-lime-400">10K+</div>
              <div className="text-gray-400 text-sm">CVs Created</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-lime-400">95%</div>
              <div className="text-gray-400 text-sm">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-lime-400">50+</div>
              <div className="text-gray-400 text-sm">Templates</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Sign Up Modal (50%) */}
      <div className="w-1/2 flex items-center justify-center px-8 lg:px-12 xl:px-16">
        <div className="w-full max-w-md">

          {/* Sign Up Modal */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Start Your Journey</h3>
              <p className="text-gray-400">Create your account and build amazing CVs</p>
            </div>

            {/* Social Sign Up Buttons */}
            <div className="space-y-3 mb-6">
              {/* Google Sign Up Button */}
              <button
                onClick={handleGoogleSignUp}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 border border-gray-600 hover:border-lime-400 text-white py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {isLoading ? 'Signing up...' : 'Continue with Google'}
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

            {/* Sign Up Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-2">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-gray-600 text-white placeholder-gray-400 focus:border-lime-400 focus:ring-lime-400 focus:ring-2 transition-all duration-200 rounded-lg"
                      placeholder="John"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-2">
                    Last Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-gray-600 text-white placeholder-gray-400 focus:border-lime-400 focus:ring-lime-400 focus:ring-2 transition-all duration-200 rounded-lg"
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>
              </div>

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
                    className={`w-full pl-10 pr-4 py-3 bg-white/10 border text-white placeholder-gray-400 focus:ring-2 transition-all duration-200 rounded-lg ${
                      emailError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-600 focus:border-lime-400 focus:ring-lime-400'
                    }`}
                    placeholder="john@example.com"
                    required
                  />
                  {isCheckingEmail && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-lime-400 rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                
                {/* Email Error Message */}
                {emailError && (
                  <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{emailError}</span>
                  </div>
                )}
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
                    placeholder="Create a strong password"
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
                
                {/* Password Requirements */}
                {formData.password && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-400 mb-2">Password requirements:</p>
                    <div className="space-y-1">
                      {[
                        { text: 'At least 8 characters', valid: formData.password.length >= 8 },
                        { text: 'One lowercase letter', valid: /(?=.*[a-z])/.test(formData.password) },
                        { text: 'One uppercase letter', valid: /(?=.*[A-Z])/.test(formData.password) },
                        { text: 'One number', valid: /(?=.*\d)/.test(formData.password) },
                        { text: 'One special character', valid: /(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(formData.password) }
                      ].map((requirement, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full flex items-center justify-center ${requirement.valid ? 'bg-green-500' : 'bg-gray-600'}`}>
                            {requirement.valid && <CheckCircle className="w-2 h-2 text-white" />}
                          </div>
                          <span className={`text-xs ${requirement.valid ? 'text-green-400' : 'text-gray-400'}`}>
                            {requirement.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 bg-white/10 border border-gray-600 text-white placeholder-gray-400 focus:border-lime-400 focus:ring-lime-400 focus:ring-2 transition-all duration-200 rounded-lg"
                    placeholder="Confirm your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-300 hover:to-lime-400 text-black font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-lime-400/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="text-center mt-6">
              <p className="text-gray-500 text-sm">
                Already have an account?{' '}
                <a href="/sign-in" className="text-lime-400 hover:text-lime-300 transition-colors duration-200 font-medium">
                  Sign in here
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
