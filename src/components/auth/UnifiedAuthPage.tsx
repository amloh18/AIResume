'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// import { useConsoleLoggerContext } from '@/contexts/ConsoleLoggerProvider';
import UnifiedAuthLayout from './UnifiedAuthLayout';
import UnifiedAuthForm, { emailValidation, passwordValidation, nameValidation, confirmPasswordValidation } from './UnifiedAuthForm';
import SocialAuthButtons from './SocialAuthButtons';
import CodeVerificationScreen from './CodeVerificationScreen';

type AuthMode = 'signin' | 'signup' | 'reset' | 'magic-link' | 'verify-code';

interface AuthPageProps {
  initialMode?: AuthMode;
}

function UnifiedAuthPageContent({ initialMode = 'signin' }: AuthPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  // const { messages, clearMessages } = useConsoleLoggerContext();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [verificationType, setVerificationType] = useState<'email-verification' | 'passwordless-login' | 'password-reset'>('email-verification');
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [showSendCodeButton, setShowSendCodeButton] = useState(false);

  // Check if user is already signed in
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      console.log('🔍 User already signed in, redirecting to dashboard');
      router.push('/dashboard');
    }
  }, [status, session?.user, router]);

  // Handle redirect after successful sign-in
  useEffect(() => {
    if (success && status === 'authenticated' && session?.user) {
      console.log('🔍 Sign-in successful, redirecting to dashboard');
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [success, status, session?.user, router, success]);

  const handleFormSubmit = async (formData: Record<string, string>) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'signin') {
        await handleSignIn(formData);
      } else if (mode === 'signup') {
        await handleSignUp(formData);
      } else if (mode === 'reset') {
        await handlePasswordReset(formData);
      } else if (mode === 'magic-link') {
        await handleMagicLink(formData);
      }
    } catch (error: any) {
      console.error('Form submission error:', error);
      setError(error.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (formData: Record<string, string>) => {
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
  };

  const handleSignUp = async (formData: Record<string, string>) => {
    const response = await fetch('/api/auth/register-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.email,
        password: formData.password,
        firstName: 'User', // Default first name
        lastName: 'User', // Default last name
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      // Account created successfully and verification code already sent
      // Switch to verification screen
      setEmail(formData.email);
      setVerificationType('email-verification');
      setMode('verify-code');
      setCooldownSeconds(60);
      setRemainingAttempts(5);
      setSuccess('Account created! Please check your email for the verification code.');
    } else {
      setError(result.message || 'Failed to create account. Please try again.');
    }
  };

  const handlePasswordReset = async (formData: Record<string, string>) => {
    // Send code instead of reset email
    await handleSendCode(formData.email, 'password-reset');
  };

  const handleMagicLink = async (formData: Record<string, string>) => {
    // Send code instead of magic link
    await handleSendCode(formData.email, 'passwordless-login');
  };

  const handleSendCode = async (email: string, type: 'email-verification' | 'passwordless-login' | 'password-reset') => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type }),
      });

      const result = await response.json();
      
      if (result.success) {
        setEmail(email);
        setVerificationType(type);
        setMode('verify-code');
        setCooldownSeconds(60);
        setRemainingAttempts(5);
      } else {
        setError(result.message || 'Failed to send verification code. Please try again.');
      }
    } catch (error: any) {
      console.error('Send code error:', error);
      setError('Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeVerification = async (code: string) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-and-signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          code, 
          type: verificationType 
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess(result.message || 'Code verified successfully!');
        
        // Handle based on verification type
        if (verificationType === 'email-verification') {
          // Email verified - redirect to sign in
          setTimeout(() => {
            setMode('signin');
            setSuccess('');
            setError('');
            setEmail('');
          }, 2000);
        } else if (verificationType === 'passwordless-login') {
          // Passwordless login - sign in automatically
          if (!result.requiresSignIn) {
            // Sign in the user automatically using NextAuth passwordless provider
            try {
              const { signIn } = await import('next-auth/react');
              const signInResult = await signIn('passwordless', {
                email: result.email,
                verificationCode: code, // Use the code that was just verified
                redirect: false
              });
              
              if (signInResult?.ok) {
                // Redirect to dashboard after successful sign-in
                setTimeout(() => {
                  router.push('/dashboard');
                }, 1000);
              } else {
                // Fallback to sign-in mode if automatic sign-in fails
                setTimeout(() => {
                  setMode('signin');
                  setSuccess('');
                  setError('');
                  setEmail('');
                }, 2000);
              }
            } catch (error) {
              console.error('Auto sign-in failed:', error);
              // Fallback to sign-in mode
              setTimeout(() => {
                setMode('signin');
                setSuccess('');
                setError('');
                setEmail('');
              }, 2000);
            }
          } else {
            // Fallback to sign-in mode
            setTimeout(() => {
              setMode('signin');
              setSuccess('');
              setError('');
              setEmail('');
            }, 2000);
          }
        } else if (verificationType === 'password-reset') {
          // Password reset - show success message
          setSuccess('Code verified! You can now set a new password.');
          // In a real implementation, you would redirect to a password reset form
        }
      } else {
        setError(result.message || 'Invalid verification code.');
        setRemainingAttempts(result.remainingAttempts || 0);
      }
    } catch (error: any) {
      console.error('Code verification error:', error);
      setError('Failed to verify code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    await handleSendCode(email, verificationType);
  };

  const checkEmailAvailability = useCallback(async (email: string) => {
    if (!email || !email.includes('@')) {
      setEmailExists(null);
      return;
    }

    setCheckingEmail(true);
    try {
      const response = await fetch('/api/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      setEmailExists(result.exists);
      
      // Don't update show/hide logic here - let handleInputChange handle it
    } catch (error) {
      console.error('Error checking email:', error);
      setEmailExists(null);
    } finally {
      setCheckingEmail(false);
    }
  }, []);

  const handleEmailBlur = useCallback((value: string) => {
    if (value && value.includes('@')) {
      checkEmailAvailability(value);
    }
  }, [checkEmailAvailability]);

  const handleInputChange = (name: string, value: string, formData: Record<string, string>) => {
    // Update show/hide logic for send code button
    if (mode === 'signin') {
      if (name === 'email') {
        setEmail(value);
        // Always show send code button if email is valid, regardless of emailExists status
        setShowSendCodeButton(value.includes('@'));
      } else if (name === 'password') {
        // Hide send code button only when password field has content
        setShowSendCodeButton(value.length === 0);
      }
    }
  };

  const handleResendVerification = async () => {
    if (!email) return;
    
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess('verification-resent');
      } else {
        setError(result.message || 'Failed to resend verification email. Please try again.');
      }
    } catch (error: any) {
      console.error('Resend verification error:', error);
      setError('Failed to resend verification email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setError('');

    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (error: any) {
      console.error('Google auth error:', error);
      setError('Failed to sign in with Google. Please try again.');
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
    setEmail('');
  };

  const getFormFields = () => {
    switch (mode) {
      case 'signin':
        return [
          {
            name: 'email',
            type: 'email' as const,
            label: 'Email Address',
            placeholder: 'john@example.com',
            required: true,
            autoComplete: 'email',
            icon: <Mail className="w-4 h-4" />,
            validation: emailValidation,
            onBlur: handleEmailBlur
          },
          {
            name: 'password',
            type: 'password' as const,
            label: 'Password',
            placeholder: 'Enter your password',
            required: false, // Make optional for code-based login
            autoComplete: 'current-password',
            icon: <Lock className="w-4 h-4" />,
            validation: passwordValidation,
            showPasswordToggle: true
          }
        ];

      case 'signup':
        return [
          {
            name: 'email',
            type: 'email' as const,
            label: 'Email Address',
            placeholder: 'john@example.com',
            required: true,
            autoComplete: 'email',
            icon: <Mail className="w-4 h-4" />,
            validation: (value: string) => {
              const emailError = emailValidation(value);
              if (emailError) return emailError;
              
              if (emailExists === true) {
                return 'An account with this email already exists. Please sign in instead.';
              }
              
              return null;
            },
            onBlur: (value: string) => {
              if (value && value.includes('@')) {
                checkEmailAvailability(value);
              }
            }
          },
          {
            name: 'password',
            type: 'password' as const,
            label: 'Password',
            placeholder: 'Create a strong password',
            required: true,
            autoComplete: 'new-password',
            icon: <Lock className="w-4 h-4" />,
            validation: passwordValidation,
            showPasswordToggle: true
          },
          {
            name: 'confirmPassword',
            type: 'password' as const,
            label: 'Confirm Password',
            placeholder: 'Confirm your password',
            required: true,
            autoComplete: 'new-password',
            icon: <Lock className="w-4 h-4" />,
            validation: (value: string, password?: string) => confirmPasswordValidation(value, password || ''),
            showPasswordToggle: true
          }
        ];

      case 'reset':
        return [
          {
            name: 'email',
            type: 'email' as const,
            label: 'Email Address',
            placeholder: 'john@example.com',
            required: true,
            autoComplete: 'email',
            icon: <Mail className="w-4 h-4" />,
            validation: emailValidation
          }
        ];

      case 'magic-link':
        return [
          {
            name: 'email',
            type: 'email' as const,
            label: 'Email Address',
            placeholder: 'john@example.com',
            required: true,
            autoComplete: 'email',
            icon: <Mail className="w-4 h-4" />,
            validation: emailValidation
          }
        ];

      case 'verify-code':
        return []; // No form fields for code verification - handled by CodeVerificationScreen

      default:
        return [];
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'signin':
        return 'Sign In';
      case 'signup':
        return 'Create your account';
      case 'reset':
        return 'Reset Password';
      case 'magic-link':
        return 'Sign In with Code';
      default:
        return 'Sign In';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'signin':
        return 'Welcome back! Please enter your credentials to access your account.';
      case 'signup':
        return 'Sign up now to start managing your job applications and CVs.';
      case 'reset':
        return 'Enter your email address and we\'ll send you a 4-digit code to reset your password.';
      case 'magic-link':
        return 'Enter your email address and we\'ll send you a 4-digit code to sign in without a password.';
      default:
        return 'Welcome back! Please enter your credentials to access your account.';
    }
  };

  const getSubmitText = () => {
    switch (mode) {
      case 'signin':
        return 'Sign In';
      case 'signup':
        return 'Sign Up';
      case 'reset':
        return 'Send Code';
      case 'magic-link':
        return 'Send Code';
      default:
        return 'Sign In';
    }
  };

  const getIcon = () => {
    switch (mode) {
      case 'signin':
        return (
          <div className="w-12 h-12 rounded-full border-2 border-[#88E03F] flex items-center justify-center mb-6 mx-auto">
            <svg className="w-6 h-6 text-[#88E03F]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8,5.14V19.14L19,12.14L8,5.14Z" />
            </svg>
          </div>
        );
      case 'signup':
        return (
          <div className="w-12 h-12 rounded-full border-2 border-[#88E03F] flex items-center justify-center mb-6 mx-auto">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
            </svg>
          </div>
        );
      case 'reset':
        return (
          <div className="w-12 h-12 rounded-full border-2 border-[#88E03F] flex items-center justify-center mb-6 mx-auto">
            <svg className="w-6 h-6 text-[#88E03F]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
            </svg>
          </div>
        );
      case 'verify-code':
        return (
          <div className="w-12 h-12 rounded-full border-2 border-[#88E03F] flex items-center justify-center mb-6 mx-auto">
            <svg className="w-6 h-6 text-[#88E03F]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getFooter = () => {
    switch (mode) {
      case 'signin':
        return (
          <div className="space-y-3">
            <p className="text-gray-300 text-sm text-center">
              Forgot Password?{' '}
              <button
                onClick={() => switchMode('reset')}
                className="text-[#88E03F] hover:text-[#88E03F]/80 transition-colors duration-200 font-medium"
              >
                Forgot Password?
              </button>
            </p>
            <p className="text-gray-300 text-sm text-center">
              Don't have an account?{' '}
              <button
                onClick={() => switchMode('signup')}
                className="text-[#88E03F] hover:text-[#88E03F]/80 transition-colors duration-200 font-medium"
              >
                Create Account
              </button>
            </p>
          </div>
        );

      case 'signup':
        return (
          <div className="space-y-3">
            <p className="text-gray-300 text-sm text-center">
              Already have an account?{' '}
              <button
                onClick={() => switchMode('signin')}
                className="text-[#88E03F] hover:text-[#88E03F]/80 transition-colors duration-200 font-medium"
              >
                Sign In
              </button>
            </p>
          </div>
        );

      case 'reset':
        return (
          <div className="space-y-3">
            <p className="text-gray-300 text-sm text-center">
              Remember your password?{' '}
              <button
                onClick={() => switchMode('signin')}
                className="text-[#88E03F] hover:text-[#88E03F]/80 transition-colors duration-200 font-medium"
              >
                Sign In
              </button>
            </p>
            <p className="text-gray-500 text-sm text-center">
              Don't have an account?{' '}
              <button
                onClick={() => switchMode('signup')}
                className="text-[#88E03F] hover:text-[#88E03F]/80 transition-colors duration-200 font-medium"
              >
                Sign up here
              </button>
            </p>
          </div>
        );

      case 'magic-link':
        return (
          <div className="space-y-3">
            <p className="text-gray-500 text-sm text-center">
              Prefer password?{' '}
              <button
                onClick={() => switchMode('signin')}
                className="text-[#88E03F] hover:text-[#88E03F]/80 transition-colors duration-200 font-medium"
              >
                Sign in with password
              </button>
            </p>
            <p className="text-gray-500 text-sm text-center">
              Don't have an account?{' '}
              <button
                onClick={() => switchMode('signup')}
                className="text-[#88E03F] hover:text-[#88E03F]/80 transition-colors duration-200 font-medium"
              >
                Sign up here
              </button>
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  const socialButtons = (mode !== 'magic-link' && mode !== 'verify-code') ? (
    <SocialAuthButtons
      onGoogleAuth={handleGoogleAuth}
      onMagicLinkAuth={mode === 'signin' ? () => switchMode('magic-link') : undefined}
      isLoading={isLoading}
      mode={mode === 'signup' ? 'signup' : 'signin'}
    />
  ) : null;

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

  // Show code verification screen
  if (mode === 'verify-code') {
    return (
      <UnifiedAuthLayout
        title="Verify Your Code"
        subtitle="Enter the 4-digit code sent to your email"
      >
        <CodeVerificationScreen
          email={email}
          type={verificationType}
          onCodeVerified={handleCodeVerification}
          onResendCode={handleResendCode}
          isLoading={isLoading}
          error={error}
          success={success}
          remainingAttempts={remainingAttempts}
          cooldownSeconds={cooldownSeconds}
        />
      </UnifiedAuthLayout>
    );
  }

  return (
    <UnifiedAuthLayout
      title={getTitle()}
      subtitle={getSubtitle()}
      showBackButton={mode !== 'signin'}
      backHref="/"
      backText="Back to Home"
    >
      {/* Logo */}
      <div className="mb-8">
        <div className="text-4xl font-black font-sans" style={{ fontWeight: 900 }}>
          <span className="text-[#88E03F]">CV</span><span className="text-gray-300">Circle.io</span>
        </div>
      </div>
      
      {/* Icon */}
      {getIcon()}
      
      {/* Title */}
      <h2 className="text-3xl font-bold text-white mb-2">
        {getTitle()}
      </h2>
      
      {/* Subtitle */}
      <p className="text-gray-300 text-lg mb-8">
        {getSubtitle()}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <UnifiedAuthForm
            key={mode} // Add key to prevent re-mounting
            fields={getFormFields()}
            onSubmit={handleFormSubmit}
            submitText={getSubmitText()}
            isLoading={isLoading}
            error={error}
            success={success}
            socialButtons={socialButtons}
            footer={null} // Remove footer from form
            autoFocus={true}
            onInputChange={handleInputChange}
          />
          
          {/* Send Code Button for Sign In */}
          {mode === 'signin' && showSendCodeButton && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <button
                onClick={() => handleSendCode(email, 'passwordless-login')}
                disabled={isLoading || checkingEmail}
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#88E03F] to-[#88E03F]/80 hover:from-[#88E03F]/90 hover:to-[#88E03F]/70 text-black font-semibold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading || checkingEmail ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z" />
                  </svg>
                )}
                {isLoading ? 'Sending code...' : 'Send me a code'}
              </button>
            </motion.div>
          )}

          {/* Footer Links */}
          <div className="mt-8">
            {getFooter()}
            
            {/* Privacy Policy and Terms */}
            <div className="mt-6 pt-4 border-t border-gray-600/30">
              <div className="flex justify-center space-x-4 text-xs text-gray-400">
                <a 
                  href="/privacy-policy" 
                  className="hover:text-[#88E03F] transition-colors duration-200"
                >
                  Privacy Policy
                </a>
                <span className="text-gray-500">•</span>
                <a 
                  href="/terms" 
                  className="hover:text-[#88E03F] transition-colors duration-200"
                >
                  Terms of Service
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </UnifiedAuthLayout>
  );
}

// Wrapper component that handles mounting
export default function UnifiedAuthPage({ initialMode = 'signin' }: AuthPageProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-lime-400" />
          <p className="text-white text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return <UnifiedAuthPageContent initialMode={initialMode} />;
}
