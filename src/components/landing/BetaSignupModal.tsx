'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, CheckCircle, AlertCircle, X } from 'lucide-react';

interface BetaSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoShow?: boolean;
}

const BetaSignupModal = ({ isOpen, onClose, autoShow = false }: BetaSignupModalProps) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [hasSeenPopup, setHasSeenPopup] = useState(false);

  // Check if user has seen the popup before
  useEffect(() => {
    if (autoShow) {
      const hasSeen = localStorage.getItem('beta-popup-seen');
      if (!hasSeen) {
        // Delay the popup by 2 seconds for better UX
        const timer = setTimeout(() => {
          setHasSeenPopup(false);
        }, 2000);
        return () => clearTimeout(timer);
      } else {
        setHasSeenPopup(true);
      }
    }
  }, [autoShow]);

  // Mark popup as seen when opened
  useEffect(() => {
    if (isOpen && autoShow) {
      localStorage.setItem('beta-popup-seen', 'true');
    }
  }, [isOpen, autoShow]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setSubmitStatus('error');
      setMessage('Please enter your email address');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/beta-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus('success');
        setMessage(data.message);
        setEmail('');
        // Auto close after 3 seconds on success
        setTimeout(() => {
          onClose();
          setSubmitStatus('idle');
          setMessage('');
        }, 3000);
      } else {
        setSubmitStatus('error');
        setMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      setSubmitStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      if (autoShow) {
        setHasSeenPopup(true);
      }
      setEmail('');
      setSubmitStatus('idle');
      setMessage('');
    }
  };

  return (
    <AnimatePresence>
      {(isOpen || (autoShow && !hasSeenPopup)) && (
        <motion.div
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-md mx-auto"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
              {/* Close Button */}
              <motion.button
                onClick={handleClose}
                className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                disabled={isSubmitting}
              >
                <X size={20} />
              </motion.button>
              
              {/* Don't Show Again Button (only for auto-show) */}
              {autoShow && (
                <motion.button
                  onClick={() => {
                    localStorage.setItem('beta-popup-seen', 'true');
                    setHasSeenPopup(true);
                    onClose();
                  }}
                  className="absolute top-4 left-4 text-white/40 hover:text-white/60 transition-colors text-xs px-3 py-1 rounded-full hover:bg-white/5"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={isSubmitting}
                >
                  Don't show again
                </motion.button>
              )}

              {/* Header */}
              <div className="text-center mb-8">
                <motion.h2
                  className="text-3xl font-bold text-white mb-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  Join the{' '}
                  <span className="text-lime-400 drop-shadow-[0_0_20px_rgba(132,204,22,0.3)]">
                    Beta
                  </span>
                </motion.h2>
                <motion.p
                  className="text-white/80 text-lg"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  Be among the first to experience the future of CV creation
                </motion.p>
                
                {/* Beta Warning */}
                <motion.div
                  className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <span className="text-2xl">⚠️</span>
                    </div>
                    <div className="text-left">
                      <p className="text-amber-400 font-medium text-sm mb-1">
                        Beta Disclaimer
                      </p>
                      <p className="text-white/70 text-xs leading-relaxed">
                        This is a product in development. Things might break, features might disappear, 
                        and our AI might occasionally suggest you add "Professional Ninja" to your skills. 
                        We promise to fix the bugs, but we can't guarantee the AI's sense of humor. 
                        Welcome to the wild west of CV creation! 🤠
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Form */}
              <motion.form
                onSubmit={handleSubmit}
                className="space-y-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {/* Email Input */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent backdrop-blur-sm transition-all"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-lime-400 to-lime-500 text-black px-8 py-4 rounded-full font-semibold text-lg shadow-2xl hover:shadow-lime-400/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                      <span>Joining...</span>
                    </div>
                  ) : (
                    <span>Join Beta</span>
                  )}
                </motion.button>
              </motion.form>

              {/* Status Message */}
              <AnimatePresence mode="wait">
                {submitStatus !== 'idle' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${
                      submitStatus === 'success' 
                        ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
                        : 'bg-red-500/20 border border-red-500/30 text-red-400'
                    }`}
                  >
                    {submitStatus === 'success' ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <AlertCircle className="h-5 w-5" />
                    )}
                    <span className="text-sm font-medium">{message}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Benefits */}
              <motion.div
                className="mt-8 grid grid-cols-1 gap-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center gap-3 text-white/70">
                  <div className="w-8 h-8 bg-lime-400/20 rounded-full flex items-center justify-center">
                    <span className="text-sm">🚀</span>
                  </div>
                  <span className="text-sm">Early access to new features</span>
                </div>
                <div className="flex items-center gap-3 text-white/70">
                  <div className="w-8 h-8 bg-lime-400/20 rounded-full flex items-center justify-center">
                    <span className="text-sm">💎</span>
                  </div>
                  <span className="text-sm">Exclusive benefits and discounts</span>
                </div>
                <div className="flex items-center gap-3 text-white/70">
                  <div className="w-8 h-8 bg-lime-400/20 rounded-full flex items-center justify-center">
                    <span className="text-sm">🎯</span>
                  </div>
                  <span className="text-sm">Help shape the future of CV creation</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BetaSignupModal;
