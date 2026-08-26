'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, X, ExternalLink, Send } from 'lucide-react';

interface ManualConfirmModalProps {
  job: any;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ManualConfirmModal({ job, onClose, onConfirm }: ManualConfirmModalProps) {
  const [confirmationId, setConfirmationId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      onConfirm();
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-[#121212] border border-white/10 rounded-3xl p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Confirm External Submission
              </h3>
              <p className="text-xs text-white/50">{job?.title} at {job?.company}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold uppercase tracking-wider text-white/60 mb-1.5">
              Confirmation Reference ID (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. GH-91823, REQ-4401"
              value={confirmationId}
              onChange={(e) => setConfirmationId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-white/60 mb-1.5">
              Application Notes (Optional)
            </label>
            <textarea
              placeholder="Any notes about salary discussed, referral used, or specific cover letter..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark as Applied
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
