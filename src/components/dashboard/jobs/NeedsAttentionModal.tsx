'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ExternalLink, X, FileText, CheckCircle2 } from 'lucide-react';

interface NeedsAttentionModalProps {
  job: any;
  reason?: string;
  onClose: () => void;
  onConfirmManualSubmit: () => void;
}

export default function NeedsAttentionModal({
  job,
  reason,
  onClose,
  onConfirmManualSubmit,
}: NeedsAttentionModalProps) {
  const applicationUrl = job?.applicationUrl || job?.url || '#';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-[#121212] border border-amber-500/30 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Manual Review Required
              </h3>
              <p className="text-xs text-white/50">{job?.title} at {job?.company}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-white/70">
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-300 leading-relaxed">
            {reason ||
              'This employer portal uses custom questionnaire fields or security verifications that cannot be safely automated with 100% accuracy. We have prepared your tailored CV so you can finish submission in 1 click.'}
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="font-bold text-white uppercase text-[10px] tracking-wider">
              Prepared Assets Ready
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Tailored ATS-Optimized CV</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Tailored Cover Letter</span>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <a
            href={applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <ExternalLink className="w-4 h-4" /> Open Application Form
          </a>

          <button
            onClick={() => {
              onConfirmManualSubmit();
              onClose();
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            I Have Applied
          </button>
        </div>
      </motion.div>
    </div>
  );
}
