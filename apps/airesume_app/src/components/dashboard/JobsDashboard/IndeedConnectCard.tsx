'use client';

import React, { useState } from 'react';
import { Briefcase, Zap, CheckCircle2, ArrowRight, Shield } from 'lucide-react';
import PortalConnectModal from '../settings/PortalConnectModal';
import { CHIP_INLINE, CHIP_TONES } from '@/components/ui/chip-styles';

interface IndeedConnectCardProps {
  onConnected?: () => void;
}

export const IndeedConnectCard: React.FC<IndeedConnectCardProps> = ({ onConnected }) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border-2 border-indigo-500/30 dark:border-indigo-500/20 bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/50 dark:from-[#131726] dark:via-[#141810] dark:to-[#171a2b] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
        {/* Glow decorative background */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div>
          {/* Top Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 dark:text-white text-base">
                    Indeed.com
                  </span>
                  <span className={`${CHIP_INLINE} ${CHIP_TONES.indigo} font-extrabold tracking-wide uppercase`}>
                    Featured
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Global & Direct Employer Openings
                </p>
              </div>
            </div>
          </div>

          {/* Value Proposition */}
          <h4 className="text-small font-semibold text-gray-900 dark:text-white mb-2 leading-snug">
            Link your account to auto-match & 1-click apply to worldwide opportunities
          </h4>

          {/* Benefits list */}
          <div className="space-y-1.5 mb-4 text-xs text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-lime-500 shrink-0" />
              <span>AI tailored resumes for each job posting</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-lime-500 shrink-0" />
              <span>Auto-fills employer assessment questions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-lime-500 shrink-0" />
              <span>Real-time status updates synced in Job Tracker</span>
            </div>
          </div>
        </div>

        {/* Action Area */}
        <div className="pt-3 border-t border-gray-200/80 dark:border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
            <Shield className="w-3.5 h-3.5 text-indigo-500" />
            <span>Encrypted connection</span>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5 group-hover:gap-2 shrink-0 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            Connect Account
            <ArrowRight className="w-3.5 h-3.5 transition-transform" />
          </button>
        </div>
      </div>

      <PortalConnectModal
        portal="indeed"
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          if (onConnected) onConnected();
        }}
      />
    </>
  );
};

export default IndeedConnectCard;
