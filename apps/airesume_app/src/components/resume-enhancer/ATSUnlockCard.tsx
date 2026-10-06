import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, ArrowRight, X, Sparkles } from 'lucide-react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { CHIP_INLINE, CHIP_TONES } from '@/components/ui/chip-styles';

interface ATSUnlockCardProps {
  onUnlockClick: () => void;
  onDismiss: () => void;
  isDismissed: boolean;
}

export default function ATSUnlockCard({ onUnlockClick, onDismiss, isDismissed }: ATSUnlockCardProps) {
  const { state } = useResumeEnhancer();

  const hasJobData = !!state.jobData && !!(state.jobData.description || state.jobData.jobDescription);

  if (hasJobData || isDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="relative group mb-6"
        style={{ perspective: 1000 }}
      >
        <motion.div
          whileHover={{ rotateX: 2, rotateY: -2 }}
          className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 shadow-xl transition-all duration-300"
        >
          {/* Animated Background Glow */}
          <div className="absolute -inset-24 bg-gradient-to-r from-lime-500/20 via-emerald-500/10 to-transparent blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-10 relative z-10">
            {/* Visual Teaser */}
            <div className="flex-shrink-0 relative w-28 h-28 flex items-center justify-center bg-gray-50 dark:bg-black/50 rounded-full border border-gray-200 dark:border-white/10 shadow-inner">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-lime-500/20 to-transparent animate-spin-slow" />
              <div className="text-center relative z-10">
                <span className="block text-3xl font-black text-gray-800 dark:text-white blur-[4px] select-none group-hover:blur-[2px] transition-all duration-500">
                  92%
                </span>
                <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                  ATS Match
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 text-center md:text-left">
              <div className={`${CHIP_INLINE} ${CHIP_TONES.green} font-bold uppercase tracking-wider mb-3`}>
                <Sparkles className="w-3 h-3" />
                Unlock Focused Features
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Want to know your ATS Score?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-5 leading-relaxed max-w-xl">
                Your resume is looking great, but it&apos;s missing context. Add a target Job Description to instantly calculate your ATS Match Score and unlock AI-powered content tailoring.
              </p>
              
              {/* CTA Button */}
              <button
                onClick={onUnlockClick}
                className="group/btn inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-semibold text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-all active:scale-95 shadow-lg"
              >
                <Target className="w-4 h-4" />
                Add Job Description
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
