'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie } from 'lucide-react';
import { 
  getCookieConsentStatus, 
  setCookieConsentStatus, 
  initializeAnalytics, 
  initializeMarketing 
} from '@/lib/utils/cookieUtils';

interface CookieConsentProps {
  onAccept?: () => void;
  onDecline?: () => void;
}

const CookieConsent: React.FC<CookieConsentProps> = ({ 
  onAccept, 
  onDecline 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const currentConsent = getCookieConsentStatus();
    if (!currentConsent) {
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    setCookieConsentStatus('accepted');
    initializeAnalytics();
    initializeMarketing();
    setIsVisible(false);
    onAccept?.();
  };

  const handleDeclineAll = () => {
    setCookieConsentStatus('declined');
    setIsVisible(false);
    onDecline?.();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-6 left-0 right-0 z-[99999] flex justify-center px-4 pointer-events-none">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="w-full max-w-[850px] pointer-events-auto"
        >
          <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 md:py-5 md:px-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
            {/* Left Content */}
            <div className="flex items-center gap-4 text-left w-full md:w-auto">
              <div className="flex-shrink-0 w-12 h-12 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center">
                <Cookie className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col gap-0.5">
                <h4 className="text-white text-sm md:text-base font-semibold leading-tight">
                  A better experience starts with cookies
                </h4>
                <p className="text-white/60 text-xs md:text-sm leading-normal font-light">
                  Your data, your choice. We use cookies to improve how things work here.
                </p>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end shrink-0">
              <button
                onClick={handleDeclineAll}
                className="flex-1 md:flex-initial px-5 py-2.5 border border-white/15 bg-transparent hover:bg-white/5 text-white text-xs md:text-sm font-semibold rounded-xl transition-colors duration-200"
              >
                Reject all
              </button>
              <button
                onClick={handleAcceptAll}
                className="flex-1 md:flex-initial px-5 py-2.5 bg-[#013f2e] hover:bg-[#025c43] text-white text-xs md:text-sm font-bold rounded-xl shadow-lg transition-colors duration-200"
              >
                Accept all
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CookieConsent;
