'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, LogIn, User, Sparkles, Lock, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

interface AuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueGuest?: () => void;
  currentStep?: number;
}

export default function AuthPromptModal({
  isOpen,
  onClose,
  onContinueGuest,
  currentStep = 3
}: AuthPromptModalProps) {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleSignUp = () => {
    setIsRedirecting(true);
    // Save current state before redirect
    const callbackUrl = `/editor?restoreDraft=true&step=${currentStep}`;
    router.push(`/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  };

  const handleSignIn = () => {
    setIsRedirecting(true);
    // Save current state before redirect
    const callbackUrl = `/editor?restoreDraft=true&step=${currentStep}`;
    router.push(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  };

  const handleGoogleSignIn = async () => {
    setIsRedirecting(true);
    const callbackUrl = `/editor?restoreDraft=true&step=${currentStep}`;
    await signIn('google', {
      callbackUrl: callbackUrl,
      redirect: true
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-[#141810] rounded-2xl shadow-2xl shadow-black/30 dark:shadow-black/60 w-full max-w-md mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-white/10 bg-gradient-to-r from-[#80FF00]/10 to-[#80FF00]/5 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-[#80FF00]/20 rounded-lg">
                    <Lock className="w-6 h-6 text-[#80FF00]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Save Your Progress
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      Create an account to continue
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  disabled={isRedirecting}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a2015] rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 bg-white dark:bg-[#141810]">
              <div className="flex flex-col space-y-3 p-4 bg-amber-500/10 dark:bg-amber-500/5 rounded-xl border border-amber-500/20">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wider">
                      Temporary Guest Session
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      You are currently using a guest draft. If you do not sign in to sync your work, you will lose:
                    </p>
                  </div>
                </div>
                <ul className="space-y-1.5 pl-8 text-xs text-gray-700 dark:text-gray-300 list-disc leading-relaxed">
                  <li>
                    <strong className="text-amber-700 dark:text-amber-400">Live ATS History:</strong> All scanned keyword audits, formatting checks, and progress checklists will be permanently cleared.
                  </li>
                  <li>
                    <strong className="text-amber-700 dark:text-amber-400">Mori AI Chats & Letter Guides:</strong> Custom AI-generated cover letters, section guides, and chat logs will be lost.
                  </li>
                  <li>
                    <strong className="text-amber-700 dark:text-amber-400">Cloud Backup & Sync:</strong> Your edits are stored locally in this browser. Clearing cookies or switching devices will wipe your CV draft.
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                {/* Google Sign Up */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isRedirecting}
                  className="w-full px-4 py-3 bg-white dark:bg-[#1a2015] border-2 border-gray-200 dark:border-white/10 rounded-lg hover:border-[#80FF00] dark:hover:border-[#80FF00] transition-all flex items-center justify-center space-x-3 font-medium text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* Email Sign Up */}
                <button
                  onClick={handleSignUp}
                  disabled={isRedirecting}
                  className="w-full px-4 py-3 bg-lime-500 dark:bg-[#80FF00] text-black rounded-lg hover:bg-lime-600 dark:hover:bg-[#70e600] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Sign Up with Email</span>
                </button>

                {/* Sign In */}
                <button
                  onClick={handleSignIn}
                  disabled={isRedirecting}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-[#1a2015] text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-[#222327] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <LogIn className="w-5 h-5" />
                  <span>Already have an account? Sign In</span>
                </button>
              </div>

              {onContinueGuest && (
                <div className="pt-2 border-t border-gray-200 dark:border-white/10">
                  <button
                    onClick={onContinueGuest}
                    disabled={isRedirecting}
                    className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
                  >
                    Continue as guest (limited features)
                  </button>
                </div>
              )}

              {isRedirecting && (
                <div className="pt-2 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Redirecting...
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

