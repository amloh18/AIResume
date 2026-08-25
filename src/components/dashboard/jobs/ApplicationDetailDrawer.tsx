'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Zap,
  CheckCircle2,
  FileText,
  Clock,
  ExternalLink,
  ShieldCheck,
  Building2,
  MapPin,
  HelpCircle,
  Mail,
  AlertTriangle,
} from 'lucide-react';

export interface TimelineStep {
  time: string;
  label: string;
  description?: string;
  status: 'completed' | 'current' | 'failed';
}

export interface ApplicationDetailData {
  id: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  location?: string;
  stage: 'saved' | 'staging' | 'applied' | 'interview' | 'offer' | 'rejected';
  internalStatus: string;
  isAutoApplied: boolean;
  appliedDate?: string;
  confirmationId?: string;
  confirmationSource?: string;
  cvName?: string;
  coverLetterName?: string;
  whyMovedReason?: string;
  timeline: TimelineStep[];
}

interface ApplicationDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  application: ApplicationDetailData | null;
}

export default function ApplicationDetailDrawer({
  isOpen,
  onClose,
  application,
}: ApplicationDetailDrawerProps) {
  if (!isOpen || !application) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
        {/* Backdrop click */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
        />

        {/* Drawer Body */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-md bg-[#111111] border-l border-white/10 h-full flex flex-col shadow-2xl z-10 overflow-y-auto"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#111111]/90 backdrop-blur-md z-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white font-bold">
                {application.companyLogo ? (
                  <img
                    src={application.companyLogo}
                    alt={application.companyName}
                    className="w-full h-full object-contain rounded-2xl"
                  />
                ) : (
                  <Building2 className="w-5 h-5 text-white/60" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">
                  {application.jobTitle}
                </h3>
                <p className="text-xs text-white/50">{application.companyName}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-6 flex-1 text-xs">
            {/* Status Strip */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                  Application Status
                </span>
                {application.isAutoApplied ? (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[11px]">
                    <Zap className="w-3.5 h-3.5" />
                    Applied automatically
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 font-bold text-[11px]">
                    👤 Manually Applied
                  </div>
                )}
              </div>

              {application.appliedDate && (
                <div className="text-white/70 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-white/40" />
                  <span>Submitted on {application.appliedDate}</span>
                </div>
              )}
            </div>

            {/* Verification Proof Badge */}
            {application.confirmationId && (
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Submission Verified</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-white/50">Application ID:</span>
                  <span className="font-mono text-emerald-300 font-bold">
                    {application.confirmationId}
                  </span>
                </div>
                {application.confirmationSource && (
                  <div className="text-[11px] text-white/40">
                    Source: {application.confirmationSource}
                  </div>
                )}
              </div>
            )}

            {/* "Why Did This Move?" Explainability Box */}
            {application.whyMovedReason && (
              <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-1.5">
                <div className="flex items-center gap-1.5 text-blue-400 font-bold text-[11px] uppercase tracking-wider">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Why did this move?
                </div>
                <p className="text-white/80 leading-relaxed text-[11px]">
                  {application.whyMovedReason}
                </p>
              </div>
            )}

            {/* Prepared Documents */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2.5">
              <div className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                Submitted Documents
              </div>
              <div className="flex items-center justify-between text-white/80 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold">{application.cvName || 'Tailored Master CV'}</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">✓ Ready</span>
              </div>
              {application.coverLetterName && (
                <div className="flex items-center justify-between text-white/80 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold">{application.coverLetterName}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold">✓ Ready</span>
                </div>
              )}
            </div>

            {/* Step-by-Step Flight Timeline */}
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                Application Timeline
              </div>
              <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-white/10">
                {application.timeline.map((step, idx) => (
                  <div key={idx} className="relative flex items-start gap-3 text-xs">
                    <div
                      className={`w-3 h-3 rounded-full border-2 -ml-[19px] mt-0.5 z-10 ${
                        step.status === 'completed'
                          ? 'bg-emerald-500 border-emerald-400'
                          : step.status === 'failed'
                          ? 'bg-red-500 border-red-400'
                          : 'bg-amber-400 border-amber-300'
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{step.label}</span>
                        <span className="text-[10px] font-mono text-white/40">{step.time}</span>
                      </div>
                      {step.description && (
                        <p className="text-[11px] text-white/50 mt-0.5 leading-relaxed">
                          {step.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
