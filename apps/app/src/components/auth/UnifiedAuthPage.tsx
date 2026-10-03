// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuthModalStore } from '@/lib/stores/authModalStore';
import { signIn, useSession } from 'next-auth/react';
import posthog from 'posthog-js';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// import { useConsoleLoggerContext } from '@/contexts/ConsoleLoggerProvider';
import UnifiedAuthLayout from './UnifiedAuthLayout';
import UnifiedAuthForm, { emailValidation, passwordValidation, nameValidation, confirmPasswordValidation } from './UnifiedAuthForm';
import { DEV_BYPASS_CLIENT_ENABLED } from '@/lib/auth/dev-bypass';
import SocialAuthButtons from './SocialAuthButtons';
import CodeVerificationScreen from './CodeVerificationScreen';

export type AuthMode = 'signin' | 'signup' | 'reset' | 'magic-link' | 'verify-code';

export interface AuthPageProps {
  initialMode?: AuthMode;
  isModal?: boolean;
  layoutVariant?: 'default' | 'admin';
  callbackUrl?: string;
}

export function UnifiedAuthPageContent({ initialMode = 'signin', isModal = false, layoutVariant = 'default', callbackUrl: propCallbackUrl }: AuthPageProps) {
  const { data: session, status } = useSession();
  const globalCallbackUrl = useAuthModalStore(state => state.callbackUrl);

  // Get callbackUrl from search params, default to dashboard
  const callbackUrl = useMemo(() => {
    if (propCallbackUrl) return propCallbackUrl;
    if (typeof window !== 'undefined') {
      const url = new URLSearchParams(window.location.search).get('callbackUrl');
      return globalCallbackUrl || url || '/dashboard/jobs';
    }
    return globalCallbackUrl || '/dashboard/jobs';
  }, [globalCallbackUrl, propCallbackUrl]);

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [verificationType, setVerificationType] = useState<'email-verification' | 'passwordless-login' | 'password-reset'>('email-verification');
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [showSendCodeButton, setShowSendCodeButton] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [showPasswordResetForm, setShowPasswordResetForm] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [twoFactorSessionId, setTwoFactorSessionId] = useState<string | null>(null);
  const [twoFactorUserId, setTwoFactorUserId] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  // Check if user is already signed in
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      if (!isModal) {
        // Use window.location for reliable redirect that preserves callbackUrl
        window.location.href = callbackUrl;
      }
    }
  }, [status, session?.user, callbackUrl, isModal]);

  // Handle redirect after successful sign-in
  useEffect(() => {
    if (success && status === 'authenticated' && session?.user) {
      if (!isModal) {
        // Use window.location for reliable redirect that preserves callbackUrl
        const timer = setTimeout(() => {
          window.location.href = callbackUrl;
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [success, status, session?.user, callbackUrl, isModal]);

  const handleFormSubmit = async (formData: Record<string, string>) => {
    if (isSubmittingRef.current || isLoading) return;
    isSubmittingRef.current = true;
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
      isSubmittingRef.current = false;
      setIsLoading(false);
    }
  };

  const handleSignIn = async (formData: Record<string, string>) => {
    // Clear previous states immediately
    setError('');
    setSuccess('');
    
    try {
      // Verify credentials and check for 2FA
      const verifyResponse = await fetch('/api/auth/verify-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          portal: layoutVariant,
        }),
      });

      const verifyResult = await verifyResponse.json();

      if (!verifyResult.success) {
        // Handle specific error codes
        if (verifyResult.code === 'EMAIL_NOT_VERIFIED') {
          setEmail(formData.email);
          setVerificationType('email-verification');
          await handleSendCode(formData.email, 'email-verification');
          setSuccess('Account not verified. Verification code sent.');
          return;
        }

        if (verifyResult.code === 'OAUTH_USER') {
          setError('Please use the "Continue with Google" button.');
          return;
        }

        setError(verifyResult.error || 'Invalid email or password.');
        return;
      }

      // Check if 2FA is required
      if (verifyResult.requiresTwoFactor && verifyResult.sessionId) {
        setTwoFactorSessionId(verifyResult.sessionId);
        setTwoFactorUserId(verifyResult.userId);
        setEmail(formData.email);
        setVerificationType('passwordless-login');
        setMode('verify-code');
        setSuccess('Please enter the 6-digit code sent to your email.');
        return;
      }

      // No 2FA required - proceed with normal NextAuth sign-in
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        portal: layoutVariant,
        redirect: false,
      });

      if (result?.ok) {
        // Clear errors first
        setError('');
        setSuccess('Sign in successful! Redirecting...');
        
        if (verifyResult.user) {
          const u = verifyResult.user;
          posthog.identify(u.id || u._id, {
            email: u.email,
            name: u.name || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || undefined,
          });
          posthog.capture('user_signed_in', {
            auth_method: 'password',
            email: u.email,
          });
        }
        
        const redirectUrl = await determineRedirectUrl(verifyResult.user, callbackUrl);
        // Force immediate redirection if possible to avoid state flashes
        if (!isModal) {
          window.location.assign(redirectUrl);
        }
      } else {
        // Sign in failed, show error and ensure success is empty
        setSuccess('');
        let errorMessage = 'Invalid email or password.';

        if (result?.error === 'CredentialsSignin') {
          errorMessage = 'Invalid email or password. Please check your credentials.';
        } else if (result?.error === 'Configuration') {
          errorMessage = 'Service unavailable. Please try again.';
        } else if (result?.error === 'AccessDenied') {
          errorMessage = 'Access denied. Please contact support.';
        } else if (result?.error) {
          errorMessage = result.error;
        }

        setError(errorMessage);
      }
    } catch (error: any) {
      setSuccess('');
      console.error('❌ Sign in error:', error);
      setError('Sign in failed. Please try again.');
    }
  };

  /**
   * Determine the appropriate redirect URL based on user role and setup status
   */
  const determineRedirectUrl = async (user: any, defaultUrl: string): Promise<string> => {
    // If user is admin, check if they need to see the dashboard selector
    if (user.role === 'admin' || user.role === 'superadmin') {
      // Check if admin has already seen the selector (stored in localStorage client-side)
      // This will be handled by the admin layout component
      return '/admin';
    }

    // Regular user goes to standard dashboard
    return defaultUrl;
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
      setRemainingAttempts(3);
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

  const handleSendCode = async (emailInput: string, type: 'email-verification' | 'passwordless-login' | 'password-reset') => {
    setError('');
    setSuccess('');

    // Step 1: Validate email exists (fast check)
    if (type === 'passwordless-login') {
      try {
        const checkRes = await fetch('/api/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput }),
        });
        const checkData = await checkRes.json();
        if (!checkData.exists) {
          setError('No account found with this email. Please sign up first.');
          return;
        }
      } catch {
        setError('Failed to verify email. Please try again.');
        return;
      }
    }

    // Step 2: Navigate to code screen immediately + send code in parallel
    setEmail(emailInput);
    setVerificationType(type);
    setMode('verify-code');
    setCooldownSeconds(60);
    setRemainingAttempts(3);
    setSendingCode(true);

    // Send code in background (don't await before navigating)
    fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput, type }),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!result.success) {
          setError(result.message || 'Failed to send verification code. Please try again.');
        }
      })
      .catch(() => {
        setError('Failed to send verification code. Please try again.');
      })
      .finally(() => {
        setSendingCode(false);
      });
  };

  const handleCodeVerification = async (code: string) => {
    if (isSubmittingRef.current || isLoading) return;
    isSubmittingRef.current = true;
    setIsLoading(true);
    setError('');

    try {
      // Check if this is a 2FA verification (has twoFactorSessionId)
      if (twoFactorSessionId) {
        // Verify AND consume the 2FA code in one call.
        //
        // This used to call /api/auth/two-factor/verify first and then
        // /api/auth/complete-two-factor-signin with the same sessionId. The code is
        // single-use, so the first call consumed it and the second always failed with
        // "Invalid or expired session. Please sign in again." — every 2FA sign-in broke.
        // It also burned two of the three allowed attempts on a correct code.
        const completeResponse = await fetch('/api/auth/complete-two-factor-signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: twoFactorSessionId,
            code,
          }),
        });

        const completeResult = await completeResponse.json();

        if (!completeResult.success) {
          const message: string = completeResult.error || 'Invalid or expired code. Please try again.';

          // Once the session is gone (too many attempts, or expired) there is nothing
          // left to retry against — clear it so the UI can't offer a dead code entry.
          if (
            message.includes('Too many failed attempts') ||
            message.includes('Invalid or expired session')
          ) {
            setTwoFactorSessionId(null);
            setTwoFactorUserId(null);
            setRemainingAttempts(0);
          } else if (typeof completeResult.attemptsRemaining === 'number') {
            setRemainingAttempts(completeResult.attemptsRemaining);
          }

          setError(message);
          return;
        }

        // Create NextAuth session
        const sessionResponse = await fetch('/api/auth/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: completeResult.userId,
            email: completeResult.email,
          }),
          credentials: 'include',
        });

        const sessionResult = await sessionResponse.json();

        if (!sessionResult.success) {
          setError(
            sessionResult.error || 'Failed to create session. Please try again.'
          );
          return;
        }

        // Success - redirect
        setTwoFactorSessionId(null);
        setSuccess('Sign in successful! Redirecting...');
        setTimeout(() => {
          if (!isModal) {
            window.location.href = callbackUrl;
          }
        }, 1000);
        return;
      }

      // Handle different verification types
      switch (verificationType) {
        case 'passwordless-login': {
          try {
            // For passwordless login, verify code and sign in directly with NextAuth
            // The passwordless provider will handle verification and user creation

            const signInResult = await Promise.race([
              signIn('passwordless', {
                email,
                verificationCode: code,
                portal: layoutVariant,
                redirect: false
              } as any),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Sign-in request timed out after 30 seconds')), 30000)
              )
            ]) as any;


            if ((signInResult as any)?.ok) {
              setSuccess('Authentication successful, redirecting...');
              posthog.capture('user_signed_in', {
                auth_method: 'passwordless',
                email,
              });
              setTimeout(() => {
                if (!isModal) {
                  window.location.href = callbackUrl;
                }
              }, 800);
            } else {
              // If sign-in fails, try to verify via API to get better error message
              try {
                const verifyResponse = await fetch('/api/auth/verify-and-signin', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email,
                    code,
                    type: 'passwordless-login'
                  }),
                });

                if (!verifyResponse.ok) {
                  throw new Error(`HTTP error! status: ${verifyResponse.status}`);
                }

                const verifyResult = await verifyResponse.json();

                if (!verifyResult.success) {
                  setError(verifyResult.message || 'Invalid or expired code. Please request a new one.');
                  setRemainingAttempts(verifyResult.remainingAttempts || 0);
                } else {
                  // Code is valid but NextAuth sign-in failed - the code was already consumed
                  setError('Code was verified but sign-in failed. The code may have been used. Please request a new code and try again.');
                }
              } catch (fetchError: any) {
                console.error('Failed to fetch verification status:', fetchError);
                // If the fetch fails, check if it's a network error
                if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
                  setError('Network error: Unable to connect to the server. Please check your internet connection and try again.');
                } else {
                  setError((signInResult as any)?.error || 'Failed to sign you in. Please try again.');
                }
              }
            }
          } catch (err: any) {
            console.error('Passwordless NextAuth sign-in failed:', err);

            // Check if it's a network error
            if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
              setError('Network error: Unable to connect to the server. Please check your internet connection and try again.');
            } else if (err.message) {
              setError(err.message);
            } else {
              setError('Failed to sign you in with the code. Please try again.');
            }
          } finally {
            setIsLoading(false);
          }
          return;
        }

        case 'password-reset': {
          // Handle password reset verification
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
            // Store reset token and show password reset form
            setResetToken(result.resetToken);
            setShowPasswordResetForm(true);
            setSuccess('');
          } else {
            setError(result.message || 'Invalid verification code.');
            setRemainingAttempts(result.remainingAttempts || 0);
          }
          return;
        }

        default: {
          // Handle other verification types (email-verification)
          // For email-verification, use atomic signup endpoint directly (no double verification)
          if (verificationType === 'email-verification') {

            try {
              // Data is already stored in database via session ID, no need to preserve localStorage
              // The draft will automatically link to the user when they authenticate

              // Step 1: Verify code and mark user as verified (atomic-signup)
              const atomicSignupResponse = await fetch('/api/auth/atomic-signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code }),
              });

              if (!atomicSignupResponse.ok) {
                const errorData = await atomicSignupResponse.json();
                setError(errorData.message || 'Invalid or expired code. Please try again.');
                setRemainingAttempts(errorData.remainingAttempts || 0);
                setIsLoading(false);
                return;
              }

              const atomicSignupResult = await atomicSignupResponse.json();

              if (!atomicSignupResult.success || !atomicSignupResult.user) {
                setError('Verification failed. Please try again.');
                setIsLoading(false);
                return;
              }


              // Step 2: Create session server-side (more reliable than client-side signIn)
              setSuccess('Email verified! Creating session...');

              const sessionResponse = await fetch('/api/auth/create-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: atomicSignupResult.user.id }),
                credentials: 'include' // Important: include cookies
              });

              if (!sessionResponse.ok) {
                const errorData = await sessionResponse.json();
                // Fallback: Try client-side NextAuth signIn as backup

                const signInResult = await Promise.race([
                  signIn('passwordless', {
                    email,
                    verificationCode: atomicSignupResult.sessionToken || 'fallback',
                    preVerified: 'true',
                    portal: layoutVariant,
                    redirect: false
                  } as any),
                  new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Sign-in timed out')), 30000)
                  )
                ]) as any;

                if (signInResult?.ok) {
                  setSuccess('Signed in! Redirecting...');
                  setTimeout(() => {
                    window.location.href = callbackUrl;
                  }, 500);
                } else {
                  setError('Verification succeeded but sign-in failed. Please try signing in manually.');
                  setTimeout(() => {
                    setMode('signin');
                    setError('');
                  }, 2000);
                }
                setIsLoading(false);
                return;
              }

              const sessionResult = await sessionResponse.json();

              if (sessionResult.success) {
                setSuccess('Signed in! Redirecting...');

                // Force a page reload to pick up the new session cookie
                // This ensures NextAuth recognizes the session
                setTimeout(() => {
                  if (!isModal) {
                    window.location.href = callbackUrl;
                  }
                }, 500);
              } else {
                setError('Failed to create session. Please try signing in manually.');
              }

            } catch (signupError: any) {
              console.error('❌ Atomic verify-and-signin error:', signupError);

              // Check if it's a network error
              if (signupError instanceof TypeError && signupError.message.includes('Failed to fetch')) {
                setError('Network error: Unable to connect to server. Please check your internet connection and try again.');
              } else if (signupError.message?.includes('timed out')) {
                setError('Request timed out. Please try again.');
              } else if (signupError.message) {
                setError(signupError.message);
              } else {
                setError('Failed to verify and sign in. Please try again.');
              }
            } finally {
              setIsLoading(false);
            }
            return; // Exit early since we handled the signup
          }

          // For other verification types (password-reset), use verify-and-signin
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
            // Redirect to callbackUrl
            setTimeout(() => {
              if (!isModal) {
                window.location.href = callbackUrl;
              }
            }, 1500);
          } else {
            setError(result.message || 'Invalid verification code.');
            setRemainingAttempts(result.remainingAttempts || 0);
          }
        }
      }
    } catch (error: any) {
      console.error('Code verification error:', error);
      setError('Failed to verify code. Please try again.');
    } finally {
      isSubmittingRef.current = false;
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setSuccess('');
    setSendingCode(true);

    fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, type: verificationType }),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!result.success) {
          setError(result.message || 'Failed to resend code. Please try again.');
        } else {
          setCooldownSeconds(60);
        }
      })
      .catch(() => {
        setError('Failed to resend code. Please try again.');
      })
      .finally(() => {
        setSendingCode(false);
      });
  };

  const handlePasswordResetSubmit = async (formData: Record<string, string>) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!resetToken) {
        setError('Reset token is missing. Please request a new code.');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          token: resetToken,
          password: formData.password
        }),
      });

      const result = await response.json();

      if (response.ok && !result.error) {
        setSuccess('Password reset successfully! Redirecting to sign in...');
        setTimeout(() => {
          setMode('signin');
          setShowPasswordResetForm(false);
          setResetToken(null);
          setEmail('');
          setSuccess('');
          setError('');
          setRemainingAttempts(3);
        }, 2000);
      } else {
        setError(result.error || 'Failed to reset password. Please try again.');
        setRemainingAttempts(result.remainingAttempts || 0);
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError('Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
        setRemainingAttempts(3);
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
      await signIn('google', { callbackUrl: callbackUrl });
    } catch (error: any) {
      console.error('Google auth error:', error);
      setError('Failed to sign in with Google. Please try again.');
      setIsLoading(false);
    }
  };

   const handleAppleAuth = async () => {
    setIsLoading(true);
    setError('');

    try {
      await signIn('apple', { callbackUrl: callbackUrl });
    } catch (error: any) {
      console.error('Apple auth error:', error);
      setError('Failed to sign in with Apple. Please try again.');
      setIsLoading(false);
    }
  };

  const handleLinkedInAuth = async () => {
    setIsLoading(true);
    setError('');

    try {
      await signIn('linkedin', { callbackUrl: callbackUrl });
    } catch (error: any) {
      console.error('LinkedIn auth error:', error);
      setError('Failed to sign in with LinkedIn. Please try again.');
      setIsLoading(false);
    }
  };

  const handleDevBypass = async (role: 'user' | 'admin') => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/dev-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`Bypass login successful! Redirecting...`);
        if (result.user) {
          posthog.identify(result.user.id, {
            email: result.user.email,
            name: result.user.name,
          });
          posthog.capture('user_signed_in', {
            auth_method: 'dev_bypass',
            email: result.user.email,
            role: result.user.role,
          });
        }
        
        setTimeout(() => {
          if (role === 'admin') {
            window.location.href = '/admin';
          } else {
            window.location.href = callbackUrl || '/dashboard/jobs';
          }
        }, 800);
      } else {
        setError(result.error || 'Bypass login failed.');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('Dev bypass error:', err);
      setError('An error occurred during dev bypass login.');
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
        return isModal ? 'Sign in to AIResume' : 'Sign In';
      case 'signup':
        return isModal ? 'Join AIResume' : 'Create your account';
      case 'reset':
        return 'Reset Password';
      case 'magic-link':
        return 'Sign In with Code';
      default:
        return isModal ? 'Sign in to AIResume' : 'Sign In';
    }
  };

  const getSubtitle = () => {
    if (isModal) return null; // Don't show subtitle in modal
    switch (mode) {
      case 'signin':
        return 'Welcome back! Please enter your credentials to access your account.';
      case 'signup':
        return 'Sign up now to start managing your job applications and CVs.';
      case 'reset':
        return 'Enter your email address and we\'ll send you a 6-digit code to reset your password.';
      case 'magic-link':
        return 'Enter your email address and we\'ll send you a 6-digit code to sign in without a password.';
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
        return null;
      case 'signup':
        return null;
      case 'reset':
        return (
          <div className="w-12 h-12 rounded-sm border-2 border-[#013f2e] flex items-center justify-center mb-6 mx-auto">
            <svg className="w-6 h-6 text-[#013f2e]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
            </svg>
          </div>
        );
      case 'verify-code':
        return (
          <div className="w-12 h-12 rounded-sm border-2 border-[#013f2e] flex items-center justify-center mb-6 mx-auto">
            <svg className="w-6 h-6 text-[#013f2e]" fill="currentColor" viewBox="0 0 24 24">
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
            <p className="text-gray-600 dark:text-white/70 text-small text-center">
              Forgot Password?{' '}
              <button
                onClick={() => switchMode('reset')}
                className="text-[#36D39B] hover:text-[#4DDCB0] transition-colors duration-200 font-semibold underline underline-offset-2"
              >
                Reset Password
              </button>
            </p>
          </div>
        );

      case 'signup':
        return null;

      case 'reset':
        return (
          <div className="space-y-3">
            <p className="text-gray-600 dark:text-white/70 text-small text-center">
              Remember your password?{' '}
              <button
                onClick={() => switchMode('signin')}
                className="text-[#36D39B] hover:text-[#4DDCB0] transition-colors duration-200 font-semibold underline underline-offset-2"
              >
                Sign In
              </button>
            </p>
            {layoutVariant === 'default' && (
              <p className="text-gray-400 text-small text-center">
                {"Don't have an account?"}{' '}
                <button
                  onClick={() => switchMode('signup')}
                  className="text-[#36D39B] hover:text-[#4DDCB0] transition-colors duration-200 font-semibold underline underline-offset-2"
                >
                  Sign up here
                </button>
              </p>
            )}
          </div>
        );

      case 'magic-link':
        return (
          <div className="space-y-3">
            <p className="text-gray-400 text-small text-center">
              Prefer password?{' '}
              <button
                onClick={() => switchMode('signin')}
                className="text-[#36D39B] hover:text-[#4DDCB0] transition-colors duration-200 font-semibold underline underline-offset-2"
              >
                Sign in with password
              </button>
            </p>
            {layoutVariant === 'default' && (
              <p className="text-gray-400 text-small text-center">
                {"Don't have an account?"}{' '}
                <button
                  onClick={() => switchMode('signup')}
                  className="text-[#36D39B] hover:text-[#4DDCB0] transition-colors duration-200 font-semibold underline underline-offset-2"
                >
                  Sign up here
                </button>
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

   const socialButtons = (mode !== 'magic-link' && mode !== 'verify-code' && layoutVariant === 'default') ? (
    <SocialAuthButtons
      onGoogleAuth={handleGoogleAuth}
      onAppleAuth={handleAppleAuth}
      onLinkedInAuth={handleLinkedInAuth}
      onMagicLinkAuth={mode === 'signin' ? () => switchMode('magic-link') : undefined}
      isLoading={isLoading}
      mode={mode === 'signup' ? 'signup' : 'signin'}
    />
  ) : null;

  // Show password reset form after code verification
  if (mode === 'verify-code' && showPasswordResetForm && verificationType === 'password-reset') {
    return (
      <UnifiedAuthLayout
        title="Set New Password"
        subtitle="Enter your new password"
        showBackButton={!isModal}
        backHref="/sign-in"
        backText="Back to Sign In"
        isModal={isModal}
        variant={layoutVariant}
      >
        <UnifiedAuthForm
          fields={[
            {
              name: 'password',
              type: 'password',
              label: 'New Password',
              placeholder: 'Enter your new password',
              required: true,
              autoComplete: 'new-password',
              icon: <Lock className="w-4 h-4" />,
              validation: passwordValidation,
              showPasswordToggle: true
            },
            {
              name: 'confirmPassword',
              type: 'password',
              label: 'Confirm Password',
              placeholder: 'Confirm your new password',
              required: true,
              autoComplete: 'new-password',
              icon: <Lock className="w-4 h-4" />,
              validation: (value: string, password?: string) => confirmPasswordValidation(value, password || ''),
              showPasswordToggle: true
            }
          ]}
          onSubmit={handlePasswordResetSubmit}
          submitText="Reset Password"
          isLoading={isLoading}
          error={error}
          success={success}
        />
      </UnifiedAuthLayout>
    );
  }

  // Show code verification screen
  if (mode === 'verify-code') {
    return (
      <UnifiedAuthLayout
        title="Verification Required"
        subtitle="Please verify your identity"
        showBackButton={false}
        backHref="/sign-in"
        backText="Back to Login"
        isModal={isModal}
        variant={layoutVariant}
      >
        <CodeVerificationScreen
          email={email}
          type={verificationType}
          onCodeVerified={handleCodeVerification}
          onResendCode={handleResendCode}
          isLoading={isLoading}
          sendingCode={sendingCode}
          error={error}
          success={success}
          remainingAttempts={remainingAttempts}
          cooldownSeconds={cooldownSeconds}
          onBack={() => {
            setMode('signin');
            setEmail('');
            setError('');
            setSuccess('');
          }}
        />
      </UnifiedAuthLayout>
    );
  }

  return (
    <UnifiedAuthLayout
      title={getTitle()}
      subtitle={getSubtitle()}
      showBackButton={!isModal && mode === 'verify-code'}
      backHref="/sign-in"
      backText="Back to Login"
      isModal={isModal}
      variant={layoutVariant}
    >
      {/* Mode Toggle Switch - Only show for signin/signup on default layout */}
      {(mode === 'signin' || mode === 'signup') && layoutVariant === 'default' && (
        <div className="mb-6 flex justify-center">
          <div className="relative inline-flex items-center bg-gray-100 dark:bg-[#1A1A1A] rounded-md p-1.5 border border-gray-200 dark:border-white/10">
            <motion.button
              type="button"
              onClick={() => switchMode('signin')}
              className={`relative px-8 py-3 text-body font-bold rounded-sm transition-all duration-300 z-10 ${
                mode === 'signin'
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-800 dark:text-white/60 dark:hover:text-white'
              }`}
            >
              Sign In
            </motion.button>
            <motion.button
              type="button"
              onClick={() => switchMode('signup')}
              className={`relative px-8 py-3 text-body font-bold rounded-sm transition-all duration-300 z-10 ${
                mode === 'signup'
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-800 dark:text-white/60 dark:hover:text-white'
              }`}
            >
              Sign Up
            </motion.button>
            {/* Animated Pill Background */}
            <motion.div
              className="absolute top-1.5 bottom-1.5 bg-[#013f2e] rounded-sm z-0 shadow-sm"
              initial={false}
              animate={{
                left: mode === 'signin' ? '0.375rem' : '50%',
                right: mode === 'signup' ? '0.375rem' : '50%',
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>
        </div>
      )}

      {/* Icon */}
      {!isModal && getIcon()}

      {/* Title */}
      <h2 className="text-h2 font-bold text-gray-900 dark:text-white mb-2 text-center">
        {getTitle()}
      </h2>

      {/* Subtitle */}
      {!isModal && (
        <p className="text-gray-600 dark:text-white/70 text-body mb-6 text-center">
          {getSubtitle()}
        </p>
      )}

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
                type="button"
                onClick={() => handleSendCode(email, 'passwordless-login')}
                disabled={isLoading || checkingEmail}
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#013f2e] to-[#013f2e]/90 hover:from-[#025c43] hover:to-[#013f2e] text-white font-bold py-3 px-6 rounded-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {isLoading || checkingEmail ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z" />
                  </svg>
                )}
                {isLoading ? 'Sending code...' : 'Send me a code'}
              </button>
            </motion.div>
          )}

          {/* Dev Bypass Buttons — local dev only. The route re-checks the env
              flag AND that the request came from localhost, so this render hint
              is cosmetic, not the security boundary. */}
          {DEV_BYPASS_CLIENT_ENABLED && mode === 'signin' && (
            <div className="mt-6 pt-6 border-t border-dashed border-gray-200 dark:border-white/10 text-center">
              <div className="text-xs font-bold tracking-widest text-gray-400 dark:text-white/40 uppercase mb-3 flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#013f2e] animate-ping" />
                Dev Bypass Login
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDevBypass('user')}
                  disabled={isLoading}
                  className="px-3 py-2 text-xs font-semibold bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 text-gray-800 dark:text-white/80 rounded border border-gray-200 dark:border-white/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  User
                </button>
                <button
                  type="button"
                  onClick={() => handleDevBypass('admin')}
                  disabled={isLoading}
                  className="px-3 py-2 text-xs font-semibold bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 text-gray-800 dark:text-white/80 rounded border border-gray-200 dark:border-white/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Admin
                </button>
              </div>
            </div>
          )}

          {/* Footer Links */}
          <div className="mt-8">
            {getFooter()}

            {/* Privacy Policy and Terms */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600/30">
              <div className="flex justify-center space-x-4 text-small text-gray-500 dark:text-gray-400">
                <a
                  href="/legal#privacy"
                  target="_blank"
                  className="hover:text-[#88E03F] transition-colors duration-200"
                >
                  Privacy Policy
                </a>
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <a
                  href="/legal#terms"
                  target="_blank"
                  className="hover:text-[#88E03F] transition-colors duration-200"
                >
                  Terms of Service
                </a>
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <a
                  href="/legal#support"
                  target="_blank"
                  className="hover:text-[#88E03F] transition-colors duration-200"
                >
                  Support
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
export default function UnifiedAuthPage({ initialMode = 'signin', layoutVariant = 'default', callbackUrl }: AuthPageProps) {
  return <UnifiedAuthPageContent initialMode={initialMode} layoutVariant={layoutVariant} callbackUrl={callbackUrl} />;
}
