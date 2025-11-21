'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cookie, Shield, Settings } from 'lucide-react';
import { getCookieConsentStatus, setCookieConsentStatus, initializeAnalytics, initializeMarketing } from '@/lib/utils/cookieUtils';

interface CookieConsentProps {
  onAccept?: () => void;
  onDecline?: () => void;
  onClose?: () => void;
}

const CookieConsent: React.FC<CookieConsentProps> = ({ 
  onAccept, 
  onDecline, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const cookieConsent = getCookieConsentStatus();
    
    // Check for expiry date and clear if expired
    if (typeof window !== 'undefined') {
      try {
        const expiryStr = localStorage.getItem('cookieConsentExpiry');
        if (expiryStr) {
          const expiryDate = new Date(expiryStr);
          if (new Date() > expiryDate) {
            // Consent has expired, clear it
            localStorage.removeItem('cookieConsent');
            localStorage.removeItem('cookieConsentExpiry');
          }
        }
      } catch (error) {
        console.error('Error checking cookie consent expiry:', error);
      }
    }
    
    // Only show if no valid consent exists
    const currentConsent = getCookieConsentStatus();
    if (!currentConsent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // User has already made a choice, don't show
      setIsVisible(false);
    }
  }, []);

  const handleAccept = () => {
    setIsAnimating(true);
    setCookieConsentStatus('accepted');
    // Initialize analytics and marketing tools
    initializeAnalytics();
    initializeMarketing();
    setTimeout(() => {
      setIsVisible(false);
      onAccept?.();
    }, 300);
  };

  const handleDecline = () => {
    setIsAnimating(true);
    setCookieConsentStatus('declined');
    setTimeout(() => {
      setIsVisible(false);
      onDecline?.();
    }, 300);
  };

  const handleClose = () => {
    setIsAnimating(true);
    setCookieConsentStatus('accepted'); // Default to accept
    // Initialize analytics and marketing tools
    initializeAnalytics();
    initializeMarketing();
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ 
          duration: 0.4, 
          ease: [0.4, 0, 0.2, 1],
          opacity: { duration: 0.3 }
        }}
        className="fixed bottom-0 left-0 right-0 z-[99999] bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-t border-white/10 backdrop-blur-xl"
        style={{
          background: 'rgba(17, 24, 39, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          zIndex: 99999
        }}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-lime-400/5 via-blue-400/5 to-lime-400/5" />
        
        <div className="relative px-4 tablet:px-6 desktop:px-8 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col tablet:flex-row items-center justify-between gap-3">
              {/* Content */}
              <div className="flex items-center gap-3 flex-1">
                <motion.div
                  className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-lime-400 to-lime-500 rounded-lg flex items-center justify-center shadow-lg"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <Cookie size={18} className="text-white" />
                </motion.div>
                
                <div className="flex-1">
                  <p className="text-white/90 text-sm leading-relaxed">
                    We use cookies to enhance your experience and analyze site traffic. 
                    <a href="/cookie-policy" className="text-lime-400 hover:text-lime-300 underline ml-1">Learn more</a>
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <motion.button
                  onClick={handleDecline}
                  className="px-3 py-1.5 text-xs font-medium text-white/70 hover:text-white transition-colors duration-200 border border-white/20 hover:border-white/40 rounded-md backdrop-blur-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isAnimating}
                >
                  Decline
                </motion.button>
                
                <motion.button
                  onClick={handleAccept}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-500 hover:to-lime-600 rounded-md shadow-lg transition-all duration-200"
                  whileHover={{ 
                    scale: 1.02,
                    boxShadow: "0 10px 25px -5px rgba(132, 204, 22, 0.4)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isAnimating}
                >
                  Accept
                </motion.button>
                
                <motion.button
                  onClick={handleClose}
                  className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-md transition-all duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={isAnimating}
                  title="Close (Accept)"
                >
                  <X size={16} />
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CookieConsent;
