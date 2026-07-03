'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plus, ArrowRight, X, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CreateMasterCVCardProps {
  userId: string;
  onClose: () => void;
}

const CreateMasterCVCard: React.FC<CreateMasterCVCardProps> = ({ userId, onClose }) => {
  const router = useRouter();

  // Blur sidebar when modal is shown
  React.useEffect(() => {
    // Add blur class to sidebar
    const sidebar = document.querySelector('[data-dashboard-sidebar]');
    if (sidebar) {
      sidebar.classList.add('blur-sm');
    }

    // Cleanup: remove blur when modal is closed
    return () => {
      const sidebar = document.querySelector('[data-dashboard-sidebar]');
      if (sidebar) {
        sidebar.classList.remove('blur-sm');
      }
    };
  }, []);

  const handleCreateMasterCV = () => {
    // Set flag to indicate user is creating master CV
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('fromOnboarding', 'true');
      sessionStorage.setItem('welcomeDismissed', 'true');
    }
    router.push('/editor');
  };

  const features = [
    'Comprehensive CV builder',
    'AI-powered content optimization',
    'Multiple template options',
    'ATS-friendly formatting'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="bg-[#1A261A] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-lime-500 to-green-600 rounded-xl flex items-center justify-center">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-h3 font-bold text-white">Create Master CV</h2>
              <p className="text-lime-400 font-medium text-small">Your Career Foundation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-white/80 leading-relaxed">
            Create your comprehensive Master CV that serves as the foundation for all your job applications.
          </p>

          <div className="space-y-3">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3"
              >
                <CheckCircle className="w-5 h-5 text-lime-400 flex-shrink-0" />
                <span className="text-white/70 text-small">{feature}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-white/70 hover:text-white transition-colors"
          >
            Maybe later
          </button>
          <motion.button
            onClick={handleCreateMasterCV}
            className="flex items-center gap-2 px-6 py-3 bg-[rgb(129,255,0)] hover:bg-[rgb(110,230,0)] text-black rounded-lg font-semibold transition-all duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Create Master CV
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateMasterCVCard;

