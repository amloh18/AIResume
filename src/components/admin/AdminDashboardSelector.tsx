import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Users, CheckCircle } from 'lucide-react';

interface AdminDashboardSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (choice: 'admin' | 'user') => void;
}

export default function AdminDashboardSelector({
  isOpen,
  onClose,
  onSelect,
}: AdminDashboardSelectorProps) {
  const [hasConfirmed, setHasConfirmed] = useState(false);

  useEffect(() => {
    // Check if user has already confirmed the selector before
    if (isOpen) {
      const hasSeenSelector = localStorage.getItem('admin-dashboard-selector-confirmed');
      if (hasSeenSelector) {
        // If already confirmed, auto-select based on saved preference
        const savedPreference = localStorage.getItem('admin-dashboard-preference');
        if (savedPreference === 'admin' || savedPreference === 'user') {
          onSelect(savedPreference);
          onClose();
          return;
        }
      }
      setHasConfirmed(false);
    }
  }, [isOpen, onSelect, onClose]);

  const handleSelect = (choice: 'admin' | 'user') => {
    // Save preference to localStorage
    localStorage.setItem('admin-dashboard-preference', choice);
    localStorage.setItem('admin-dashboard-selector-confirmed', 'true');
    setHasConfirmed(true);
    onSelect(choice);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-[#1a1a1a] rounded-none border border-gray-200 dark:border-white/10 w-full max-w-lg p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-none border-2 border-[#80FF00] flex items-center justify-center mx-auto mb-4">
              <LayoutGrid className="w-8 h-8 text-[#80FF00]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome, Admin
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Choose your dashboard view
            </p>
          </div>

          {/* Options */}
          <div className="space-y-4 mb-6">
            {/* Admin Panel */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect('admin')}
              className="w-full p-4 rounded-none border-2 border-gray-200 dark:border-white/10 hover:border-[#80FF00] transition-all duration-200 text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-none border-2 border-[#88E03F] flex items-center justify-center group-hover:bg-[#88E03F]/10 transition-colors">
                  <LayoutGrid className="w-6 h-6 text-[#88E03F]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-[#88E03F] transition-colors">
                    Admin Panel
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Manage users, settings, and system configuration
                  </p>
                </div>
              </div>
            </motion.button>

            {/* User View */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect('user')}
              className="w-full p-4 rounded-none border-2 border-gray-200 dark:border-white/10 hover:border-[#80FF00] transition-all duration-200 text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-none border-2 border-[#88E03F] flex items-center justify-center group-hover:bg-[#88E03F]/10 transition-colors">
                  <Users className="w-6 h-6 text-[#88E03F]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-[#88E03F] transition-colors">
                    User Dashboard
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Access standard user features and CV tools
                  </p>
                </div>
              </div>
            </motion.button>
          </div>

          {/* Confirmation */}
          {hasConfirmed && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 text-[#88E03F] text-sm"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Preference saved for future logins</span>
            </motion.div>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-4">
            You can change this preference anytime from your account settings
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
