'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface SocialAuthButtonsProps {
  onGoogleAuth: () => void;
  onAppleAuth?: () => void;
  onMagicLinkAuth?: () => void;
  onLinkedInAuth?: () => void;
  isLoading: boolean;
  mode: 'signin' | 'signup';
}

export default function SocialAuthButtons({
  onGoogleAuth,
  onAppleAuth,
  onMagicLinkAuth,
  onLinkedInAuth,
  isLoading,
  mode
}: SocialAuthButtonsProps) {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  const baseButton =
    'relative flex items-center justify-center gap-2.5 py-3 px-4 rounded-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold overflow-hidden whitespace-nowrap group';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 tablet:grid-cols-3 gap-3">
        {/* Google */}
        <motion.button
          type="button"
          onClick={onGoogleAuth}
          onMouseEnter={() => setHoveredButton('Google')}
          onMouseLeave={() => setHoveredButton(null)}
          disabled={isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className={`${baseButton} bg-white hover:bg-gray-50 dark:bg-white/5 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white`}
        >
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="truncate">{hoveredButton === 'Google' ? 'Continue with Google' : 'Google'}</span>
        </motion.button>

        {/* LinkedIn */}
        {onLinkedInAuth && (
          <motion.button
            type="button"
            onClick={onLinkedInAuth}
            onMouseEnter={() => setHoveredButton('LinkedIn')}
            onMouseLeave={() => setHoveredButton(null)}
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className={`${baseButton} bg-[#0a66c2] hover:bg-[#004182] text-white border border-transparent`}
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            <span className="truncate">{hoveredButton === 'LinkedIn' ? 'Continue with LinkedIn' : 'LinkedIn'}</span>
          </motion.button>
        )}

        {/* Apple */}
        {onAppleAuth && (
          <motion.button
            type="button"
            onClick={onAppleAuth}
            onMouseEnter={() => setHoveredButton('Apple')}
            onMouseLeave={() => setHoveredButton(null)}
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className={`${baseButton} bg-black hover:bg-gray-900 text-white border border-transparent`}
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 384 512" fill="white">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
            </svg>
            <span className="truncate">{hoveredButton === 'Apple' ? 'Continue with Apple' : 'Apple'}</span>
          </motion.button>
        )}
      </div>

      {/* Code-based Passwordless Button - Only for signup mode */}
      {onMagicLinkAuth && mode === 'signup' && (
        <motion.button
          type="button"
          onClick={onMagicLinkAuth}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-[#80FF00]/10 hover:bg-[#80FF00]/20 border border-[#80FF00]/20 hover:border-[#80FF00]/40 text-gray-900 dark:text-white py-3 px-6 rounded-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6Z" />
          </svg>
          Send me a code
        </motion.button>
      )}
    </div>
  );
}
