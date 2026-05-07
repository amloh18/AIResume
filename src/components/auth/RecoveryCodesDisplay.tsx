'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Copy, Download, AlertCircle, Check, Eye, EyeOff } from 'lucide-react';

interface RecoveryCodesDisplayProps {
  codes: string[];
  onClose: () => void;
  onRegenerate: () => void;
}

export default function RecoveryCodesDisplay({
  codes,
  onClose,
  onRegenerate,
}: RecoveryCodesDisplayProps) {
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCodes, setShowCodes] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownload = () => {
    const content = `CVCircle Recovery Codes\n${'='.repeat(30)}\n\n` +
      `These codes can be used to regain access to your account if you lose your 2FA device.\n` +
      `Each code can only be used once.\n\n` +
      `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n\n` +
      `Recovery Codes:\n` +
      codes.map((code, index) => `${index + 1}. ${code}`).join('\n') +
      `\n\n${'='.repeat(30)}\n` +
      `Store these codes in a secure location (password manager recommended).\n` +
      `Do not share these codes with anyone.`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cvcircle-recovery-codes-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  const handleConfirm = () => {
    setHasConfirmed(true);
    // In a real app, you would send confirmation to the server
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-[#1a1a1a] rounded-none border border-gray-200 dark:border-white/10 w-full max-w-lg shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-none border-2 border-[#88E03F] flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#88E03F]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Recovery Codes
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Save these codes securely
                </p>
              </div>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-100 dark:border-yellow-800/50">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Important Security Notice
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Store these codes in a secure location (like a password manager). 
                  Do not screenshot or save to cloud storage. Each code can only be used once.
                </p>
              </div>
            </div>
          </div>

          {/* Recovery Codes Display */}
          <div className="p-6">
            <div className="bg-gray-50 dark:bg-[#1a1a1a]/50 rounded-none border border-gray-200 dark:border-white/10 p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Your Recovery Codes
                </span>
                <button
                  onClick={() => setShowCodes(!showCodes)}
                  className="flex items-center gap-1 text-sm text-[#88E03F] hover:text-[#88E03F]/80 transition-colors"
                >
                  {showCodes ? (
                    <><EyeOff className="w-4 h-4" /> Hide</>
                  ) : (
                    <><Eye className="w-4 h-4" /> Show</>
                  )}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {codes.map((code, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-none border border-gray-200 dark:border-gray-700 text-center font-mono text-lg ${
                      showCodes ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                    }`}
                  >
                    {showCodes ? code : '••••••••'}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-none border-2 border-gray-200 dark:border-white/10 hover:border-[#88E03F] hover:text-[#88E03F] transition-all duration-200 group"
              >
                <Copy className={`w-4 h-4 ${copied ? 'text-[#88E03F]' : ''}`} />
                <span className="text-sm font-medium">
                  {copied ? 'Copied!' : 'Copy Codes'}
                </span>
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-none border-2 border-gray-200 dark:border-white/10 hover:border-[#88E03F] hover:text-[#88E03F] transition-all duration-200 group"
              >
                <Download className={`w-4 h-4 ${downloaded ? 'text-[#88E03F]' : ''}`} />
                <span className="text-sm font-medium">
                  {downloaded ? 'Downloaded!' : 'Download'}
                </span>
              </button>
            </div>

            {/* Confirmation Checkbox */}
            <div className="p-4 bg-gray-50 dark:bg-[#1a1a1a]/50 rounded-none border border-gray-200 dark:border-white/10">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasConfirmed}
                  onChange={(e) => setHasConfirmed(e.target.checked)}
                  className="mt-1 w-4 h-4 text-[#88E03F] border-gray-300 dark:border-gray-600 rounded-none focus:ring-[#88E03F]"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  I have saved these recovery codes in a secure location and understand that each code can only be used once.
                </span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-white/10">
            <div className="flex gap-3">
              <button
                onClick={onRegenerate}
                className="flex-1 px-4 py-3 rounded-none border-2 border-gray-200 dark:border-white/10 hover:border-red-500 hover:text-red-500 transition-all duration-200 text-sm font-medium"
              >
                Regenerate Codes
              </button>
              <button
                onClick={handleConfirm}
                disabled={!hasConfirmed}
                className="flex-1 px-4 py-3 rounded-none border-2 bg-[#88E03F] text-gray-900 hover:bg-[#88E03F]/90 hover:border-[#88E03F]/90 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {hasConfirmed ? 'Continue' : 'Confirm & Continue'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
