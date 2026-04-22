'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuthModalStore } from '@/lib/stores/authModalStore';
import { UnifiedAuthPageContent } from './UnifiedAuthPage';
import { useSession } from 'next-auth/react';

export default function AuthModal() {
  const { isOpen, closeModal, view } = useAuthModalStore();
  const { status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close modal automatically if user becomes authenticated
  useEffect(() => {
    if (status === 'authenticated' && isOpen) {
      closeModal();
    }
  }, [status, isOpen, closeModal]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-[#141810] rounded-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-20 p-2 bg-gray-100/50 hover:bg-gray-200 dark:bg-black/20 dark:hover:bg-black/40 rounded-sm transition-colors text-gray-600 dark:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-0">
              <UnifiedAuthPageContent initialMode={view} isModal={true} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}