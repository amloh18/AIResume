'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, X, Copy, Check } from 'lucide-react';

interface LaunchBannerProps {
  onClose?: () => void;
}

const LaunchBanner: React.FC<LaunchBannerProps> = ({ onClose }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 2,
    hours: 14,
    minutes: 31,
    seconds: 0
  });

  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the banner before
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('launch-banner-dismissed');
      if (dismissed) {
        setIsVisible(false);
        return;
      }

      // Show banner after a delay to let users see the landing page first
      // 5 seconds gives users time to read the hero section before the modal appears
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    // Only start countdown if banner is visible
    if (!isVisible) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { days, hours, minutes, seconds } = prev;
        
        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        } else if (days > 0) {
          days--;
          hours = 23;
          minutes = 59;
          seconds = 59;
        }
        
        return { days, hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible]);

  const handleClose = () => {
    setIsAnimating(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('launch-banner-dismissed', 'true');
    }
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) {
        onClose();
      }
    }, 300);
  };

  const handleClaimClick = () => {
    window.location.href = '/sign-up?promo=LAUNCH500&code=LAUNCH500';
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText('LAUNCH500');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998]"
            onClick={handleClose}
          />
          
          {/* Modal Card */}
          <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center z-[9999] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ 
                type: 'spring',
                stiffness: 300,
                damping: 30,
                duration: 0.5
              }}
              className="w-[95%] sm:w-[90%] md:w-[600px] lg:w-[650px] max-w-2xl pointer-events-auto"
            >
              <div className="relative bg-gradient-to-br from-lime-400 via-lime-500 to-lime-400 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border-4 border-lime-600/50">
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-20">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-transparent"
                    animate={{
                      x: ['-100%', '100%'],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    style={{
                      width: '50%',
                    }}
                  />
                </div>

                {/* Close button */}
                <button
                  onClick={handleClose}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 text-black/70 hover:text-black transition-colors p-1.5 sm:p-2 rounded-full hover:bg-black/10 flex-shrink-0 bg-white/20 backdrop-blur-sm"
                  aria-label="Close banner"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                <div className="relative px-6 sm:px-8 lg:px-10 py-6 sm:py-8 lg:py-10">
                  {/* Header with Sparkle */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-black animate-pulse" />
                    <h2 className="text-black font-extrabold text-lg sm:text-xl lg:text-2xl text-center">
                      🎉 LAUNCH OFFER 🎉
                    </h2>
                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-black animate-pulse" />
                  </div>

                  {/* Main Offer Text */}
                  <div className="text-center mb-6">
                    <p className="text-black font-bold text-base sm:text-lg lg:text-xl mb-2">
                      Get 1 Month Free!
                    </p>
                    <p className="text-black/90 font-medium text-sm sm:text-base mb-4">
                      Be one of our first 500 users
                    </p>

                    {/* Coupon Code */}
                    <div className="mb-6">
                      <p className="text-black/80 text-xs sm:text-sm font-medium mb-2">Use Code:</p>
                      <div className="flex items-center justify-center gap-2">
                        <motion.div
                          className="bg-black text-lime-400 px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-mono font-extrabold text-lg sm:text-xl lg:text-2xl tracking-wider border-4 border-black/30 shadow-lg"
                          whileHover={{ scale: 1.05 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          LAUNCH500
                        </motion.div>
                        <motion.button
                          onClick={handleCopyCode}
                          className="bg-black/80 hover:bg-black text-lime-400 p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Copy code"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                          ) : (
                            <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                          )}
                        </motion.button>
                      </div>
                      {copied && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-black/80 text-xs sm:text-sm font-medium mt-2"
                        >
                          Code copied! 🎉
                        </motion.p>
                      )}
                    </div>

                    {/* Countdown Timer */}
                    <div className="mb-6">
                      <p className="text-black/80 font-medium text-xs sm:text-sm mb-3">Offer ends in:</p>
                      <div className="flex items-center justify-center gap-2 sm:gap-3 font-bold">
                        <div className="bg-black/20 text-black px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-sm sm:text-base font-mono min-w-[55px] sm:min-w-[65px] text-center border-2 border-black/30">
                          {String(timeLeft.days).padStart(2, '0')}d
                        </div>
                        <span className="text-black text-lg sm:text-xl">:</span>
                        <div className="bg-black/20 text-black px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-sm sm:text-base font-mono min-w-[55px] sm:min-w-[65px] text-center border-2 border-black/30">
                          {String(timeLeft.hours).padStart(2, '0')}h
                        </div>
                        <span className="text-black text-lg sm:text-xl">:</span>
                        <div className="bg-black/20 text-black px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-sm sm:text-base font-mono min-w-[55px] sm:min-w-[65px] text-center border-2 border-black/30">
                          {String(timeLeft.minutes).padStart(2, '0')}m
                        </div>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <motion.button
                      onClick={handleClaimClick}
                      className="w-full bg-black text-lime-400 font-extrabold px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-base lg:text-lg whitespace-nowrap flex items-center justify-center gap-2 sm:gap-3 hover:bg-gray-900 transition-all duration-300 shadow-2xl hover:shadow-3xl border-4 border-black/30 hover:border-lime-400/50"
                      whileHover={{ 
                        scale: 1.02,
                        boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.6)"
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span>Claim My Free Month Now</span>
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default LaunchBanner;

