'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnnouncementBannerProps {
  onDismiss?: () => void;
}

export default function AnnouncementBanner({ onDismiss }: AnnouncementBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('airesume_rebrand_banner_dismissed');
      if (!dismissed) {
        setIsVisible(true);
      }
    } catch {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem('airesume_rebrand_banner_dismissed', 'true');
    } catch {}
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed top-0 left-0 right-0 z-[100000] bg-[#0c100a]/95 backdrop-blur-md border-b border-[#81ff00]/25 text-white overflow-hidden shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3 text-xs sm:text-[13px]">
          {/* Center Message */}
          <div className="flex-1 flex items-center justify-center gap-2 text-center text-gray-200">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#81ff00]/15 border border-[#81ff00]/30 text-[10px] font-extrabold uppercase tracking-wide text-[#81ff00] shrink-0">
              <Sparkles className="w-2.5 h-2.5" />
              Update
            </span>
            <span className="leading-snug">
              <strong className="font-bold text-white">CVCIRCLE</strong> is now <strong className="font-extrabold text-[#81ff00]">AIRESUME</strong> with fully automated job application features.
            </span>
          </div>

          {/* Dismiss Button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
