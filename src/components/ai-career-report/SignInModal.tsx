'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, CheckCircle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const router = useRouter();

  const handleSignIn = () => {
    const callbackUrl = '/ai-career-report?step=3';
    router.push(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  };

  const handleSignUp = () => {
    const callbackUrl = '/ai-career-report?step=3';
    router.push(`/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-[#222B22] border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#80FF00] rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-black" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Unlock Your Full Career Report
              </h2>
              <p className="text-white/70 text-sm">
                Sign in to access your personalized AI-powered career insights and save your Master CV
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-white/80">
                <CheckCircle className="w-5 h-5 text-[#80FF00] flex-shrink-0" />
                <span className="text-sm">Save your Master CV for future use</span>
              </div>
              <div className="flex items-center gap-3 text-white/80">
                <CheckCircle className="w-5 h-5 text-[#80FF00] flex-shrink-0" />
                <span className="text-sm">Access detailed career path analysis</span>
              </div>
              <div className="flex items-center gap-3 text-white/80">
                <CheckCircle className="w-5 h-5 text-[#80FF00] flex-shrink-0" />
                <span className="text-sm">Get personalized skill recommendations</span>
              </div>
              <div className="flex items-center gap-3 text-white/80">
                <CheckCircle className="w-5 h-5 text-[#80FF00] flex-shrink-0" />
                <span className="text-sm">Create unlimited CVs and cover letters</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                onClick={handleSignIn}
                className="w-full bg-[#80FF00] text-black px-6 py-3 rounded-lg font-semibold hover:bg-[#70e600] transition-colors flex items-center justify-center gap-2"
              >
                Sign In
                <ArrowRight size={16} />
              </button>
              <button
                onClick={handleSignUp}
                className="w-full bg-[#333333] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#444444] transition-colors"
              >
                Create Account
              </button>
            </div>

            {/* Footer */}
            <p className="text-center text-white/50 text-xs mt-6">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
