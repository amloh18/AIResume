'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cookie, Settings, ChevronRight, Lock, BarChart3, Target } from 'lucide-react';
import { 
  getCookieConsentStatus, 
  setCookieConsentStatus, 
  getCookiePreferences,
  setCookiePreferences,
  initializeAnalytics, 
  initializeMarketing 
} from '@/lib/utils/cookieUtils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

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
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: true,
    marketing: false,
  });

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

  const handleSaveCustom = () => {
    setCookiePreferences(preferences);
    initializeAnalytics();
    initializeMarketing();
    setIsVisible(false);
    onAccept?.();
  };

  const togglePreference = (key: keyof typeof preferences) => {
    if (key === 'necessary') return;
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-4 left-0 right-0 z-[99999] flex justify-center px-4 pointer-events-none">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="w-full md:w-[85%] max-w-7xl pointer-events-auto"
        >
          <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden">
            <div className="px-4 py-3 md:px-6 md:py-3">
              {!showCustomizer ? (
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-center md:text-left">
                  {/* Left: Minimal Info */}
                  <div className="flex items-center gap-3 shrink-0">
                    <Cookie className="text-[#81ff00] w-5 h-5 shrink-0" />
                    <p className="text-gray-700 dark:text-gray-300 text-[13px] leading-tight font-medium">
                      We use cookies to improve your experience. 
                      <Link href="/cookie-policy" className="text-[#81ff00] hover:underline ml-1">
                        Policy
                      </Link>
                    </p>
                  </div>

                  {/* Right: Compact Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <button 
                      onClick={() => setShowCustomizer(true)}
                      className="text-[11px] font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white px-1 transition-colors flex items-center gap-1"
                    >
                      <Settings className="w-3 h-3" />
                      Customize
                    </button>
                    <Button 
                      variant="ghost"
                      onClick={handleDeclineAll}
                      className="h-8 px-3 text-[11px] font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg"
                    >
                      Essential Only
                    </Button>
                    <Button 
                      onClick={handleAcceptAll}
                      className="h-8 px-5 bg-[#81ff00] hover:bg-[#72e000] text-black text-[11px] font-bold rounded-lg shadow-sm"
                    >
                      Accept All
                    </Button>
                    <button 
                      onClick={() => setIsVisible(false)}
                      className="ml-1 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col md:flex-row items-center justify-center gap-6"
                >
                  <div className="flex items-center gap-3">
                    <MiniPreferenceItem 
                      title="Essential"
                      checked={preferences.necessary}
                      disabled={true}
                    />
                    <MiniPreferenceItem 
                      title="Analytics"
                      checked={preferences.analytics}
                      onToggle={() => togglePreference('analytics')}
                    />
                    <MiniPreferenceItem 
                      title="Marketing"
                      checked={preferences.marketing}
                      onToggle={() => togglePreference('marketing')}
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button 
                      variant="ghost"
                      onClick={() => setShowCustomizer(false)}
                      className="h-8 px-3 text-[11px] text-gray-500"
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={handleSaveCustom}
                      className="h-8 px-4 bg-black dark:bg-[#81ff00] text-white dark:text-black text-[11px] font-bold rounded-lg"
                    >
                      Save
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const MiniPreferenceItem = ({ title, checked, disabled, onToggle }: any) => (
  <div 
    onClick={!disabled ? onToggle : undefined}
    className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-[11px] transition-all ${
      disabled 
        ? 'bg-gray-50 dark:bg-white/5 border-transparent opacity-60' 
        : `cursor-pointer ${checked ? 'border-[#81ff00]/40 bg-[#81ff00]/5 text-gray-900 dark:text-white' : 'border-gray-200 dark:border-white/10 text-gray-500'}`
    }`}
  >
    <span className="font-bold">{title}</span>
    <div className={`w-6 h-3 rounded-full relative transition-colors ${checked ? 'bg-[#81ff00]' : 'bg-gray-300 dark:bg-gray-700'}`}>
      <div className={`absolute top-0.5 w-2 h-2 bg-white rounded-full transition-all ${checked ? 'left-3.5' : 'left-0.5'}`} />
    </div>
  </div>
);

export default CookieConsent;
