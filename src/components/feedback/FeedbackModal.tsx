'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Send } from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  userName,
  userEmail,
}) => {
  const { isDark } = useTheme();
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 3000);
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: userName,
          email: userEmail,
          rating,
          message: message.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitStatus('success');
        setTimeout(() => {
          onClose();
          setRating(0);
          setMessage('');
          setSubmitStatus('idle');
        }, 2000);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setRating(0);
      setMessage('');
      setSubmitStatus('idle');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`relative w-full max-w-md rounded-xl shadow-2xl ${
            isDark
              ? 'bg-[rgb(34,43,34)] border border-white/10'
              : 'bg-white border border-gray-200'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
            <h2 className={`text-xl font-semibold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Share Your Feedback
            </h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark
                  ? 'text-gray-400 hover:text-white hover:bg-white/10'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Status Messages */}
            <AnimatePresence mode="wait">
              {submitStatus === 'success' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm"
                >
                  Thank you for your feedback! We appreciate it.
                </motion.div>
              )}
              {submitStatus === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm"
                >
                  {rating === 0
                    ? 'Please select a rating'
                    : 'Failed to submit feedback. Please try again.'}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Name Field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <label
                htmlFor="feedback-name"
                className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Name
              </label>
              <input
                type="text"
                id="feedback-name"
                value={userName}
                disabled
                className={`w-full px-4 py-2.5 rounded-lg transition-all duration-200 ${
                  isDark
                    ? 'bg-[rgb(26,26,26)] border border-white/10 text-gray-300'
                    : 'bg-gray-50 border border-gray-200 text-gray-700'
                } disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent`}
              />
            </motion.div>

            {/* Email Field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <label
                htmlFor="feedback-email"
                className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Email
              </label>
              <input
                type="email"
                id="feedback-email"
                value={userEmail}
                disabled
                className={`w-full px-4 py-2.5 rounded-lg transition-all duration-200 ${
                  isDark
                    ? 'bg-[rgb(26,26,26)] border border-white/10 text-gray-300'
                    : 'bg-gray-50 border border-gray-200 text-gray-700'
                } disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent`}
              />
            </motion.div>

            {/* Rating Stars */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <label className={`block text-sm font-medium mb-3 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Rating <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    disabled={isSubmitting}
                    className="focus:outline-none transition-transform duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors duration-200 ${
                        star <= (hoveredRating || rating)
                          ? 'fill-[rgb(129,255,0)] text-[rgb(129,255,0)]'
                          : isDark
                          ? 'text-gray-600'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Message Field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
            >
              <label
                htmlFor="feedback-message"
                className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Message (Optional)
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isSubmitting}
                rows={4}
                placeholder="Tell us what you think..."
                className={`w-full px-4 py-2.5 rounded-lg resize-none transition-all duration-200 ${
                  isDark
                    ? 'bg-[rgb(26,26,26)] border border-white/10 text-white placeholder-gray-500'
                    : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                } disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent`}
              />
            </motion.div>

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <button
                type="submit"
                disabled={isSubmitting || rating === 0}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                  isSubmitting || rating === 0
                    ? 'bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed'
                    : 'bg-[rgb(129,255,0)] hover:bg-[rgb(110,230,0)] text-black shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
                } disabled:transform-none`}
              >
                {isSubmitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-black border-t-transparent rounded-full"
                    />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Submit Feedback</span>
                  </>
                )}
              </button>
            </motion.div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FeedbackModal;

