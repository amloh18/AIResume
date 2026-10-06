'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ANNOUNCEMENT_BANNER_HEIGHT,
  ANNOUNCEMENT_BANNER_HEIGHT_VAR,
} from '@/components/landing/announcementBannerConfig';

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

  useEffect(() => {
    if (!isVisible) {
      document.documentElement.style.removeProperty(ANNOUNCEMENT_BANNER_HEIGHT_VAR);
      document.documentElement.classList.remove('has-announcement-banner');
      return;
    }
    document.documentElement.style.setProperty(ANNOUNCEMENT_BANNER_HEIGHT_VAR, ANNOUNCEMENT_BANNER_HEIGHT);
    document.documentElement.classList.add('has-announcement-banner');
    return () => {
      document.documentElement.style.removeProperty(ANNOUNCEMENT_BANNER_HEIGHT_VAR);
      document.documentElement.classList.remove('has-announcement-banner');
    };
  }, [isVisible]);

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
        className="fixed top-0 left-0 right-0 z-[100000] bg-[#80FF00] text-black overflow-hidden shadow-sm"
        style={{ minHeight: ANNOUNCEMENT_BANNER_HEIGHT }}
      >
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3 text-xs sm:text-[13px]">
          {/* Center Message */}
          <div className="flex-1 flex items-center justify-center gap-2 text-center text-black">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/10 border border-black/20 text-[10px] font-extrabold uppercase tracking-wide text-black shrink-0">
              <Sparkles className="w-2.5 h-2.5" />
              Update
            </span>
            <span className="leading-snug text-black">
              <strong className="font-bold text-black">CVCIRCLE</strong> is now <strong className="font-extrabold text-black">AIResume</strong> with fully automated job application features.
            </span>
          </div>

          {/* Dismiss Button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            className="p-1 rounded-full text-black/70 hover:text-black hover:bg-black/10 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
